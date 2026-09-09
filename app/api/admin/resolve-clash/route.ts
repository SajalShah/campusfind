import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyMatchedParties } from "@/lib/notify-match";

export async function POST(request: Request) {
  const { matchId } = await request.json();
  if (!matchId) {
    return NextResponse.json({ error: "matchId required" }, { status: 400 });
  }

  // Verify the caller is actually an administrator.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "administrator") {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  const admin = createAdminClient();

  const { data: chosen, error: chosenError } = await admin
    .from("match_suggestions")
    .select("id, lost_report_id, found_report_id, total_score")
    .eq("id", matchId)
    .single();

  if (chosenError || !chosen) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  // Confirm the chosen match.
  await admin
    .from("match_suggestions")
    .update({ status: "pursued", needs_admin_review: false })
    .eq("id", chosen.id);

  // Dismiss every other pending match sharing either report — the clash
  // is resolved once one side is confirmed correct.
  await admin
    .from("match_suggestions")
    .update({ status: "dismissed", needs_admin_review: false })
    .or(`lost_report_id.eq.${chosen.lost_report_id},found_report_id.eq.${chosen.found_report_id}`)
    .eq("status", "pending")
    .neq("id", chosen.id);

  // Fetch the report details needed to notify both parties.
  const [{ data: lost }, { data: found }] = await Promise.all([
    admin.from("item_reports").select("id, description, reporter_id").eq("id", chosen.lost_report_id).single(),
    admin.from("item_reports").select("id, description, reporter_id").eq("id", chosen.found_report_id).single(),
  ]);

  if (lost && found) {
    await notifyMatchedParties(admin, lost, found, chosen.total_score, chosen.id);
  }

  await admin.from("audit_log").insert({
    actor_id: user.id,
    action: "clash_resolved",
    entity_type: "match_suggestions",
    entity_id: chosen.id,
    details: { lost_report_id: chosen.lost_report_id, found_report_id: chosen.found_report_id },
    email_sent: false,
  });

  return NextResponse.json({ resolved: true });
}
