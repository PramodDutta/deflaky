---
title: "Flaky Tests in GitHub Actions: Detection, Prevention, and Monitoring"
description: "Detect and prevent flaky tests in GitHub Actions with reusable workflows, matrix strategies, artifact analysis, and DeFlaky integration."
date: 2026-04-05
slug: flaky-tests-github-actions
keywords:
  - flaky tests github actions
  - github actions test reliability
  - CI flaky tests
  - github actions test retry
  - github actions workflow flaky
  - detect flaky tests github
  - github actions testing
  - CI/CD test monitoring
  - github actions artifacts
  - github test reporting
author: "DeFlaky Team"
---

# Flaky Tests in GitHub Actions: Detection, Prevention, and Monitoring

GitHub Actions is the most popular CI/CD platform for open-source projects and an increasingly common choice for enterprise teams. Its ephemeral runner model -- where each job gets a fresh virtual machine that is destroyed after the job completes -- creates unique flakiness patterns that differ from traditional CI servers like Jenkins.

This guide covers GitHub Actions-specific causes of test flakiness, provides ready-to-use workflow configurations for detection, and shows how to build a monitoring pipeline that catches flaky tests before they become problems.

## Why GitHub Actions Introduces Unique Flakiness

### Ephemeral Environments

Every GitHub Actions job starts on a fresh VM. This eliminates the "works on my CI server because of cached state" problem but introduces a new one: cold-start variability. The first time a job runs, it must install dependencies, warm up caches, and start services from scratch. The time this takes varies between runs, sometimes significantly.

### Shared Runner Infrastructure

GitHub-hosted runners share physical infrastructure with other customers. During peak hours, your runner may have less available CPU, memory, and network bandwidth than during off-peak hours. Tests with tight timing assumptions may pass at 2 AM but fail at 2 PM.

### Network Variability

GitHub-hosted runners access the internet through shared network infrastructure. npm install, pip install, Docker pulls, and API calls to external services all depend on network performance that varies between runs.

### Runner Image Updates

GitHub periodically updates runner images with new OS versions, browser versions, and system library versions. A test that depends on a specific browser rendering behavior may start flaking after a runner image update.

## GitHub Actions-Specific Flakiness Patterns

### Pattern 1: Dependency Installation Failures

```yaml
# FLAKY: npm install can fail due to registry timeouts
steps:
  - uses: actions/checkout@v4
  - run: npm install
  - run: npm test
```

The npm registry occasionally has latency spikes. A timeout during `npm install` fails the entire job, which looks like a test failure but is actually an infrastructure issue.

**Fix: Use npm ci with retries and caching.**

```yaml
steps:
  - uses: actions/checkout@v4

  - name: Cache node_modules
    uses: actions/cache@v4
    with:
      path: ~/.npm
      key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
      restore-keys: ${{ runner.os }}-node-

  - name: Install dependencies
    run: npm ci --prefer-offline
    timeout-minutes: 5

  - name: Run tests
    run: npm test
```

`npm ci` is deterministic (uses the lock file exactly), `--prefer-offline` uses cached packages when available, and the explicit `timeout-minutes` prevents the job from hanging indefinitely.

### Pattern 2: Service Container Startup Race

```yaml
# FLAKY: Tests might start before PostgreSQL is ready
services:
  postgres:
    image: postgres:16
    env:
      POSTGRES_DB: test
      POSTGRES_PASSWORD: test
    ports:
      - 5432:5432

steps:
  - uses: actions/checkout@v4
  - run: npm test  # Database might not be accepting connections yet
```

**Fix: Add a health check to the service definition.**

```yaml
services:
  postgres:
    image: postgres:16
    env:
      POSTGRES_DB: test
      POSTGRES_PASSWORD: test
    ports:
      - 5432:5432
    options: >-
      --health-cmd pg_isready
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5

steps:
  - uses: actions/checkout@v4
  - name: Wait for PostgreSQL
    run: |
      until pg_isready -h localhost -p 5432; do
        echo "Waiting for PostgreSQL..."
        sleep 2
      done
  - run: npm test
```

### Pattern 3: Resource Exhaustion on Shared Runners

GitHub-hosted runners have limited resources (typically 2 cores, 7 GB RAM for Linux runners). Running too many parallel tests or memory-intensive browser tests can cause OOM kills and timeouts.

**Fix: Limit parallelism and monitor resources.**

```yaml
steps:
  - uses: actions/checkout@v4
  - run: npm ci

  # Limit Jest workers to match available cores
  - name: Run tests
    run: npx jest --maxWorkers=2

  # Or for Playwright, limit browsers
  - name: Run E2E tests
    run: npx playwright test --workers=1
```

### Pattern 4: Timezone-Dependent Failures

GitHub-hosted runners use UTC by default. Tests that depend on a specific timezone will fail unless the timezone is explicitly set.

```yaml
steps:
  - uses: actions/checkout@v4
  - name: Set timezone
    run: sudo timedatectl set-timezone America/New_York
  - name: Run tests
    run: npm test
    env:
      TZ: America/New_York
```

## Building a Flaky Test Detection Workflow

This reusable workflow runs your test suite multiple times to detect flaky tests automatically.

```yaml
# .github/workflows/flaky-detection.yml
name: Flaky Test Detection

on:
  schedule:
    # Run every Monday and Thursday at 3 AM UTC
    - cron: '0 3 * * 1,4'
  workflow_dispatch:
    inputs:
      runs:
        description: 'Number of test runs'
        default: '5'
        type: string

jobs:
  detect:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        run: [1, 2, 3, 4, 5]

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - run: npm ci

      - name: Run tests (attempt ${{ matrix.run }})
        run: |
          npx jest \
            --json \
            --outputFile=test-results-${{ matrix.run }}.json \
            --forceExit
        continue-on-error: true

      - name: Upload results
        uses: actions/upload-artifact@v4
        with:
          name: results-run-${{ matrix.run }}
          path: test-results-${{ matrix.run }}.json

  analyze:
    needs: detect
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Download all results
        uses: actions/download-artifact@v4
        with:
          pattern: results-run-*
          merge-multiple: true

      - name: Analyze flakiness
        run: |
          echo "## Flaky Test Detection Report" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY

          # Compare results across runs
          node -e "
            const fs = require('fs');
            const results = {};

            for (let i = 1; i <= 5; i++) {
              const file = 'test-results-' + i + '.json';
              if (!fs.existsSync(file)) continue;
              const data = JSON.parse(fs.readFileSync(file, 'utf-8'));

              data.testResults.forEach(suite => {
                suite.testResults.forEach(test => {
                  const key = test.fullName;
                  if (!results[key]) results[key] = [];
                  results[key].push(test.status);
                });
              });
            }

            const flaky = Object.entries(results)
              .filter(([, statuses]) => {
                const unique = new Set(statuses);
                return unique.size > 1;
              })
              .map(([name, statuses]) => ({
                name,
                passes: statuses.filter(s => s === 'passed').length,
                fails: statuses.filter(s => s === 'failed').length,
              }))
              .sort((a, b) => b.fails - a.fails);

            if (flaky.length === 0) {
              console.log('No flaky tests detected across 5 runs.');
            } else {
              console.log('Flaky tests detected: ' + flaky.length);
              flaky.forEach(t => {
                console.log('  ' + t.name + ' (passed: ' + t.passes + ', failed: ' + t.fails + ')');
              });
            }
          "
```

## Monitoring Flaky Tests Across PR Builds

Add flaky test monitoring to every pull request to catch new flakiness before it merges.

```yaml
# .github/workflows/pr-tests.yml
name: PR Tests

on:
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci

      - name: Run tests with JUnit output
        run: |
          npx jest \
            --reporters=default \
            --reporters=jest-junit \
            --forceExit
        env:
          JEST_JUNIT_OUTPUT_DIR: ./test-results
          JEST_JUNIT_OUTPUT_NAME: results.xml
        continue-on-error: true

      - name: Analyze with DeFlaky
        run: |
          npx deflaky analyze \
            --input test-results/results.xml \
            --format junit \
            --threshold 0.05
        continue-on-error: true

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-results
          path: test-results/

      - name: Push results to DeFlaky Dashboard
        if: always()
        run: |
          npx deflaky push \
            --input test-results/results.xml \
            --project ${{ github.repository }} \
            --commit ${{ github.sha }} \
            --branch ${{ github.head_ref }}
        env:
          DEFLAKY_TOKEN: ${{ secrets.DEFLAKY_TOKEN }}
```

## Retry Configuration for GitHub Actions

When infrastructure-level retries are needed, GitHub Actions does not have built-in job retries. Use these patterns instead.

### Test-Level Retries (Preferred)

Configure retries in your test framework rather than at the workflow level.

```yaml
- name: Run tests with retries
  run: npx jest --retries 2
```

### Step-Level Retries

Use the `nick-fields/retry` action for steps that might fail due to infrastructure issues.

```yaml
- name: Run tests with step retry
  uses: nick-fields/retry@v3
  with:
    timeout_minutes: 15
    max_attempts: 3
    command: npm test
```

### Job-Level Retries via Reusable Workflow

```yaml
# .github/workflows/test-with-retry.yml
name: Tests with Retry

on: [push]

jobs:
  test:
    uses: ./.github/workflows/run-tests.yml

  retry-on-failure:
    needs: test
    if: failure()
    uses: ./.github/workflows/run-tests.yml
```

## Artifact-Based Debugging

When a test fails in GitHub Actions, you need artifacts to debug it. Configure comprehensive artifact collection.

```yaml
- name: Run Playwright tests
  run: npx playwright test
  continue-on-error: true

- name: Upload test artifacts
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: test-artifacts-${{ github.run_id }}
    path: |
      test-results/
      playwright-report/
    retention-days: 14
```

For Playwright specifically, enable trace capture on retries:

```typescript
// playwright.config.ts
export default defineConfig({
  retries: process.env.CI ? 2 : 0,
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
});
```

## Long-Term Monitoring with DeFlaky

For ongoing monitoring across all your GitHub Actions workflow runs, integrate DeFlaky into your pipeline.

```yaml
# Add to your main test workflow
- name: Push results to DeFlaky
  if: always()
  run: |
    deflaky push \
      --input test-results.xml \
      --project "${{ github.repository }}" \
      --commit "${{ github.sha }}" \
      --branch "${{ github.ref_name }}" \
      --run-id "${{ github.run_id }}"
  env:
    DEFLAKY_TOKEN: ${{ secrets.DEFLAKY_TOKEN }}
```

The [DeFlaky Dashboard](/demo) aggregates results across all workflow runs, computing FlakeScore per test and per suite. You can see at a glance which tests are the most flaky, whether flakiness is trending up or down, and which GitHub Actions workflow runs were affected.

Set up alerts to get notified when a previously stable test becomes flaky:

```bash
# Configure alerts in DeFlaky
deflaky alerts create \
  --project "my-org/my-repo" \
  --condition "flakescore < 80" \
  --channel slack \
  --webhook "$SLACK_WEBHOOK"
```

## Conclusion

GitHub Actions is an excellent CI platform, but its shared, ephemeral runner model introduces flakiness patterns that teams on dedicated CI servers may not have encountered. Dependency installation failures, service startup races, resource exhaustion, and runner image changes all contribute to tests that pass locally but fail intermittently in CI.

The solutions are straightforward: cache aggressively, health-check service containers, limit parallelism, and set explicit environment variables. For ongoing monitoring, integrate [DeFlaky](/pricing) into your GitHub Actions workflows to track test reliability across every run and catch new flakiness before it becomes entrenched.

Build the detection workflow from this article, run it weekly, and review the results. Within a month, you will have a clear map of your flaky tests and a prioritized list of fixes. That is the first step toward a CI pipeline your team can trust.
