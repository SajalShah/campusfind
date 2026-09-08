import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";

type ReportForNotify = { id: string; description: string; reporter_id: string };

/**
 * Notifies both parties of a confirmed match — email (if both have a
 * university_email on file) plus an in-app notification for both,
 * regardless of whether the email actually sent. Also writes the
 * audit_log entry. Used both for routine auto-matches and for matches an
 * admin has just resolved out of a clash.
 */
export async function notifyMatchedParties(
  admin: ReturnType<typeof createAdminClient>,
  lost: ReportForNotify,
  found: ReportForNotify,
  score: number
) {
  const [{ data: lostUser }, { data: foundUser }] = await Promise.all([
    admin.from("users").select("university_email").eq("id", lost.reporter_id).single(),
    admin.from("users").select("university_email").eq("id", found.reporter_id).single(),
  ]);

  const lostEmail = lostUser?.university_email;
  const foundEmail = foundUser?.university_email;

  let emailedLost = false;
  let emailedFound = false;

  if (lostEmail && foundEmail) {
    emailedLost = await sendEmail({
      to: lostEmail,
      subject: "CampusFind: a match was found for your lost item",
      html: `
        <p>Good news — a found item matches your lost report (confidence score ${score}/100).</p>
        <p><strong>Your report:</strong> ${lost.description}</p>
        <p>The person who found it can be reached at: <strong>${foundEmail}</strong></p>
        <p>Reach out directly to arrange the handoff. If anything doesn't add up, contact CampusFind admin with your reference CF-${lost.id.slice(0, 8)}.</p>
      `,
    });
    emailedFound = await sendEmail({
      to: foundEmail,
      subject: "CampusFind: someone may be the owner of the item you found",
      html: `
        <p>A lost item report matches what you found (confidence score ${score}/100).</p>
        <p><strong>What you reported finding:</strong> ${found.description}</p>
        <p>The person who lost it can be reached at: <strong>${lostEmail}</strong></p>
        <p>Reach out directly to arrange the handoff. If anything doesn't add up, contact CampusFind admin with your reference CF-${found.id.slice(0, 8)}.</p>
      `,
    });
  }

  // In-app notifications fire regardless of email success — a missing or
  // undeliverable email should never mean the student hears nothing.
  await admin.from("notifications").insert([
    {
      recipient_id: lost.reporter_id,
      notification_type: "match_found",
      related_report_id: lost.id,
      related_user_id: found.reporter_id,
      message: `A found item matches your lost report (score ${score}/100) — check your email to coordinate.`,
    },
    {
      recipient_id: found.reporter_id,
      notification_type: "match_found",
      related_report_id: found.id,
      related_user_id: lost.reporter_id,
      message: `A lost report matches what you found (score ${score}/100) — check your email to coordinate.`,
    },
  ]);

  await admin.from("audit_log").insert({
    actor_id: null,
    action: "match_notified",
    entity_type: "match_suggestions",
    entity_id: null,
    details: { lost_report_id: lost.id, found_report_id: found.id, score },
    email_sent: emailedLost && emailedFound,
  });
}
