// Supabase Edge Function: notify
// Deploy with: supabase functions deploy notify
// Secrets required (set with `supabase secrets set`):
//   RESEND_API_KEY, NOTIFY_FROM_EMAIL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Called by the database trigger in 002_audit_and_storage.sql whenever a
// report or match is created. Looks up who to email, sends it via Resend,
// then marks the audit_log row as sent.

import { createClient } from "jsr:@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM_EMAIL = Deno.env.get("NOTIFY_FROM_EMAIL") ?? "CampusFind <notifications@resend.dev>";

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req) => {
  try {
    const { action, entity_type, entity_id } = await req.json();

    let toEmail: string | null = null;
    let subject = "";
    let bodyHtml = "";

    if (entity_type === "item_reports") {
      const { data: report } = await supabaseAdmin
        .from("item_reports")
        .select("id, type, category, description, user_id, users(email)")
        .eq("id", entity_id)
        .single();

      toEmail = (report as any)?.users?.email ?? null;
      subject = `CampusFind: your ${report?.type} report was logged`;
      bodyHtml = `
        <p>This confirms your ${report?.type} report (ref CF-${report?.id?.slice(0, 8)}) was logged on CampusFind.</p>
        <p><strong>Category:</strong> ${report?.category}<br/>
        <strong>Description:</strong> ${report?.description}</p>
        <p>Keep this email as a timestamped record.</p>
      `;
    }

    if (entity_type === "match_suggestions") {
      const { data: match } = await supabaseAdmin
        .from("match_suggestions")
        .select(
          "id, total_score, lost_report_id, found_report_id, item_reports!match_suggestions_lost_report_id_fkey(user_id, users(email))"
        )
        .eq("id", entity_id)
        .single();

      toEmail = (match as any)?.item_reports?.users?.email ?? null;
      subject = "CampusFind: a possible match was found";
      bodyHtml = `
        <p>A possible match (score ${match?.total_score}/100) was found for your report.</p>
        <p>An admin will review and confirm it before you're put in touch with the finder.</p>
      `;
    }

    if (!toEmail) {
      return new Response(JSON.stringify({ skipped: "no recipient" }), { status: 200 });
    }

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: toEmail,
        subject,
        html: bodyHtml,
      }),
    });

    const sent = emailRes.ok;

    await supabaseAdmin
      .from("audit_log")
      .update({ email_sent: sent })
      .eq("entity_id", entity_id)
      .eq("action", action);

    return new Response(JSON.stringify({ sent }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
