import { NextRequest,NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { getIdentity } from '@/lib/authz';
import { writeAudit } from '@/lib/audit';
const Body=z.object({email:z.string().email().max(254),permission:z.enum(['read','edit'])});
export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const db=await createClient();const identity=await getIdentity(db);if(!identity)return NextResponse.json({error:'Unauthenticated'},{status:401});const {id}=await params;
 const {data:doc}=await db.from('documents').select('id,owner_id').eq('id',id).maybeSingle();if(!doc||identity.role!=='owner'||doc.owner_id!==identity.user.id){await writeAudit({actorId:identity.user.id,action:'permission.grant',documentId:id,outcome:'denied'});return NextResponse.json({error:'Not found'},{status:404})}
 const parsed=Body.safeParse(await req.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:'Valid email and permission are required'},{status:400});
 const admin=createAdminClient();const {data:target,error:targetError}=await admin.from('profiles').select('id,email,role').eq('email',parsed.data.email.toLowerCase()).maybeSingle();if(targetError||!target)return NextResponse.json({error:'Recipient must have an existing TrustVault account'},{status:404});if(target.id===identity.user.id)return NextResponse.json({error:'You already own this document'},{status:400});
 const {error}=await admin.from('document_permissions').upsert({document_id:id,user_id:target.id,permission:parsed.data.permission,granted_by:identity.user.id},{onConflict:'document_id,user_id'});if(error)return NextResponse.json({error:'Could not update permission'},{status:500});
 await writeAudit({actorId:identity.user.id,action:'permission.grant',documentId:id,outcome:'success',details:{recipientId:target.id,permission:parsed.data.permission}});return NextResponse.json({ok:true});
}
export async function DELETE(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const db=await createClient();const identity=await getIdentity(db);if(!identity)return NextResponse.json({error:'Unauthenticated'},{status:401});const {id}=await params;const {data:doc}=await db.from('documents').select('id,owner_id').eq('id',id).maybeSingle();if(!doc||identity.role!=='owner'||doc.owner_id!==identity.user.id){await writeAudit({actorId:identity.user.id,action:'permission.revoke',documentId:id,outcome:'denied'});return NextResponse.json({error:'Not found'},{status:404})}
 const targetId=new URL(req.url).searchParams.get('userId');if(!targetId)return NextResponse.json({error:'userId is required'},{status:400});const admin=createAdminClient();const {error}=await admin.from('document_permissions').delete().eq('document_id',id).eq('user_id',targetId);if(error)return NextResponse.json({error:'Could not revoke permission'},{status:500});await writeAudit({actorId:identity.user.id,action:'permission.revoke',documentId:id,outcome:'success',details:{recipientId:targetId}});return NextResponse.json({ok:true});
}
