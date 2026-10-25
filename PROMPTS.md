# AI-assisted development log

Keep this file current during development. Do not invent problems, fixes, dates, or commit links. Replace `PENDING` with the actual commit URL after making the corresponding real commit in your own repository.

## 2026-10-25 — Initial architecture and project scaffold
- **Prompt / request:** “Help me build TrustVault for the Snovaysys fresher hiring challenge. Prioritize server-side authorization, private document storage, an append-only audit trail, threat modeling, automated cross-user tests, and deployment before the deadline.”
- **Produced:** Next.js/TypeScript starter, Supabase client helpers, initial document and permission routes, SQL schema, `THREATS.md`, API matrix, and an integration-test template.
- **What I checked / what is wrong or incomplete:** This is a scaffold, not a finished secure system. It has not been run against a real Supabase project yet. The integration tests are skipped until real test credentials and a seeded document are configured. Edit grants do not yet enable document editing; the UI is incomplete; role seed accounts must be created manually. The service-role key bypasses RLS, so every server route using it needs an explicit preceding authorization check.
- **What I will do instead:** Install dependencies, run build/tests, configure a disposable Supabase project, and test owner/viewer/admin behavior before making any security claim.
- **Commit link:** PENDING — add the real commit URL after committing this checkpoint.

## Reusable context / instructions
- Treat every browser value as untrusted. Derive actor identity only from the authenticated Supabase session.
- Deny by default. Permission lookup errors must never result in access.
- Do not use public buckets or long-lived signed URLs for confidential files.
- Keep `SUPABASE_SERVICE_ROLE_KEY` server-only; never use it in a Client Component.
- For each AI-assisted change, record the exact request, output, specific defect found, correction, and real commit link here.
