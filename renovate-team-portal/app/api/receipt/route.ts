import { NextRequest } from 'next/server';
import {bucket} from '@/lib/storage';
import { eq } from 'drizzle-orm';
import { currentMember } from '@/lib/portal';
import { entries } from '@/db/schema';
import { getDb } from '@/db';
export async function GET(request:NextRequest){const m=await currentMember();if(!m||!['employee','admin'].includes(m.role))return new Response('Forbidden',{status:403});const id=request.nextUrl.searchParams.get('id')||'';const row=await getDb().select().from(entries).where(eq(entries.id,id)).get();if(!row?.fileKey||row.kind!=='expense'||(row.ownerId!==m.id&&m.role!=='admin'))return new Response('Not found',{status:404});if(!bucket)return new Response('Storage unavailable',{status:503});const obj=await bucket.get(row.fileKey);if(!obj)return new Response('Not found',{status:404});return new Response(obj.body,{headers:{'Content-Type':obj.httpMetadata?.contentType||'application/octet-stream','Content-Disposition':`attachment; filename="${(row.fileName||'receipt').replace(/["\\\r\n]/g,'_')}"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}})}
