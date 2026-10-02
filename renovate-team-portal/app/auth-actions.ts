'use server';
import {cookies,headers} from 'next/headers';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {database} from '@/lib/database.mjs';
import {username,verifyPassword,newToken,digest,limited,issuePasswordLink,consumePasswordLink,hashPassword} from '@/lib/auth-core.mjs';
import {SESSION_COOKIE,authenticatedMember,administrator} from '@/lib/auth';
export type AuthState={error:string;success?:string;link?:string};
function clean(f:FormData,k:string,max=200){return String(f.get(k)||'').trim().slice(0,max);}
export async function login(_:AuthState,form:FormData):Promise<AuthState>{
 const db=database();let name;try{name=username(form.get('username'));}catch{name='invalid';}
 const password=String(form.get('password')||'');
 if(limited(db,'global-login',Date.now(),120,60000))return {error:'Please wait a minute and try again.'};
 if(limited(db,'login:'+name))return {error:'Too many attempts. Try again in 15 minutes.'};
 const row=db.prepare("SELECT c.*,m.role FROM credentials c JOIN members m ON m.id=c.member_id WHERE c.username=? COLLATE NOCASE").get(name);
 const correct=await verifyPassword(password,row?.password_hash);
 if(!correct||!row||!['admin','employee'].includes(row.role))return {error:'Username or password is incorrect.'};
 const token=newToken(),expires=Date.now()+8*60*60*1000;
 db.transaction(()=>{db.prepare('DELETE FROM sessions WHERE expires_at<=?').run(Date.now());db.prepare('INSERT INTO sessions VALUES (?,?,?)').run(digest(token),row.member_id,expires);db.prepare('DELETE FROM login_limits WHERE key=?').run('login:'+name);})();
 (await cookies()).set(SESSION_COOKIE,token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',expires:new Date(expires)});
 redirect('/');
}
export async function logout(){const token=(await cookies()).get(SESSION_COOKIE)?.value;if(token)database().prepare('DELETE FROM sessions WHERE digest=?').run(digest(token));(await cookies()).delete(SESSION_COOKIE);redirect('/login');}
export async function setPassword(_:AuthState,form:FormData):Promise<AuthState>{
 try {const token=clean(form,'token',100);if(limited(database(),'setup:'+digest(token)))throw Error('Too many attempts. Try again in 15 minutes.');
 const password=String(form.get('password')||'');if(password!==String(form.get('confirm')||''))throw Error('Passwords do not match.');await consumePasswordLink(database(),token,password);return {error:'',success:'Password saved. Sign in with your username and new password.'};}catch(e){return {error:e instanceof Error?e.message:'Unable to set password.'};}
}
export async function changePassword(_:AuthState,form:FormData):Promise<AuthState>{
 try{const m=await authenticatedMember();if(!m)throw Error('Sign in first.');const db=database();if(limited(db,'change:'+m.id))throw Error('Too many attempts. Try again in 15 minutes.');const row=db.prepare('SELECT password_hash FROM credentials WHERE member_id=?').get(m.id);
 if(!await verifyPassword(String(form.get('current')||''),row?.password_hash))throw Error('Current password is incorrect.');const password=String(form.get('password')||'');if(password!==String(form.get('confirm')||''))throw Error('Passwords do not match.');const hash=await hashPassword(password);
 db.transaction(()=>{db.prepare('UPDATE credentials SET password_hash=? WHERE member_id=?').run(hash,m.id);db.prepare('DELETE FROM sessions WHERE member_id=?').run(m.id);db.prepare('DELETE FROM password_links WHERE member_id=?').run(m.id)})();(await cookies()).delete(SESSION_COOKIE);return {error:'',success:'Password changed. Sign in again.'};}catch(e){return {error:e instanceof Error?e.message:'Unable to change password.'};}
}
export async function createAccount(_:AuthState,form:FormData):Promise<AuthState>{
 try{await administrator();const db=database();const name=clean(form,'name',150),email=clean(form,'email').toLowerCase(),user=username(form.get('username'));if(!name||!/^\S+@\S+\.\S+$/.test(email))throw Error('Enter a name and valid email.');
 const id=crypto.randomUUID();db.transaction(()=>{if(db.prepare('SELECT id FROM members WHERE lower(email)=?').get(email))throw Error('That email already has an account. Use its password setup option.');db.prepare('INSERT INTO members(id,name,email,role,created_at) VALUES (?,?,?,?,?)').run(id,name,email,'employee',Date.now());db.prepare('INSERT INTO credentials(member_id,username) VALUES (?,?)').run(id,user)})();const token=issuePasswordLink(db,id);revalidatePath('/');return {error:'',link:'/set-password#'+token,success:'Account created. Send the setup link privately; it expires in one hour.'};}catch(e){return {error:e instanceof Error&&e.message.includes('UNIQUE')?'That username is already in use.':e instanceof Error?e.message:'Unable to create account.'};}
}
export async function resetAccount(_:AuthState,form:FormData):Promise<AuthState>{
 try{const admin=await administrator(),db=database(),id=clean(form,'id',100);if(id===admin.id)throw Error('Use My account to change your own password.');const member=db.prepare("SELECT id FROM members WHERE id=? AND role='employee'").get(id);if(!member)throw Error('Enable this account first.');
 const chosen=username(form.get('username'));db.prepare('INSERT INTO credentials(member_id,username) VALUES (?,?) ON CONFLICT(member_id) DO UPDATE SET username=excluded.username').run(id,chosen);
 const token=issuePasswordLink(db,id);revalidatePath('/');return {error:'',link:'/set-password#'+token,success:'Send this link privately after verifying the team member’s identity. It expires in one hour.'};}catch(e){return {error:e instanceof Error&&e.message.includes('UNIQUE')?'That username is already in use.':e instanceof Error?e.message:'Unable to issue link.'};}
}
export async function toggleAccount(form:FormData){const admin=await administrator(),id=clean(form,'id',100);if(id===admin.id)throw Error('Cannot disable your own account.');const db=database();db.transaction(()=>{const row=db.prepare('SELECT role FROM members WHERE id=?').get(id);if(!row||row.role==='admin')throw Error('Invalid account.');db.prepare('UPDATE members SET role=? WHERE id=?').run(row.role==='employee'?'disabled':'employee',id);db.prepare('DELETE FROM sessions WHERE member_id=?').run(id);db.prepare('DELETE FROM password_links WHERE member_id=?').run(id)})();revalidatePath('/');}
