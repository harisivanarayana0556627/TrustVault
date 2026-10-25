'use client';
import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
export default function LoginPage(){
 const router=useRouter(); const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [error,setError]=useState(''); const [busy,setBusy]=useState(false);
 async function submit(e:FormEvent){e.preventDefault();setBusy(true);setError('');try{const supabase=createClient();const {error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error;router.push('/dashboard');router.refresh();}catch(e){setError(e instanceof Error?e.message:'Sign-in failed');}finally{setBusy(false)}}
 return <main className="login"><Link className="brand" href="/">trust<span style={{color:'var(--accent)'}}>vault</span></Link><div className="panel" style={{marginTop:28}}><div className="eyebrow">SECURE WORKSPACE</div><h1>Welcome back.</h1><p className="muted">Sign in with your assigned demo account.</p><form className="stack" onSubmit={submit}><label className="small muted">Email address<input className="field" style={{width:'100%',marginTop:6}} type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label className="small muted">Password<input className="field" style={{width:'100%',marginTop:6}} type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/></label>{error&&<p className="error" role="alert">{error}</p>}<button className="btn primary" disabled={busy}>{busy?'Signing in…':'Sign in securely'}</button></form></div><p className="foot"><Link href="/">← Back to TrustVault</Link></p></main>
}
