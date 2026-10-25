import { createAdminClient } from '@/lib/supabase-admin';
export type AuditInput = {
  actorId: string; action: string; documentId?: string | null;
  outcome: 'success' | 'denied' | 'failure'; details?: Record<string, unknown>;
};
/** Called only by server routes after obtaining actorId from Supabase auth.getUser(). */
export async function writeAudit(input: AuditInput) {
  const admin = createAdminClient();
  const { error } = await admin.rpc('append_audit_event', {
    p_actor_id: input.actorId,
    p_action: input.action,
    p_document_id: input.documentId ?? null,
    p_outcome: input.outcome,
    p_details: input.details ?? {}
  });
  if (error) throw new Error(`Audit write failed: ${error.message}`);
}
