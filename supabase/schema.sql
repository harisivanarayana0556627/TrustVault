-- TrustVault schema. Run in Supabase SQL Editor on a fresh project.
create extension if not exists pgcrypto;
create type public.app_role as enum ('admin','owner','viewer');
create type public.doc_permission as enum ('read','edit');
create type public.audit_outcome as enum ('success','denied','failure');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text not null default '',
  role public.app_role not null default 'viewer',
  created_at timestamptz not null default now()
);
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 180),
  category text not null check (char_length(category) between 1 and 60),
  owner_id uuid not null references public.profiles(id),
  storage_path text not null unique,
  mime_type text not null check (mime_type in ('application/pdf','text/plain','image/png','image/jpeg')),
  size_bytes bigint not null check (size_bytes between 1 and 10485760),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.document_permissions (
  document_id uuid not null references public.documents(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  permission public.doc_permission not null,
  granted_by uuid not null references public.profiles(id),
  granted_at timestamptz not null default now(),
  primary key(document_id,user_id)
);
create table public.audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id),
  action text not null,
  document_id uuid,
  outcome public.audit_outcome not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  previous_hash text,
  event_hash text not null
);
create index documents_owner_created_idx on public.documents(owner_id,created_at desc);
create index documents_name_idx on public.documents using gin(to_tsvector('simple',name));
create index permissions_user_idx on public.document_permissions(user_id,document_id);
create index audit_created_idx on public.audit_events(created_at desc);
create index audit_document_idx on public.audit_events(document_id,created_at desc);

-- Keep profile email/role changes out of the user's direct write permissions.
alter table public.profiles enable row level security;
alter table public.documents enable row level security;
alter table public.document_permissions enable row level security;
alter table public.audit_events enable row level security;
create policy "users read own profile" on public.profiles for select to authenticated using (id=auth.uid());
-- SECURITY DEFINER helpers avoid recursive RLS when documents and grants refer to each other.
create or replace function public.has_document_grant(p_document_id uuid,p_user_id uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from public.document_permissions p where p.document_id=p_document_id and p.user_id=p_user_id)
$$;
create or replace function public.is_document_owner(p_document_id uuid,p_user_id uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from public.documents d where d.id=p_document_id and d.owner_id=p_user_id)
$$;
revoke all on function public.has_document_grant(uuid,uuid) from public,anon;
revoke all on function public.is_document_owner(uuid,uuid) from public,anon;
grant execute on function public.has_document_grant(uuid,uuid) to authenticated,service_role;
grant execute on function public.is_document_owner(uuid,uuid) to authenticated,service_role;
create policy "owners see their documents" on public.documents for select to authenticated using (owner_id=auth.uid());
create policy "grantees see explicitly shared documents" on public.documents for select to authenticated using (public.has_document_grant(id,auth.uid()));
create policy "owners create their documents" on public.documents for insert to authenticated with check (owner_id=auth.uid() and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='owner'));
create policy "owners update their documents" on public.documents for update to authenticated using (owner_id=auth.uid() and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='owner')) with check (owner_id=auth.uid());
create policy "owners delete their documents" on public.documents for delete to authenticated using (owner_id=auth.uid() and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='owner'));
create policy "users read their own grants" on public.document_permissions for select to authenticated using (user_id=auth.uid() or public.is_document_owner(document_id,auth.uid()));
create policy "owners grant permissions for their docs" on public.document_permissions for insert to authenticated with check (public.is_document_owner(document_id,auth.uid()) and granted_by=auth.uid());
create policy "owners update permissions for their docs" on public.document_permissions for update to authenticated using (public.is_document_owner(document_id,auth.uid())) with check (public.is_document_owner(document_id,auth.uid()));
create policy "owners revoke permissions for their docs" on public.document_permissions for delete to authenticated using (public.is_document_owner(document_id,auth.uid()));
create policy "admins read audit" on public.audit_events for select to authenticated using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));
create policy "users read own audit events" on public.audit_events for select to authenticated using (actor_id=auth.uid());
-- No INSERT/UPDATE/DELETE policy for audit_events: clients cannot mutate the evidence directly.

-- Append-only audit RPC. Only service_role may execute it; application server validates identity first.
create or replace function public.append_audit_event(
 p_actor_id uuid, p_action text, p_document_id uuid, p_outcome public.audit_outcome, p_details jsonb default '{}'::jsonb
) returns bigint language plpgsql security definer set search_path=public,pg_temp as $$
declare prior_hash text; new_id bigint; payload text; new_hash text; event_time timestamptz;
begin
 if p_action not in ('document.upload','document.download','document.update','document.delete','permission.grant','permission.revoke','document.read') then
   raise exception 'Unsupported audit action';
 end if;
 -- Serialize hash-chain writers so two simultaneous inserts cannot share a previous hash.
 perform pg_advisory_xact_lock(731942);
 select event_hash into prior_hash from public.audit_events order by id desc limit 1;
 event_time := clock_timestamp();
 payload := jsonb_build_object('actor_id',p_actor_id,'action',p_action,'document_id',p_document_id,'outcome',p_outcome,'details',coalesce(p_details,'{}'::jsonb),'previous_hash',prior_hash,'created_at',event_time)::text;
 new_hash := encode(digest(coalesce(prior_hash,'GENESIS') || '|' || payload,'sha256'),'hex');
 insert into public.audit_events(actor_id,action,document_id,outcome,details,created_at,previous_hash,event_hash)
 values(p_actor_id,p_action,p_document_id,p_outcome,coalesce(p_details,'{}'::jsonb),event_time,prior_hash,new_hash) returning id into new_id;
 return new_id;
end $$;
revoke all on function public.append_audit_event(uuid,text,uuid,public.audit_outcome,jsonb) from public,anon,authenticated;
grant execute on function public.append_audit_event(uuid,text,uuid,public.audit_outcome,jsonb) to service_role;
revoke update,delete,truncate on public.audit_events from anon,authenticated;

-- Private bucket. Never make this bucket public.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('vault-documents','vault-documents',false,10485760,array['application/pdf','text/plain','image/png','image/jpeg'])
on conflict(id) do update set public=false,file_size_limit=10485760,allowed_mime_types=array['application/pdf','text/plain','image/png','image/jpeg'];
-- Storage direct reads are restricted too. API currently uses a server-only service key only after authorization.
create policy "storage owner can read own files" on storage.objects for select to authenticated using (
 bucket_id='vault-documents' and exists(select 1 from public.documents d where d.storage_path=name and d.owner_id=auth.uid())
);
create policy "storage grantee can read granted files" on storage.objects for select to authenticated using (
 bucket_id='vault-documents' and exists(select 1 from public.documents d join public.document_permissions p on p.document_id=d.id where d.storage_path=name and p.user_id=auth.uid())
);
-- Inserts/deletes are done only by the controlled server route using service_role; no client write policy.

-- Create demo users in Supabase Auth first, then set roles in profiles with the actual UUIDs.
-- Example after creating users in Authentication > Users:
-- insert into public.profiles(id,email,display_name,role) values
-- ('OWNER_UUID','owner@trustvault.demo','Olivia Owner','owner'),
-- ('VIEWER_UUID','viewer@trustvault.demo','Victor Viewer','viewer'),
-- ('ADMIN_UUID','admin@trustvault.demo','Avery Admin','admin');
