-- Cloudflare D1. Apply on a fresh DB before enabling community accounts.
CREATE TABLE IF NOT EXISTS users (
 id TEXT PRIMARY KEY,
 email TEXT NOT NULL UNIQUE COLLATE NOCASE,
 handle TEXT NOT NULL UNIQUE COLLATE NOCASE,
 password_hash TEXT NOT NULL,
 password_salt TEXT NOT NULL,
 display_name TEXT NOT NULL,
 role TEXT NOT NULL DEFAULT 'writer',
 bio TEXT NOT NULL DEFAULT '',
 avatar TEXT NOT NULL DEFAULT '',
 banner TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS sessions (
 token_hash TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 expires_at INTEGER NOT NULL,
 created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS public_books (
 id TEXT PRIMARY KEY,
 owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 title TEXT NOT NULL,
 author TEXT NOT NULL,
 description TEXT NOT NULL DEFAULT '',
 category TEXT NOT NULL,
 cover TEXT NOT NULL DEFAULT '',
 content_json TEXT NOT NULL,
 published_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS public_books_owner_idx ON public_books(owner_id, updated_at);
CREATE INDEX IF NOT EXISTS public_books_cat_idx ON public_books(category, published_at);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);
CREATE TABLE IF NOT EXISTS auth_limits (
 key TEXT PRIMARY KEY,
 attempts INTEGER NOT NULL,
 window_start INTEGER NOT NULL
);
