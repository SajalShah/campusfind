// SERVER-ONLY. Sends transactional email via Resend's HTTP API directly —
// no extra npm dependency needed. Uses RESEND_API_KEY, which must never be
// exposed to the browser (no NEXT_PUBLIC_ prefix).

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFY_FROM_EMAIL ?? "CampusFind <onboarding@resend.dev>";

  if (!apiKey) {
    console.warn("RESEND_API_KEY not set — skipping email send.");
    return false;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: params.to, subject: params.subject, html: params.html }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
