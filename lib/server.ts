import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
export async function db() {
 const store = await cookies();
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL, key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!url||!key) throw new Error('Configure Supabase to connect your workspace.');
 return createServerClient(url,key,{cookies:{getAll:()=>store.getAll(),setAll:values=>{try{values.forEach(v=>store.set(v.name,v.value,v.options))}catch{}}}});
}
export async function admin(){const client=await db(); const {data:{user}}=await client.auth.getUser(); if(!user) throw new Error('Sign in to continue.'); const {data,error}=await client.from('profiles').select('is_superadmin').eq('id',user.id).single(); if(error||data?.is_superadmin!==true) throw new Error('Superadmin access required.'); return {client,user};}
