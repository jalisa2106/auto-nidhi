-- ============================================================
-- AutoConsultancy ΓÇö Part 4: Financial Ledgers
-- ============================================================

CREATE TABLE payment_in (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id             UUID NOT NULL REFERENCES file_record(id),
    payment_amount      DECIMAL(15,2) NOT NULL,
    paid_amount         DECIMAL(15,2),
    remaining_amount    DECIMAL(15,2),
    round_up            BOOLEAN DEFAULT FALSE,
    payment_mode        payment_mode NOT NULL,
    payment_date        DATE NOT NULL,
    payment_from        payment_from_enum,
    cheque_bank_name    VARCHAR(255),
    branch_name         VARCHAR(255),
    cheque_no           VARCHAR(50),
    cheque_date         DATE,
    cheque_amount       DECIMAL(15,2),
    utr_no              VARCHAR(100),
    company_bank_id     UUID REFERENCES master_company_bank(id),
    remarks             TEXT
);

CREATE TABLE payment_out (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id             UUID NOT NULL REFERENCES file_record(id),
    amount              DECIMAL(15,2) NOT NULL,
    payment_mode        payment_mode NOT NULL,
    payment_date        DATE NOT NULL,
    payment_to          payment_to_enum,
    payee_dealer_id     UUID REFERENCES master_dealer(id),
    payee_broker_id     UUID REFERENCES master_broker(id),
    bank_account_no     VARCHAR(50),
    ifsc_code           VARCHAR(20),
    cheque_bank_name    VARCHAR(255),
    branch_name         VARCHAR(255),
    cheque_no           VARCHAR(50),
    cheque_date         DATE,
    cheque_amount       DECIMAL(15,2),
    utr_no              VARCHAR(100),
    remarks             TEXT
);

CREATE TABLE commission_in (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id             UUID NOT NULL REFERENCES file_record(id),
    payment_by          VARCHAR(100),
    amount              DECIMAL(15,2) NOT NULL,
    payment_date        DATE NOT NULL,
    company_bank_id     UUID REFERENCES master_company_bank(id),
    remarks             TEXT
);

CREATE TABLE commission_out (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id             UUID NOT NULL REFERENCES file_record(id),
    payee_type          payee_type_enum NOT NULL,
    payee_dealer_id     UUID REFERENCES master_dealer(id),
    payee_broker_id     UUID REFERENCES master_broker(id),
    amount              DECIMAL(15,2) NOT NULL,
    payment_mode        payment_mode NOT NULL,
    payment_date        DATE NOT NULL,
    is_advance          BOOLEAN DEFAULT FALSE,
    bank_account_no     VARCHAR(50),
    ifsc_code           VARCHAR(20),
    cheque_bank_name    VARCHAR(255),
    branch_name         VARCHAR(255),
    cheque_no           VARCHAR(50),
    cheque_date         DATE,
    cheque_amount       DECIMAL(15,2),
    utr_no              VARCHAR(100),
    remarks             TEXT
);

CREATE TABLE rto_payment (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id             UUID NOT NULL REFERENCES file_record(id),
    payment_date        DATE NOT NULL,
    payment_mode        payment_mode NOT NULL,
    payee_dealer_id     UUID REFERENCES master_dealer(id),
    payee_broker_id     UUID REFERENCES master_broker(id),
    amount              DECIMAL(15,2) NOT NULL,
    bank_account_no     VARCHAR(50),
    ifsc_code           VARCHAR(20),
    cheque_bank_name    VARCHAR(255),
    branch_name         VARCHAR(255),
    cheque_no           VARCHAR(50),
    cheque_date         DATE,
    cheque_amount       DECIMAL(15,2),
    utr_no              VARCHAR(100),
    remarks             TEXT
);

CREATE TABLE insurance_payment (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id             UUID NOT NULL REFERENCES file_record(id),
    payment_date        DATE NOT NULL,
    payment_mode        payment_mode NOT NULL,
    payee_dealer_id     UUID REFERENCES master_dealer(id),
    payee_broker_id     UUID REFERENCES master_broker(id),
    amount              DECIMAL(15,2) NOT NULL,
    bank_account_no     VARCHAR(50),
    ifsc_code           VARCHAR(20),
    cheque_bank_name    VARCHAR(255),
    branch_name         VARCHAR(255),
    cheque_no           VARCHAR(50),
    cheque_date         DATE,
    cheque_amount       DECIMAL(15,2),
    utr_no              VARCHAR(100),
    remarks             TEXT
);

CREATE TABLE expense_ledger (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_category_id UUID NOT NULL REFERENCES master_expense_category(id),
    amount              DECIMAL(15,2) NOT NULL,
    expense_date        DATE NOT NULL,
    remarks             TEXT
);

-- Operational Tracking (Retained from Original)
CREATE TABLE advances (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    party_type          party_type NOT NULL,
    party_id            UUID NOT NULL,
    advance_date        DATE NOT NULL,
    amount              DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    mode                payment_mode NOT NULL,
    utr_cheque_number   VARCHAR(50),
    purpose             VARCHAR(500),
    file_id             UUID REFERENCES file_record(id),
    recovery_status     recovery_status NOT NULL DEFAULT 'pending',
    amount_recovered    DECIMAL(15,2) NOT NULL DEFAULT 0,
    remarks             TEXT,
    created_by          UUID NOT NULL REFERENCES system_user(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notifications (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES system_user(id),
    notification_type   notification_type NOT NULL,
    message             TEXT NOT NULL,
    file_id             UUID REFERENCES file_record(id),
    is_read             BOOLEAN NOT NULL DEFAULT FALSE,
    read_at             TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_logs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID REFERENCES system_user(id),
    action      VARCHAR(50) NOT NULL,
    table_name  VARCHAR(100) NOT NULL,
    record_id   UUID,
    old_values  JSONB,
    new_values  JSONB,
    ip_address  INET,
    user_agent  VARCHAR(500),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
