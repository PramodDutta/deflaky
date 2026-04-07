---
title: "Cypress Flaky Tests: Root Causes, Detection, and Fixes (Complete Guide)"
description: "A comprehensive guide to identifying, diagnosing, and fixing flaky Cypress tests. Learn about command queue timing, async pitfalls, cy.intercept issues, retry-ability, test isolation, and proven strategies to make your Cypress test suite rock-solid."
date: "2026-04-07"
slug: "cypress-flaky-tests"
keywords:
  - cypress flaky tests
  - fix cypress tests
  - cypress test reliability
  - cypress retry
  - cypress test flakiness
  - cypress command queue
  - cy.intercept timing
  - cypress test isolation
  - cypress async testing
  - cypress best practices
author: "Pramod Dutta"
---

# Cypress Flaky Tests: Root Causes, Detection, and Fixes (Complete Guide)

If you have ever watched a Cypress test pass five times in a row and then inexplicably fail on the sixth run with no code changes, you are not alone. Flaky Cypress tests are one of the most common frustrations for front-end and QA teams adopting end-to-end testing. They erode trust in your test suite, slow down CI/CD pipelines, and waste hours of engineering time chasing phantom failures.

This guide covers everything you need to know about Cypress flaky tests: why they happen, how to detect them systematically, and battle-tested fixes for every major category of flakiness. Whether you are dealing with timing issues in `cy.intercept`, race conditions in the command queue, or test isolation failures, you will find actionable solutions here.

## Why Cypress Tests Become Flaky

Before diving into fixes, it is worth understanding what makes Cypress tests uniquely susceptible to flakiness -- and also uniquely equipped to fight it.

Cypress runs inside the browser alongside your application. This gives it powerful capabilities like automatic waiting, network interception, and direct DOM access. But it also means your tests are subject to every timing nuance of browser rendering, JavaScript execution, and network behavior.

### The Three Pillars of Cypress Flakiness

Most flaky Cypress tests fall into one of three categories:

1. **Timing and async issues** -- the test runs faster than the application can respond
2. **Test isolation failures** -- one test leaves behind state that affects another
3. **Environment dependencies** -- the test depends on external services, data, or browser behavior that varies between runs

Understanding which category your flaky test belongs to is the first step toward fixing it.

## Root Cause #1: The Cypress Command Queue and Timing Issues

Cypress commands do not execute immediately. They are enqueued and run asynchronously in a deterministic order. This is one of Cypress's greatest strengths, but misunderstanding how the command queue works is the number one source of flaky tests.

### How the Command Queue Works

When you write Cypress code like this:

```javascript
cy.get('.submit-button').click();
cy.get('.success-message').should('be.visible');
```

These commands are not executed line by line. Instead, Cypress adds them to a queue and processes them sequentially. Each command waits for the previous one to complete before executing. This is why you do not need explicit `await` statements in Cypress.

### The Mixing Problem: Cypress Commands and Regular JavaScript

Problems arise when you mix Cypress commands with synchronous JavaScript:

```javascript
// PROBLEMATIC: Mixing sync JS with Cypress commands
let userName;
cy.get('.user-name').then(($el) => {
  userName = $el.text();
});
// This runs BEFORE the .then() callback!
console.log(userName); // undefined
cy.get('.greeting').should('contain', userName); // flaky!
```

The fix is to keep everything inside the Cypress command chain:

```javascript
// CORRECT: Stay within the command chain
cy.get('.user-name').then(($el) => {
  const userName = $el.text();
  cy.get('.greeting').should('contain', userName);
});
```

### Conditional Testing Pitfalls

Conditional testing is another area where the command queue causes flakiness:

```javascript
// FLAKY: The condition might evaluate at the wrong time
cy.get('body').then(($body) => {
  if ($body.find('.modal').length > 0) {
    cy.get('.modal .close').click();
  }
});
cy.get('.main-content').should('be.visible');
```

The problem is that the modal might appear after the `$body.find()` check but before the next assertion. A more robust approach uses explicit waits or assertions:

```javascript
// BETTER: Use an assertion-based approach
cy.get('.main-content', { timeout: 10000 }).should('be.visible');
```

### Race Conditions with `cy.then()`

The `cy.then()` command is essential but can introduce race conditions when used carelessly:

```javascript
// FLAKY: Multiple .then() blocks that depend on shared state
let itemCount;
cy.get('.items').then(($items) => {
  itemCount = $items.length;
});
cy.get('.add-item').click();
cy.get('.items').then(($items) => {
  // itemCount might not be set yet in some edge cases
  expect($items.length).to.equal(itemCount + 1);
});
```

The reliable pattern nests dependent operations:

```javascript
// RELIABLE: Nested dependencies
cy.get('.items').its('length').then((initialCount) => {
  cy.get('.add-item').click();
  cy.get('.items').should('have.length', initialCount + 1);
});
```

## Root Cause #2: Network Interception Timing with cy.intercept

Network-related flakiness is extremely common in Cypress tests. The `cy.intercept()` API is powerful, but timing issues with network requests are a leading cause of flaky tests.

### The Setup-Before-Action Rule

The most fundamental rule with `cy.intercept()` is that you must set up the intercept before the action that triggers the network request:

```javascript
// FLAKY: Intercept set up too late
cy.get('.load-data').click();
cy.intercept('GET', '/api/data').as('getData');
cy.wait('@getData'); // Might miss the request entirely!

// CORRECT: Intercept before the trigger
cy.intercept('GET', '/api/data').as('getData');
cy.get('.load-data').click();
cy.wait('@getData');
```

### Handling Multiple Requests to the Same Endpoint

Applications often make multiple requests to the same endpoint. This causes flakiness when your test waits for the wrong one:

```javascript
// FLAKY: Might catch the wrong request
cy.intercept('GET', '/api/users*').as('getUsers');
cy.visit('/dashboard');
cy.wait('@getUsers'); // Catches the initial load
cy.get('.refresh').click();
cy.wait('@getUsers'); // Might still be waiting on the first request!
```

Use numbered aliases or more specific matching:

```javascript
// RELIABLE: Use specific request matching
cy.intercept('GET', '/api/users*').as('getUsers');
cy.visit('/dashboard');
cy.wait('@getUsers');

// Set up a new intercept for the refresh
cy.intercept('GET', '/api/users*').as('getUsersRefresh');
cy.get('.refresh').click();
cy.wait('@getUsersRefresh');
```

### Stubbing vs. Letting Requests Through

One of the most impactful decisions for test reliability is whether to stub network requests or let them hit a real server:

```javascript
// STUBBED: Deterministic and fast
cy.intercept('GET', '/api/products', {
  statusCode: 200,
  body: {
    products: [
      { id: 1, name: 'Widget', price: 9.99 },
      { id: 2, name: 'Gadget', price: 19.99 },
    ],
  },
}).as('getProducts');

// REAL: Subject to server timing, data changes, network issues
cy.intercept('GET', '/api/products').as('getProducts');
```

For tests that verify UI behavior, stub the network. For integration tests that verify API contracts, let requests through but add generous timeouts and proper error handling.

### Handling Slow or Delayed Responses

Sometimes flakiness comes from the server responding faster or slower than expected:

```javascript
// Simulate realistic network delay to catch timing bugs
cy.intercept('POST', '/api/submit', (req) => {
  req.reply({
    delay: 500,
    statusCode: 200,
    body: { success: true },
  });
}).as('submitForm');

cy.get('.submit').click();
// Now test the loading state
cy.get('.loading-spinner').should('be.visible');
cy.wait('@submitForm');
cy.get('.loading-spinner').should('not.exist');
cy.get('.success-message').should('be.visible');
```

## Root Cause #3: Retry-ability and Assertions

Cypress has a built-in retry mechanism for assertions, but not all commands are retryable. Misunderstanding which commands retry and which do not is a major source of flakiness.

### Commands That Retry vs. Commands That Do Not

Retryable commands include `cy.get()`, `cy.find()`, `cy.contains()`, and most query commands. Non-retryable commands include `cy.click()`, `cy.type()`, `cy.then()`, and most action commands.

This distinction matters enormously:

```javascript
// FLAKY: .then() does not retry
cy.get('.items').then(($items) => {
  expect($items).to.have.length(5); // Does not retry if items are still loading
});

// RELIABLE: .should() retries until passing or timeout
cy.get('.items').should('have.length', 5); // Retries automatically
```

### Chaining Assertions for Retry-ability

You can chain multiple assertions, and Cypress will retry the entire chain:

```javascript
// All assertions retry together
cy.get('.user-card')
  .should('be.visible')
  .and('contain', 'John Doe')
  .and('have.class', 'active');
```

### Custom Retry Logic with should() Callbacks

For complex assertions, use the callback form of `should()`:

```javascript
// Custom retry logic
cy.get('.data-table').should(($table) => {
  const rows = $table.find('tr');
  expect(rows.length).to.be.greaterThan(0);

  const firstRow = rows.first();
  expect(firstRow.find('td').first().text().trim()).to.not.be.empty;
});
```

This entire callback retries until all expectations pass or the timeout expires.

### Adjusting Timeouts Strategically

Rather than using a global timeout increase (which slows down your entire suite), adjust timeouts for specific commands:

```javascript
// Targeted timeout for slow operations
cy.get('.analytics-dashboard', { timeout: 15000 }).should('be.visible');

// Default timeout for fast operations
cy.get('.nav-menu').should('be.visible');
```

## Root Cause #4: Test Isolation Failures

Test isolation failures are insidious because they create flakiness that only appears when tests run in a specific order. A test might pass when run alone but fail when run as part of the full suite.

### Shared State Through the Application

The most common isolation failure is shared application state:

```javascript
// Test A: Creates data
it('should create a new item', () => {
  cy.get('.add-item').click();
  cy.get('.item-name').type('Test Item');
  cy.get('.save').click();
  cy.get('.items-list').should('contain', 'Test Item');
});

// Test B: Assumes clean state - FLAKY if Test A runs first
it('should show empty state when no items exist', () => {
  cy.visit('/items');
  cy.get('.empty-state').should('be.visible'); // Fails because Test A created an item!
});
```

### Fixing Isolation with beforeEach

Use `beforeEach` hooks to reset state:

```javascript
beforeEach(() => {
  // Reset database state via API
  cy.request('POST', '/api/test/reset');

  // Clear browser state
  cy.clearCookies();
  cy.clearLocalStorage();

  // Visit the page fresh
  cy.visit('/items');
});
```

### Cypress Session API for Efficient Isolation

Cypress's `cy.session()` API lets you cache and restore login state efficiently while maintaining isolation:

```javascript
Cypress.Commands.add('login', (username, password) => {
  cy.session([username, password], () => {
    cy.visit('/login');
    cy.get('#username').type(username);
    cy.get('#password').type(password);
    cy.get('.login-button').click();
    cy.url().should('include', '/dashboard');
  });
});

beforeEach(() => {
  cy.login('testuser', 'password123');
});
```

### Local Storage and Cookie Leakage

Even with `cy.clearCookies()`, some state can persist. Be thorough:

```javascript
beforeEach(() => {
  cy.clearCookies();
  cy.clearLocalStorage();

  // Clear sessionStorage too
  cy.window().then((win) => {
    win.sessionStorage.clear();
  });

  // Clear IndexedDB if your app uses it
  cy.window().then((win) => {
    win.indexedDB.databases().then((databases) => {
      databases.forEach((db) => {
        win.indexedDB.deleteDatabase(db.name);
      });
    });
  });
});
```

## Root Cause #5: DOM and Rendering Timing

Even with Cypress's built-in waiting, DOM timing issues can cause flakiness, especially with modern front-end frameworks that use virtual DOM diffing and asynchronous rendering.

### Animations and Transitions

CSS animations and transitions are a frequent source of flakiness:

```javascript
// FLAKY: Clicking during an animation
cy.get('.dropdown-trigger').click();
cy.get('.dropdown-menu .item').first().click(); // Might fail if menu is animating

// RELIABLE: Wait for animation to complete
cy.get('.dropdown-trigger').click();
cy.get('.dropdown-menu')
  .should('be.visible')
  .and('not.have.class', 'animating');
cy.get('.dropdown-menu .item').first().click();
```

You can also disable animations globally in your test setup:

```javascript
// cypress/support/e2e.js
beforeEach(() => {
  cy.document().then((doc) => {
    const style = doc.createElement('style');
    style.innerHTML = `
      *, *::before, *::after {
        animation-duration: 0s !important;
        transition-duration: 0s !important;
      }
    `;
    doc.head.appendChild(style);
  });
});
```

### Detached DOM Elements

When frameworks re-render components, DOM elements get replaced. If Cypress holds a reference to an old element, commands will fail:

```javascript
// FLAKY: Element might get detached between commands
cy.get('.user-list li').first().as('firstUser');
cy.get('.refresh').click(); // Triggers re-render
cy.get('@firstUser').click(); // Element is detached!

// RELIABLE: Re-query after actions that trigger re-renders
cy.get('.refresh').click();
cy.get('.user-list li').first().click();
```

### React, Vue, and Angular Specific Issues

Each framework has its own rendering quirks:

**React**: State updates are batched and asynchronous. After triggering a state change, wait for the resulting DOM update:

```javascript
cy.get('.increment').click();
// React batches updates - wait for the new value
cy.get('.counter').should('have.text', '1');
```

**Vue**: Vue uses `nextTick` for DOM updates. Similar waiting patterns apply:

```javascript
cy.get('.toggle').click();
cy.get('.content').should('be.visible'); // Vue will update on next tick
```

**Angular**: Zone.js can interfere with Cypress's waiting. Use `cy.wait()` sparingly for Angular-specific stabilization issues, or configure Cypress to wait for Angular zones to stabilize.

## Root Cause #6: Viewport and Responsive Design Flakiness

Tests that pass on one viewport size but fail on another are a subtle form of flakiness:

```javascript
// Set viewport explicitly at the start of each test
beforeEach(() => {
  cy.viewport(1280, 720);
});

// Or test multiple viewports explicitly
const viewports = ['iphone-6', 'ipad-2', [1280, 720]];
viewports.forEach((viewport) => {
  it(`should display navigation correctly on ${viewport}`, () => {
    if (Array.isArray(viewport)) {
      cy.viewport(viewport[0], viewport[1]);
    } else {
      cy.viewport(viewport);
    }
    cy.visit('/');
    cy.get('.nav').should('be.visible');
  });
});
```

## Detecting Flaky Cypress Tests Systematically

Finding flaky tests before they become a problem requires a systematic approach.

### Cypress's Built-in Retry Mechanism

Cypress has a built-in test retry feature that you can configure in `cypress.config.js`:

```javascript
module.exports = defineConfig({
  retries: {
    runMode: 2,    // Retries in CI
    openMode: 0,   // No retries in interactive mode
  },
});
```

While retries mask flakiness in CI, they also help identify flaky tests. Any test that needs a retry to pass should be investigated.

### Running Tests Multiple Times

The simplest detection method is to run your tests multiple times:

```bash
# Run the same spec 10 times
for i in {1..10}; do
  npx cypress run --spec "cypress/e2e/checkout.cy.js"
done
```

### Using DeFlaky for Automated Detection

Manual detection is tedious and error-prone. DeFlaky automates the entire process by running your test suite multiple times, tracking pass/fail patterns, and calculating a FlakeScore for each test:

```bash
# Install DeFlaky
npm install -g deflaky

# Analyze your Cypress tests for flakiness
deflaky analyze --framework cypress --runs 10

# View the dashboard for detailed results
deflaky dashboard
```

DeFlaky integrates directly with Cypress and can identify flaky tests that only fail under specific conditions -- like when run in parallel, after a particular test, or on specific browser versions. Its dashboard shows trends over time, helping you prioritize which flaky tests to fix first based on their impact on your pipeline.

### Monitoring CI Failure Patterns

Track your CI failures over time. A test that fails once every 20 runs is flaky. Key metrics to watch:

- **Failure rate per test**: How often does each test fail across all runs?
- **Failure correlation**: Do certain tests always fail together?
- **Time-based patterns**: Do failures cluster around certain times of day (suggesting external dependency issues)?

## Building Custom Commands for Reliability

Custom Cypress commands can encapsulate reliability patterns so your team does not have to remember them every time:

### A Reliable Click Command

```javascript
Cypress.Commands.add('safeClick', (selector, options = {}) => {
  const { timeout = 10000, force = false } = options;

  cy.get(selector, { timeout })
    .should('be.visible')
    .should('not.be.disabled')
    .then(($el) => {
      // Ensure element is not covered by another element
      const rect = $el[0].getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const topElement = Cypress.$(document.elementFromPoint(centerX, centerY));

      if (topElement.is($el) || $el.find(topElement).length > 0 || topElement.closest(selector).length > 0) {
        cy.wrap($el).click({ force });
      } else {
        // Scroll into view and retry
        cy.wrap($el).scrollIntoView().click({ force });
      }
    });
});
```

### A Reliable Form Fill Command

```javascript
Cypress.Commands.add('fillForm', (formData) => {
  Object.entries(formData).forEach(([selector, value]) => {
    cy.get(selector)
      .should('be.visible')
      .clear()
      .type(value, { delay: 50 })
      .should('have.value', value);
  });
});

// Usage
cy.fillForm({
  '#first-name': 'John',
  '#last-name': 'Doe',
  '#email': 'john@example.com',
});
```

### A Reliable Wait-for-API Command

```javascript
Cypress.Commands.add('waitForApi', (method, url, alias, options = {}) => {
  const { timeout = 30000, statusCode = 200 } = options;

  cy.intercept(method, url).as(alias);

  return cy.wait(`@${alias}`, { timeout }).then((interception) => {
    if (statusCode) {
      expect(interception.response.statusCode).to.equal(statusCode);
    }
    return interception;
  });
});
```

## Advanced Fix Strategies

### Strategy 1: Deterministic Test Data

Never rely on shared or production-like data for tests. Create fresh data for each test:

```javascript
beforeEach(() => {
  // Seed the database with known state
  cy.task('db:seed', {
    users: [
      { id: 1, name: 'Test User', email: 'test@example.com' },
    ],
    products: [
      { id: 1, name: 'Widget', price: 9.99, stock: 100 },
    ],
  });
});
```

### Strategy 2: Clock Control for Time-Dependent Tests

Tests that depend on the current time are inherently flaky:

```javascript
// FLAKY: Depends on current time
it('should show morning greeting before noon', () => {
  cy.visit('/dashboard');
  cy.get('.greeting').should('contain', 'Good morning'); // Only works before noon!
});

// RELIABLE: Control the clock
it('should show morning greeting before noon', () => {
  const morning = new Date(2026, 3, 7, 9, 0, 0); // April 7, 2026, 9:00 AM
  cy.clock(morning.getTime());
  cy.visit('/dashboard');
  cy.get('.greeting').should('contain', 'Good morning');
});
```

### Strategy 3: Parallelization Without Interference

When running Cypress tests in parallel, ensure tests do not interfere with each other:

```javascript
// Use unique identifiers per test worker
const workerId = Cypress.env('WORKER_ID') || '0';

it('should create and verify an order', () => {
  const uniqueEmail = `test-${workerId}-${Date.now()}@example.com`;

  cy.get('#email').type(uniqueEmail);
  cy.get('#submit').click();
  cy.get('.confirmation').should('contain', uniqueEmail);
});
```

### Strategy 4: Handling Third-Party Scripts

Third-party scripts (analytics, chat widgets, ads) can interfere with tests:

```javascript
// Block third-party scripts in tests
beforeEach(() => {
  cy.intercept('GET', 'https://www.google-analytics.com/**', { statusCode: 200, body: '' });
  cy.intercept('GET', 'https://cdn.intercom.io/**', { statusCode: 200, body: '' });
  cy.intercept('GET', '**/hotjar.com/**', { statusCode: 200, body: '' });
});
```

### Strategy 5: Visual Stability Assertions

Instead of relying solely on text or attribute assertions, verify visual stability:

```javascript
// Wait for the page to be visually stable before interacting
Cypress.Commands.add('waitForStable', (selector, options = {}) => {
  const { timeout = 10000, interval = 200 } = options;

  let previousHtml = '';
  let stableCount = 0;
  const requiredStableChecks = 3;

  const checkStability = () => {
    return cy.get(selector, { timeout }).then(($el) => {
      const currentHtml = $el.html();
      if (currentHtml === previousHtml) {
        stableCount++;
      } else {
        stableCount = 0;
        previousHtml = currentHtml;
      }

      if (stableCount < requiredStableChecks) {
        cy.wait(interval);
        return checkStability();
      }
    });
  };

  return checkStability();
});
```

## Cypress Configuration for Maximum Reliability

Here is a production-tested `cypress.config.js` that minimizes flakiness:

```javascript
const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    defaultCommandTimeout: 10000,
    requestTimeout: 15000,
    responseTimeout: 30000,
    pageLoadTimeout: 60000,

    retries: {
      runMode: 2,
      openMode: 0,
    },

    video: true,
    screenshotOnRunFailure: true,

    // Improve test isolation
    testIsolation: true,

    // Disable Chrome Web Security for cross-origin testing
    chromeWebSecurity: false,

    // Experimental features for stability
    experimentalMemoryManagement: true,

    setupNodeEvents(on, config) {
      // Increase memory for large test suites
      on('before:browser:launch', (browser, launchOptions) => {
        if (browser.family === 'chromium') {
          launchOptions.args.push('--disable-gpu');
          launchOptions.args.push('--disable-dev-shm-usage');
          launchOptions.args.push('--no-sandbox');
          launchOptions.args.push('--disable-extensions');
        }
        return launchOptions;
      });

      return config;
    },
  },
});
```

## A Flaky Test Debugging Checklist

When you encounter a flaky Cypress test, work through this checklist:

1. **Reproduce the flakiness**: Run the test 20 times. If it does not fail, try running it as part of the full suite.

2. **Check the command log**: Cypress's command log shows exactly what happened. Look for unexpectedly long waits or commands that retried many times.

3. **Review the screenshot and video**: Cypress captures screenshots on failure and records video. These are invaluable for understanding what the user would have seen.

4. **Isolate the test**: Run just the flaky test. If it passes consistently in isolation, the problem is test ordering or shared state.

5. **Check network requests**: Use `cy.intercept()` to log all network requests and check for unexpected failures or slow responses.

6. **Look for timing assumptions**: Search for `cy.wait(number)`, hardcoded timeouts, or assertions that assume immediate updates.

7. **Verify test data**: Ensure the test is not depending on data that changes between runs.

8. **Check the environment**: Is the test flaky only in CI? Check for differences in browser version, viewport size, network speed, or available resources.

## Integrating Flaky Test Detection into Your Workflow

The best teams do not just fix flaky tests reactively -- they prevent them proactively.

### Pre-Merge Detection

Run each PR's tests multiple times before merging to catch flakiness early:

```yaml
# GitHub Actions example
name: Cypress Flaky Test Detection
on: pull_request

jobs:
  flaky-detection:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        run: [1, 2, 3, 4, 5]
    steps:
      - uses: actions/checkout@v4
      - uses: cypress-io/github-action@v6
        with:
          command: npx cypress run
```

### Continuous Monitoring with DeFlaky

DeFlaky can run as part of your CI pipeline and track flakiness trends over time. It automatically quarantines tests that exceed a configurable flake threshold, preventing them from blocking deployments while alerting the team to fix them:

```yaml
# DeFlaky CI integration
- name: Run DeFlaky Analysis
  run: |
    deflaky ci --framework cypress \
      --threshold 0.05 \
      --quarantine-on-flake \
      --notify slack
```

The DeFlaky dashboard provides historical FlakeScore trends, letting you see whether your test suite is getting more or less reliable over time. Teams that track this metric consistently reduce their flake rate by 60-80% within three months.

### Team Practices

Beyond tooling, adopt these team practices:

- **Flaky test SLA**: Any test flagged as flaky must be fixed within 48 hours or quarantined.
- **Code review for test reliability**: Review test code with the same rigor as production code. Look for timing assumptions, missing waits, and isolation issues.
- **Flaky test retrospectives**: Monthly reviews of flaky test patterns to identify systemic issues.

## Common Cypress Anti-Patterns That Cause Flakiness

### Anti-Pattern 1: Arbitrary cy.wait()

```javascript
// BAD: Arbitrary wait
cy.get('.button').click();
cy.wait(3000);
cy.get('.result').should('exist');

// GOOD: Wait for a specific condition
cy.get('.button').click();
cy.get('.result', { timeout: 10000 }).should('be.visible');
```

### Anti-Pattern 2: Testing Through the UI for Setup

```javascript
// BAD: UI-based setup is slow and flaky
it('should edit a product', () => {
  cy.visit('/admin/login');
  cy.get('#username').type('admin');
  cy.get('#password').type('admin123');
  cy.get('.login').click();
  cy.visit('/admin/products');
  cy.get('.add-product').click();
  // ... 20 more steps just to create a product to edit

  // NOW we test the actual edit functionality
  cy.get('.edit-product').first().click();
});

// GOOD: API-based setup is fast and reliable
it('should edit a product', () => {
  cy.request('POST', '/api/products', { name: 'Test Product', price: 10 });
  cy.login('admin'); // Custom command using cy.session()
  cy.visit('/admin/products');
  cy.get('.edit-product').first().click();
});
```

### Anti-Pattern 3: Over-Specific Selectors

```javascript
// BAD: Brittle selector
cy.get('div.container > div:nth-child(2) > ul > li:first-child > a');

// GOOD: Data attribute selector
cy.get('[data-testid="first-item-link"]');
```

### Anti-Pattern 4: Not Waiting for Navigation

```javascript
// BAD: Assuming instant navigation
cy.get('.nav-link').click();
cy.get('.page-content').should('exist'); // Might check before navigation starts

// GOOD: Wait for URL change
cy.get('.nav-link').click();
cy.url().should('include', '/target-page');
cy.get('.page-content').should('be.visible');
```

### Anti-Pattern 5: Ignoring Uncaught Exceptions

Uncaught exceptions in your application will fail Cypress tests. Handle them explicitly:

```javascript
// In cypress/support/e2e.js
Cypress.on('uncaught:exception', (err, runnable) => {
  // Known third-party errors that don't affect our tests
  if (err.message.includes('ResizeObserver loop')) {
    return false; // Prevent test failure
  }
  // Let other errors fail the test
  return true;
});
```

## Measuring Your Progress

Track these metrics to measure your flaky test improvement:

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Flake Rate | < 1% | Failed runs / Total runs per test |
| Mean Time to Detect | < 1 day | Time from introduction to detection |
| Mean Time to Fix | < 2 days | Time from detection to fix |
| Retry Rate | < 5% | Tests requiring retry / Total tests |
| Suite Reliability | > 99% | Clean runs / Total suite runs |

DeFlaky tracks all of these metrics automatically and provides trend analysis, letting you demonstrate concrete improvement to stakeholders.

## Conclusion

Flaky Cypress tests are not inevitable. By understanding the command queue, mastering `cy.intercept()` timing, leveraging retry-ability, ensuring test isolation, and using tools like DeFlaky for automated detection and monitoring, you can build a Cypress test suite that your team actually trusts.

The key is to treat test reliability as a first-class engineering concern, not an afterthought. Every flaky test that goes unfixed erodes trust in your entire test suite, slows down your CI pipeline, and wastes engineering time. Start with the quick wins -- fixing arbitrary waits, adding proper assertions, and stubbing network requests -- then build toward a comprehensive reliability strategy that includes automated detection, monitoring, and team practices.

Your future self, staring at a green CI pipeline at 5 PM on a Friday, will thank you.
