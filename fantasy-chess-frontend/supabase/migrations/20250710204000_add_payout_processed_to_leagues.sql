-- Add payout_processed column to leagues table
ALTER TABLE leagues ADD COLUMN payout_processed boolean NOT NULL DEFAULT false; 