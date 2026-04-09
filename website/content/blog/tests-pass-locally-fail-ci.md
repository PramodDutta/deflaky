---
title: "Why Your Tests Pass Locally But Fail in CI (And How to Fix Every Cause)"
description: "Diagnose the top 10 reasons tests pass on your machine but fail in CI. Covers timing, resources, environment, and configuration mismatches."
date: 2026-04-08
slug: tests-pass-locally-fail-ci
keywords:
  - tests pass locally fail CI
  - CI test failures
  - local vs CI tests
  - environment test differences
  - CI debugging
  - test environment mismatch
  - flaky tests CI only
  - CI test timeout
  - headless browser tests
  - CI test troubleshooting
author: "DeFlaky Team"
---

# Why Your Tests Pass Locally But Fail in CI (And How to Fix Every Cause)

"It works on my machine." Every developer has said it. Every QA engineer has heard it. And when it comes to tests that pass locally but fail in CI, the phrase is almost always true -- the test genuinely works on the developer's machine. The question is: why does it not work in CI?

This article systematically covers every common cause of the local-pass-CI-fail pattern, with specific diagnostic steps and fixes for each one.

## Cause 1: Resource Constraints

Your development machine likely has 8-32 GB of RAM and 4-16 CPU cores. A GitHub Actions runner has 7 GB RAM and 2 cores. A standard Docker-based CI runner might have even less.

### Symptoms

- Timeout errors that never happen locally
- "Out of memory" or SIGKILL errors
- Tests that are "slow" in CI but fast locally
- Browser crashes during E2E tests

### Diagnosis

```yaml
# Add resource monitoring to your CI pipeline
- name: Monitor resources during tests
  run: |
    # Start monitoring in background
    while true; do
      echo "$(date): $(free -m | grep Mem | awk '{print "Memory: " $3 "/" $2 "MB"}')"
      sleep 5
    done &
    MONITOR_PID=$!

    # Run tests
    npm test

    # Stop monitoring
    kill $MONITOR_PID
```

### Fix

```typescript
// Playwright: Limit parallelism in CI
export default defineConfig({
  workers: process.env.CI ? 1 : undefined,
});
```

```javascript
// Jest: Limit workers in CI
module.exports = {
  maxWorkers: process.env.CI ? 2 : '50%',
};
```

```python
# pytest: Limit parallelism
# pytest.ini
[pytest]
# Use fewer workers in CI
addopts = -n auto  # auto-detects available cores
```

For browser tests, reduce memory usage:

```typescript
// Launch with minimal memory footprint
const browser = await chromium.launch({
  args: [
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--no-sandbox',
    '--disable-extensions',
    '--disable-background-networking',
  ],
});
```

## Cause 2: Timing and Speed Differences

Your development machine processes operations faster than a CI runner. A function that takes 50ms locally might take 500ms in CI. Tests with tight timing assumptions break.

### Symptoms

- Assertion failures where the expected value "should be there"
- Intermittent timeouts on specific test steps
- Tests that pass with added `sleep()` calls

### Diagnosis

Add timing instrumentation to the failing test:

```javascript
test('checkout flow', async () => {
  const start = Date.now();

  await page.click('#add-to-cart');
  console.log(`Add to cart: ${Date.now() - start}ms`);

  await page.click('#checkout');
  console.log(`Checkout click: ${Date.now() - start}ms`);

  // This assertion might fail if the page is slow
  await expect(page.locator('#total')).toHaveText('$9.99');
  console.log(`Total visible: ${Date.now() - start}ms`);
});
```

### Fix

Replace hardcoded timeouts with explicit waits and increase timeout limits for CI.

```python
# Before: hardcoded timing that works locally
time.sleep(2)
assert element.text == "Complete"

# After: explicit wait that adapts to environment speed
timeout = 15 if os.environ.get("CI") else 5
WebDriverWait(driver, timeout).until(
    EC.text_to_be_present_in_element((By.ID, "status"), "Complete")
)
```

## Cause 3: Display and Rendering Differences

CI runners typically run in headless mode without a display server. This affects browser rendering, screenshot comparisons, and any test that depends on visual layout.

### Symptoms

- "Element not visible" when the element exists in the DOM
- Screenshot comparison failures
- Font rendering differences
- Different scroll behavior

### Diagnosis

```yaml
# Check display environment in CI
- name: Check display
  run: |
    echo "DISPLAY: $DISPLAY"
    echo "XDG_SESSION_TYPE: $XDG_SESSION_TYPE"
    xdpyinfo 2>/dev/null || echo "No X display available"
```

### Fix

For tests that need a display:

```yaml
# Use xvfb for a virtual display
- name: Run tests with virtual display
  uses: GabrielBB/xvfb-action@v1
  with:
    run: npm test
```

For Playwright and Cypress (which handle headless mode natively):

```typescript
// Playwright runs headless by default in CI -- this is correct
// But ensure your tests don't assume headed mode
export default defineConfig({
  use: {
    headless: true,  // Explicit, though it's the default
    viewport: { width: 1280, height: 720 },  // Fixed viewport size
  },
});
```

For screenshot tests, use a tolerance threshold:

```typescript
expect(screenshot).toMatchSnapshot('homepage.png', {
  maxDiffPixels: 100,  // Allow minor rendering differences
});
```

## Cause 4: File System Differences

macOS file systems are case-insensitive by default. Linux file systems (used by most CI runners) are case-sensitive. An import of `./MyComponent` that points to a file named `mycomponent.tsx` works on Mac but fails on Linux.

### Symptoms

- "Module not found" errors that only occur in CI
- File path resolution failures
- Tests that read/write temp files failing

### Diagnosis

```bash
# Check for case mismatches in imports
# Run this locally on Mac to find potential issues
git ls-files | sort -f | uniq -Di
```

### Fix

Ensure all imports match file names exactly:

```javascript
// BAD: Works on macOS, fails on Linux
import { Button } from './components/button';  // File is Button.tsx

// GOOD: Exact case match
import { Button } from './components/Button';
```

For temp file operations, use OS-agnostic paths:

```python
import tempfile
import os

# BAD: Hardcoded path that may not exist in CI
output_path = "/tmp/test_output.csv"

# GOOD: Cross-platform temp directory
output_path = os.path.join(tempfile.gettempdir(), "test_output.csv")
```

## Cause 5: Environment Variables and Secrets

Tests that depend on environment variables may fail in CI if those variables are not configured.

### Symptoms

- "undefined" or "null" values in test output
- Authentication failures
- API calls returning 401/403

### Diagnosis

```yaml
# Print non-secret environment variables for debugging
- name: Debug environment
  run: |
    echo "NODE_ENV: $NODE_ENV"
    echo "DATABASE_URL set: $([ -z "$DATABASE_URL" ] && echo NO || echo YES)"
    echo "API_KEY set: $([ -z "$API_KEY" ] && echo NO || echo YES)"
```

### Fix

```yaml
# Ensure all required environment variables are set
jobs:
  test:
    env:
      NODE_ENV: test
      DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
      API_BASE_URL: http://localhost:3000

    steps:
      - name: Validate environment
        run: |
          REQUIRED_VARS="NODE_ENV DATABASE_URL API_BASE_URL"
          for var in $REQUIRED_VARS; do
            if [ -z "${!var}" ]; then
              echo "ERROR: $var is not set"
              exit 1
            fi
          done
```

For API keys and secrets, use GitHub Actions secrets:

```yaml
- name: Run tests
  run: npm test
  env:
    API_KEY: ${{ secrets.TEST_API_KEY }}
```

## Cause 6: Timezone and Locale Differences

Your machine is set to your local timezone. CI runners typically use UTC. Tests that format dates, sort strings, or compare timestamps will produce different results.

### Symptoms

- Date assertion failures ("Expected March 28, got March 29")
- String sorting differences
- Timestamp comparisons off by hours

### Fix

```yaml
# Set timezone explicitly in CI
- name: Run tests
  run: npm test
  env:
    TZ: UTC
    LANG: en_US.UTF-8
    LC_ALL: en_US.UTF-8
```

In test code, use fixed timezones:

```javascript
// BAD: Uses system timezone
const formatted = new Date(timestamp).toLocaleDateString();

// GOOD: Uses explicit timezone
const formatted = new Date(timestamp).toLocaleDateString('en-US', {
  timeZone: 'UTC',
});
```

```python
# BAD: Uses system timezone
from datetime import datetime
today = datetime.now().strftime("%Y-%m-%d")

# GOOD: Uses explicit timezone
from datetime import datetime, timezone
today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
```

## Cause 7: Network Access Differences

Your machine has fast, unrestricted internet access. CI runners may have restricted access, higher latency, or rate limits from package registries and external APIs.

### Symptoms

- Timeout errors during API calls
- "Connection refused" to external services
- Intermittent DNS resolution failures

### Fix

Mock external services in tests:

```typescript
// Mock external API calls to remove network dependency
await page.route('**/api.external-service.com/**', route =>
  route.fulfill({
    status: 200,
    body: JSON.stringify({ result: 'mocked' }),
  })
);
```

For tests that must call external services, increase timeouts:

```python
# Use generous timeouts for network calls in CI
timeout = 30 if os.environ.get("CI") else 10
response = requests.get(url, timeout=timeout)
```

## Cause 8: Service Startup Timing

In CI, databases and other services start from cold. Locally, they are usually already running and warmed up.

### Symptoms

- "Connection refused" errors at the start of test runs
- First few tests fail, rest pass
- Database migration errors

### Fix

```yaml
services:
  postgres:
    image: postgres:16
    env:
      POSTGRES_PASSWORD: test
    options: >-
      --health-cmd pg_isready
      --health-interval 5s
      --health-timeout 5s
      --health-retries 10

steps:
  - name: Wait for services
    run: |
      # Wait for PostgreSQL
      until pg_isready -h localhost -p 5432; do
        echo "Waiting for PostgreSQL..."
        sleep 2
      done

      # Run migrations
      npm run db:migrate

  - name: Run tests
    run: npm test
```

## Cause 9: Dependency Version Drift

Your local `node_modules` might have different versions than what CI installs from the lock file -- especially if you have not run `npm install` recently or if the lock file is outdated.

### Symptoms

- Syntax errors in dependencies
- "Method not found" on library APIs
- Different behavior from third-party libraries

### Fix

```bash
# Always use lock file installation in CI
npm ci        # Not npm install
pip install -r requirements.txt --no-deps  # Not pip install
bundle install --frozen                     # Not bundle install
```

Locally, regularly sync:

```bash
# Periodically reset local dependencies to match lock file
rm -rf node_modules
npm ci
```

## Cause 10: Git-Related Differences

CI checks out a specific commit, often in a detached HEAD state. Tests that depend on git state (branch name, uncommitted files, or git history) may behave differently.

### Symptoms

- Tests that read git branch names failing
- Tests that check for uncommitted changes failing
- Different file permissions after checkout

### Fix

```yaml
# Ensure full git history is available
- uses: actions/checkout@v4
  with:
    fetch-depth: 0  # Full history, not shallow clone
```

For file permission issues:

```yaml
- name: Fix permissions
  run: chmod +x scripts/*.sh
```

## A Systematic Debugging Approach

When a test passes locally but fails in CI, follow this process:

1. **Read the CI error message carefully.** It usually points to a specific cause category.
2. **Check if the failure is consistent in CI.** Rerun the pipeline. If it passes on rerun, it is a timing or resource issue.
3. **Compare environments.** Use the diagnostic commands from this article to check resource availability, environment variables, timezone, and display settings.
4. **Reproduce locally with constraints.** Run tests with limited resources to simulate CI.

```bash
# Simulate CI constraints locally (Docker)
docker run --rm \
  --cpus=2 \
  --memory=4g \
  -v $(pwd):/app \
  -w /app \
  -e CI=true \
  -e TZ=UTC \
  node:20-slim \
  bash -c "npm ci && npm test"
```

5. **Use DeFlaky for pattern analysis.** The [DeFlaky Dashboard](/demo) can identify tests that fail only in CI, correlate failures with specific CI runner types, and track whether fixes hold across environments.

```bash
deflaky analyze --input ci-results.xml --format junit --group-by environment
```

## Conclusion

Tests that pass locally but fail in CI are not mysterious. They fail for concrete, diagnosable reasons: resource constraints, timing differences, environment mismatches, network issues, or configuration gaps. The ten causes in this article cover the vast majority of local-pass-CI-fail scenarios.

The most effective prevention strategy is to make your local development environment match CI as closely as possible. Use Docker for development, set timezone to UTC, limit test parallelism, and mock external services. The closer your local environment is to CI, the fewer surprises you will encounter.

For ongoing monitoring, integrate [DeFlaky](/pricing) into your CI pipeline. It tracks which tests are CI-only failures and provides the data you need to diagnose and fix environmental flakiness systematically.

Your CI pipeline should be a trusted gatekeeper, not a source of frustration. Fix the environment mismatches, and the trust follows.
