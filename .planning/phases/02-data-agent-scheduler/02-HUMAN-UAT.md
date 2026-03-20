---
status: partial
phase: 02-data-agent-scheduler
source: [02-VERIFICATION.md]
started: 2026-03-20T22:05:00Z
updated: 2026-03-20T22:05:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. End-to-end agent run via live stack
expected: All 85 companies processed; company_id NULL rows appear for any pre-upsert failures; no DB constraint violations
result: [pending]

### 2. Deliberate pre-upsert failure with supabase db reset
expected: AgentRunResult row inserted with company_id=NULL, status=failed, error_message populated — no IntegrityError
result: [pending]

### 3. APScheduler auto-fire at 6:00 AM ET
expected: A new AgentRun row appears at 6:00 AM America/New_York without a manual API call
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
