import {db} from '@/lib/server';
import {NextResponse} from 'next/server';
export async function GET(request:Request){const url=new URL(request.url);const code=url.searchParams.get('code');if(code){const client=await db();const {error}=await client.auth.exchangeCodeForSession(code);if(!error)return NextResponse.redirect(new URL('/',url.origin))}return NextResponse.redirect(new URL('/?auth=failed',url.origin))}
