-- ============================================================
-- AutoConsultancy ΓÇö Part 3: Core Entities & Sub-Modules
-- ============================================================

CREATE TABLE customer (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name   VARCHAR(255) NOT NULL,
    email       VARCHAR(255),
    mobile_1    VARCHAR(15) NOT NULL UNIQUE,
    mobile_2    VARCHAR(15),
    address     TEXT
);

CREATE TABLE file_record (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id         UUID NOT NULL REFERENCES customer(id),
    created_by_user_id  UUID NOT NULL REFERENCES system_user(id),
    file_number         VARCHAR(50) UNIQUE,
    docket_date         DATE,
    service_type        VARCHAR(50),
    reference_dealer_id UUID REFERENCES master_dealer(id),
    reference_broker_id UUID REFERENCES master_broker(id),
    remarks             TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sub-Modules
CREATE TABLE vehicle_info (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id             UUID NOT NULL UNIQUE REFERENCES file_record(id),
    vehicle_model       VARCHAR(255),
    number_of_owners    INT,
    manufacture_year    INT,
    vehicle_number      VARCHAR(20),
    chassis_number      VARCHAR(100),
    engine_number       VARCHAR(100),
    is_inhouse_insurance BOOLEAN DEFAULT FALSE
);

CREATE TABLE finance_info (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id             UUID NOT NULL UNIQUE REFERENCES file_record(id),
    lan_number          VARCHAR(100),
    loan_amount         DECIMAL(15,2),
    no_of_months        INT,
    emi_amount          DECIMAL(15,2),
    bank_id             UUID REFERENCES master_bank(id),
    area                VARCHAR(255),
    fc_sc_gst_amount    DECIMAL(15,2),
    gap_interest        DECIMAL(15,2),
    old_loan_amount     DECIMAL(15,2),
    irr_percentage      DECIMAL(5,2),
    ls_amount           DECIMAL(15,2),
    disbursement_amount DECIMAL(15,2),
    rto_hold_amount     DECIMAL(15,2),
    total_amount        DECIMAL(15,2)
);

CREATE TABLE insurance_info (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id                 UUID NOT NULL UNIQUE REFERENCES file_record(id),
    insurance_company_id    UUID REFERENCES master_insurance_company(id),
    policy_number           VARCHAR(100),
    valid_from              DATE,
    valid_to                DATE,
    idv_amount              DECIMAL(15,2),
    premium_amount          DECIMAL(15,2),
    premium_dealer_id       UUID REFERENCES master_dealer(id),
    premium_broker_id       UUID REFERENCES master_broker(id),
    insurance_transfer_status VARCHAR(50),
    insurance_remarks       TEXT
);

CREATE TABLE rto_info (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id                 UUID NOT NULL UNIQUE REFERENCES file_record(id),
    rto_amount              DECIMAL(15,2),
    screening_report_status VARCHAR(50),
    rto_district            VARCHAR(100),
    rto_dealer_id           UUID REFERENCES master_dealer(id),
    rto_broker_id           UUID REFERENCES master_broker(id),
    permit_number           VARCHAR(100),
    rto_transfer_status     VARCHAR(50),
    has_fitness_certificate BOOLEAN DEFAULT FALSE,
    has_noc                 BOOLEAN DEFAULT FALSE
);

-- Document Management
CREATE TABLE documents (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id             UUID NOT NULL REFERENCES file_record(id),
    document_type       document_type NOT NULL,
    s3_key              VARCHAR(500) NOT NULL,
    original_filename   VARCHAR(300) NOT NULL,
    file_size_bytes     BIGINT,
    mime_type           VARCHAR(100),
    description         TEXT,
    status              document_status NOT NULL DEFAULT 'pending_review',
    uploaded_by         UUID NOT NULL REFERENCES system_user(id),
    uploaded_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verified_at         TIMESTAMPTZ,
    verified_by         UUID REFERENCES system_user(id),
    rejection_reason    TEXT,
    is_deleted          BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_by          UUID REFERENCES system_user(id),
    deleted_at          TIMESTAMPTZ
);
