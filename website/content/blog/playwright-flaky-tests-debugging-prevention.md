---
title: "Playwright Test Flakiness: A Debugging and Prevention Guide"
description: "Debug and prevent flaky Playwright tests with trace analysis, network mocking, locator strategies, and CI-specific configuration patterns."
date: 2026-04-07
slug: playwright-flaky-tests-debugging-prevention
keywords:
  - playwright flaky tests fix
  - playwright test debugging
  - playwright trace viewer
  - playwright flaky CI
  - playwright auto-waiting
  - playwright test stability
  - playwright network mock
  - playwright locator strategy
  - playwright test timeout
  - playwright retrying assertions
author: "DeFlaky Team"
---

# Playwright Test Flakiness: A Debugging and Prevention Guide

Playwright was designed to eliminate the flakiness problems that plagued Selenium and early Cypress. Its auto-waiting, browser context isolation, and built-in assertions with retry logic are specifically engineered for test reliability. Yet teams still encounter flaky Playwright tests -- often because they are fighting Playwright's design patterns rather than working with them.

This guide focuses on two things: how to debug a flaky Playwright test when it appears, and how to write tests that resist flakiness from the start.

## Debugging: The Trace-First Approach

When a Playwright test starts flaking, your first move should always be to capture and analyze a trace. Traces are Playwright's killer debugging feature -- they record everything that happened during a test execution, including screenshots at every step, DOM snapshots, network requests, and console output.

### Enabling Traces for Debugging

```typescript
// playwright.config.ts
export default defineConfig({
  retries: process.env.CI ? 2 : 0,
  use: {
    // Capture trace on first retry -- saves performance on passing tests
    trace: 'on-first-retry',
  },
});
```

When a test fails and is retried, Playwright records a trace of the retry. After the test run:

```bash
# Open the HTML report which includes trace links
npx playwright show-report

# Or open a specific trace file
npx playwright show-trace test-results/my-test-chromium-retry1/trace.zip
```

### Reading a Trace for Flakiness Clues

The Trace Viewer shows a timeline of every action, assertion, and network event. When debugging a flaky test, look for these patterns:

**1. Gap between action and assertion.**

If the trace shows a long gap between a click action and the next assertion, the assertion might be timing out because the expected state has not been reached. Look at the network panel to see if there is an API call in flight during the gap.

**2. Network request that has not completed.**

Check the Network tab for pending requests at the time of the assertion. A common pattern: the test asserts page content that depends on an API response, but the API response has not arrived yet.

**3. Different DOM state than expected.**

Click on the assertion step in the timeline and compare the DOM snapshot to what you expected. You might find that the element exists but has different text, is hidden, or is covered by another element.

**4. Console errors.**

Check the Console tab for JavaScript errors. A runtime error in the application might prevent the expected UI state from being reached.

### Reproducing Flakiness Locally

Flaky tests often pass consistently on a developer machine. To reproduce CI flakiness locally:

```bash
# Simulate CI resource constraints
# Run with a single worker (CI often has limited cores)
npx playwright test --workers=1

# Run in headed mode to watch what happens
npx playwright test --headed

# Run with slow motion to catch timing issues
npx playwright test --headed --slow-mo=500

# Run multiple times to trigger the flakiness
for i in $(seq 1 20); do
  npx playwright test tests/checkout.spec.ts --reporter=line
done
```

If the test passes all 20 local runs, the flakiness is likely environment-specific. Check:
- CI runner CPU and memory limits
- Network latency to external services
- Browser version differences between local and CI

## Prevention Pattern 1: Retrying Assertions Over Manual Waits

Playwright's most powerful anti-flakiness feature is retrying assertions. These assertions automatically retry until the condition is met or the timeout expires.

```typescript
// NON-RETRYING (flaky): reads the value once
const text = await page.textContent('#status');
expect(text).toBe('Complete');  // Fails if status hasn't updated yet

// RETRYING (stable): keeps checking until it matches
await expect(page.locator('#status')).toHaveText('Complete');
```

**The full list of retrying assertions:**

```typescript
// Text assertions
await expect(locator).toHaveText('expected text');
await expect(locator).toContainText('partial text');
await expect(locator).not.toHaveText('unexpected text');

// Visibility assertions
await expect(locator).toBeVisible();
await expect(locator).toBeHidden();
await expect(locator).toBeAttached();

// Value assertions (for inputs)
await expect(locator).toHaveValue('expected value');
await expect(locator).toHaveValues(['value1', 'value2']);

// Attribute assertions
await expect(locator).toHaveAttribute('href', '/dashboard');
await expect(locator).toHaveClass(/active/);

// Count assertions
await expect(locator).toHaveCount(5);

// Page-level assertions
await expect(page).toHaveURL(/.*dashboard/);
await expect(page).toHaveTitle('My App');
```

**Rule: Use retrying assertions for every state check.** The non-retrying `page.textContent()` and `locator.getAttribute()` methods should only be used to extract values after a retrying assertion has confirmed the state.

```typescript
// PATTERN: Confirm state with retrying assertion, then extract value
await expect(page.locator('#price')).toContainText('$');
const priceText = await page.locator('#price').textContent();
const price = parseFloat(priceText!.replace('$', ''));
expect(price).toBeGreaterThan(0);
```

## Prevention Pattern 2: Locator Hierarchy

Fragile locators are the second most common cause of Playwright flakiness. Use this hierarchy:

```typescript
// Tier 1: Role-based (most resilient)
page.getByRole('button', { name: 'Add to Cart' });
page.getByRole('heading', { name: 'Shopping Cart' });
page.getByRole('link', { name: 'Home' });
page.getByRole('textbox', { name: 'Email' });

// Tier 2: Semantic locators
page.getByLabel('Email address');
page.getByPlaceholder('Enter your email');
page.getByAltText('Company logo');
page.getByTitle('Settings');

// Tier 3: Test ID locators (stable contract between test and component)
page.getByTestId('checkout-button');

// Tier 4: CSS/XPath (last resort)
page.locator('[data-state="ready"]');
page.locator('.product-card >> text=Add to Cart');
```

**Why role-based locators are best:**
- They are tied to accessibility semantics, which rarely change.
- They match what users actually see and interact with.
- If the locator breaks, it usually means the accessibility was also broken -- which is a real bug.

## Prevention Pattern 3: Network Control

Tests that depend on real network requests are inherently variable. Playwright's route API gives you full control.

```typescript
// Mock a slow or unreliable API endpoint
test('displays product catalog', async ({ page }) => {
  await page.route('**/api/products', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        products: [
          { id: 1, name: 'Widget', price: 9.99 },
          { id: 2, name: 'Gadget', price: 19.99 },
        ],
      }),
    });
  });

  await page.goto('/products');
  await expect(page.getByText('Widget')).toBeVisible();
  await expect(page.getByText('Gadget')).toBeVisible();
});
```

**Mock selectively, not globally.** Mock the endpoints that cause flakiness (slow, unreliable, or non-deterministic responses) and let stable, fast endpoints pass through.

```typescript
// Only mock the problematic recommendation engine
test('checkout flow', async ({ page }) => {
  // Mock only the slow recommendation API
  await page.route('**/api/recommendations', route =>
    route.fulfill({
      status: 200,
      body: JSON.stringify({ items: [] }),
    })
  );
  // All other API calls go to the real server

  await page.goto('/checkout');
  // ... rest of test
});
```

## Prevention Pattern 4: Test Isolation with Browser Contexts

Playwright's browser contexts provide lightweight isolation -- each context has its own cookies, local storage, and session state.

```typescript
import { test, expect } from '@playwright/test';

// Each test gets a fresh browser context automatically
test('user A sees their dashboard', async ({ page }) => {
  // This page is in an isolated context
  await page.goto('/login');
  await page.fill('#email', 'userA@test.com');
  await page.fill('#password', 'password');
  await page.click('#login-button');
  await expect(page).toHaveURL('/dashboard');
});

test('user B sees their dashboard', async ({ page }) => {
  // This page is in a DIFFERENT isolated context
  // User A's session does not leak into this test
  await page.goto('/login');
  await page.fill('#email', 'userB@test.com');
  await page.fill('#password', 'password');
  await page.click('#login-button');
  await expect(page).toHaveURL('/dashboard');
});
```

**For tests that share authentication state** (to avoid logging in repeatedly), use Playwright's storage state:

```typescript
// auth.setup.ts - Run once before all tests
import { test as setup, expect } from '@playwright/test';

setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.fill('#email', 'test@example.com');
  await page.fill('#password', 'password');
  await page.click('#login-button');
  await expect(page).toHaveURL('/dashboard');

  // Save authentication state
  await page.context().storageState({ path: '.auth/state.json' });
});

// playwright.config.ts
export default defineConfig({
  projects: [
    { name: 'auth-setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'chromium',
      dependencies: ['auth-setup'],
      use: {
        storageState: '.auth/state.json',
      },
    },
  ],
});
```

## Prevention Pattern 5: CI-Optimized Configuration

A Playwright config that works well locally may cause flakiness in CI. Use environment-aware configuration.

```typescript
import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;

export default defineConfig({
  // More retries in CI where environmental flakiness is more likely
  retries: isCI ? 2 : 0,

  // Fewer workers in CI to reduce resource contention
  workers: isCI ? 2 : undefined,

  // Longer timeouts in CI where things are slower
  timeout: isCI ? 60_000 : 30_000,
  expect: {
    timeout: isCI ? 15_000 : 5_000,
  },

  use: {
    // Consistent viewport across environments
    viewport: { width: 1280, height: 720 },

    // Disable animations everywhere
    reducedMotion: 'reduce',

    // Capture debugging artifacts in CI
    trace: isCI ? 'on-first-retry' : 'off',
    screenshot: isCI ? 'only-on-failure' : 'off',
    video: isCI ? 'on-first-retry' : 'off',

    // Longer navigation timeout in CI
    navigationTimeout: isCI ? 30_000 : 15_000,
    actionTimeout: isCI ? 15_000 : 10_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Only run cross-browser in CI (not locally)
    ...(isCI
      ? [
          {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] },
          },
          {
            name: 'webkit',
            use: { ...devices['Desktop Safari'] },
          },
        ]
      : []),
  ],
});
```

## Tracking Playwright Test Reliability Over Time

After applying these prevention patterns, measure their impact using [DeFlaky](/demo).

```bash
# Run Playwright tests with JUnit reporter
npx playwright test --reporter=junit

# Analyze results
deflaky analyze --input test-results/results.xml --format junit

# Push to dashboard for historical tracking
deflaky push \
  --input test-results/results.xml \
  --project my-app \
  --commit $(git rev-parse HEAD)
```

The DeFlaky Dashboard tracks each Playwright test's FlakeScore across runs and can break down flakiness by browser (chromium, firefox, webkit), helping you identify browser-specific issues.

## A Playwright Reliability Checklist

Run through this checklist for every new Playwright test:

- [ ] All state checks use retrying assertions (`expect(locator).toHaveText()`, not `locator.textContent()`)
- [ ] Locators use role-based or test-ID strategies, not CSS classes
- [ ] External API calls that could be slow or unreliable are mocked
- [ ] Test creates its own data and does not depend on state from other tests
- [ ] Viewport size is set explicitly in configuration
- [ ] Animations are disabled via `reducedMotion: 'reduce'`
- [ ] Timeouts are appropriate for CI environments
- [ ] Traces are captured on retry for post-failure debugging

## Conclusion

Playwright provides the best tooling in the industry for writing reliable E2E tests, but the tools only work if you use them correctly. The trace-first debugging approach gives you definitive answers when flakiness appears. The prevention patterns -- retrying assertions, resilient locators, network mocking, context isolation, and CI-optimized configuration -- eliminate the most common causes before they manifest.

Start with the configuration changes (retries, reduced motion, timeouts). These take five minutes and prevent a large percentage of CI-specific flakiness. Then progressively adopt the code-level patterns as you write new tests and refactor existing ones.

Track your progress with [DeFlaky](/pricing) to ensure the improvements stick. A test suite that your team trusts is the ultimate goal -- and Playwright, properly configured, can deliver that trust.
