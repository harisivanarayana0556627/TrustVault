# TrustVault

Secure document sharing prototype built with Next.js, TypeScript, Supabase Auth, PostgreSQL RLS, and private Supabase Storage.

> **Prototype warning:** Do not upload real confidential data. Security claims must be tested against the deployed project. This starter is intentionally transparent about unfinished areas in `THREATS.md`.

## Features currently scaffolded
- Role profiles: `admin`, `owner`, `viewer`.
- Per-document `read`/`edit` grants and owner-controlled grant/revoke routes.
- Private storage bucket; authenticated download route checks current permission before retrieving bytes.
- Upload validation: PDF/TXT/PNG/JPEG, 10 MB maximum.
- Audit RPC with append-only table permissions and a SHA-256 hash chain.
- Admin audit page, API access matrix, threat model, and cross-user RLS integration test template.

## Requirements
- Node.js 20.9+ (Node 22 recommended)
- A Supabase project
- Git

## Run locally
1. Copy `.env.example` to `.env.local` and fill in Supabase project URL, anon key, and **server-only** service-role key.
2. In Supabase SQL Editor, run `supabase/schema.sql` on a fresh project.
3. In Supabase Authentication, create three users with email/password. Disable public sign-ups after creating demo users.
4. Insert matching profiles using their actual auth user UUIDs in SQL Editor:

```sql
insert into public.profiles(id,email,display_name,role) values
  ('OWNER_AUTH_UUID','owner@your-demo-domain.test','Olivia Owner','owner'),
  ('VIEWER_AUTH_UUID','viewer@your-demo-domain.test','Victor Viewer','viewer'),
  ('ADMIN_AUTH_UUID','admin@your-demo-domain.test','Avery Admin','admin');
```

Use the same email addresses as the auth users. Replace every placeholder; do not copy these example UUID strings literally.
5. Install and run:

```bash
npm install
npm run dev
```

Open http://localhost:3000. Sign in with one of the users created above.

## Database and security setup
- Schema and RLS policies: `supabase/schema.sql`.
- Role and access rules: `lib/authz.ts` and `THREATS.md`.
- API authorization: `API.md` and `app/api/`.
- Keep the storage bucket private. Never commit `.env.local`, and never expose the service-role key in `NEXT_PUBLIC_*` variables.
- For demo seed data, upload a non-sensitive sample file after signing in as the owner, then grant the viewer read access. Use a separate, unrelated document to test denial.

## Tests
```bash
npm test
npm run build
```

The RLS integration tests load `.env.test.local` automatically and are skipped until all six variables below are supplied:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `TEST_USER_A_JWT` (owner's current access token)
- `TEST_USER_B_JWT` (ungranted viewer's current access token)
- `TEST_PRIVATE_DOCUMENT_ID`
- `TEST_PRIVATE_STORAGE_PATH` (normally `<document UUID>/content`)

Use disposable test accounts and non-sensitive files. Never commit JWTs or service credentials. The third test uses the authenticated viewer UUID for both foreign-key fields so a foreign-key failure cannot falsely count as an RLS denial. Run the tests against the same Supabase policies used by the deployed app. If tests are skipped, verify the file is named exactly `.env.test.local` in the project root and contains real values rather than placeholders.

## Deploy
1. Push the repository to the Git host required by the challenge, observing the placement cell's clarification about repository visibility.
2. Import it into Vercel.
3. Configure the three environment variables from `.env.local` in Vercel project settings. `SUPABASE_SERVICE_ROLE_KEY` must be server-only and must never have a `NEXT_PUBLIC_` prefix.
4. Deploy and test login, upload, grant, download, revoke, and denied download from an incognito window.
5. Create safe demo users and document their credentials in the final submission/README only if permitted by the event instructions. Use demo-only passwords and rotate them after evaluation.

## Known limitations
- This is a fast-moving challenge scaffold, not a production-certified document management system.
- Edit grants do not yet permit edits through the UI; only owners can currently update metadata/delete.
- Search currently covers name and category only; owner/date filters and pagination are not finished.
- File MIME is allowlisted but content magic-byte inspection and malware scanning are not implemented.
- The audit hash chain provides tamper evidence, not protection against a compromised service-role key or an attacker who can rewrite all rows. External log anchoring is not implemented.
- Deletion is not recoverable; retention/version history is not implemented.
- Add explicit CSRF/Origin checks, rate limiting, security headers, audit-chain verifier, and full route-level tests before production use.

## AI use and project evidence
- See `PROMPTS.md` for the dated AI-assisted work log. Add entries as you work and link real commits; do not fabricate history.
- See `THREATS.md` for known gaps and verification steps.
