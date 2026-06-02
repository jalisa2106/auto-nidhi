-- Migration 018: Add status column to payment_in and payment_out
-- Safe: DEFAULT 'completed' means all existing records are treated as completed
-- Status values: 'pending' | 'completed'

ALTER TABLE payment_in
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'completed';

ALTER TABLE payment_out
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'completed';
