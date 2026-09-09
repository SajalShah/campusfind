import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://campusfind-sand.vercel.app";

export async function POST(request: Request) {
  const { matchId, body } = await request.json();
  if (!matchId || !body) {
    return NextResponse.json({ error: "matchId and body required" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  // RLS already scopes this to matches the sender is actually part of.
  const { data: match } = await supabase
    .from("match_suggestions")
    .select("lost_report_id, found_report_id")
    .eq("id", matchId)
    .single();

  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  const admin = createAdminClient();

  const [{ data: lostReport }, { data: foundReport }] = await Promise.all([
    admin.from("item_reports").select("reporter_id").eq("id", match.lost_report_id).single(),
    admin.from("item_reports").select("reporter_id").eq("id", match.found_report_id).single(),
  ]);

  const recipientId =
    lostReport?.reporter_id === user.id ? foundReport?.reporter_id : lostReport?.reporter_id;

  if (!recipientId) {
    return NextResponse.json({ sent: false });
  }

  const [{ data: recipient }, { data: sender }] = await Promise.all([
    admin.from("users").select("university_email").eq("id", recipientId).single(),
    admin.from("users").select("full_name").eq("id", user.id).single(),
  ]);

  let emailed = false;
  if (recipient?.university_email) {
    emailed = await sendEmail({
      to: recipient.university_email,
      subject: `CampusFind: new message from ${sender?.full_name ?? "a matched student"}`,
      html: `
        <p><strong>${sender?.full_name ?? "A matched student"}</strong> sent you a message on CampusFind:</p>
        <blockquote style="border-left:3px solid #B5883A; margin:12px 0; padding-left:12px; color:#4A5568;">${body}</blockquote>
        <p><a href="${SITE_URL}/messages/${matchId}">Reply on CampusFind</a></p>
      `,
    });
  }

  await admin.from("notifications").insert({
    recipient_id: recipientId,
    notification_type: "new_message",
    related_report_id: null,
    related_user_id: user.id,
    message: `${sender?.full_name ?? "A matched student"} sent you a message.`,
  });

  return NextResponse.json({ sent: emailed });
}
