import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const { reportId } = await request.json();
  if (!reportId) {
    return NextResponse.json({ error: "reportId required" }, { status: 400 });
  }

  // Regular client — RLS enforces this can only succeed if the caller
  // actually owns the report and it's still in 'submitted' status.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { data: report, error: updateError } = await supabase
    .from("item_reports")
    .update({ status: "claimed" })
    .eq("id", reportId)
    .eq("reporter_id", user.id)
    .select("id, category, description, report_type")
    .single();

  if (updateError || !report) {
    return NextResponse.json({ error: updateError?.message ?? "Update failed" }, { status: 400 });
  }

  // Everything below is best-effort notification — a failure here should
  // never undo the claim itself, which already succeeded above.
  const admin = createAdminClient();

  // Resolve any pending match involving this report — students can't
  // update match_suggestions directly (admin-only by RLS), so this part
  // needs the service-role client.
  const { data: resolvedMatches } = await admin
    .from("match_suggestions")
    .update({ status: "pursued" })
    .or(`lost_report_id.eq.${reportId},found_report_id.eq.${reportId}`)
    .eq("status", "pending")
    .select("id, lost_report_id, found_report_id");

  // Find the matched counterpart's reporter (either a match resolved just
  // now, or one already confirmed earlier via clash resolution) so we can
  // notify them specifically that the item's been claimed.
  const { data: existingMatch } = await admin
    .from("match_suggestions")
    .select("lost_report_id, found_report_id")
    .or(`lost_report_id.eq.${reportId},found_report_id.eq.${reportId}`)
    .eq("status", "pursued")
    .limit(1)
    .maybeSingle();

  const counterpartReportId =
    existingMatch?.lost_report_id === reportId
      ? existingMatch?.found_report_id
      : existingMatch?.lost_report_id;

  if (counterpartReportId) {
    const { data: counterpart } = await admin
      .from("item_reports")
      .select("reporter_id")
      .eq("id", counterpartReportId)
      .single();

    if (counterpart?.reporter_id && counterpart.reporter_id !== user.id) {
      await admin.from("notifications").insert({
        recipient_id: counterpart.reporter_id,
        notification_type: "item_claimed",
        related_report_id: reportId,
        related_user_id: user.id,
        message: `The other party marked your matched ${report.category} report as claimed — the handoff is complete.`,
      });
    }
  }

  // Notify every administrator too, for oversight.
  const { data: admins } = await admin.from("users").select("id").eq("role", "administrator");
  for (const a of admins ?? []) {
    await admin.from("notifications").insert({
      recipient_id: a.id,
      notification_type: "item_claimed",
      related_report_id: reportId,
      related_user_id: user.id,
      message: `Report CF-${reportId.slice(0, 8)} (${report.category}) was marked claimed.`,
    });
  }

  return NextResponse.json({ claimed: true });
}
