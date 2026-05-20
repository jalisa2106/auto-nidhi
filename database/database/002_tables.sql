-- ============================================================
-- AutoConsultancy ΓÇö Part 2: All Tables (Masters & Users)
-- ============================================================

-- Authentication & Authorization
CREATE TABLE master_role (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_name       VARCHAR(50) NOT NULL UNIQUE,
    description     TEXT
);

CREATE TABLE system_user (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id         UUID REFERENCES master_role(id),
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100),
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    phone_number    VARCHAR(15),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    last_login      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Master Company Profile
CREATE TABLE master_company_profile (
    id                              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name                    VARCHAR(255) NOT NULL,
    address_1                       TEXT NOT NULL,
    address_2                       TEXT,
    mobile_no                       VARCHAR(15) NOT NULL,
    phone_no                        VARCHAR(15),
    country                         VARCHAR(100),
    state                           VARCHAR(100),
    city                            VARCHAR(100),
    pincode                         VARCHAR(20),
    email_address                   VARCHAR(255),
    fax_no                          VARCHAR(50),
    website                         VARCHAR(255),
    contact_person_1                VARCHAR(255),
    contact_person_2                VARCHAR(255),
    tin_no                          VARCHAR(50),
    gst_no                          VARCHAR(50),
    cst_no                          VARCHAR(50),
    pan_no                          VARCHAR(50),
    insurance_expiry_notification   TEXT,
    opening_balance                 DECIMAL(15,2),
    updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Master Reference Tables
CREATE TABLE master_bank (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bank_name       VARCHAR(255) NOT NULL,
    area            VARCHAR(255),
    contact_no      VARCHAR(15)
);

CREATE TABLE master_company_bank (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bank_name       VARCHAR(255) NOT NULL,
    area            VARCHAR(255),
    account_number  VARCHAR(50) NOT NULL UNIQUE,
    ifsc_code       VARCHAR(20) NOT NULL
);

CREATE TABLE master_insurance_company (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name    VARCHAR(255) NOT NULL,
    contact_person  VARCHAR(255),
    mobile_no       VARCHAR(15),
    phone_no        VARCHAR(15)
);

CREATE TABLE master_insurance_type (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    insurance_type_name VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE master_expense_category (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_name    VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE master_dealer (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dealer_name     VARCHAR(255) NOT NULL,
    address         TEXT,
    city            VARCHAR(100),
    phone           VARCHAR(15) UNIQUE,
    email           VARCHAR(255)
);

CREATE TABLE master_broker (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    broker_name     VARCHAR(255) NOT NULL,
    area            VARCHAR(100),
    district        VARCHAR(100),
    phone           VARCHAR(15) UNIQUE
);
