import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { scoreMatch, type ItemReport } from "@/lib/matching-engine";
import { embedText, toVectorLiteral } from "@/lib/embeddings";
import { notifyMatchedParties } from "@/lib/notify-match";

// Default serverless timeout (10s) isn't enough for a cold-start model
// load plus scoring multiple pairs. 60s is the max Vercel's Hobby tier
// allows for a Node serverless function.
export const maxDuration = 60;

// Only compare against reports that are still actively open.
const OPEN_STATUSES = ["submitted", "under_review", "pending_verification"];

// Below this, a pair isn't worth surfacing at all.
const MIN_SCORE_TO_SUGGEST = 50;
// Above this, we call it "likely" instead of "possible".
const LIKELY_THRESHOLD = 85;

type DbReport = {
  id: string;
  report_type: "lost" | "found";
  category: string;
  description: string;
  campus_location: string;
  item_date: string;
  colour: string | null;
  status: string;
  description_embedding: string | null;
  reporter_id: string;
};

function parseVector(raw: string | null): number[] | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function toEngineFormat(r: DbReport): ItemReport {
  return {
    id: r.id,
    type: r.report_type,
    category: r.category,
    description: r.description,
    location: r.campus_location,
    date_occurred: r.item_date,
    colour: r.colour,
    description_embedding: parseVector(r.description_embedding),
  };
}

export async function POST(request: Request) {
  const admin = createAdminClient();

  let reportId: string | null = null;
  try {
    const body = await request.json();
    reportId = body?.reportId ?? null;
  } catch {
    // No body — treat as "recompute everything".
  }

  const { data: allReports, error: fetchError } = await admin
    .from("item_reports")
    .select(
      "id, report_type, category, description, campus_location, item_date, colour, status, description_embedding, reporter_id"
    )
    .in("status", OPEN_STATUSES);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const reports = (allReports ?? []) as DbReport[];

  // Backfill: any report without an embedding yet gets one computed now.
  for (const r of reports) {
    if (!r.description_embedding) {
      const embedding = await embedText(r.description);
      const literal = toVectorLiteral(embedding);
      await admin.from("item_reports").update({ description_embedding: literal }).eq("id", r.id);
      r.description_embedding = literal;
    }
  }

  const lostReports = reports.filter((r) => r.report_type === "lost");
  const foundReports = reports.filter((r) => r.report_type === "found");

  const pairs: { lost: DbReport; found: DbReport }[] = [];
  if (reportId) {
    const justCreated = reports.find((r) => r.id === reportId);
    if (justCreated?.report_type === "lost") {
      for (const found of foundReports) pairs.push({ lost: justCreated, found });
    } else if (justCreated?.report_type === "found") {
      for (const lost of lostReports) pairs.push({ lost, found: justCreated });
    }
  } else {
    for (const lost of lostReports) {
      for (const found of foundReports) pairs.push({ lost, found });
    }
  }

  // Look up which pairs already have a match row, so we only notify on
  // genuinely NEW matches — recomputing shouldn't re-spam students.
  const { data: existingMatches } = await admin
    .from("match_suggestions")
    .select("lost_report_id, found_report_id");
  const existingKeys = new Set(
    (existingMatches ?? []).map((m) => `${m.lost_report_id}:${m.found_report_id}`)
  );

  let written = 0;
  const newlyWritten: { lost: DbReport; found: DbReport; score: number; matchId: string }[] = [];

  for (const { lost, found } of pairs) {
    const breakdown = scoreMatch(toEngineFormat(lost), toEngineFormat(found));
    if (breakdown.totalScore < MIN_SCORE_TO_SUGGEST) continue;

    const key = `${lost.id}:${found.id}`;
    const isNew = !existingKeys.has(key);

    const { data: upserted, error: upsertError } = await admin
      .from("match_suggestions")
      .upsert(
        {
          lost_report_id: lost.id,
          found_report_id: found.id,
          category_score: breakdown.categoryScore,
          description_score: breakdown.descriptionScore,
          location_score: breakdown.locationScore,
          date_score: breakdown.dateScore,
          colour_score: breakdown.colourScore,
          total_score: breakdown.totalScore,
          confidence_band: breakdown.totalScore >= LIKELY_THRESHOLD ? "likely" : "possible",
        },
        { onConflict: "lost_report_id,found_report_id" }
      )
      .select("id")
      .single();

    if (!upsertError && upserted) {
      written++;
      if (isNew) newlyWritten.push({ lost, found, score: breakdown.totalScore, matchId: upserted.id });
    }
  }

  // Clash detection: a report is ambiguous if it has more than one
  // qualifying candidate on the other side. Flag every match row touching
  // an ambiguous report so admin sees exactly which ones need a human.
  const { data: allQualifying } = await admin
    .from("match_suggestions")
    .select("id, lost_report_id, found_report_id")
    .gte("total_score", MIN_SCORE_TO_SUGGEST)
    .eq("status", "pending");

  const lostCounts = new Map<string, number>();
  const foundCounts = new Map<string, number>();
  for (const m of allQualifying ?? []) {
    lostCounts.set(m.lost_report_id, (lostCounts.get(m.lost_report_id) ?? 0) + 1);
    foundCounts.set(m.found_report_id, (foundCounts.get(m.found_report_id) ?? 0) + 1);
  }

  for (const m of allQualifying ?? []) {
    const isClash = (lostCounts.get(m.lost_report_id) ?? 0) > 1 || (foundCounts.get(m.found_report_id) ?? 0) > 1;
    await admin.from("match_suggestions").update({ needs_admin_review: isClash }).eq("id", m.id);
  }

  // Fetch all administrators once, for clash notifications.
  const { data: admins } = await admin
    .from("users")
    .select("id")
    .eq("role", "administrator");

  // Notify both reporters directly on every genuinely new, non-clashing
  // match — this is the "students coordinate themselves" path. Clashing
  // matches notify admins instead; an admin resolves those first.
  for (const { lost, found, score, matchId } of newlyWritten) {
    const isClash =
      (lostCounts.get(lost.id) ?? 0) > 1 || (foundCounts.get(found.id) ?? 0) > 1;

    if (isClash) {
      const message = `Possible clash: CF-${lost.id.slice(0, 8)} (lost) and CF-${found.id.slice(0, 8)} (found) both have multiple plausible matches — needs manual review.`;
      for (const a of admins ?? []) {
        await admin.from("notifications").insert({
          recipient_id: a.id,
          notification_type: "clash_needs_review",
          related_report_id: lost.id,
          message,
        });
      }
      await admin.from("audit_log").insert({
        actor_id: null,
        action: "match_clash_flagged",
        entity_type: "match_suggestions",
        entity_id: null,
        details: { lost_report_id: lost.id, found_report_id: found.id, score },
        email_sent: false,
      });
      continue;
    }

    await notifyMatchedParties(admin, lost, found, score, matchId);
  }

  return NextResponse.json({
    pairsEvaluated: pairs.length,
    matchesWritten: written,
    newMatchesNotified: newlyWritten.length,
  });
}
