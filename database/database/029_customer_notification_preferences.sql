CREATE TABLE IF NOT EXISTS customer_notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
    pref_key VARCHAR(50) NOT NULL,  -- 'file_update', 'payment', 'insurance', 'document', 'general'
    is_enabled BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (customer_id, pref_key)
);