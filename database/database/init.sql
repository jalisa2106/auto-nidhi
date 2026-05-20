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

\echo '=== AutoConsultancy schema setup COMPLETE ==='
