# GulfBridge Overseas

A responsive, bilingual (English/Malayalam) recruitment information website built with React, Vite, TypeScript, Tailwind CSS, React Router and Supabase. The project intentionally contains no real vacancies, contact details, partner claims, testimonials or placement statistics.

## Requirements

- Node.js 20.19+ or 22.12+
- npm
- A Supabase project for live submissions and administrator features

## Run locally

```sh
code .
npm install
cp .env.example .env.local
npm run dev
```

Run these commands in the VS Code terminal from the project folder. Open the local URL printed by Vite. Without Supabase settings, the public pages run in a no-data mode; application, enquiry and administrator submission features remain disabled. The site does not invent demo vacancies.

To compile the production frontend:

```sh
npm run build
npm run preview
```

## Supabase setup

1. Create a Supabase project and copy its project URL and public anon/publishable key into `.env.local`:

   ```dotenv
   VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_PUBLISHABLE_KEY
   VITE_BUSINESS_EMAIL=gulfbridgeoverseas.careers@gmail.com
   VITE_BUSINESS_PHONE=
   VITE_WHATSAPP_URL=
   VITE_INSTAGRAM_URL=
   VITE_BUSINESS_ADDRESS=
   VITE_RECRUITMENT_PARTNER_PUBLIC_DETAILS=
   ```

   These `VITE_` values are public browser configuration; only set contact or partner details approved for public disclosure.    A publishable key is intended for browser use and depends on RLS for data protection. Never put a service-role key in a `VITE_` variable or frontend file. This is a Vite app, so its browser variables use the `VITE_` prefix rather than Next.js's `NEXT_PUBLIC_` prefix.

2. Apply the database migration using the Supabase CLI:

   ```sh
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase db push
   ```

3. Configure and deploy the public-submission Edge Function. The Supabase service-role key is read only by the server-side Edge Function and must never be exposed to the frontend. `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided to deployed Supabase functions; configure a long random salt and the production/local origin allow-list:

   ```sh
   npx supabase secrets set RATE_LIMIT_SALT="REPLACE_WITH_A_LONG_RANDOM_SECRET" ALLOWED_ORIGINS="http://localhost:5173,https://YOUR_DOMAIN"
   npx supabase functions deploy public-submission
   ```

   Generate a random salt with `openssl rand -hex 32`. Set the generated value using the Supabase dashboard or CLI; do not commit it. The endpoint accepts up to five application/enquiry submissions per IP hash per minute. The database stores only the salted hash, not the source IP. Schedule routine deletion of old rows in `public_submission_rate_limits` (for example, rows older than a day) using a trusted maintenance job; do not grant public access to this table.

4. Securely provision the first administrator:

   ```sql
   insert into public.admin_users (user_id)
   select id
   from auth.users
   where lower(email) = lower('admin@example.com')
   on conflict (user_id) do nothing;
   ```

   First create or invite the intended person from Supabase Dashboard → Authentication → Users, using a unique administrator mailbox and a strong password; verify the email if required. Then run the SQL above in the Supabase SQL Editor, replacing the example email. Confirm the user is present in `public.admin_users`. This table has RLS enabled and no browser-role privileges. The `is_admin()` security-definer function checks the signed-in Auth UUID against this database-controlled allowlist, and every dashboard data operation is protected by RLS. Do not authorize anyone by changing `profiles.role`, user metadata, or frontend code. Remove an administrator by deleting their `admin_users` row in the SQL Editor.

   Disable public sign-ups in Supabase Auth unless there is a deliberate, separately secured account-provisioning process. Ordinary Auth registrations receive only a candidate profile; they cannot view or change the admin allowlist or add themselves to it. Never put a Supabase service-role/secret key in the frontend or a `VITE_` variable.

5. Create a vacancy in the admin area as a draft. Record employer/legal verification details in the private verification panel. Before publication, confirm the lawful disclosure status, set the vacancy's verification status to `Verified`, and then set publication status to `Published`. The database rejects a published job that is not verified. Only publish information confirmed by authorized sources.

## Database and privacy notes

- `public.jobs` contains only public vacancy fields. Employer legal names, partner registration information and private verification notes are in `public.employer_verifications`, which is admin-only under RLS.
- Public users can read published vacancies only. Applications, enquiries, profiles, admin allowlist records, employer verification records and audit logs are not publicly readable.
- Application/enquiry creation happens through the `public-submission` Edge Function. It validates consent, applies rate limits, and calls server-only database functions; direct table inserts and public RPC execution are not granted.
- A unique `(job_id, email)` constraint prevents duplicate applications to a vacancy.
- Applicant form submissions do not accept attachments or request passport scans/medical records.
- The `audit_logs` table records administrative changes to jobs, applications, enquiries and employer verification records without copying submitted content into the logs.
- Administrators can permanently delete applications and enquiries from their dashboards; each deletion leaves a minimal audit entry. Respond to verified privacy/deletion requests through this authorized workflow and set a business-approved retention schedule before launch. No retention period is invented by this template.
- Records and database policies require review against the business's actual legal basis, retention/deletion schedule, authorized partner arrangement and applicable law before launch.

## Routes

- `/`, `/jobs`, `/jobs/:slug`, `/apply/:jobId`
- `/about`, `/how-it-works`, `/safety`, `/contact`
- `/privacy`, `/terms`
- `/admin/login`, `/admin`, `/admin/jobs`, `/admin/applications`, `/admin/enquiries`

Important public content has separate English and Malayalam dictionaries in `src/i18n/`. Legal copy is a launch placeholder and must be reviewed and finalized by a qualified professional before publication.

## GitHub and Vercel deployment

Initialize the source repository and publish it to a GitHub repository:

```sh
git init
git add .
git commit -m "Build GulfBridge Overseas website"
git branch -M main
git remote add origin https://github.com/YOUR_ACCOUNT/YOUR_REPOSITORY.git
git push -u origin main
```

In Vercel, import the GitHub repository, use the Vite preset, and add the same `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` and genuine optional contact variables in Project Settings → Environment Variables. Deploy only after the Supabase migration, function, origins and policies have been configured. Add the final site origin to the Edge Function `ALLOWED_ORIGINS` secret and redeploy the function after changing it. Do not add the service-role key to Vercel frontend environment variables.

The included `vercel.json` rewrites direct route requests to the Vite entry point for React Router.

## Pre-launch checklist

- [ ] Obtain legal review of privacy notice, terms, consent language, retention and deletion process.
- [ ] Confirm the registered recruitment partner arrangement and lawful employer disclosure for every vacancy.
- [ ] Configure only genuine, monitored business contact channels and social profile links.
- [ ] Apply migrations to a non-production Supabase project first; verify RLS using anonymous, candidate and administrator test accounts.
- [ ] Test duplicate submissions, rate limiting, expired/paused jobs, denied admin access and deletion/retention handling.
- [ ] Verify no private applicant/employer/audit data is readable with the anon key.
- [ ] Review administrator account security, password/MFA policy, backups and incident response.
- [ ] Test language switching, Malayalam text rendering, keyboard navigation and mobile layouts.
- [ ] Run `npm run build` and inspect the deployed routes and browser console.
- [ ] Keep applicant documents disabled until a lawful, secure document-handling process exists.

## Current implementation boundary

Stage 1 (bilingual responsive frontend) is implemented and build-checked. Source for Stages 2–5 (Supabase schema, public queries, application Edge Function, administrator authentication and data management) is included but has not been exercised against a configured Supabase project. Stage 6 (security testing and production deployment) remains to be completed. This workspace has no Supabase URL/keys, real vacancy data, authorized business contact details or production deployment configuration. Do not claim live integration or production readiness until the checklist has passed in the actual environment.
