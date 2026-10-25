# TrustVault threat model

Status: initial working threat model, 25 October 2026. Update this as tests and deployment findings arrive. This is a prototype threat model, not a claim of independent security certification.

## Assets and trust boundaries
- Document bytes in the private `vault-documents` bucket.
- Document metadata, named-user grants, role assignments, and audit records in PostgreSQL.
- Supabase user sessions and server-only service-role secret.
- Trust boundary: browser input is untrusted. Only Supabase `auth.getUser()` establishes the actor; never trust a submitted actor/user ID.

## Threats, mitigations, tests, accepted risk

| Threat | Mitigation in this implementation | Test / verification | Accepted risk or remaining work |
|---|---|---|---|
| IDOR: change a document UUID in a URL | Server download route loads metadata with the caller's RLS-scoped client and checks current per-document access; inaccessible IDs return 404 | `security.integration.test.ts`: another user cannot select metadata; manually test download route with a different account | Test requires configured user JWTs and a real private seed document |
| Direct object-storage URL bypasses the app | Bucket is private; no public URL or signed URL is issued; storage read policies require ownership or an explicit grant | Integration test attempts direct storage download as ungranted user | Verify policies in the deployed Supabase project; never change bucket to public |
| Revoked user reuses an old link | Application does not issue long-lived signed URLs; every download request checks the current grant before using service-role storage access | Grant, download, revoke, repeat download as viewer; repeat must return 404 | A file already downloaded or copied cannot be recalled. This is inherent in file sharing |
| Viewer attempts role escalation | Profile role is not writable by ordinary authenticated clients; role is read from database, not request JSON | Attempt profile update as viewer; expected RLS denial | Supabase project owners/service-role operators remain privileged; secure dashboard access and secrets |
| Viewer changes owner/document ID in grant API | Grant/revoke routes require role `owner` and matching `owner_id` on that exact document | Attempt grant/revoke using another owner's document ID; expected 404 | Additional rate limiting and alerting are not yet implemented |
| Malicious file / oversized upload | Server validates name/category, MIME allowlist, and 10 MB size; bucket also has size and MIME restrictions; original filename is not used as storage path | Test unsupported MIME and >10 MB file | MIME can be spoofed; add magic-byte/content inspection before production |
| Audit record changed by a client | No RLS write policy for audit table; RPC execute is revoked from `anon`/`authenticated`; server uses service-role key only after authentication and authorization | Try INSERT/UPDATE/DELETE on audit table as a normal user; expect denial | Service-role compromise can rewrite data; export/hash-anchor logs to an independent system for stronger evidence |
| Audit hash-chain manipulation | Append RPC serializes writers with an advisory transaction lock and chains each event hash to the previous hash | Independently recompute chain from exported rows and compare hashes | Hash chain alone does not stop a privileged attacker rewriting the whole chain; canonical payload verification and external anchoring are future work |
| Permission lookup/database failure accidentally grants access | Access decision fails closed; query error means deny; protected route returns not found | Simulate permission lookup failure and confirm no file is returned | Ensure production monitoring alerts on repeated errors |
| Cross-user metadata leakage through search | Queries run through user-scoped Supabase client and RLS; filters do not replace authorization | Query list as two accounts and compare visibility | Search currently supports name/category; owner/date filters and pagination are not complete |
| Service-role key exposed to browser | Key is referenced only in `lib/supabase-admin.ts` and server route modules; environment file is ignored | Inspect client bundle and repository history before deploy | Rotate key immediately if ever committed or exposed in build output |
| CSRF/session abuse | Supabase SSR cookie session; sensitive writes use POST/DELETE and server-side auth | Browser testing with authenticated sessions | Add explicit Origin/CSRF checks and security headers before production |
| Race between revocation and download | Each request checks current grants before storage read; no cached signed URL | Revoke then make a fresh request; expect denial | In-flight request that passed authorization before revocation may finish; strict linearizable revocation would need coordinated locking around access and stream initiation |
| Admin is treated as universal reader | Admin role only opens audit console; no blanket document bypass in access helper | Sign in as admin and attempt document download without grant; expected deny | Product policy could later add audited break-glass access, but it is deliberately not implemented |
| Enumeration of valid document IDs | UUIDs plus RLS-scoped queries; inaccessible IDs return same 404 shape | Compare 404 for nonexistent and unauthorized IDs | UUIDs are not an authorization control; rate limiting is future work |

## Permission model

- `admin`: can inspect audit events. Not automatically allowed to read document bytes.
- `owner`: can manage only documents whose `owner_id` equals their authenticated user ID.
- `viewer`: can read a document only with an explicit `read` or `edit` grant.
- `edit` includes read access. Write routes must separately require `edit` or ownership. This starter currently implements metadata update/delete for the owner only; edit grants are not yet wired to content editing.
- No folder inheritance, public links, anonymous access, or expiring signed links.

## Known gaps before production

1. Add API-level integration tests for download, grant, revoke, update, and delete using real authenticated sessions.
2. Audit every mutation and denial; add a verifier script and external append-only log export.
3. Add upload content sniffing, antivirus scanning, rate limiting, CSRF/Origin checks, security headers, pagination, and date/owner filters.
4. Test the exact deployed configuration from an incognito browser and a second account.
5. Deletion currently removes bytes and metadata; retention/recovery/versioning are not implemented.
