---
title: "How to Fix Race Conditions in End-to-End Tests"
description: "Identify and fix race conditions in E2E tests with practical patterns for Playwright, Cypress, and Selenium across common scenarios."
date: 2026-04-05
slug: fix-race-conditions-e2e-tests
keywords:
  - race conditions e2e tests
  - fix race conditions tests
  - e2e test flakiness
  - async test race condition
  - test synchronization
  - end-to-end test reliability
  - browser test race condition
  - test timing issues
  - flaky e2e tests
  - test determinism
author: "DeFlaky Team"
---

# How to Fix Race Conditions in End-to-End Tests

Race conditions are the number one cause of flaky end-to-end tests. They occur when your test code and the application under test execute asynchronously, and your test assumes the application has finished an operation before it actually has. The test wins the race sometimes and loses it other times -- producing intermittent failures that drive engineers mad.

This guide catalogs the most common race conditions in E2E tests and provides deterministic fixes for each one.

## Understanding the Race

In an E2E test, three things happen concurrently:

1. **Your test code** sends commands (click, type, navigate).
2. **The browser** processes those commands and renders the UI.
3. **The application server** handles API requests triggered by UI actions.

A race condition occurs when your test asserts something that depends on step 2 or 3 completing, but your test code in step 1 did not wait for that completion.

```
Test code:      [click] -----> [assert text] -----> FAIL
Browser:        [click] -----> [send API request] -----> [receive response] -----> [render]
                                                                                     ^
                                                                            Text appears HERE
```

The test asserts before the text appears because it did not wait for the API round-trip and re-render.

## Race Condition 1: Click Then Assert

The most common race condition. The test clicks a button, then immediately checks for the result.

### The Problem

```typescript
// Playwright - FLAKY
await page.click('#add-to-cart');
const count = await page.textContent('#cart-count');
expect(count).toBe('1');  // Cart count hasn't updated yet
```

```javascript
// Cypress - FLAKY
cy.get('#add-to-cart').click();
cy.get('#cart-count').should('have.text', '1');
// Actually, Cypress auto-retries assertions, so this specific
// pattern is less flaky in Cypress. But the principle still applies
// to non-retrying checks.
```

```python
# Selenium - FLAKY
driver.find_element(By.ID, "add-to-cart").click()
count = driver.find_element(By.ID, "cart-count").text
assert count == "1"  # Cart count hasn't updated yet
```

### The Fix: Wait for the Expected State

**Playwright:**

```typescript
await page.click('#add-to-cart');
// Retrying assertion: keeps checking until text matches or timeout
await expect(page.locator('#cart-count')).toHaveText('1');
```

**Cypress:**

```javascript
cy.get('#add-to-cart').click();
// Cypress retries .should() assertions automatically
cy.get('#cart-count').should('have.text', '1');
```

**Selenium:**

```python
driver.find_element(By.ID, "add-to-cart").click()
WebDriverWait(driver, 10).until(
    EC.text_to_be_present_in_element((By.ID, "cart-count"), "1")
)
```

**The principle:** Never read state immediately after an action. Always use a waiting mechanism that polls for the expected state.

## Race Condition 2: Navigation Then Assert

After navigating to a new page or route, the test asserts content that has not loaded yet.

### The Problem

```typescript
// Playwright - FLAKY
await page.goto('/dashboard');
const revenue = await page.textContent('#revenue');
expect(revenue).toContain('$');
// The dashboard shell loaded, but the revenue API call is still in flight
```

### The Fix: Wait for Content, Not Navigation

```typescript
// Playwright - STABLE
await page.goto('/dashboard');
// Wait for the specific data to appear
await expect(page.locator('#revenue')).toContainText('$');
```

For data that loads via API after the initial page render:

```typescript
// Wait for the API response, then assert
await page.goto('/dashboard');
await page.waitForResponse(
  response => response.url().includes('/api/revenue') && response.status() === 200
);
await expect(page.locator('#revenue')).toContainText('$');
```

**Selenium version:**

```python
driver.get("https://app.example.com/dashboard")
# Don't just wait for page load -- wait for the data
WebDriverWait(driver, 15).until(
    lambda d: "$" in d.find_element(By.ID, "revenue").text
)
```

## Race Condition 3: Form Submit During Validation

The test submits a form while client-side validation is still running.

### The Problem

```typescript
// The form has real-time email validation that calls an API
await page.fill('#email', 'user@example.com');
await page.click('#submit');
// The email validation API hasn't responded yet
// The form either submits with invalid state or the button is still disabled
```

### The Fix: Wait for Validation to Complete

```typescript
await page.fill('#email', 'user@example.com');

// Wait for the validation indicator to show success
await expect(page.locator('#email-validation-status')).toHaveText('Valid');

// Or wait for the submit button to become enabled
await expect(page.locator('#submit')).toBeEnabled();
await page.click('#submit');
```

If the application does not expose a visible validation status, wait for the network request:

```typescript
await page.fill('#email', 'user@example.com');

// Wait for the validation API call to complete
await page.waitForResponse(
  resp => resp.url().includes('/api/validate-email')
);

await page.click('#submit');
```

## Race Condition 4: Parallel Test Data Mutations

Two tests running in parallel modify the same data, causing one or both to see unexpected state.

### The Problem

```python
# test_a.py - Runs in parallel with test_b.py
def test_update_user_name():
    user = api.get_user(id=1)
    api.update_user(id=1, name="Alice")
    user = api.get_user(id=1)
    assert user.name == "Alice"  # Might be "Bob" if test_b ran between update and assert

# test_b.py
def test_update_user_email():
    user = api.get_user(id=1)
    api.update_user(id=1, name="Bob", email="bob@test.com")
    user = api.get_user(id=1)
    assert user.email == "bob@test.com"
```

### The Fix: Unique Test Data per Test

```python
import uuid

def test_update_user_name():
    # Create a unique user for this test
    test_id = uuid.uuid4().hex[:8]
    user_id = api.create_user(name=f"User-{test_id}", email=f"{test_id}@test.com")

    api.update_user(id=user_id, name="Alice")
    user = api.get_user(id=user_id)
    assert user.name == "Alice"

    # Cleanup
    api.delete_user(id=user_id)

def test_update_user_email():
    test_id = uuid.uuid4().hex[:8]
    user_id = api.create_user(name=f"User-{test_id}", email=f"{test_id}@test.com")

    api.update_user(id=user_id, email="new@test.com")
    user = api.get_user(id=user_id)
    assert user.email == "new@test.com"

    api.delete_user(id=user_id)
```

**The principle:** Every test should create its own data and never depend on pre-existing state. This eliminates cross-test interference entirely.

## Race Condition 5: Animation Interference

An element is mid-animation when the test tries to interact with it. The click lands on the wrong coordinates because the element is still moving.

### The Problem

```typescript
// A dropdown menu slides open with a CSS transition
await page.click('#menu-button');
// The dropdown is animating open
await page.click('#menu-item-settings');  // Click misses because element is moving
```

### The Fix: Disable Animations in Tests

**Playwright:**

```typescript
// playwright.config.ts
export default defineConfig({
  use: {
    reducedMotion: 'reduce',
  },
});
```

**Cypress:**

```javascript
// cypress/support/commands.js
Cypress.Commands.add('disableAnimations', () => {
  cy.document().then(doc => {
    const style = doc.createElement('style');
    style.textContent = `
      *, *::before, *::after {
        animation-duration: 0s !important;
        transition-duration: 0s !important;
      }
    `;
    doc.head.appendChild(style);
  });
});

// In your test
beforeEach(() => {
  cy.disableAnimations();
});
```

**Selenium:**

```python
# Inject CSS to disable animations
driver.execute_script("""
    const style = document.createElement('style');
    style.textContent = `
        *, *::before, *::after {
            animation-duration: 0s !important;
            transition-duration: 0s !important;
        }
    `;
    document.head.appendChild(style);
""")
```

## Race Condition 6: Toast Notifications and Transient Elements

Your test needs to assert a toast notification that appears briefly and then auto-dismisses.

### The Problem

```typescript
await page.click('#save-button');
// The toast appears for 3 seconds then disappears
// If the test is slow, it might miss the toast entirely
const toast = await page.textContent('.toast-message');
expect(toast).toContain('Saved successfully');
```

### The Fix: Assert Before the Element Disappears

```typescript
await page.click('#save-button');
// Wait for the toast to appear (with retrying assertion)
await expect(page.locator('.toast-message')).toContainText('Saved successfully');
```

If the toast disappears too quickly for even retrying assertions, intercept the underlying event:

```typescript
// Set up a listener before the action
const toastPromise = page.waitForSelector('.toast-message', { state: 'attached' });
await page.click('#save-button');
const toast = await toastPromise;
const text = await toast.textContent();
expect(text).toContain('Saved successfully');
```

## Race Condition 7: Polling and Real-Time Updates

Applications with polling or WebSocket updates create a special type of race condition where the displayed data changes continuously.

### The Problem

```typescript
// Dashboard polls for new data every 5 seconds
await page.goto('/dashboard');
const count = await page.textContent('#active-users');
expect(parseInt(count)).toBeGreaterThan(0);
// The count might be "0" because the first poll hasn't completed,
// or it might have changed between reading and asserting
```

### The Fix: Wait for a Stable State

```typescript
// Wait for the data to load (non-zero value indicates loaded)
await page.goto('/dashboard');
await expect(page.locator('#active-users')).not.toHaveText('0');
await expect(page.locator('#active-users')).not.toHaveText('Loading...');

// For numeric assertions, use a retrying approach
await expect(async () => {
  const text = await page.textContent('#active-users');
  expect(parseInt(text || '0')).toBeGreaterThan(0);
}).toPass({ timeout: 10000 });
```

## A Systematic Approach to Finding Race Conditions

When debugging a flaky E2E test, use this process to identify race conditions:

**Step 1: Add artificial delay.** Insert a 5-second `sleep()` before the failing assertion. If the test passes consistently with the delay, you have confirmed a race condition.

**Step 2: Identify what the test is waiting for.** Is it waiting for an API response? A DOM update? An animation? A network request?

**Step 3: Replace the delay with an explicit wait.** Use the appropriate wait mechanism for your framework.

**Step 4: Remove the artificial delay.** The explicit wait should handle the timing.

**Step 5: Verify with multiple runs.** Run the test 50+ times to confirm stability.

```bash
# Run 50 times to verify the fix
for i in $(seq 1 50); do
  npx playwright test tests/checkout.spec.ts --reporter=line 2>&1 | tail -1
done
```

## Tracking Race Condition Fixes

After fixing race conditions, track whether the fixes hold over time using [DeFlaky](/demo). A test that was flaky due to a race condition might become flaky again if the application's performance degrades or the CI environment changes.

```bash
# Monitor the test's reliability after fixing
deflaky watch --test "checkout > processes payment" --alert-on-flake
```

## Conclusion

Race conditions in E2E tests follow predictable patterns. The seven patterns in this article cover the vast majority of timing-related flakiness: click-then-assert, navigate-then-assert, form validation timing, parallel data mutations, animation interference, transient element capture, and polling state.

The fix for every race condition follows the same principle: **never assume timing, always wait for state**. Replace implicit timing assumptions with explicit waits that poll for the condition your test actually depends on.

Use [DeFlaky](/pricing) to track which tests are flaky, identify the ones caused by race conditions, and verify that your fixes hold over time. Systematic detection and measurement turn race condition debugging from a frustrating guessing game into a data-driven engineering process.
