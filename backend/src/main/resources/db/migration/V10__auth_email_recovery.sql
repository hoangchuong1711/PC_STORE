ALTER TABLE users ADD COLUMN auth_version BIGINT NOT NULL DEFAULT 0;

CREATE TABLE password_reset_challenges (
    user_id INTEGER PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    otp_hash VARCHAR(255),
    otp_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
    token_hash VARCHAR(64),
    token_expires_at TIMESTAMP WITH TIME ZONE,
    auth_version BIGINT NOT NULL
);

-- Hashed email/IP buckets; atomic upsert serializes concurrent requests across replicas.
CREATE TABLE auth_rate_limits (
    bucket_key VARCHAR(64) PRIMARY KEY,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    request_count INTEGER NOT NULL CHECK (request_count > 0)
);
CREATE INDEX ix_auth_rate_limits_expiry ON auth_rate_limits(expires_at);
