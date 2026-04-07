---
title: "The Test Quarantine Pattern: How to Isolate Flaky Tests Without Ignoring Them"
description: "Learn the test quarantine pattern for isolating flaky tests from your CI pipeline without disabling them. Discover quarantine workflows, automated detection, re-qualification processes, and dashboard integration strategies."
date: "2026-04-07"
slug: "test-quarantine-pattern"
keywords:
  - test quarantine
  - quarantine flaky tests
  - test quarantine pattern
  - isolate flaky tests
  - flaky test management
  - CI flaky tests
  - test quarantine workflow
  - quarantine dashboard
  - test reliability
  - flaky test detection
author: "Pramod Dutta"
---

# The Test Quarantine Pattern: How to Isolate Flaky Tests Without Ignoring Them

Every engineering team eventually faces the same dilemma with flaky tests. You have a test that fails intermittently. It is not catching real bugs. It is blocking deployments. The temptation is to skip it, delete it, or add `@pytest.mark.skip` and move on. But skipping a test means losing the coverage it provides. Deleting it means losing the validation it performs. And adding a skip marker means it will never be looked at again.

The test quarantine pattern offers a third option. Instead of deleting flaky tests or letting them block your pipeline, you move them to a quarantine. Quarantined tests still run. Their results are still recorded. But they do not block deployments or mark builds as failed. This gives your team breathing room to investigate and fix the underlying flakiness without sacrificing CI velocity.

This guide covers everything you need to implement the test quarantine pattern: the workflow, the tooling, the CI integration, and the cultural practices that make it work.

## Why Traditional Approaches to Flaky Tests Fail

Before diving into quarantine, it is worth understanding why the common alternatives do not work.

### Skip and Forget

The most common approach to flaky tests is `@skip` or `@ignore`. The test is marked as skipped, the pipeline goes green, and everyone moves on. The problem is that "skip" is permanent in practice. Nobody schedules time to revisit skipped tests. The skip marker accumulates. Six months later, you have 50 skipped tests and no idea which ones are still relevant.

Skipped tests also provide zero information. They do not run, so you do not know if the underlying flakiness has been fixed. You do not know if the code they covered has changed. You are flying blind.

### Delete the Test

Deleting a flaky test solves the immediate CI problem but creates a coverage gap. The test existed for a reason. It was testing a specific behavior, a specific integration, or a specific edge case. Deleting it means that behavior is no longer validated. If a regression is introduced in that area, you will not catch it until it reaches production.

### Retry Until Green

Some teams configure their CI to retry failed tests automatically. If a test fails, rerun it. If it passes on retry, treat it as passing. This approach masks flakiness rather than addressing it. It also slows down CI because every flaky failure adds a retry cycle. Worse, it normalizes unreliable tests. When retries become routine, teams stop investigating failures, and real bugs slip through.

### The Real Problem

All of these approaches share a fundamental flaw: they treat flaky tests as a nuisance to be worked around rather than a signal to be acted on. The quarantine pattern is different because it treats flaky tests as a managed backlog with visibility, ownership, and a resolution process.

## What Is the Test Quarantine Pattern?

The test quarantine pattern is a systematic approach to managing flaky tests that separates the "should this test block the pipeline?" question from the "should this test run?" question.

A quarantined test:
- **Still runs** in every CI build
- **Still reports** its pass/fail result
- **Does not block** the pipeline if it fails
- **Is tracked** in a dashboard or backlog
- **Has an owner** responsible for fixing it
- **Has a deadline** for resolution
- **Is automatically re-qualified** when it demonstrates stability

The quarantine is not a graveyard. It is an ICU. Tests go in when they are sick, they are monitored and treated, and they come out when they are healthy.

## Implementing the Quarantine Workflow

### Step 1: Detection - Identifying Flaky Tests

The first step is identifying which tests are flaky. A test is flaky if it produces inconsistent results across multiple runs without any changes to the test code or the application code.

**Manual detection** works for small teams. A developer notices a test that keeps failing in CI. They check the recent commits and confirm that no relevant code has changed. They run the test locally and it passes. They conclude the test is flaky.

**Automated detection** is essential for larger teams. Automated detection analyzes test results across multiple CI runs and flags tests with inconsistent outcomes. This is exactly what DeFlaky does. DeFlaky ingests your test results, tracks pass/fail history for every test, and flags tests that exhibit flakiness above a configurable threshold.

```bash
# DeFlaky automated detection
deflaky detect --threshold 0.95 --window 7d

# Output:
# FLAKY: test_api.py::test_create_order (92% pass rate, 12/13 runs)
# FLAKY: test_search.py::test_fuzzy_match (88% pass rate, 7/8 runs)
# FLAKY: test_auth.py::test_token_refresh (95% pass rate, 19/20 runs)
```

The detection threshold is important. A threshold of 95% means any test with a pass rate below 95% over the detection window is flagged as flaky. Adjust this based on your team's tolerance. A stricter threshold catches more flaky tests but may generate more noise.

### Step 2: Quarantine - Isolating the Flaky Test

Once a test is identified as flaky, it enters quarantine. The implementation depends on your test framework and CI system, but the core mechanism is marking the test so that its failure does not block the pipeline.

**Marker-based quarantine (pytest):**

```python
# conftest.py
import pytest

def pytest_configure(config):
    config.addinivalue_line(
        "markers", "quarantine: mark test as quarantined (flaky)"
    )

# Use in tests
@pytest.mark.quarantine(reason="Flaky due to race condition in event handler",
                         owner="alice", deadline="2026-04-21")
def test_event_processing():
    # This test still runs but won't block the pipeline
    pass
```

**Configuration-based quarantine:**

Instead of marking individual tests, maintain a quarantine list in a configuration file. This keeps quarantine metadata out of the test code and makes it easier to manage centrally.

```yaml
# quarantine.yml
quarantined_tests:
  - id: "test_api.py::test_create_order"
    reason: "Intermittent timeout in CI, passes locally"
    owner: "alice"
    quarantined_date: "2026-04-01"
    deadline: "2026-04-15"
    jira_ticket: "QA-1234"

  - id: "test_search.py::test_fuzzy_match"
    reason: "Elasticsearch indexing delay causes assertion failure"
    owner: "bob"
    quarantined_date: "2026-04-03"
    deadline: "2026-04-17"
    jira_ticket: "QA-1235"
```

**CI-level quarantine:**

Some CI systems allow you to mark specific test failures as non-blocking. This is the simplest approach but provides the least visibility.

```yaml
# GitHub Actions example
- name: Run tests
  run: pytest --junitxml=results.xml

- name: Check results (excluding quarantined)
  run: |
    deflaky filter-results results.xml \
      --quarantine quarantine.yml \
      --output filtered-results.xml
    # Fail the build only if non-quarantined tests failed
    deflaky check filtered-results.xml --fail-on-error
```

### Step 3: Investigation - Finding the Root Cause

A quarantined test should be investigated promptly. The quarantine buys time, but it should not buy indefinite procrastination.

**Reproduce the failure.** Run the test many times locally with `pytest-repeat` and `pytest-randomly`. If the test is consistently passing locally but failing in CI, the problem is likely environmental: different timing, different resources, different network conditions.

```bash
# Try to reproduce locally
pytest tests/test_api.py::test_create_order --count=100 -x

# Try with random ordering
pytest tests/ --randomly-seed=random --count=10 -x
```

**Check the failure pattern.** Look at the historical failures in DeFlaky's dashboard. Is the test always failing with the same error? Does it fail at specific times of day? Does it fail only on certain CI runners? Patterns reveal root causes.

**Analyze timing.** If the test involves waiting for asynchronous operations, the failure might be a timing issue. Compare the test's execution time between passing and failing runs.

**Check for shared state.** If the test only fails when other specific tests run before it, there is a state dependency. Use `pytest-randomly` to identify which test is polluting the state.

### Step 4: Fix - Resolving the Flakiness

Fixing a flaky test means addressing the root cause, not papering over the symptom. Common fixes include:

- **Adding proper waits** for asynchronous operations instead of fixed sleeps
- **Improving fixture isolation** by using function-scoped fixtures instead of shared ones
- **Adding retry logic** for genuine transient failures (network timeouts, rate limits)
- **Freezing time** for tests that depend on the current date or time
- **Using test containers** for tests that depend on external services
- **Fixing the application code** when the flakiness reveals a real concurrency or race condition bug

### Step 5: Re-Qualification - Returning to the Main Suite

A fixed test should not immediately return to the main suite. It needs to demonstrate stability first. This is the re-qualification process.

**Manual re-qualification:** Run the test 50-100 times with `pytest-repeat` and verify that it passes every time. Then remove the quarantine marker and monitor it for a week.

**Automated re-qualification:** DeFlaky can automatically re-qualify tests. Configure a stability threshold (e.g., 100% pass rate over 20 runs) and a stability window (e.g., 7 days). When a quarantined test meets both criteria, DeFlaky marks it for re-qualification.

```bash
# Check quarantine status
deflaky quarantine status

# Output:
# QUARANTINED: test_api.py::test_create_order
#   Pass rate: 100% (last 25 runs)
#   Stable since: 2026-04-05
#   Status: ELIGIBLE FOR RE-QUALIFICATION
#
# QUARANTINED: test_search.py::test_fuzzy_match
#   Pass rate: 94% (last 18 runs)
#   Status: STILL FLAKY - needs investigation
```

## CI Integration Strategies

The quarantine pattern must integrate cleanly with your CI pipeline. There are several approaches, each with different trade-offs.

### Approach 1: Two-Phase Test Run

Run tests in two phases: main tests and quarantined tests. The main tests must all pass for the build to succeed. The quarantined tests run separately and their results are recorded but do not affect the build status.

```yaml
# GitHub Actions
jobs:
  test:
    steps:
      - name: Run main tests
        run: pytest -m "not quarantine" --junitxml=main-results.xml

      - name: Run quarantined tests (non-blocking)
        run: pytest -m "quarantine" --junitxml=quarantine-results.xml || true

      - name: Report quarantine results
        if: always()
        run: deflaky ingest quarantine-results.xml --tag quarantine
```

### Approach 2: Post-Processing Results

Run all tests together but post-process the results to separate quarantined failures from real failures.

```yaml
# GitLab CI
test:
  script:
    - pytest --junitxml=results.xml || true
    - deflaky evaluate results.xml --quarantine quarantine.yml
  artifacts:
    reports:
      junit: results.xml
```

### Approach 3: DeFlaky as CI Gatekeeper

Use DeFlaky as the arbiter of build success. DeFlaky knows which tests are quarantined and evaluates results accordingly.

```yaml
# Jenkins pipeline
stage('Test') {
    steps {
        sh 'pytest --junitxml=results.xml || true'
        sh 'deflaky evaluate results.xml --fail-on-non-quarantine-failures'
    }
}
```

This approach centralizes quarantine management in DeFlaky rather than in CI configuration or test markers. It provides a single source of truth for quarantine status and makes it easy to manage quarantines across multiple CI pipelines.

## Building a Quarantine Dashboard

Visibility is critical for the quarantine pattern to work. Without visibility, quarantined tests are forgotten. A quarantine dashboard provides this visibility.

### Essential Dashboard Metrics

**Quarantine size over time.** Track how many tests are quarantined. If the number is growing, the team is quarantining faster than it is fixing. This is a red flag that needs management attention.

**Quarantine age distribution.** How long have tests been quarantined? Tests that have been quarantined for more than 30 days should trigger an escalation. Either the test should be fixed or it should be formally deleted with documented acceptance of the coverage gap.

**Quarantine resolution rate.** What percentage of quarantined tests are being fixed and re-qualified each sprint? This measures the team's commitment to test reliability.

**Top quarantine contributors.** Which areas of the codebase produce the most flaky tests? This identifies systemic problems that need architectural attention.

**Re-qualification success rate.** What percentage of re-qualified tests stay stable? If tests frequently return to quarantine after re-qualification, the fixes are not addressing the root cause.

### DeFlaky's Quarantine Dashboard

DeFlaky provides a built-in quarantine dashboard that tracks all of these metrics automatically. It integrates with your CI pipeline to ingest test results, tracks quarantine status, and provides visualizations of quarantine health over time.

```bash
# Launch the DeFlaky dashboard
deflaky dashboard --port 8080

# Or view quarantine summary in the terminal
deflaky quarantine summary

# Output:
# Quarantine Summary (2026-04-07)
# ================================
# Total quarantined:     8
# Added this week:       2
# Fixed this week:       3
# Avg quarantine age:    9 days
# Oldest quarantine:     21 days (test_legacy.py::test_migration)
# Ready to re-qualify:   2
```

## Team Ownership and Accountability

The quarantine pattern only works if quarantined tests have owners and deadlines. Without accountability, the quarantine becomes a dump.

### Assigning Ownership

When a test is quarantined, it must be assigned to someone. The owner is responsible for investigating the flakiness, fixing the root cause, and shepherding the test through re-qualification.

Ownership assignment strategies:
- **Code owner**: The person or team that owns the code being tested
- **Last modifier**: The person who last modified the test or the code under test
- **On-call rotation**: The person currently on quality rotation
- **Volunteer**: A team member who picks up the quarantine during sprint planning

### Setting Deadlines

Every quarantined test needs a deadline. A reasonable default is two weeks: one week for investigation and one week for fix verification. If the deadline passes without resolution, the test should be escalated.

### Quarantine Budgets

Set a maximum quarantine size for your team. For example, "no more than 5% of tests can be quarantined at any time." This creates pressure to fix quarantined tests and prevents the quarantine from growing unbounded.

```
Team quarantine budget: 5% of test suite
Total tests:           2,000
Quarantine capacity:   100
Current quarantine:    8
Budget remaining:      92
```

When the quarantine budget is approaching capacity, the team must prioritize fixing quarantined tests before adding new ones. This prevents the quarantine from becoming the new normal.

### Quarantine Review in Sprint Ceremonies

Include quarantine status in your sprint ceremonies:

**Sprint planning:** Review the quarantine backlog. Assign owners to unowned quarantined tests. Include quarantine fixes in the sprint scope.

**Daily standup:** If someone is working on a quarantine fix, mention progress. This keeps quarantine fixes visible and prevents them from being deprioritized.

**Sprint retrospective:** Review quarantine metrics. Is the quarantine growing or shrinking? Are deadlines being met? What systemic issues are causing the most flakiness?

## Advanced Quarantine Patterns

### Automatic Quarantine

Instead of manually quarantining tests, configure DeFlaky to automatically quarantine tests that exceed a flakiness threshold. This ensures that newly flaky tests are caught immediately without requiring manual intervention.

```bash
# Configure automatic quarantine
deflaky config set auto-quarantine.enabled true
deflaky config set auto-quarantine.threshold 0.90  # 90% pass rate
deflaky config set auto-quarantine.window 7d
deflaky config set auto-quarantine.min-runs 5
```

With automatic quarantine, the workflow becomes:
1. A test becomes flaky (passes less than 90% of the time over 7 days)
2. DeFlaky automatically quarantines it
3. DeFlaky creates a ticket or notification
4. The team assigns an owner and fixes the test
5. DeFlaky automatically re-qualifies the test when it demonstrates stability

### Graduated Quarantine

Not all flaky tests are equally flaky. A test that fails 1% of the time is different from a test that fails 50% of the time. Graduated quarantine assigns different severity levels based on the degree of flakiness.

**Level 1 (Warning):** Pass rate between 90-99%. The test is monitored but still blocks the pipeline. The team is notified.

**Level 2 (Quarantine):** Pass rate between 50-90%. The test is quarantined. It runs but does not block. The team must fix it within two weeks.

**Level 3 (Critical):** Pass rate below 50%. The test is quarantined and escalated immediately. It is likely exposing a real problem in the code or the test infrastructure.

### Quarantine for Different Test Types

The quarantine parameters should vary by test type:

**Unit tests** should have a very low flakiness tolerance (99.9% pass rate). Flaky unit tests almost always indicate a bug in the test code.

**Integration tests** can tolerate slightly more flakiness (99% pass rate) because they depend on external systems.

**End-to-end tests** are the most flaky by nature (95% pass rate threshold). They depend on the full stack and are sensitive to timing, rendering, and environmental differences.

```yaml
# quarantine-config.yml
thresholds:
  unit:
    flakiness_threshold: 0.999
    max_quarantine_age: 7d
  integration:
    flakiness_threshold: 0.99
    max_quarantine_age: 14d
  e2e:
    flakiness_threshold: 0.95
    max_quarantine_age: 21d
```

## Common Pitfalls and How to Avoid Them

### Pitfall 1: Quarantine as Permission to Ignore

The biggest risk is that the quarantine becomes a graveyard. Tests go in and never come out. Counter this with strict deadlines, ownership requirements, and quarantine budgets.

### Pitfall 2: Over-Quarantining

Not every test failure is flakiness. Sometimes the test is catching a real, intermittent bug. Before quarantining a test, verify that the failure is not a legitimate defect. Run the test multiple times. Examine the failure message. Check if the failure correlates with specific code changes.

### Pitfall 3: Insufficient Re-Qualification

Re-qualifying a test after one successful run is not enough. The test might just be flaky in the other direction, passing most of the time but still failing occasionally. Require a sustained period of stability (20+ consecutive passes over multiple days) before re-qualification.

### Pitfall 4: No Root Cause Analysis

Quarantine without root cause analysis is just a more organized way of ignoring flaky tests. Every quarantined test should have a documented root cause or at least a hypothesis. "It's flaky" is not a root cause. "It fails when Elasticsearch indexing takes more than 2 seconds, which happens under high CI load" is a root cause.

### Pitfall 5: Quarantine Without Metrics

If you cannot measure your quarantine health, you cannot improve it. Track quarantine size, age, resolution rate, and recidivism (tests that return to quarantine after re-qualification). Without metrics, the quarantine is invisible and therefore unmanageable.

## Measuring the Impact of Quarantine

### Before and After Metrics

Track these metrics before and after implementing quarantine:

**False failure rate:** The percentage of CI builds that fail due to flaky tests rather than real bugs. This should decrease significantly after implementing quarantine.

**Time to deploy:** The average time from merge to deployment. Quarantine reduces this by eliminating flaky-test-induced deployment delays.

**Developer time spent on false failures:** The hours per week that developers spend investigating test failures that turn out to be flaky. This should decrease as quarantined tests are fixed.

**Test suite trust:** Survey your team. Do they trust the test suite? Do they investigate failures or dismiss them as flaky? Trust should increase as the quarantine shrinks and false failures decrease.

### ROI of the Quarantine Pattern

A concrete example: A team of 10 developers has a test suite with a 10% false failure rate. Each false failure costs an average of 30 minutes of developer time to investigate. With 5 CI runs per day, that is 0.5 false failures per day, costing 15 minutes per day, or about 5 hours per month of wasted developer time.

Implementing quarantine reduces the false failure rate to 1%. The time savings is 4.5 hours per month. Over a year, that is 54 hours of developer time saved, roughly 1.5 weeks of a developer's time. And this does not account for the indirect benefits: faster deployments, higher team morale, and fewer incidents caused by developers ignoring test failures.

## Conclusion

The test quarantine pattern is not a silver bullet. It does not fix flaky tests. What it does is create a structured, visible, accountable process for managing them. Instead of the chaos of random test failures blocking deployments, skipped tests accumulating silently, and developers losing trust in the test suite, quarantine provides order.

The key principles are:
1. **Quarantined tests still run.** They are not ignored; they are monitored.
2. **Every quarantined test has an owner.** Someone is responsible for fixing it.
3. **Every quarantined test has a deadline.** It will be fixed or formally deleted.
4. **Re-qualification requires demonstrated stability.** One passing run is not enough.
5. **Quarantine health is measured.** Dashboards and metrics keep the process accountable.

Tools like DeFlaky make quarantine management practical by automating detection, tracking, and re-qualification. But the pattern works even with simple tooling: a YAML file listing quarantined tests, a CI script that filters results, and a team commitment to reviewing the quarantine regularly.

Start small. Quarantine your three most problematic flaky tests. Assign owners. Set deadlines. Fix them. Then expand the process. Within a few sprints, you will have a test suite that your team trusts and a CI pipeline that your team relies on. That is worth more than any number of green builds achieved by ignoring failing tests.
