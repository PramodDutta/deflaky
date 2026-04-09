---
title: "Test Retry vs Test Fix: When to Retry Flaky Tests and When to Fix Them"
description: "Learn when retrying flaky tests is acceptable and when you must fix the root cause. Includes retry configurations for Jest, Playwright, and pytest."
date: 2026-04-03
slug: test-retry-vs-test-fix
keywords:
  - retry flaky tests
  - test retry strategy
  - test retry vs fix
  - flaky test retry
  - jest retry
  - playwright retry
  - pytest rerun
  - test retry configuration
  - flaky test management
  - when to retry tests
author: "DeFlaky Team"
---

# Test Retry vs Test Fix: When to Retry Flaky Tests and When to Fix Them

Your CI pipeline failed. The failing test has failed before -- intermittently. You have two options: add a retry or fix the root cause. Both are valid strategies, but choosing the wrong one at the wrong time either wastes engineering effort or buries a problem that will keep compounding.

This article provides a clear decision framework for when retrying is the right move and when fixing is non-negotiable, along with production-ready retry configurations for every major test framework.

## The Retry Trap

Retrying is seductive because it is fast. Add two lines of config, and your flaky test stops blocking the pipeline. The build goes green. Everyone moves on.

But retrying does not fix anything. It masks the symptom while the underlying cause persists. Every retry costs compute time, adds latency to your pipeline, and -- most dangerously -- trains your team to tolerate flakiness rather than eliminate it.

Here is what happens when retries become the default strategy:

1. **Flaky tests accumulate.** If retrying is easy and fixing is hard, rational developers will always choose retrying. The number of retried tests grows.
2. **Pipeline time increases.** Each retried test adds its execution time again. A suite with 20 retried tests can add 10+ minutes to every build.
3. **Real failures hide.** When a test that was previously "just flaky" starts failing due to a real regression, the retry mechanism masks it. The build passes on the third try, and the bug ships.

## The Decision Framework

Use this framework to decide between retrying and fixing.

### Retry When:

**The flakiness is environmental and outside your control.**

If the flakiness comes from infrastructure you do not own -- a cloud CI runner with variable performance, a third-party service your tests cannot mock, or a browser rendering inconsistency across OS versions -- retrying is a pragmatic response. You cannot fix what you do not control.

**The fix requires significant refactoring that is not prioritized.**

Some flaky tests require substantial changes to fix: rewriting the test from scratch, refactoring the application code to be more testable, or overhauling the test infrastructure. If the fix is a multi-day effort and the test is only mildly flaky (under 5% failure rate), a retry buys time while the fix is scheduled.

**The test covers critical functionality that cannot be disabled.**

If a test guards a critical path -- payment processing, authentication, data integrity -- and disabling it would be riskier than retrying it, use retries as a temporary safety net while the fix is developed.

### Fix When:

**The flake rate exceeds 10%.**

A test that fails more than 10% of the time is unreliable enough that retries will frequently exhaust all attempts. It needs a real fix.

**The root cause is known and straightforward.**

If the fix is "replace `sleep(2)` with an explicit wait" or "add a unique ID to test data," the effort is trivial. Choosing to retry instead of spending 15 minutes on a real fix is technical debt by choice.

**The flakiness is spreading.**

If multiple tests in the same area are becoming flaky, the root cause is systemic. Retrying each one individually does not address the shared underlying problem.

**The test has been retried for more than two weeks.**

If you added a retry as a "temporary" measure and two weeks have passed, it is no longer temporary. It is the new normal. Fix it or remove it.

## Retry Configurations for Major Frameworks

When retrying is the right call, configure it properly.

### Jest

Jest does not have built-in per-test retries in its default configuration, but you can use the `jest.retryTimes` API.

```javascript
// In your test file
jest.retryTimes(2, { logErrorsBeforeRetry: true });

describe('Payment API', () => {
  test('processes charge successfully', async () => {
    const result = await processCharge({ amount: 1000, currency: 'usd' });
    expect(result.status).toBe('succeeded');
  });
});
```

For global retries across all tests:

```javascript
// jest.setup.js
jest.retryTimes(2, { logErrorsBeforeRetry: true });

// jest.config.js
module.exports = {
  setupFilesAfterFramework: ['./jest.setup.js'],
};
```

**Best practice:** Only retry in CI, not locally. Developers should see failures immediately during local development.

```javascript
// jest.setup.js
if (process.env.CI) {
  jest.retryTimes(2, { logErrorsBeforeRetry: true });
}
```

### Playwright

Playwright has first-class retry support in its configuration.

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  retries: process.env.CI ? 2 : 0,

  // Capture trace on first retry for debugging
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
});
```

Playwright's retry mechanism is sophisticated: it reruns the entire test including `beforeEach` hooks, captures traces only on retries (to avoid performance overhead on passing tests), and reports which tests needed retries.

**Per-test retry override:**

```typescript
import { test, expect } from '@playwright/test';

// This specific test gets more retries because it depends on a flaky third-party widget
test('loads payment widget', async ({ page }) => {
  test.info().annotations.push({ type: 'retries', description: '3' });
  // ... test code
});
```

### pytest

pytest uses the `pytest-rerunfailures` plugin for retries.

```bash
pip install pytest-rerunfailures
```

```bash
# Retry all failed tests up to 2 times
pytest --reruns 2 --reruns-delay 1

# Retry only specific failure types
pytest --reruns 2 --only-rerun "TimeoutError" --only-rerun "ConnectionError"
```

**Per-test retry with decorators:**

```python
import pytest

@pytest.mark.flaky(reruns=3, reruns_delay=2)
def test_external_api_response():
    """This test calls a third-party API that occasionally times out."""
    response = requests.get("https://api.external-service.com/status")
    assert response.status_code == 200
```

**Configuration in pytest.ini:**

```ini
[pytest]
addopts = --reruns 2 --reruns-delay 1
```

### Cypress

Cypress supports test retries natively.

```javascript
// cypress.config.js
const { defineConfig } = require('cypress');

module.exports = defineConfig({
  retries: {
    runMode: 2,      // Retries when running in CI (cypress run)
    openMode: 0,     // No retries in interactive mode (cypress open)
  },
});
```

**Per-test configuration:**

```javascript
describe('Checkout Flow', () => {
  it('completes purchase', { retries: 3 }, () => {
    cy.visit('/checkout');
    cy.get('[data-testid="pay-button"]').click();
    cy.contains('Order confirmed').should('be.visible');
  });
});
```

### JUnit 5

JUnit 5 uses the `@RepeatedTest` annotation for basic repeats, or the Pioneer extension for retries.

```java
// Using JUnit Pioneer
import org.junitpioneer.jupiter.RetryingTest;

class PaymentTest {

    @RetryingTest(3)
    void processPayment() {
        PaymentResult result = paymentService.charge(1000, "usd");
        assertEquals("succeeded", result.getStatus());
    }
}
```

## The Hybrid Strategy: Retry Now, Track, Fix Later

The most effective teams use a hybrid approach: retry immediately to unblock the pipeline, but track retried tests and schedule fixes based on impact.

### Step 1: Enable Retries with Tracking

```bash
# Run tests with retries enabled, output results to JUnit XML
npx playwright test --retries 2

# Push results to DeFlaky for tracking
deflaky push --input test-results.xml --project my-app
```

### Step 2: Monitor the Retry Dashboard

The [DeFlaky Dashboard](/demo) shows which tests are being retried, how often, and whether their retry frequency is increasing or decreasing. This gives you a data-driven priority list for fixes.

Key metrics to watch:

- **Retry rate per test**: The percentage of runs where a test needed at least one retry. Target: under 5% for any individual test.
- **Retry rate trend**: Is the retry rate for a test going up or down? An increasing trend means the underlying problem is worsening.
- **Total retry time**: The cumulative time spent on retries across all tests. This is the direct pipeline time you are wasting.

### Step 3: Set Fix SLAs Based on Severity

| Retry Rate | Severity | SLA |
|-----------|----------|-----|
| > 20% | Critical | Fix within 24 hours |
| 10-20% | High | Fix within 1 week |
| 5-10% | Medium | Fix within 2 weeks |
| < 5% | Low | Schedule for next sprint |

### Step 4: Validate Fixes

After fixing a flaky test, remove the retry and monitor for at least one week.

```typescript
// After fixing the root cause, remove excess retries
test('processes payment', async ({ page }) => {
  // Previously had retries: 3 due to iframe loading race condition
  // Fixed by adding proper frame wait -- retries no longer needed
  await page.goto('/checkout');
  await page.frameLocator('#payment-iframe').getByLabel('Card').fill('4242424242424242');
  await page.getByRole('button', { name: 'Pay' }).click();
  await expect(page.getByText('Payment successful')).toBeVisible();
});
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Infinite Retries

```javascript
// NEVER DO THIS
jest.retryTimes(10);  // If a test needs 10 retries, it needs a fix
```

More than 3 retries is a red flag. If a test cannot pass within 3 attempts, the problem is too severe for retries.

### Anti-Pattern 2: Retries Without Logging

```bash
# BAD: Retries happen silently
pytest --reruns 3

# GOOD: Log retries so you know they're happening
pytest --reruns 3 -v  # Verbose output shows retry attempts
```

If retries happen silently, nobody knows the problem exists. Ensure retry events are visible in your CI logs and tracked in your [test dashboard](/demo).

### Anti-Pattern 3: Retries as a Permanent Solution

If a test has had retries enabled for more than 30 days without a fix being scheduled, the retry has become a permanent coping mechanism. Either fix the test or acknowledge that the test is unreliable and consider removing it.

### Anti-Pattern 4: Retrying Without Cleanup

If a test fails because it created partial state (e.g., half-created database records), retrying without cleaning up will fail again for the same reason.

```python
# BAD: Retry without cleanup
@pytest.mark.flaky(reruns=2)
def test_create_order():
    order = create_order(sku="WIDGET-001")
    assert order.status == "confirmed"

# GOOD: Ensure cleanup before retry
@pytest.mark.flaky(reruns=2)
def test_create_order():
    cleanup_pending_orders()  # Clean up any partial state from a previous failed attempt
    order = create_order(sku="WIDGET-001")
    assert order.status == "confirmed"
```

## Conclusion

Retrying and fixing are not opposing strategies -- they are tools for different situations. Retries buy time for environmental flakiness and low-impact issues. Fixes are required for high-flake-rate tests, known root causes, and systemic problems.

The key is to never let retries become invisible. Track every retry, measure the trend, and set SLAs for fixes. Use [DeFlaky](/pricing) to automate this tracking so your team always knows which tests are being retried, how often, and whether the situation is improving.

The teams with the most reliable test suites are not the ones that never use retries. They are the ones that treat every retry as a temporary measure with an expiration date.
