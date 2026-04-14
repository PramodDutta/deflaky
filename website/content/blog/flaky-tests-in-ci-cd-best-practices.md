---
title: "CI/CD Best Practices for Handling Flaky Tests (2026 Guide)"
description: "The definitive 2026 guide to handling flaky tests in CI/CD pipelines. Covers retry policies, test quarantine, parallel execution, test splitting, caching, environment consistency, and artifact collection strategies for reliable continuous integration."
date: "2026-04-13"
slug: "flaky-tests-in-ci-cd-best-practices"
keywords:
  - flaky tests ci cd
  - ci cd testing best practices
  - test reliability ci
  - continuous integration flaky
  - ci pipeline testing
  - flaky test retry ci
  - test quarantine ci cd
  - ci cd test splitting
  - pipeline test reliability
  - ci test stability
author: "Pramod Dutta"
---

# CI/CD Best Practices for Handling Flaky Tests (2026 Guide)

Flaky tests and CI/CD pipelines have a toxic relationship. A test that fails intermittently in a developer's local environment is annoying. The same test failing intermittently in CI blocks deployments, wastes compute resources, and trains your team to distrust the pipeline. When engineers start ignoring CI failures, you have lost one of the most valuable safety nets in software development.

This guide covers the flaky tests ci cd best practices that high-performing engineering teams use in 2026 to maintain reliable pipelines without sacrificing test coverage or developer velocity.

## The True Cost of Flaky Tests in CI/CD

Before diving into solutions, let us quantify the problem. In a typical CI/CD pipeline:

- Each flaky test failure triggers a full pipeline re-run (5-30 minutes of compute)
- A developer context-switches to investigate the failure (10-20 minutes of focus time)
- If the developer cannot immediately identify the failure as flaky, they may spend 30+ minutes debugging
- Other developers waiting on the same pipeline are blocked

For a team running 100 CI builds per day with a 15% flake-induced failure rate, that is 15 wasted builds daily. At 15 minutes per build (compute + investigation), that is nearly 4 hours of engineering time evaporated every single day.

The compounding effect is worse: as flaky test counts grow, developers learn to ignore failures, and real bugs slip through undetected. This is the death spiral that these flaky tests ci cd best practices are designed to prevent.

## Best Practice 1: Intelligent Retry Policies

The simplest defense against flaky tests in CI is automatic retry. But naive retry policies create their own problems. Here is how to implement retry intelligently.

### Test-Level vs. Build-Level Retry

**Build-level retry** re-runs the entire pipeline when any test fails. This is wasteful -- you are re-running hundreds of passing tests to check one failure.

**Test-level retry** re-runs only the failed tests. This is faster and cheaper but requires framework support.

```yaml
# GitHub Actions: Build-level retry (avoid this)
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: nick-fields/retry@v2
        with:
          max_attempts: 3
          command: npm test

# Better: Test-level retry with Jest
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: npx jest --bail=false
      - name: Retry failed tests only
        if: failure()
        run: npx jest --onlyFailures
```

### Configuring Retry Per Framework

**pytest:**

```ini
# pytest.ini
[pytest]
addopts = --reruns 2 --reruns-delay 1
```

**Jest:**

```javascript
// jest.config.js
module.exports = {
  retryTimes: 2,
  retryImmediately: true,
};
```

**TestNG:**

```java
public class RetryAnalyzer implements IRetryAnalyzer {
    private int count = 0;
    private static final int MAX = 2;

    @Override
    public boolean retry(ITestResult result) {
        if (count < MAX) {
            count++;
            return true;
        }
        return false;
    }
}
```

**Playwright:**

```typescript
// playwright.config.ts
export default defineConfig({
  retries: process.env.CI ? 2 : 0, // Only retry in CI
});
```

### The Golden Rule of Retries

Every retry should be logged and tracked. A test that passes on retry is still flaky -- the retry just masked the symptom. Collect retry data, aggregate it, and use it to identify tests that need fixing:

```yaml
# After test run, report retried tests
- name: Report flaky tests
  if: always()
  run: |
    npx deflaky run --report-retries
```

## Best Practice 2: Test Quarantine

Quarantine is the practice of isolating known-flaky tests so they do not block your pipeline while still running them for data collection. This is one of the most impactful flaky tests ci cd best practices you can implement.

### How Quarantine Works

1. A test is identified as flaky (either manually or by automated detection)
2. The test is moved to a quarantine group
3. Quarantined tests still run in CI but their results are non-blocking
4. The test's flake rate continues to be tracked
5. When the root cause is fixed, the test is moved back to the main suite

### Implementation with Test Tags

```python
# pytest: Mark flaky tests
import pytest

@pytest.mark.quarantine
def test_payment_webhook():
    """Quarantined: Flaky due to webhook timing. Ticket: JIRA-1234"""
    result = wait_for_webhook(timeout=5)
    assert result.status == "received"
```

```ini
# pytest.ini: Run quarantined tests separately
[pytest]
markers =
    quarantine: Tests that are known to be flaky
```

```yaml
# CI: Run main tests as blocking, quarantine as non-blocking
jobs:
  main-tests:
    runs-on: ubuntu-latest
    steps:
      - run: pytest -m "not quarantine" --strict-markers

  quarantine-tests:
    runs-on: ubuntu-latest
    continue-on-error: true  # Non-blocking
    steps:
      - run: pytest -m "quarantine"
      - name: Report quarantine results
        if: always()
        run: npx deflaky run --quarantine-report
```

### Quarantine Hygiene

Quarantine without discipline becomes a graveyard. Follow these rules:

- **Every quarantined test must have an associated ticket** with an owner and a deadline
- **Review quarantined tests weekly** -- are they being worked on? Can any be unquarantined?
- **Set a maximum quarantine duration** (e.g., 30 days). If a test is still quarantined after 30 days, escalate or delete it
- **Track quarantine size over time** -- it should trend downward, not upward

## Best Practice 3: Parallel Execution Done Right

Parallel test execution reduces pipeline duration but amplifies flakiness if tests are not properly isolated. Here is how to parallelize safely.

### Choosing the Right Parallelism Level

```yaml
# GitHub Actions: Matrix strategy for parallel test groups
jobs:
  test:
    strategy:
      matrix:
        shard: [1, 2, 3, 4]
    steps:
      - run: npx jest --shard=${{ matrix.shard }}/4
```

### Isolation Requirements for Parallel Tests

Every test running in parallel must have:

- **Its own database** (or at minimum, its own schema/namespace)
- **Its own file system workspace** (no shared temp directories)
- **Its own network ports** (use dynamic port allocation)
- **No reliance on execution order**

```javascript
// Dynamic port allocation for parallel test workers
const getPort = require('get-port');

beforeAll(async () => {
  const port = await getPort();
  server = app.listen(port);
  baseUrl = `http://localhost:${port}`;
});
```

### Database Isolation Strategies

**Strategy 1: Separate database per worker**

```yaml
services:
  db-shard-1:
    image: postgres:15
    environment:
      POSTGRES_DB: test_shard_1
  db-shard-2:
    image: postgres:15
    environment:
      POSTGRES_DB: test_shard_2
```

**Strategy 2: Transaction rollback**

```java
@Transactional
@Rollback
public class UserServiceTest {
    @Test
    public void testCreateUser() {
        // All database changes are rolled back after each test
        userService.create("test@example.com");
        assertEquals(1, userRepository.count());
    }
}
```

**Strategy 3: Schema-per-worker with prefixing**

```python
import os

WORKER_ID = os.environ.get('PYTEST_XDIST_WORKER', 'gw0')
DB_SCHEMA = f"test_{WORKER_ID}"
```

## Best Practice 4: Smart Test Splitting

How you divide tests across parallel workers matters more than how many workers you use. Naive splitting (alphabetical, by file) leads to unbalanced shards where one worker finishes in 2 minutes while another takes 20.

### Timing-Based Splitting

Use historical test timing data to create balanced shards:

```yaml
# CircleCI: Timing-based test splitting
- run:
    command: |
      TESTFILES=$(circleci tests glob "tests/**/*.test.js" | circleci tests split --split-by=timings)
      npx jest $TESTFILES
```

### Failure-Aware Splitting

Separate known-flaky tests from stable tests. Run stable tests as blocking and flaky tests as non-blocking:

```yaml
jobs:
  stable-tests:
    steps:
      - run: npx jest --testPathIgnorePatterns="flaky" --bail

  flaky-tests:
    continue-on-error: true
    steps:
      - run: npx jest --testPathPattern="flaky"
```

### Dependency-Aware Splitting

Some tests share expensive setup (database migrations, service startup). Group these together to avoid duplicating setup costs:

```yaml
# Group tests by their fixture requirements
test-groups:
  database-tests:
    setup: migrate-and-seed
    tests: tests/db/**
  api-tests:
    setup: start-api-server
    tests: tests/api/**
  unit-tests:
    setup: none
    tests: tests/unit/**
```

## Best Practice 5: Caching for Consistency

Inconsistent caching is a subtle but common source of CI flakiness. When your pipeline sometimes uses cached dependencies and sometimes downloads fresh ones, you get different behavior across runs.

### Dependency Caching

```yaml
# GitHub Actions: Deterministic dependency caching
- uses: actions/cache@v4
  with:
    path: |
      node_modules
      ~/.npm
    key: deps-${{ hashFiles('package-lock.json') }}
    restore-keys: |
      deps-
```

**Critical rule**: Always use a lockfile hash as the cache key. Never cache based on branch name or date, as these produce non-deterministic results.

### Build Artifact Caching

```yaml
- uses: actions/cache@v4
  with:
    path: dist
    key: build-${{ hashFiles('src/**', 'package-lock.json') }}
```

### Docker Layer Caching

```yaml
- uses: docker/build-push-action@v5
  with:
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

### What NOT to Cache

- Test databases (they should be fresh each run)
- Test result files from previous runs
- Environment-specific configuration
- Anything that changes between runs intentionally

## Best Practice 6: Environment Consistency

"Works on my machine" is the classic flaky test refrain. The gap between local and CI environments is one of the most common sources of flakiness.

### Containerized CI Environments

Pin every dependency to an exact version:

```dockerfile
# .ci/Dockerfile
FROM node:20.11.1-slim

# Pin system dependencies
RUN apt-get update && apt-get install -y \
    chromium=120.0.6099.224-1 \
    fonts-liberation=1:1.07.4-11 \
    --no-install-recommends

# Set consistent locale and timezone
ENV LANG=C.UTF-8
ENV TZ=UTC
ENV NODE_ENV=test
```

### Environment Variables to Standardize

```yaml
env:
  TZ: UTC
  LANG: C.UTF-8
  LC_ALL: C.UTF-8
  NODE_ENV: test
  CI: true
  # Pin any randomness seeds
  TEST_SEED: ${{ github.run_id }}
  # Disable animations and transitions
  DISABLE_ANIMATIONS: true
```

### Resource Limits

CI containers often have different resource constraints than developer machines. Set explicit limits and design tests to work within them:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    container:
      image: node:20
      options: --memory=4g --cpus=2
```

## Best Practice 7: Artifact Collection for Debugging

When a flaky test fails in CI, you need enough context to diagnose the issue without being able to reproduce it locally. Comprehensive artifact collection is essential.

### What to Collect

```yaml
- name: Upload test artifacts
  if: failure()
  uses: actions/upload-artifact@v4
  with:
    name: test-failure-artifacts
    retention-days: 7
    path: |
      test-results/
      screenshots/
      videos/
      logs/
      traces/
```

### Screenshots and Videos for UI Tests

```typescript
// playwright.config.ts
export default defineConfig({
  use: {
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
});
```

### Structured Logging

Replace console.log with structured logs that include timestamps, test names, and context:

```javascript
const winston = require('winston');

const testLogger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/test-run.log' })
  ]
});

// In your test
testLogger.info('Starting test', {
  testName: 'checkout flow',
  testFile: 'checkout.spec.ts',
  attempt: 1,
  environment: process.env.CI ? 'ci' : 'local'
});
```

### System State Snapshots

Capture system state at the point of failure:

```yaml
- name: Capture system state on failure
  if: failure()
  run: |
    echo "=== Docker containers ===" > system-state.log
    docker ps -a >> system-state.log 2>&1 || true
    echo "=== Port usage ===" >> system-state.log
    ss -tlnp >> system-state.log 2>&1 || true
    echo "=== Disk usage ===" >> system-state.log
    df -h >> system-state.log 2>&1 || true
    echo "=== Memory ===" >> system-state.log
    free -m >> system-state.log 2>&1 || true
```

## Best Practice 8: Pipeline Design Patterns

Beyond individual test fixes, the structure of your CI/CD pipeline itself can reduce or amplify flakiness.

### Fast Feedback First

Structure your pipeline so fast, stable tests run first:

```yaml
jobs:
  lint:
    # 30 seconds, never flaky
    runs-on: ubuntu-latest
    steps:
      - run: npm run lint

  unit-tests:
    # 2 minutes, rarely flaky
    needs: lint
    steps:
      - run: npm run test:unit

  integration-tests:
    # 10 minutes, occasionally flaky
    needs: unit-tests
    steps:
      - run: npm run test:integration

  e2e-tests:
    # 20 minutes, most likely to be flaky
    needs: integration-tests
    steps:
      - run: npm run test:e2e
```

This way, if a unit test fails deterministically, you find out in 2 minutes instead of waiting 30 minutes for the entire pipeline.

### Separate Blocking from Non-Blocking

```yaml
# Required status checks (must pass to merge)
required-checks:
  - lint
  - unit-tests
  - integration-tests

# Optional checks (run but don't block)
optional-checks:
  - e2e-full-suite
  - performance-tests
  - quarantined-tests
```

### Canary Pipelines

Run your full test suite on a schedule (not on every PR) to detect flakiness early:

```yaml
on:
  schedule:
    - cron: '0 */4 * * *'  # Every 4 hours

jobs:
  canary:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        run: [1, 2, 3]  # Run 3 times to detect flakiness
    steps:
      - run: npm test
      - name: Report to DeFlaky
        if: always()
        run: npx deflaky run --canary-report
```

## Putting It All Together

Here is a complete CI configuration that incorporates all of these flaky tests ci cd best practices:

```yaml
name: CI Pipeline
on: [push, pull_request]

env:
  TZ: UTC
  CI: true
  NODE_ENV: test

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/cache@v4
        with:
          path: node_modules
          key: deps-${{ hashFiles('package-lock.json') }}
      - run: npm ci
      - run: npx jest --shard=1/2 --retryTimes=1
      - run: npx jest --shard=2/2 --retryTimes=1

  integration-tests:
    needs: unit-tests
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: test
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run test:integration
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: integration-artifacts
          path: test-results/

  quarantine:
    runs-on: ubuntu-latest
    continue-on-error: true
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx jest --testPathPattern="quarantine"
      - run: npx deflaky run --quarantine-report
        if: always()
```

## Conclusion

Implementing these flaky tests ci cd best practices is not a one-time effort -- it is an ongoing commitment to pipeline reliability. Start with the practices that address your biggest pain points (usually retry policies and quarantine), then layer on the more advanced strategies as your team matures.

The goal is not a zero-flake pipeline (that is unrealistic). The goal is a pipeline where flaky tests are automatically detected, isolated, tracked, and systematically fixed -- so your CI/CD system remains a reliable source of truth rather than a source of frustration.

**Take the first step toward a reliable CI/CD pipeline today.** DeFlaky integrates with your existing CI system to automatically detect, quarantine, and track flaky tests:

```bash
npx deflaky run
```
