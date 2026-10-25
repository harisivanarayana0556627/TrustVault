# TrustVault final handoff checklist

## Local setup
1. Keep your existing `.env.local` on your machine. It must contain `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and server-only `SUPABASE_SERVICE_ROLE_KEY`.
2. Install dependencies with `npm ci`.
3. For a fresh Supabase project, run `supabase/schema.sql` once. For an already configured project with the `digest` error, run `supabase/fix-audit-digest.sql` in Supabase SQL Editor.
4. Start with `npm run dev`; run `npm run lint`, `npx tsc --noEmit`, and `npm run build`.

## Security integration tests
1. Copy `.env.test.example` to `.env.test.local`.
2. Fill all six variables with real values: Supabase URL, anon key, owner access token, ungranted viewer access token, private document UUID, and exact storage path.
3. Use a document owned by User A and not granted to User B. Tokens expire; refresh them if needed.
4. Run `npm test`. A skipped test is not a passing test. The tests must execute (not skip) and pass before claiming cross-user isolation is verified.
5. Never commit `.env.local`, `.env.test.local`, service-role keys, passwords, or JWTs.

## Before submission
- Verify upload, search, grant, revoke, download, delete, audit entries, role restrictions, and invalid-file handling in the running app.
- Deploy only after setting server-side environment variables in the host and testing the deployed app.
- Update `PROMPTS.md` with actual work and real commit links; do not fabricate evidence.
- Follow the placement cell's instructions about public/private repository visibility.
- This is a prototype; see `THREATS.md` and README known limitations. Do not claim production certification.
