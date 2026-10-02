import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const qaDir=fs.mkdtempSync(path.join(os.tmpdir(),'rt-portal-qa-'));
process.env.PORTAL_DATA_DIR=qaDir;
const {database}=await import('../lib/database.mjs');
const {hashPassword,issuePasswordLink}=await import('../lib/auth-core.mjs');
const db=database(),hash=await hashPassword('Test account password 2026');
for(const [id,name,role] of [['qa-admin','Marc','admin'],['qa-alpha','Alpha','employee'],['qa-bravo','Bravo','employee']]){db.prepare('INSERT INTO members(id,name,email,role,created_at) VALUES (?,?,?,?,?)').run(id,name,name.toLowerCase()+'@test.local',role,Date.now());db.prepare('INSERT INTO credentials VALUES (?,?,?)').run(id,name.toLowerCase(),hash);}
db.prepare('INSERT INTO entries(id,owner_id,kind,date,hours,project,status,created_at) VALUES (?,?,?,?,?,?,?,?)').run('alpha-private','qa-alpha','time','2026-09-30',7.5,'Alpha private job','submitted',Date.now());
const fileKey='receipts/qa-alpha/11111111-1111-4111-8111-111111111111';
const filePath=path.join(qaDir,'uploads',fileKey);fs.mkdirSync(path.dirname(filePath),{recursive:true});fs.writeFileSync(filePath,'private receipt fixture');fs.writeFileSync(filePath+'.type','application/pdf');
db.prepare('INSERT INTO entries(id,owner_id,kind,date,amount,file_key,file_name,status,created_at) VALUES (?,?,?,?,?,?,?,?,?)').run('alpha-receipt','qa-alpha','expense','2026-09-30',10,fileKey,'test.pdf','submitted',Date.now());
const setupToken=issuePasswordLink(db,'qa-bravo');
const base='http://127.0.0.1:3101';
const production=process.argv.includes('--production');
if(production){fs.cpSync('public','.next/standalone/public',{recursive:true});fs.cpSync('.next/static','.next/standalone/.next/static',{recursive:true});}
const command=production?['.next/standalone/server.js']:['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port','3101'];
const child=spawn(process.execPath,command,{env:{...process.env,PORTAL_DATA_DIR:qaDir,NODE_ENV:production?'production':'development',PORT:'3101',HOSTNAME:'127.0.0.1'},stdio:['ignore','pipe','pipe']});
child.stderr.on('data',s=>process.stderr.write(s));
const decode=v=>v.replaceAll('&quot;','"').replaceAll('&#x27;',"'").replaceAll('&amp;','&').replaceAll('&lt;','<').replaceAll('&gt;','>');
function form(html,predicate=()=>true){const forms=[...html.matchAll(/<form\b[^>]*>([\s\S]*?)<\/form>/g)].map(m=>m[1]);const f=forms.find(predicate);assert.ok(f,'Expected form rendered');const body=new FormData();for(const m of f.matchAll(/<input\b[^>]*>/g)){const tag=m[0],name=tag.match(/name="([^"]+)"/),value=tag.match(/value="([^"]*)"/);if(name&&tag.includes('type="hidden"'))body.append(decode(name[1]),decode(value?.[1]||''));}return body;}
async function signIn(name){const html=await(await fetch(base+'/login')).text();const body=form(html);body.set('username',name);body.set('password','Test account password 2026');const r=await fetch(base+'/login',{method:'POST',headers:{Origin:base},body,redirect:'manual'});assert.equal(r.status,303,await r.text());const cookie=r.headers.get('set-cookie');assert.ok(cookie?.includes('HttpOnly'));assert.ok(cookie?.includes('SameSite=lax'));if(production)assert.ok(cookie.includes('Secure'));return cookie.split(';')[0];}
try{
 await new Promise((res,rej)=>{child.stdout.on('data',s=>{if(String(s).includes('Ready'))res();});child.on('exit',c=>rej(Error('Server exited '+c)));setTimeout(()=>rej(Error('Timeout starting server')),15000).unref();});
 const anonymous=await fetch(base+'/',{redirect:'manual'});assert.equal(anonymous.status,307);assert.equal(anonymous.headers.get('location'),'/login');
 assert.equal((await fetch(base+'/api/receipt?id=alpha-private')).status,403);
 const a=await signIn('alpha'),b=await signIn('bravo'),admin=await signIn('marc');
 assert.equal((await fetch(base+'/api/receipt?id=alpha-receipt',{headers:{Cookie:a}})).status,200);assert.equal((await fetch(base+'/api/receipt?id=alpha-receipt',{headers:{Cookie:b}})).status,404);assert.equal((await fetch(base+'/api/receipt?id=alpha-receipt',{headers:{Cookie:admin}})).status,200);
 const alpha=await(await fetch(base+'/?view=time',{headers:{Cookie:a}})).text();assert.ok(alpha.includes('Alpha private job'));
 const bravo=await(await fetch(base+'/?view=time',{headers:{Cookie:b}})).text();assert.ok(!bravo.includes('Alpha private job'));
 const forbiddenAdmin=await(await fetch(base+'/?view=admin',{headers:{Cookie:a}})).text();assert.ok(!forbiddenAdmin.includes('Create team member account'));assert.ok(!forbiddenAdmin.includes('bravo@test.local'));
 const adminPage=await(await fetch(base+'/?view=admin',{headers:{Cookie:admin}})).text();assert.ok(adminPage.includes('Alpha private job'));assert.ok(adminPage.includes('Create team member account'));
 const create=form(adminPage,f=>f.includes('name="name"'));create.set('name','New hire');create.set('email','new-hire@test.local');create.set('username','newhire');
 const spoofed=await fetch(base+'/?view=admin',{method:'POST',headers:{Cookie:a,Origin:base},body:create});assert.ok((await spoofed.text()).includes('Administrator access required.'));
 const created=await fetch(base+'/?view=admin',{method:'POST',headers:{Cookie:admin,Origin:base},body:create});assert.ok((await created.text()).includes('Account created.'));
 const html=await(await fetch(base+'/set-password')).text();const setup=form(html);setup.set('token',setupToken);setup.set('password','A brand new long password');setup.set('confirm','A brand new long password');
 const set=await fetch(base+'/set-password',{method:'POST',headers:{Origin:base},body:setup});assert.ok((await set.text()).includes('Password saved.'));
 const expiredSession=await fetch(base+'/?view=time',{headers:{Cookie:b},redirect:'manual'});assert.equal(expiredSession.status,307);
 const again=await fetch(base+'/set-password',{method:'POST',headers:{Origin:base},body:setup});assert.ok((await again.text()).includes('invalid or expired'));
 db.prepare("UPDATE members SET role='disabled' WHERE id='qa-alpha'").run();assert.equal((await fetch(base+'/api/receipt?id=alpha-receipt',{headers:{Cookie:a}})).status,403);db.prepare("UPDATE members SET role='employee' WHERE id='qa-alpha'").run();
 const logoutPage=await(await fetch(base+'/',{headers:{Cookie:a}})).text();const logout=form(logoutPage,f=>f.includes('Sign out'));await fetch(base+'/',{method:'POST',headers:{Origin:base,Cookie:a},body:logout,redirect:'manual'});assert.equal((await fetch(base+'/',{headers:{Cookie:a},redirect:'manual'})).status,307);
 console.log('PASS: real HTTP sign-in, admin account creation, private timesheet and receipt isolation, admin access, one-time password setup, session revocation and logout.');
}finally{child.kill('SIGTERM');db.close();await new Promise(resolve=>child.once('exit',resolve));fs.rmSync(qaDir,{recursive:true,force:true});}
