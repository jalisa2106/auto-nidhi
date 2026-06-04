-- Migration 020: Add password_reset_tokens table
-- Stores password reset tokens in the DB so they survive server restarts
-- and Render free-tier cold starts.

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    token      VARCHAR(128)  PRIMARY KEY,
    email      VARCHAR(255)  NOT NULL,
    expires_at TIMESTAMP     NOT NULL,
    created_at TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prt_email      ON password_reset_tokens (email);
CREATE INDEX IF NOT EXISTS idx_prt_expires_at ON password_reset_tokens (expires_at);
