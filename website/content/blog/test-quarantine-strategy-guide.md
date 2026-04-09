---
title: "The Complete Guide to Test Quarantine Strategies"
description: "Implement a test quarantine system that isolates flaky tests from your CI pipeline without losing visibility. Includes workflow examples and tooling."
date: 2026-04-06
slug: test-quarantine-strategy-guide
keywords:
  - test quarantine strategy
  - quarantine flaky tests
  - test quarantine workflow
  - flaky test isolation
  - CI test quarantine
  - test quarantine pipeline
  - quarantine vs disable
  - test reliability workflow
  - flaky test management system
  - test quarantine automation
author: "DeFlaky Team"
---

# The Complete Guide to Test Quarantine Strategies

Disabling a flaky test is easy. Getting it re-enabled is nearly impossible. Once a test is commented out or skipped, it enters a graveyard of good intentions where it will remain until someone rewrites it from scratch -- which is to say, never.

Test quarantine is the middle path. It isolates a flaky test from your critical CI pipeline so it cannot block deployments, while keeping it running in a separate context so the flakiness remains visible and the test remains exercised. When the root cause is fixed, the test is "un-quarantined" and returned to the main pipeline.

This guide walks you through implementing a complete quarantine system, from the initial decision to quarantine through the re-qualification process.

## Why Quarantine Instead of Skip

Skipping a flaky test (`@pytest.mark.skip`, `test.skip()`, `@Disabled`) removes the test from execution entirely. This has three problems:

1. **No feedback loop.** You stop getting data about whether the test is still flaky, whether the underlying issue has been fixed, or whether the test would catch a real regression.
2. **No accountability pressure.** A skipped test exerts zero pressure on the team to fix it. A quarantined test that keeps running and reporting failures is a constant reminder.
3. **Coverage loss.** The code path that the test covers is now completely unprotected. If a regression is introduced in that code, no test will catch it.

Quarantine solves all three: the test runs, reports results, and provides coverage -- it just does not block the pipeline.

## The Quarantine Workflow

A proper quarantine system has five stages:

### Stage 1: Detection

A test is identified as flaky through automated monitoring or developer report. This is where tools like [DeFlaky](/demo) add the most value -- automated detection is faster and more reliable than waiting for developers to notice and report.

```bash
# DeFlaky identifies tests with high flake rates
deflaky report --threshold 0.05 --format table

# Output:
# Test Name                          | Flake Rate | FlakeScore | Runs
# -----------------------------------|------------|------------|-----
# checkout > processes payment       | 18%        | 34         | 200
# auth > refreshes expired token     | 12%        | 41         | 180
# search > handles pagination        | 7%         | 62         | 165
```

### Stage 2: Triage

Not every flaky test should be quarantined. Triage using these criteria:

**Quarantine if:**
- The flake rate exceeds your threshold (recommended: 5%)
- The root cause is not immediately obvious or fixable
- The flakiness is blocking other developers' work

**Fix immediately if:**
- The root cause is known and the fix is simple (< 30 minutes)
- The test covers a critical business function
- Multiple tests are flaky for the same root cause (fix the cause, not the symptoms)

**Delete if:**
- The test provides no meaningful coverage
- The test is redundant with other tests
- The cost of maintaining the test exceeds its value

### Stage 3: Quarantine Execution

Move the test to a quarantine status. There are several implementation approaches.

**Approach A: Tag-based quarantine (recommended for most teams)**

Add a tag or marker to quarantined tests and filter them in your CI pipeline.

```python
# pytest: Mark with a custom marker
import pytest

@pytest.mark.quarantine(reason="Flaky due to race condition in payment iframe loading", ticket="JIRA-1234")
def test_processes_payment():
    # ... test code unchanged
    pass

# conftest.py: Register the marker
def pytest_configure(config):
    config.addinivalue_line(
        "markers", "quarantine(reason, ticket): mark test as quarantined"
    )
```

```ini
# pytest.ini: Exclude quarantined tests from main run
[pytest]
addopts = -m "not quarantine"
```

```yaml
# CI pipeline: Two jobs
jobs:
  main-tests:
    steps:
      - run: pytest -m "not quarantine" --junitxml=main-results.xml

  quarantine-tests:
    steps:
      - run: pytest -m "quarantine" --junitxml=quarantine-results.xml
        continue-on-error: true  # Don't fail the pipeline
```

**For Jest:**

```javascript
// Tag tests with a naming convention
describe('[QUARANTINE] Payment processing', () => {
  test('processes credit card payment', () => {
    // ... test code
  });
});

// jest.config.js for main pipeline
module.exports = {
  testPathIgnorePatterns: [],
  // Use --testNamePattern to exclude quarantined tests
};
```

```bash
# Main pipeline: exclude quarantined tests
npx jest --testNamePattern="^(?!.*\\[QUARANTINE\\])"

# Quarantine pipeline: run only quarantined tests
npx jest --testNamePattern="\\[QUARANTINE\\]"
```

**For Playwright:**

```typescript
// Tag tests with Playwright's tagging system
import { test, expect } from '@playwright/test';

test('processes payment @quarantine', async ({ page }) => {
  // ... test code
});
```

```bash
# Main pipeline: exclude quarantined tests
npx playwright test --grep-invert "@quarantine"

# Quarantine pipeline
npx playwright test --grep "@quarantine"
```

**Approach B: Directory-based quarantine**

Move quarantined test files to a separate directory.

```
tests/
  main/
    checkout.test.ts
    auth.test.ts
  quarantine/
    payment-iframe.test.ts   # Moved here when quarantined
    token-refresh.test.ts    # Moved here when quarantined
```

```yaml
jobs:
  main-tests:
    steps:
      - run: npx jest tests/main/

  quarantine-tests:
    steps:
      - run: npx jest tests/quarantine/
        continue-on-error: true
```

This approach is more visible (you can see quarantined tests in the file tree) but creates churn in version control.

**Approach C: Configuration-driven quarantine**

Maintain a quarantine list in a configuration file.

```yaml
# quarantine.yml
quarantined_tests:
  - name: "checkout > processes payment"
    reason: "Race condition in payment iframe loading"
    ticket: "JIRA-1234"
    quarantined_date: "2026-04-01"
    owner: "payments-team"

  - name: "auth > refreshes expired token"
    reason: "Intermittent Redis connection timeout"
    ticket: "JIRA-1235"
    quarantined_date: "2026-04-03"
    owner: "auth-team"
```

This is the most metadata-rich approach and works well for larger teams that need ownership tracking and SLA enforcement.

### Stage 4: Monitoring

Quarantined tests must be actively monitored. Without monitoring, quarantine becomes a euphemism for "disabled."

**What to monitor:**
- Is the quarantined test still failing? If it has stopped failing (e.g., because someone fixed the underlying issue), it should be un-quarantined.
- Is the failure rate increasing or decreasing?
- Has the quarantine exceeded its SLA?

```bash
# Weekly quarantine health check
deflaky quarantine report \
  --project my-app \
  --format table

# Output:
# Test                          | Days in Quarantine | Current Flake Rate | Trend
# ------------------------------|--------------------|--------------------|------
# checkout > processes payment  | 7                  | 18%                | stable
# auth > refreshes expired token| 5                  | 2%                 | improving
```

### Stage 5: Re-Qualification

When a fix is applied, the test must be re-qualified before returning to the main pipeline. This means running it many times to verify stability.

```bash
# Re-qualification: run the test 50 times
for i in $(seq 1 50); do
  pytest tests/test_checkout.py::test_processes_payment -x
  if [ $? -ne 0 ]; then
    echo "FAILED on run $i -- test is still flaky"
    exit 1
  fi
done

echo "PASSED 50 consecutive runs -- test is stable"
```

**Automated re-qualification with DeFlaky:**

```bash
# DeFlaky tracks the test's reliability automatically
# When the flake rate drops below the threshold, it suggests un-quarantining
deflaky quarantine check \
  --test "checkout > processes payment" \
  --min-stable-runs 50 \
  --max-flake-rate 0.01
```

After successful re-qualification:

1. Remove the quarantine tag/marker from the test.
2. Remove the retry overrides if any were added.
3. Add a comment explaining the fix.
4. Monitor for one week to confirm stability in production CI.

```python
# After un-quarantining
# Previously quarantined: JIRA-1234
# Fixed by: Adding explicit wait for payment iframe (commit abc123)
# Re-qualified: 50/50 runs passed on 2026-04-06
def test_processes_payment():
    # ... fixed test code
    pass
```

## Quarantine SLAs

Without SLAs, quarantine becomes permanent. Set explicit time limits.

| Severity | Max Quarantine Duration | Escalation |
|----------|------------------------|------------|
| Critical (blocks release) | 3 days | Escalate to engineering manager |
| High (>10% flake rate) | 1 week | Assign to sprint |
| Medium (5-10% flake rate) | 2 weeks | Add to backlog |
| Low (<5% flake rate) | 1 month | Schedule for tech debt sprint |

If a test exceeds its quarantine SLA, escalate. Either the test is fixed, the fix is re-prioritized, or the test is deleted with a documented rationale.

## Common Quarantine Anti-Patterns

### Anti-Pattern 1: Quarantine Without a Ticket

Every quarantined test must have a tracking ticket (Jira, GitHub Issue, Linear, etc.) with an owner and a due date. Without a ticket, there is no accountability.

### Anti-Pattern 2: Quarantine Everything

If more than 10% of your tests are quarantined, you do not have a flaky test problem -- you have a test infrastructure problem. Quarantine should be for individual tests, not for entire suites.

### Anti-Pattern 3: Quarantine Without Running

Some teams "quarantine" tests by skipping them entirely. This is not quarantine -- it is disabling with extra steps. Quarantined tests must continue running in a non-blocking context.

### Anti-Pattern 4: No Re-Qualification Process

If there is no defined process for returning tests to the main pipeline, quarantine is a one-way trip. Define the re-qualification criteria before quarantining.

## Metrics for Your Quarantine System

Track these metrics to ensure your quarantine system is healthy:

- **Quarantine Size**: Number of currently quarantined tests. Should be small and stable.
- **Mean Quarantine Duration**: Average days a test spends in quarantine. Should be trending down.
- **Quarantine Throughput**: Tests entering quarantine per week vs. tests leaving. Inflow should not exceed outflow.
- **Quarantine Violations**: Tests exceeding their quarantine SLA. Should be zero.

The [DeFlaky Dashboard](/demo) tracks these metrics automatically when you push test results with quarantine metadata.

## Conclusion

Test quarantine is the responsible way to handle flaky tests that cannot be fixed immediately. It keeps the test running, maintains coverage, preserves visibility, and creates accountability for fixes -- all while preventing the flaky test from blocking your deployment pipeline.

The key to successful quarantine is discipline: every quarantined test needs a ticket, an owner, an SLA, and a re-qualification process. Without these guardrails, quarantine becomes a graveyard no different from `@skip`.

Implement the tag-based quarantine approach from this guide, set up monitoring with [DeFlaky](/pricing), and enforce your SLAs. Within a month, you will have a quarantine system that keeps your pipeline reliable while ensuring flaky tests get the attention they need.

Check the [docs](/docs) for detailed DeFlaky integration guides for your specific test framework and CI platform.
