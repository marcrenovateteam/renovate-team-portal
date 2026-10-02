import {randomBytes,scrypt,timingSafeEqual,createHash} from 'node:crypto';
import {promisify} from 'node:util';
const derive=promisify(scrypt);
const options={N:32768,r:8,p:3,maxmem:64*1024*1024};
export const digest=token=>createHash('sha256').update(token).digest('hex');
export const newToken=()=>randomBytes(32).toString('base64url');
export function username(value){const v=String(value||'').trim().toLowerCase();if(!/^[a-z0-9][a-z0-9._-]{2,39}$/.test(v))throw Error('Use 3–40 letters, numbers, dots, hyphens or underscores for the username.');return v;}
export async function hashPassword(password){if(typeof password!=='string'||password.length<12||password.length>128)throw Error('Use a password between 12 and 128 characters.');const salt=randomBytes(16).toString('hex');const hash=await derive(password,salt,64,options);return `scrypt$${salt}$${hash.toString('hex')}`;}
const dummySalt='00000000000000000000000000000000';
export async function verifyPassword(password,stored){
 const parts=typeof stored==='string'?stored.split('$'):[];const valid=parts.length===3&&parts[0]==='scrypt'&&/^[a-f0-9]{32}$/.test(parts[1])&&/^[a-f0-9]{128}$/.test(parts[2]);
 const hash=await derive(typeof password==='string'&&password.length<=128?password:'invalid',valid?parts[1]:dummySalt,64,options);
 return valid&&timingSafeEqual(hash,Buffer.from(parts[2],'hex'));
}
export function limited(db,key,now=Date.now(),max=10,windowMs=15*60*1000){
 db.prepare('DELETE FROM login_limits WHERE reset_at<=?').run(now);
 const row=db.prepare('SELECT * FROM login_limits WHERE key=?').get(key);
 if(row&&row.attempts>=max)return true;
 db.prepare('INSERT INTO login_limits(key,attempts,reset_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=attempts+1').run(key,now+windowMs);return false;
}
export function memberForToken(db,token,now=Date.now()){
 if(!token||!/^[A-Za-z0-9_-]{43}$/.test(token))return null;
 return db.prepare("SELECT m.* FROM members m JOIN sessions s ON s.member_id=m.id JOIN credentials c ON c.member_id=m.id WHERE s.digest=? AND s.expires_at>? AND m.role IN ('employee','admin') AND c.password_hash IS NOT NULL").get(digest(token),now)||null;
}
export function issuePasswordLink(db,memberId){
 const token=newToken();db.transaction(()=>{db.prepare('DELETE FROM password_links WHERE member_id=? OR expires_at<=?').run(memberId,Date.now());db.prepare('INSERT INTO password_links VALUES (?,?,?)').run(digest(token),memberId,Date.now()+60*60*1000)})();return token;
}
export async function consumePasswordLink(db,token,password){
 if(!token||!/^[A-Za-z0-9_-]{43}$/.test(token))throw Error('This link is invalid or expired. Ask Marc for a new link.');
 const eligible=db.prepare("SELECT l.member_id FROM password_links l JOIN members m ON m.id=l.member_id WHERE l.digest=? AND l.expires_at>? AND m.role IN ('employee','admin')").get(digest(token),Date.now());if(!eligible)throw Error('This link is invalid or expired. Ask Marc for a new link.');
 const hash=await hashPassword(password);
 db.transaction(()=>{const row=db.prepare("SELECT l.member_id FROM password_links l JOIN members m ON m.id=l.member_id WHERE l.digest=? AND l.expires_at>? AND m.role IN ('employee','admin')").get(digest(token),Date.now());if(!row)throw Error('This link is invalid or expired. Ask Marc for a new link.');
 db.prepare('UPDATE credentials SET password_hash=? WHERE member_id=?').run(hash,row.member_id);db.prepare('DELETE FROM password_links WHERE member_id=?').run(row.member_id);db.prepare('DELETE FROM sessions WHERE member_id=?').run(row.member_id);})();
}
