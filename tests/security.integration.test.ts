import { describe,it,expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const userAToken=process.env.TEST_USER_A_JWT;
const userBToken=process.env.TEST_USER_B_JWT;
const docId=process.env.TEST_PRIVATE_DOCUMENT_ID;
const storagePath=process.env.TEST_PRIVATE_STORAGE_PATH;
const configured=Boolean(url&&anon&&userAToken&&userBToken&&docId&&storagePath);
function asUser(token:string){return createClient(url!,anon!,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:`Bearer ${token}`}}})}
describe.skipIf(!configured)('TrustVault cross-user isolation (configure TEST_* vars)',()=>{
 it('does not return another user’s private document metadata',async()=>{const b=asUser(userBToken!);const {data,error}=await b.from('documents').select('id,name,storage_path').eq('id',docId!).maybeSingle();expect(error).toBeNull();expect(data).toBeNull()});
 it('does not let an ungranted user download the private storage object directly',async()=>{const b=asUser(userBToken!);const {data,error}=await b.storage.from('vault-documents').download(storagePath!);expect(data).toBeNull();expect(error).not.toBeNull()});
 it('does not let an ungranted user create a grant on someone else’s document',async()=>{const b=asUser(userBToken!);const {error}=await b.from('document_permissions').insert({document_id:docId!,user_id:'00000000-0000-0000-0000-000000000000',permission:'read',granted_by:'00000000-0000-0000-0000-000000000000'});expect(error).not.toBeNull()});
});
