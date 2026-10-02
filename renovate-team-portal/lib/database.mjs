import Database from 'better-sqlite3';
import {mkdirSync,readFileSync,readdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
export const dataDir=resolve(/* turbopackIgnore: true */ process.env.PORTAL_DATA_DIR||'data');
let singleton;
/** @returns {any} */
export function database(){
 if(singleton)return singleton;
 mkdirSync(dataDir,{recursive:true,mode:0o700});
 const db=new Database(join(dataDir,'portal.sqlite'));db.pragma('journal_mode = WAL');db.pragma('foreign_keys = ON');db.pragma('busy_timeout = 5000');
 db.exec('CREATE TABLE IF NOT EXISTS portal_migrations (name TEXT PRIMARY KEY)');
 for(const file of readdirSync(resolve('drizzle')).filter(f=>f.endsWith('.sql')).sort()){
  if(db.prepare('SELECT name FROM portal_migrations WHERE name=?').get(file))continue;
  db.transaction(()=>{db.exec(readFileSync(join('drizzle',file),'utf8'));db.prepare('INSERT INTO portal_migrations(name) VALUES (?)').run(file)})();
 }
 db.exec(`CREATE TABLE IF NOT EXISTS credentials (member_id TEXT PRIMARY KEY REFERENCES members(id), username TEXT NOT NULL UNIQUE COLLATE NOCASE, password_hash TEXT);
 CREATE TABLE IF NOT EXISTS sessions (digest TEXT PRIMARY KEY, member_id TEXT NOT NULL REFERENCES members(id), expires_at INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS sessions_member ON sessions(member_id);
 CREATE TABLE IF NOT EXISTS password_links (digest TEXT PRIMARY KEY, member_id TEXT NOT NULL REFERENCES members(id), expires_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS login_limits (key TEXT PRIMARY KEY, attempts INTEGER NOT NULL, reset_at INTEGER NOT NULL);`);
 singleton=db;return db;
}
