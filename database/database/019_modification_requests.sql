-- Migration 019: Maker-checker modification requests for Admin Review Desk

CREATE TABLE IF NOT EXISTS modification_request (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(255) NOT NULL,
    request_type VARCHAR(30) NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    submitted_by UUID NOT NULL REFERENCES system_user(id),
    reviewed_by UUID NULL REFERENCES system_user(id),
    reviewed_at TIMESTAMPTZ NULL,
    decision_note TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT modification_request_type_check CHECK (request_type IN ('update', 'delete')),
    CONSTRAINT modification_request_status_check CHECK (status IN ('pending', 'approved', 'rejected'))
);

CREATE INDEX IF NOT EXISTS idx_modification_request_status
    ON modification_request(status);

CREATE INDEX IF NOT EXISTS idx_modification_request_submitted_by
    ON modification_request(submitted_by);

CREATE INDEX IF NOT EXISTS idx_modification_request_created_at
    ON modification_request(created_at DESC);
