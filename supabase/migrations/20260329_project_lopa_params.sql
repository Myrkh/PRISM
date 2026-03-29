-- Migration: Add lopa_params JSONB column to prism_projects
-- Full project LOPA configuration: severity levels G1-G5, frequency levels F1-F5,
-- site-specific IPL templates, and risk tolerance table.
-- Supersedes the earlier risk_tolerance column (kept for backward compat).

ALTER TABLE prism_projects
  ADD COLUMN IF NOT EXISTS lopa_params JSONB DEFAULT NULL;

COMMENT ON COLUMN prism_projects.lopa_params IS
  'Full LOPA project configuration: severityLevels (G1-G5 with TMEL), frequencyLevels (F1-F5), iplTemplates, riskTolerance. See LOPAProjectParams TypeScript type.';
