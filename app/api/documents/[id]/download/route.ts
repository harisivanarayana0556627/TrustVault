import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { getIdentity, decideDocumentAccess } from '@/lib/authz';
import { writeAudit } from '@/lib/audit';
export const dynamic='force-dynamic';
export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}){
 const db=await createClient();const identity=await getIdentity(db);if(!identity)return NextResponse.json({error:'Unauthenticated'},{status:401});const {id}=await params;
 const {data:doc}=await db.from('documents').select('id,name,owner_id,storage_path,mime_type').eq('id',id).maybeSingle();
 if(!doc){await writeAudit({actorId:identity.user.id,action:'document.download',documentId:id,outcome:'denied',details:{reason:'not_found_or_not_visible'}});return NextResponse.json({error:'Document not found'},{status:404})}
 const decision=await decideDocumentAccess(db,identity.user.id,identity.role,doc,'read');if(!decision.allowed){await writeAudit({actorId:identity.user.id,action:'document.download',documentId:id,outcome:'denied',details:{reason:decision.reason}});return NextResponse.json({error:'Document not found'},{status:404})}
 const admin=createAdminClient();const {data:file,error}=await admin.storage.from('vault-documents').download(doc.storage_path);if(error||!file){await writeAudit({actorId:identity.user.id,action:'document.download',documentId:id,outcome:'failure',details:{reason:'storage_read_failed'}});return NextResponse.json({error:'Document unavailable'},{status:404})}
 await writeAudit({actorId:identity.user.id,action:'document.download',documentId:id,outcome:'success'});
 return new NextResponse(await file.arrayBuffer(),{headers:{'Content-Type':doc.mime_type,'Content-Disposition':`attachment; filename="${doc.name.replace(/[\r\n"\\]/g,'_')}"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}})
}
