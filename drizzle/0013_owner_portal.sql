ALTER TABLE auth_google_flows ADD COLUMN audience TEXT NOT NULL DEFAULT 'admin';
CREATE TABLE owner_accounts (
 id TEXT PRIMARY KEY NOT NULL,
 google_subject TEXT NOT NULL UNIQUE,
 email TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
CREATE TABLE venue_workspaces (
 id TEXT PRIMARY KEY NOT NULL,
 created_by TEXT NOT NULL,
 data_json TEXT NOT NULL,
 revision INTEGER NOT NULL DEFAULT 1,
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','pending_review','changes_requested','published','rejected')),
 submitted_revision INTEGER,
 review_note TEXT NOT NULL DEFAULT '',
 operation_id TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
CREATE TABLE venue_members (
 venue_id TEXT NOT NULL REFERENCES venue_workspaces(id),
 user_id TEXT NOT NULL,
 PRIMARY KEY(venue_id,user_id)
);
CREATE INDEX venue_members_user ON venue_members(user_id,venue_id);
CREATE TABLE venue_revisions (
 venue_id TEXT NOT NULL REFERENCES venue_workspaces(id),
 revision INTEGER NOT NULL,
 data_json TEXT NOT NULL,
 submitted_by TEXT NOT NULL,
 created_at TEXT NOT NULL,
 PRIMARY KEY(venue_id,revision)
);
CREATE TABLE owner_review_events (
 id TEXT PRIMARY KEY NOT NULL,
 venue_id TEXT NOT NULL REFERENCES venue_workspaces(id),
 revision INTEGER NOT NULL,
 actor_id TEXT NOT NULL,
 decision TEXT NOT NULL,
 note TEXT NOT NULL,
 created_at TEXT NOT NULL
);
CREATE INDEX owner_review_venue ON owner_review_events(venue_id,created_at);
CREATE TABLE venue_owner_invites (
 id TEXT PRIMARY KEY NOT NULL,
 venue_id TEXT NOT NULL REFERENCES venue_workspaces(id),
 email TEXT NOT NULL,
 created_by TEXT NOT NULL,
 verification_note TEXT NOT NULL,
 expires_at INTEGER NOT NULL,
 accepted_by TEXT,
 revoked INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX owner_invite_email ON venue_owner_invites(email,expires_at);
CREATE TABLE owner_portal_photos (
 id TEXT PRIMARY KEY NOT NULL,
 venue_id TEXT NOT NULL REFERENCES venue_workspaces(id),
 uploaded_by TEXT NOT NULL,
 object_key TEXT NOT NULL,
 ready INTEGER NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL
);
