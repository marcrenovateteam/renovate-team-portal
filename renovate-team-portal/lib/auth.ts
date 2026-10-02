import {cookies} from 'next/headers';
import {database} from './database.mjs';
import {memberForToken} from './auth-core.mjs';
export const SESSION_COOKIE='rt_session';
export async function authenticatedMember(){const token=(await cookies()).get(SESSION_COOKIE)?.value;return memberForToken(database(),token) as {id:string;email:string;name:string;role:string;created_at:number}|null;}
export async function administrator(){const m=await authenticatedMember();if(!m||m.role!=='admin')throw Error('Administrator access required.');return m;}
