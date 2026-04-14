---
title: "Root Cause Analysis for Flaky Tests: A Systematic Framework"
description: "A structured framework for performing root cause analysis on flaky tests. Learn to categorize failures by type (timing, ordering, resource, environment, data), use investigation checklists, bisect flaky tests, and reliably reproduce intermittent failures."
date: "2026-04-13"
slug: "test-flakiness-root-cause-analysis"
keywords:
  - flaky test root cause analysis
  - flaky test root cause
  - test failure analysis
  - debug flaky tests
  - intermittent test failures
  - test investigation
  - test bisection
  - reproduce flaky tests
  - test failure categorization
  - test debugging framework
author: "Pramod Dutta"
---

# Root Cause Analysis for Flaky Tests: A Systematic Framework

Every engineering team has experienced the frustration: a test fails in CI, you rerun the pipeline, it passes, and you move on. Over time, this pattern erodes trust in your test suite and trains developers to ignore legitimate failures hidden among the noise. The solution is not to retry harder but to perform proper flaky test root cause analysis on every intermittent failure.

Root cause analysis (RCA) for flaky tests is not the same as debugging a broken test. A broken test fails consistently and the cause is usually obvious. A flaky test fails sporadically, and the cause is typically a hidden assumption about the test environment, execution order, timing, or data state. This guide provides a systematic framework that transforms flaky test investigation from guesswork into a repeatable engineering process.

## The Five Categories of Test Flakiness

After analyzing thousands of flaky tests across hundreds of codebases, a clear pattern emerges. Nearly every flaky test falls into one of five categories. Identifying which category a failure belongs to is the first and most important step in flaky test root cause analysis.

### 1. Timing-Dependent Failures

Timing issues are the most common category, responsible for roughly 40% of all flaky tests. They occur when a test makes assumptions about how quickly something will happen.

**Symptoms:**
- Test passes on fast machines, fails on slow CI runners
- Failures correlate with system load
- Adding `sleep()` or increasing timeouts "fixes" the test

**Common causes:**
- Hardcoded timeouts instead of event-based waiting
- Race conditions between test setup and assertion
- Animation or transition timing
- Network request timing assumptions

**Investigation approach:**

```bash
# Run the test with CPU throttling to expose timing issues
# On Linux:
cpulimit -l 25 -- npx jest path/to/test.spec.js

# Or use nice to lower priority:
nice -n 19 npx jest path/to/test.spec.js
```

```javascript
// Pattern: Replace setTimeout-based waiting with event-based waiting
// FLAKY
await new Promise(resolve => setTimeout(resolve, 2000));
expect(screen.getByText('Loaded')).toBeInTheDocument();

// STABLE
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument();
}, { timeout: 10000 });
```

### 2. Order-Dependent Failures

Order-dependent tests pass when run in a specific sequence but fail when run in isolation or in a different order. They account for approximately 25% of flaky tests.

**Symptoms:**
- Test passes in the full suite but fails when run alone
- Test fails when another test is added or removed from the suite
- Random test ordering reveals failures

**Common causes:**
- Shared mutable state (global variables, singletons, module-level caches)
- Missing teardown of side effects
- Database records created by previous tests
- Environment variables set by earlier tests

**Investigation approach:**

```bash
# Run tests in random order to expose ordering issues
npx jest --randomize

# Run the failing test in isolation
npx jest --testPathPattern="failing-test.spec.ts"

# If it passes alone, find the test that it depends on
# Binary search through the test suite:
npx jest --testPathPattern="(testA|testB|failing)" --verbose
```

### 3. Resource-Dependent Failures

These failures occur when tests compete for shared resources: ports, files, database connections, or external services.

**Symptoms:**
- Failures increase with parallelism
- "Address already in use" or "Connection refused" errors
- Timeouts when connecting to external services
- File lock or permission errors

**Common causes:**
- Hardcoded ports for test servers
- Shared database without transaction isolation
- File system operations without unique paths
- Connection pool exhaustion

**Investigation approach:**

```javascript
// Diagnose port conflicts
const getPort = require('get-port');

beforeAll(async () => {
  // FLAKY: Hardcoded port
  // server = app.listen(3000);

  // STABLE: Dynamic port allocation
  const port = await getPort();
  server = app.listen(port);
  baseUrl = `http://localhost:${port}`;
});
```

### 4. Environment-Dependent Failures

Environment flakiness occurs when tests behave differently across machines, operating systems, or CI environments.

**Symptoms:**
- "Works on my machine" syndrome
- Tests pass on macOS but fail on Linux CI
- Failures only occur in containerized environments
- Timezone or locale-dependent failures

**Common causes:**
- Filesystem path separator differences (Windows vs Unix)
- Timezone assumptions
- Locale-dependent string formatting
- Missing system dependencies in CI
- Different Node.js or runtime versions

**Investigation approach:**

```javascript
// Diagnose environment differences
beforeAll(() => {
  console.log('Node version:', process.version);
  console.log('Platform:', process.platform);
  console.log('Timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
  console.log('Locale:', Intl.DateTimeFormat().resolvedOptions().locale);
  console.log('CPU cores:', require('os').cpus().length);
  console.log('Free memory:', require('os').freemem() / 1024 / 1024, 'MB');
});
```

### 5. Data-Dependent Failures

Data-dependent flakiness arises when test outcomes depend on the specific data used, and that data is not fully controlled by the test.

**Symptoms:**
- Tests fail around date boundaries (midnight, month-end, year-end)
- Failures correlate with specific input values generated randomly
- Tests break when seed data changes
- Sorting-related assertions fail intermittently

**Common causes:**
- Using `Date.now()` or `Math.random()` without seeding
- Relying on database auto-increment IDs
- Non-deterministic sort order for equal elements
- Floating-point comparison without tolerance

**Investigation approach:**

```javascript
// Freeze time to eliminate date-dependent flakiness
beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-06-15T10:00:00Z'));
});

afterEach(() => {
  jest.useRealTimers();
});

// Use deterministic random values
function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}
```

## The Investigation Checklist

When you encounter a flaky test, work through this checklist systematically. Do not skip steps, and do not assume you know the cause until you can reproduce the failure deterministically.

### Step 1: Gather Evidence

Before changing any code, collect information about the failure:

```markdown
- [ ] Record the exact error message and stack trace
- [ ] Note the CI run URL and build number
- [ ] Check if the test has failed before (search CI history)
- [ ] Record the test execution time (slow tests are more likely to be timing-dependent)
- [ ] Note what else was running on the CI runner
- [ ] Check if the failure correlates with recent code changes
```

### Step 2: Classify the Failure

Use the five categories above to classify the failure. Ask these questions:

| Question | If Yes | Category |
|----------|--------|----------|
| Does it pass when run alone? | Order-dependent | Ordering |
| Does it fail more on slow machines? | Timing-dependent | Timing |
| Does it fail more with parallelism? | Resource contention | Resource |
| Does it work locally but not in CI? | Environment-dependent | Environment |
| Does it fail near date boundaries? | Data-dependent | Data |

### Step 3: Reproduce the Failure

This is the most critical step. A flaky test you cannot reproduce is a flaky test you cannot fix. Here are techniques for each category:

```bash
# Timing: Run with reduced resources
docker run --cpus=0.5 --memory=512m your-test-image npm test

# Ordering: Randomize and repeat
for i in $(seq 1 50); do
  npx jest --randomize --bail 2>/dev/null || echo "FAILED on run $i"
done

# Resource: Increase parallelism
npx jest --maxWorkers=8

# Environment: Test in CI-equivalent container
docker run -it --rm node:20 bash -c "npm ci && npm test"

# Data: Run around date boundaries
TZ=UTC faketime '2026-12-31 23:59:50' npx jest path/to/test
```

### Step 4: Isolate the Root Cause

Once you can reproduce the failure, narrow down the cause:

```bash
# Git bisect to find the commit that introduced flakiness
git bisect start
git bisect bad HEAD
git bisect good v1.0.0  # Last known stable version

# At each step, run the test multiple times:
git bisect run bash -c 'for i in $(seq 1 10); do npx jest path/to/test || exit 1; done'
```

### Step 5: Fix and Verify

After identifying the root cause, apply the fix and verify it eliminates the flakiness:

```bash
# Run the test many times to confirm the fix
for i in $(seq 1 100); do
  npx jest path/to/test 2>/dev/null || { echo "STILL FLAKY on run $i"; exit 1; }
done
echo "All 100 runs passed - fix verified"
```

## Bisecting Flaky Tests

Git bisect is an underused tool for flaky test root cause analysis. The challenge is that standard bisect expects deterministic pass/fail, but flaky tests are probabilistic. The solution is to run multiple iterations at each bisect step:

```bash
#!/bin/bash
# bisect-flaky.sh - Run a test N times to determine if it's flaky at this commit

TEST_PATH=$1
ITERATIONS=${2:-20}
FAILURES=0

for i in $(seq 1 $ITERATIONS); do
  if ! npx jest "$TEST_PATH" --silent 2>/dev/null; then
    FAILURES=$((FAILURES + 1))
  fi
done

echo "Failed $FAILURES out of $ITERATIONS runs"

# Consider it "bad" if it fails more than 10% of the time
if [ $FAILURES -gt $((ITERATIONS / 10)) ]; then
  exit 1  # bad
else
  exit 0  # good
fi
```

Usage:

```bash
git bisect start
git bisect bad HEAD
git bisect good abc123
git bisect run bash bisect-flaky.sh "src/__tests__/flaky.test.ts" 30
```

This approach typically finds the guilty commit within minutes, even for tests that only fail 5-10% of the time.

## Building a Flaky Test Knowledge Base

Each flaky test root cause analysis produces valuable knowledge. Capture it systematically so your team learns from every investigation:

```markdown
## Flaky Test Report: UserDashboard.test.tsx

**Test:** "should display recent activity after login"
**Category:** Timing
**Failure rate:** ~15% in CI, 0% locally
**Root cause:** The test asserted on the activity list immediately after
calling `login()`, but the activity data was fetched asynchronously.
On CI runners with limited CPU, the fetch did not complete before the
assertion ran.
**Fix:** Replaced `getByTestId('activity-list')` with
`await findByTestId('activity-list')`.
**Time to diagnose:** 2 hours
**Lessons learned:** All data-fetching assertions should use `findBy`
queries, not `getBy`. Added a lint rule to catch this pattern.
```

Over time, this knowledge base reveals patterns. You might discover that 80% of your flaky tests are timing-related, pointing to a systemic issue with how your team writes async assertions. Or you might find that a specific test utility is responsible for most ordering issues.

## Preventing Flaky Tests Before They Merge

The cheapest flaky test to fix is one that never reaches your main branch. Implement these preventive measures:

### Pre-Merge Flake Detection

Run new or modified tests multiple times before merging:

```yaml
# .github/workflows/flake-detection.yml
flake-check:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - name: Find changed test files
      id: changed
      run: |
        FILES=$(git diff --name-only origin/main | grep '\.test\.' | tr '\n' ' ')
        echo "files=$FILES" >> $GITHUB_OUTPUT
    - name: Run changed tests 10 times
      if: steps.changed.outputs.files != ''
      run: |
        for i in $(seq 1 10); do
          echo "=== Run $i ==="
          npx jest ${{ steps.changed.outputs.files }} || exit 1
        done
```

### Code Review Checklist for Tests

Add these items to your PR review template:

```markdown
## Test Quality Checklist
- [ ] No hardcoded timeouts or sleep calls
- [ ] All async operations use proper await/waitFor patterns
- [ ] Tests clean up after themselves (mocks, state, connections)
- [ ] No dependency on test execution order
- [ ] Environment-specific values are properly configured
- [ ] Date/time values are controlled, not using system clock
```

## The Cost of Skipping RCA

Teams that skip flaky test root cause analysis and simply retry or quarantine flaky tests are accumulating technical debt. Each ignored flaky test:

- Reduces confidence in the test suite by a measurable amount
- Makes it harder to identify real regressions hidden behind flaky noise
- Trains developers to ignore CI failures
- Slows down the entire team when flaky tests block deployments

A proper RCA takes 30 minutes to 2 hours. The cost of not doing it compounds indefinitely.

## Automate Your Flaky Test Investigation

Manual investigation does not scale. When your test suite grows to hundreds or thousands of tests, you need automated tools to continuously monitor test reliability, detect flakiness patterns, and prioritize which tests need attention. DeFlaky performs continuous flaky test root cause analysis across your entire test suite, categorizing failures, tracking failure rates over time, and providing actionable fix recommendations.

Start analyzing your test suite today:

```bash
npx deflaky run
```

DeFlaky identifies flaky tests, classifies them by root cause category, and gives your team a prioritized remediation plan. Stop guessing why tests fail intermittently and start applying systematic flaky test root cause analysis to build a test suite your team can trust.
