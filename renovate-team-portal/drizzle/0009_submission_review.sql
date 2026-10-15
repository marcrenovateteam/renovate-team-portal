CREATE TABLE IF NOT EXISTS submission_audit (id TEXT PRIMARY KEY, entry_id TEXT NOT NULL, actor_id TEXT NOT NULL, action TEXT NOT NULL, occurred_at INTEGER NOT NULL, details TEXT);
CREATE INDEX IF NOT EXISTS idx_submission_audit_entry ON submission_audit(entry_id);
