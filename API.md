# API access matrix

All endpoints require a valid Supabase session except `GET /` and `GET /login`.

| Endpoint | Allowed caller | Behavior / authorization |
|---|---|---|
| `POST /api/documents` | `owner` | Validates metadata, file size and MIME allowlist; creates a document owned by the authenticated caller; stores bytes privately; audits upload |
| `GET /api/documents/:id/download` | Owner or explicit `read`/`edit` grantee | Checks current access on every request; unauthorized and unknown IDs both return 404; audits success/denial/failure |
| `POST /api/documents/:id/permissions` | Owner of that exact document | Grants `read` or `edit` to an existing account by email; caller identity comes from session |
| `DELETE /api/documents/:id/permissions?userId=...` | Owner of that exact document | Revokes the named grant; later requests re-check permissions |
| `PATCH /api/documents/:id` | Owner of that exact document | Updates name/category with validation; logs action |
| `DELETE /api/documents/:id` | Owner of that exact document | Deletes private object and metadata; logs outcome |
| `GET /dashboard` | Authenticated user with valid profile | Shows RLS-scoped document list |
| `GET /dashboard/audit` | `admin` | Shows latest 200 audit events; other roles are redirected |
| `POST /rpc/append_audit_event` | `service_role` only | Database RPC; never expose service-role credentials to browsers |

This table describes the current code, not a claim that all behavior has been validated in a deployed environment. Re-test after every change.
