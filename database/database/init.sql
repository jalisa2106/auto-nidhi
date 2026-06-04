-- ============================================================
-- AutoConsultancy ΓÇö Master Schema Runner
-- Run this file to execute ALL migrations in order
-- Usage: psql -U postgres -d autoconsultancy -f init.sql
-- ============================================================

\echo '=== Step 1: Extensions & Enums ==='
\i 001_extensions_enums.sql

\echo '=== Step 2: Core Tables ==='
\i 002_tables.sql

\echo '=== Step 3: Files & Documents ==='
\i 003_files_documents.sql

\echo '=== Step 4: Financial Tables ==='
\i 004_financial_tables.sql

\echo '=== Step 5: Triggers & Constraints ==='
\i 005_triggers_constraints.sql

\echo '=== Step 6: Indexes ==='
\i 006_indexes.sql

\echo '=== Step 7: Views ==='
\i 007_views.sql

\echo '=== Step 8: Seed Data & Comments ==='
\i 008_seed_comments.sql

\echo '=== Step 9: RTO Soft Delete ==='
\i 009_add_soft_delete_rto.sql

\echo '=== Step 10: Payment Out + Expense Soft Delete ==='
\i 010_add_company_bank_to_out.sql
\i 010_add_soft_delete_expense_ledger.sql

\echo '=== Step 11: Broker Soft Delete + Seed Finance Banks ==='
\i 011_broker_soft_delete.sql
\i 011_seed_finance_banks.sql

\echo '=== Step 12: Insurance + Advances Soft Delete ==='
\i 012_add_soft_delete_insurance.sql
\i 012_advances_soft_delete.sql

\echo '=== Step 13: Dealer Soft Delete ==='
\i 013_dealer_soft_delete.sql

\echo '=== Step 14: Expense Category Soft Delete ==='
\i 014_expense_category_soft_delete.sql

\echo '=== Step 15: User Notification Preferences ==='
\i 015_user_notification_preferences.sql

\echo '=== Step 16: Customer Document Vault ==='
\i 016_customer_documents.sql

\echo '=== Step 17: Financial Soft Delete + Payment Status ==='
\i 017_soft_delete_financials.sql
\i 018_payment_status.sql

\echo '=== Step 18: Modification Requests ==='
\i 019_modification_requests.sql

\echo '=== AutoConsultancy schema setup COMPLETE ==='
