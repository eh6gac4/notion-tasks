CREATE TABLE passkeys (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  public_key TEXT NOT NULL,
  counter INTEGER NOT NULL DEFAULT 0,
  transports TEXT NOT NULL DEFAULT '[]',
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX passkeys_username ON passkeys(username);

-- Cookie にはランダムな ID のみを置く。検証時の DELETE RETURNING で再利用を防ぐ。
CREATE TABLE passkey_challenges (
  id TEXT PRIMARY KEY,
  challenge TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('register', 'authenticate')),
  username TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX passkey_challenges_expiry ON passkey_challenges(expires_at);
