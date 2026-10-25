import type { SupabaseClient, User } from '@supabase/supabase-js';
export type Role = 'admin' | 'owner' | 'viewer';
export type Permission = 'read' | 'edit';
export type AccessDecision = { allowed: boolean; reason: string; role?: Role };

/** The authenticated user's identity must come from Supabase, never from request JSON. */
export async function getIdentity(db: SupabaseClient): Promise<{ user: User; role: Role } | null> {
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user) return null;
  const { data: profile, error: profileError } = await db.from('profiles').select('role').eq('id', user.id).single();
  if (profileError || !profile || !['admin','owner','viewer'].includes(profile.role)) return null;
  return { user, role: profile.role as Role };
}

/** Admin can inspect the activity console, but is NOT a universal document reader. */
export async function decideDocumentAccess(
  db: SupabaseClient, userId: string, role: Role,
  doc: { owner_id: string; id: string }, permission: Permission
): Promise<AccessDecision> {
  if (role === 'owner' && doc.owner_id === userId) return { allowed: true, reason: 'owner', role };
  const { data: grant, error } = await db.from('document_permissions')
    .select('permission').eq('document_id', doc.id).eq('user_id', userId).maybeSingle();
  if (error) return { allowed: false, reason: 'permission_lookup_failed' };
  const allowed = permission === 'read'
    ? grant?.permission === 'read' || grant?.permission === 'edit'
    : grant?.permission === 'edit';
  return { allowed, reason: allowed ? 'explicit_grant' : 'no_matching_grant', role };
}
