-- Migration: Add risk_tolerance JSONB column to prism_projects
-- Stores project-level TMEL defaults per consequence category for LOPA

ALTER TABLE prism_projects
  ADD COLUMN IF NOT EXISTS risk_tolerance JSONB DEFAULT NULL;

COMMENT ON COLUMN prism_projects.risk_tolerance IS
  'LOPA risk tolerance table: maps ConsequenceCategory to TMEL [yr⁻¹]. Example: {"safety_personnel": 1e-5, "asset": 1e-3}';
