import {database} from '../lib/database.mjs';
import {issuePasswordLink,username} from '../lib/auth-core.mjs';
import {readFileSync} from 'node:fs';
const origin=process.env.PORTAL_ORIGIN;if(!origin)throw Error('Set PORTAL_ORIGIN to the actual HTTPS portal address.');
const parsed=new URL(origin);if(parsed.protocol!=='https:'&&parsed.hostname!=='localhost'&&parsed.hostname!=='127.0.0.1')throw Error('HTTPS is required.');
const db=database();const snapshot=JSON.parse(readFileSync('migration/sites-snapshot.json','utf8'));
// Import into an empty destination only. Never overwrite new portal records.
const empty=db.prepare('SELECT count(*) AS n FROM members').get().n===0;
if(empty)db.transaction(()=>{for(const table of snapshot.tables){if(!['members','entries','posts','comments','reactions'].includes(table.table))throw Error('Unknown table');for(const row of table.rows){const columns=Object.keys(row);if(columns.some(k=>!/^\w+$/.test(k)))throw Error('Invalid column');db.prepare(`INSERT INTO ${table.table} (${columns.map(c=>'"'+c+'"').join(',')}) VALUES (${columns.map(()=>'?').join(',')})`).run(...columns.map(c=>row[c]));}}})();
const member=db.prepare("SELECT * FROM members WHERE lower(email)='marc@renovateteam.com' AND role='admin'").get();if(!member)throw Error('Original administrator account missing. Do not create a replacement identity.');
const user=username(process.env.ADMIN_USERNAME||'marc');
const existing=db.prepare('SELECT * FROM credentials WHERE member_id=?').get(member.id);
if(existing?.password_hash&&!process.argv.includes('--recover-admin')){console.log('Administrator already initialized. Use My account for password changes.');process.exit(0);}
db.prepare('INSERT INTO credentials(member_id,username) VALUES (?,?) ON CONFLICT(member_id) DO UPDATE SET username=excluded.username').run(member.id,user);
console.log(`Administrator username: ${user}\nOne-time setup link (expires in one hour): ${parsed.origin}/set-password#${issuePasswordLink(db,member.id)}\nKeep this link private. It is a credential.`);
