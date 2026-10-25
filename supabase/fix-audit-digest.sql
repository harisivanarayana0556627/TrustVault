-- Apply to an existing TrustVault database where append_audit_event fails to resolve pgcrypto.digest.
-- Supabase commonly installs pgcrypto in the `extensions` schema. Keep the RPC server-only;
-- this changes only function name resolution and does not grant additional execution privileges.
ALTER FUNCTION public.append_audit_event(
  uuid,
  text,
  uuid,
  public.audit_outcome,
  jsonb
)
SET search_path = public, extensions, pg_temp;
