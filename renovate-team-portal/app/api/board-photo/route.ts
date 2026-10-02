import { NextRequest } from 'next/server';
import {bucket} from '@/lib/storage';
import { eq } from 'drizzle-orm';
import { currentMember } from '@/lib/portal';
import { posts } from '@/db/schema';
import { getDb } from '@/db';
export async function GET(request:NextRequest){
 const m=await currentMember();if(!m||!['employee','admin'].includes(m.role))return new Response('Forbidden',{status:403});
 const id=request.nextUrl.searchParams.get('id')||'';
 const post=await getDb().select({imageKey:posts.imageKey}).from(posts).where(eq(posts.id,id)).get();
 if(!post?.imageKey||!bucket)return new Response('Not found',{status:404});
 const image=await bucket.get(post.imageKey);if(!image)return new Response('Not found',{status:404});
 return new Response(image.body,{headers:{'Content-Type':image.httpMetadata?.contentType||'application/octet-stream','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"}});
}
