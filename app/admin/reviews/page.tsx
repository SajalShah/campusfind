import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ResolveClashButton from "@/components/ResolveClashButton";
import ReviewHistoryRow from "@/components/ReviewHistoryRow";

type ReportBrief = { id: string; category: string; description: string; campus_location: string };
type PendingMatch = {
  id: string;
  total_score: number;
  confidence_band: string;
  lost_report_id: string;
  found_report_id: string;
  created_at: string;
};

export default async function AdminReviewsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "administrator") redirect("/browse");

  const { data: pending } = await supabase
    .from("match_suggestions")
    .select("id, total_score, confidence_band, lost_report_id, found_report_id, created_at")
    .eq("needs_admin_review", true)
    .order("total_score", { ascending: false });

  const { data: resolvedLog } = await supabase
    .from("audit_log")
    .select("id, actor_id, entity_id, details, created_at")
    .eq("action", "clash_resolved")
    .order("created_at", { ascending: false });

  const adminIds = [...new Set((resolvedLog ?? []).map((r) => r.actor_id).filter(Boolean))];
  const matchIds = [...new Set((resolvedLog ?? []).map((r) => r.entity_id).filter(Boolean))];

  const [{ data: admins }, { data: historyMatches }] = await Promise.all([
    adminIds.length
      ? supabase.from("users").select("id, full_name, university_email").in("id", adminIds)
      : Promise.resolve({ data: [] }),
    matchIds.length
      ? supabase
          .from("match_suggestions")
          .select("id, total_score, lost_report_id, found_report_id")
          .in("id", matchIds)
      : Promise.resolve({ data: [] }),
  ]);

  // Gather every report ID referenced anywhere on this page (pending
  // clashes + history) into one set, then fetch all their details in a
  // single query — used both for the comparison groups and history rows.
  const reportIds = new Set<string>();
  for (const m of pending ?? []) {
    reportIds.add(m.lost_report_id);
    reportIds.add(m.found_report_id);
  }
  for (const r of resolvedLog ?? []) {
    const match = r.entity_id ? historyMatches?.find((m) => m.id === r.entity_id) : null;
    const details = r.details as { lost_report_id?: string; found_report_id?: string } | null;
    if (match?.lost_report_id) reportIds.add(match.lost_report_id);
    if (match?.found_report_id) reportIds.add(match.found_report_id);
    if (!match && details?.lost_report_id) reportIds.add(details.lost_report_id);
    if (!match && details?.found_report_id) reportIds.add(details.found_report_id);
  }

  const { data: reports } = reportIds.size
    ? await supabase
        .from("item_reports")
        .select("id, category, description, campus_location")
        .in("id", [...reportIds])
    : { data: [] };

  const adminById = new Map((admins ?? []).map((a) => [a.id, a]));
  const historyMatchById = new Map((historyMatches ?? []).map((m) => [m.id, m]));
  const reportById = new Map<string, ReportBrief>((reports ?? []).map((r) => [r.id, r]));

  // Group pending clashes so each report's competing candidates show
  // together — that's what actually makes a clash reviewable, rather
  // than showing disconnected pairs with no shared context.
  const pendingList = (pending ?? []) as PendingMatch[];
  const lostGroups = new Map<string, PendingMatch[]>();
  const foundGroups = new Map<string, PendingMatch[]>();
  for (const m of pendingList) {
    (lostGroups.get(m.lost_report_id) ?? lostGroups.set(m.lost_report_id, []).get(m.lost_report_id)!).push(m);
    (foundGroups.get(m.found_report_id) ?? foundGroups.set(m.found_report_id, []).get(m.found_report_id)!).push(m);
  }

  const rendered = new Set<string>();
  const clusters: { anchor: ReportBrief | undefined; anchorType: "lost" | "found"; candidates: PendingMatch[] }[] = [];

  for (const [lostId, group] of lostGroups) {
    if (group.length > 1) {
      clusters.push({ anchor: reportById.get(lostId), anchorType: "lost", candidates: group });
      group.forEach((m) => rendered.add(m.id));
    }
  }
  for (const [foundId, group] of foundGroups) {
    const remaining = group.filter((m) => !rendered.has(m.id));
    if (remaining.length > 1) {
      clusters.push({ anchor: reportById.get(foundId), anchorType: "found", candidates: remaining });
      remaining.forEach((m) => rendered.add(m.id));
    }
  }
  const leftovers = pendingList.filter((m) => !rendered.has(m.id));

  return (
    <div className="max-w-5xl mx-auto px-6 py-14">
      <h1 className="font-serif text-3xl text-ink">Reviews</h1>
      <p className="text-ink-soft text-sm mt-2">
        Clashes needing your decision, and a permanent record of every
        clash you've already resolved.
      </p>

      <section className="mt-10">
        <h2 className="font-serif text-xl text-lost">
          Needs review — {pendingList.length}
        </h2>

        {clusters.length === 0 && leftovers.length === 0 ? (
          <p className="text-ink-soft text-sm mt-4">
            Nothing needs your review right now.
          </p>
        ) : (
          <div className="mt-4 space-y-6">
            {clusters.map((cluster, i) => (
              <div key={i} className="ticket ml-4 p-4">
                <p className="text-xs text-ink-soft uppercase tracking-wide">
                  {cluster.anchorType === "lost" ? "Lost report" : "Found report"} with{" "}
                  {cluster.candidates.length} plausible matches
                </p>
                {cluster.anchor && (
                  <div className="mt-1 mb-3">
                    <p className="font-medium text-ink">{cluster.anchor.category}</p>
                    <p className="text-ink-soft text-sm">{cluster.anchor.description}</p>
                    <p className="text-ink-soft text-sm">{cluster.anchor.campus_location}</p>
                  </div>
                )}
                <div className="ticket-perforation my-3" />
                <p className="text-xs text-ink-soft uppercase tracking-wide mb-2">
                  Being reviewed against:
                </p>
                <div className="space-y-3">
                  {cluster.candidates.map((m) => {
                    const otherId = cluster.anchorType === "lost" ? m.found_report_id : m.lost_report_id;
                    const other = reportById.get(otherId);
                    return (
                      <div
                        key={m.id}
                        className="flex items-center justify-between gap-4 border border-line rounded-tag p-3"
                      >
                        <div className="text-sm">
                          <p className="font-medium text-brass-dark">
                            {m.total_score} — {m.confidence_band}
                          </p>
                          {other ? (
                            <>
                              <p className="text-ink">{other.category} — {other.description}</p>
                              <p className="text-ink-soft">{other.campus_location}</p>
                            </>
                          ) : (
                            <p className="text-ink-soft">CF-{otherId.slice(0, 8)}</p>
                          )}
                        </div>
                        <ResolveClashButton matchId={m.id} />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {leftovers.map((m) => (
              <div key={m.id} className="ticket ml-4 p-4 flex items-center justify-between gap-4">
                <div className="text-sm">
                  <p className="font-medium text-brass-dark">{m.total_score} — {m.confidence_band}</p>
                  <p className="text-ink-soft mt-1">
                    Lost CF-{m.lost_report_id.slice(0, 8)} × Found CF-{m.found_report_id.slice(0, 8)}
                  </p>
                </div>
                <ResolveClashButton matchId={m.id} />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-12">
        <h2 className="font-serif text-xl text-ink">Already reviewed</h2>
        <p className="text-ink-soft text-sm mt-1">
          Click a row to see the actual items involved.
        </p>
        {resolvedLog && resolvedLog.length > 0 ? (
          <div className="mt-4 space-y-3">
            {resolvedLog.map((r) => {
              const admin = r.actor_id ? adminById.get(r.actor_id) : null;
              const match = r.entity_id ? historyMatchById.get(r.entity_id) : null;
              const details = r.details as { lost_report_id?: string; found_report_id?: string } | null;
              const lostId = match?.lost_report_id ?? details?.lost_report_id;
              const foundId = match?.found_report_id ?? details?.found_report_id;

              return (
                <ReviewHistoryRow
                  key={r.id}
                  resolvedAt={r.created_at}
                  adminName={admin?.full_name || admin?.university_email || "Unknown admin"}
                  score={match?.total_score ?? "—"}
                  lost={lostId ? reportById.get(lostId) ?? null : null}
                  found={foundId ? reportById.get(foundId) ?? null : null}
                />
              );
            })}
          </div>
        ) : (
          <p className="text-ink-soft text-sm mt-4">
            No clashes have been resolved yet.
          </p>
        )}
      </section>
    </div>
  );
}
