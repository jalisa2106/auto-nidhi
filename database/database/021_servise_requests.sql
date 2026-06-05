CREATE TABLE IF NOT EXISTS service_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customer(id) ON DELETE CASCADE,
    request_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    details JSONB DEFAULT '{}',
    remarks TEXT,
    consultant_id UUID REFERENCES system_user(id) ON DELETE SET NULL,
    viewed_by_consultant BOOLEAN DEFAULT FALSE,
    viewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
)