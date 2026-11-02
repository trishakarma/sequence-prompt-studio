import Studio from './studio';
import { admin } from '@/lib/server';
export const dynamic='force-dynamic';
export default async function Page(){let email='';let message='';try{const {user}=await admin();email=user.email||'Superadmin'}catch(e){message=e instanceof Error?e.message:'Unable to connect.'}return <Studio email={email} message={message}/>}
