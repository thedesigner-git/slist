-- Fix schema/ORM mismatch for agent_run_results.company_id nullability.
--
-- AGENT-07: When a company fails before upsert_company() in runner.py,
-- company_id is None. The previous NOT NULL constraint would reject the INSERT,
-- losing the error log row. This migration aligns the DB schema with the ORM
-- model in apps/backend/models/agent_run.py (nullable=True, ondelete="SET NULL").

ALTER TABLE agent_run_results
    DROP CONSTRAINT agent_run_results_company_id_fkey;

ALTER TABLE agent_run_results
    ALTER COLUMN company_id DROP NOT NULL;

ALTER TABLE agent_run_results
    ADD CONSTRAINT agent_run_results_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;
