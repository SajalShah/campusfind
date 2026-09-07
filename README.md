# CampusFind — Next.js app

Proper multi-page build, replacing the single-file demo. Built on your
existing Supabase project (`duzybzrpnabciwvnfpqi`), so your data and schema
carry over — nothing to migrate.

## What's new vs the HTML demo

| Feature | Where |
|---|---|
| Email OTP sign-in (passwordless, logged) | `app/login`, `app/verify` |
| Optional photo upload on reports | `app/report`, storage bucket `item-images` |
| Public browse of all lost/found items | `app/browse` |
| Student's own reports | `app/my-reports` |
| Admin match queue | `app/admin` |
| Audit log + email proof trail | `app/admin/audit-log`, `supabase/functions/notify` |

## 1. Local setup

```bash
cp .env.local.example .env.local   # already has your real Supabase URL/anon key
npm install
npm run dev
```

## 2. Database changes (run once, in the Supabase SQL editor)

Run `supabase/migrations/002_audit_and_storage.sql`. It adds the
`audit_log` table, the `item-images` storage bucket, a browse policy so
students can see *all* open reports (not just their own — RLS still keeps
`match_suggestions` and `admin_actions` admin-only), and a trigger that
calls the notify function on every new report or match.

## 3. Turn on Email OTP

Supabase dashboard → **Authentication → Providers → Email** → enable
**"Email OTP"** (not magic link). Under **Authentication → Email
Templates → Confirm signup / Magic Link**, make sure the template includes
`{{ .Token }}` so the email actually shows a 6-digit code.

This is genuinely passwordless MFA-style login (something-you-have via
email), not full multi-factor with an authenticator app. If your professor
specifically wants TOTP-based MFA on top of this, that's a separate
`supabase.auth.mfa.enroll()` flow — flagging it now rather than calling it
done when it isn't.

## 4. Deploy the notify edge function (for the email proof trail)

```bash
supabase functions deploy notify
supabase secrets set RESEND_API_KEY=your_resend_key
supabase secrets set NOTIFY_FROM_EMAIL="CampusFind <notifications@yourdomain>"
```

Then in the SQL editor, point the trigger at your deployed function:

```sql
alter database postgres set app.notify_function_url =
  'https://duzybzrpnabciwvnfpqi.supabase.co/functions/v1/notify';
```

Get a free Resend API key at resend.com — no domain verification needed if
you send from their shared `resend.dev` sending domain for the demo.

## 5. Deploy to Vercel

```bash
git add .
git commit -m "Rebuild as Next.js app: OTP login, browse pages, image upload, audit trail"
git push
```

Import the repo at vercel.com, set the two `NEXT_PUBLIC_*` env vars in
Vercel's project settings, deploy. Your existing GitHub repo
(`SajalShah/campusfind`) can hold this alongside the old demo file, or you
can replace it — your call.

## Known gaps (be upfront about these if asked)

- Email OTP replaces password login entirely; it is not *additional* MFA on
  top of a password. True two-factor (password + authenticator app) is not
  built yet.
- The notify function sends on report creation and match suggestion; it
  does not yet cover "item claimed" — add a third branch in
  `supabase/functions/notify/index.ts` following the same pattern once
  there's a claim-confirmation action in the admin UI.
- The matching engine still uses token-overlap similarity for descriptions,
  not the MiniLM embeddings — same as the demo. Swapping it in is a
  drop-in replacement inside `descriptionScore()` in `lib/matching-engine.ts`.
