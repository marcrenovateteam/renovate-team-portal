CREATE TABLE portal_accounts (
 member_id TEXT PRIMARY KEY NOT NULL REFERENCES members(id),
 username TEXT UNIQUE NOT NULL COLLATE NOCASE,
 password_hash TEXT,
 auth_version INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE portal_sessions (
 digest TEXT PRIMARY KEY NOT NULL,
 member_id TEXT NOT NULL REFERENCES members(id),
 auth_version INTEGER NOT NULL,
 expires_at INTEGER NOT NULL
);
CREATE INDEX portal_sessions_member ON portal_sessions(member_id);
CREATE TABLE portal_access_tokens (
 digest TEXT PRIMARY KEY NOT NULL,
 member_id TEXT NOT NULL REFERENCES members(id),
 expires_at INTEGER NOT NULL,
 consumed_at INTEGER
);
CREATE INDEX portal_access_tokens_member ON portal_access_tokens(member_id);
CREATE TABLE portal_auth_limits (key TEXT PRIMARY KEY NOT NULL,hits INTEGER NOT NULL,expires_at INTEGER NOT NULL);
CREATE TABLE portal_auth_audit (id TEXT PRIMARY KEY NOT NULL,actor_id TEXT,target_id TEXT,event TEXT NOT NULL,created_at INTEGER NOT NULL);
