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

  const { error: updateError } = await supabase
    .from("item_reports")
    .update({ status: "claimed" })
    .eq("id", reportId)
    .eq("reporter_id", user.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  // Resolve any pending match involving this report — students can't
  // update match_suggestions directly (admin-only by RLS), so this part
  // needs the service-role client.
  const admin = createAdminClient();
  await admin
    .from("match_suggestions")
    .update({ status: "pursued" })
    .or(`lost_report_id.eq.${reportId},found_report_id.eq.${reportId}`)
    .eq("status", "pending");

  return NextResponse.json({ claimed: true });
}
