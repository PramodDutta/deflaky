---
title: "How to Fix Flaky Vitest Tests: Common Causes and Proven Solutions"
description: "Learn how to identify and fix flaky Vitest tests caused by timer mocking issues, async/await problems, shared state, and module mocking. A comprehensive guide with code examples and Vitest-specific solutions."
date: "2026-04-13"
slug: "vitest-flaky-tests"
keywords:
  - vitest flaky tests
  - vitest test failures
  - vitest async tests
  - vitest testing guide
  - fix vitest tests
author: "Pramod Dutta"
---

# How to Fix Flaky Vitest Tests: Common Causes and Proven Solutions

Vitest has rapidly become the go-to testing framework for Vite-powered projects, offering blazing-fast execution, native ESM support, and a Jest-compatible API. But as teams scale their Vitest test suites, a familiar enemy appears: flaky tests.

If you have been battling **vitest flaky tests** that pass one moment and fail the next, you are not alone. Flakiness in Vitest often stems from its unique execution model, which differs from Jest in important ways. Understanding these differences is the key to writing stable, deterministic tests.

This guide covers every major source of Vitest flakiness, explains why each occurs at a technical level, and provides battle-tested solutions to eliminate them from your codebase.

## How Vitest's Execution Model Differs from Jest

Before diagnosing **vitest flaky tests**, you need to understand what makes Vitest's runtime unique. Vitest runs tests using Vite's dev server and its native ESM module system by default. This means:

- **Modules are real ES modules**, not CommonJS transforms. This affects how mocking works.
- **Tests run in worker threads** (or the main thread, depending on configuration), which impacts shared state.
- **Vite's HMR-optimized module graph** is used under the hood, meaning module resolution can behave differently than in Node.js or Jest.

These architectural choices give Vitest its speed advantage, but they also create unique avenues for flakiness that do not exist in other frameworks.

## Timer Mocking Issues in Vitest

Timer-related flakiness is one of the most common sources of **vitest flaky tests**. Vitest provides `vi.useFakeTimers()` and `vi.useRealTimers()` to control time, but misusing them leads to intermittent failures.

### The Problem: Timers Leaking Between Tests

```typescript
// BAD: Timer state leaks into subsequent tests
describe('notification system', () => {
  test('shows notification after delay', () => {
    vi.useFakeTimers();
    const callback = vi.fn();

    setTimeout(callback, 5000);
    vi.advanceTimersByTime(5000);

    expect(callback).toHaveBeenCalled();
    // Missing vi.useRealTimers() - timers leak!
  });

  test('fetches data on mount', async () => {
    // This test now runs with fake timers active
    // Any internal setTimeout/setInterval will not fire
    const data = await fetchUserData(); // May hang or timeout
    expect(data).toBeDefined();
  });
});
```

### The Fix: Always Restore Timers with afterEach

```typescript
describe('notification system', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('shows notification after delay', () => {
    const callback = vi.fn();
    setTimeout(callback, 5000);
    vi.advanceTimersByTime(5000);
    expect(callback).toHaveBeenCalled();
  });
});
```

### Date Mocking Pitfalls

Vitest's fake timers also mock `Date`, which can cause surprising failures:

```typescript
// BAD: Date.now() returns the fake time
vi.useFakeTimers();
vi.setSystemTime(new Date('2025-01-01'));

// If your code compares dates or calculates durations,
// the frozen time will cause unexpected results
const token = generateJWT(); // Expiry calculated from frozen Date.now()
vi.advanceTimersByTime(60000);
expect(isTokenValid(token)).toBe(true); // May fail if token uses Date.now()
```

```typescript
// GOOD: Be explicit about what you mock
vi.useFakeTimers({
  shouldAdvanceTime: true, // Let real time pass for Promises
  toFake: ['setTimeout', 'setInterval'], // Only fake timers, not Date
});
```

## Async/Await Problems

Async test failures are the second most frequent category of vitest flaky tests. Vitest handles async code well, but subtle patterns can introduce non-determinism.

### Unresolved Promises

```typescript
// BAD: Promise is created but not awaited
test('saves user data', () => {
  const user = { name: 'Alice' };
  saveUser(user); // Returns a Promise, but test doesn't await it
  expect(getUserFromCache('Alice')).toBeDefined(); // Race condition
});
```

```typescript
// GOOD: Always await async operations
test('saves user data', async () => {
  const user = { name: 'Alice' };
  await saveUser(user);
  expect(getUserFromCache('Alice')).toBeDefined();
});
```

### Floating Promises in Event Handlers

A more insidious version occurs when async operations are triggered inside callbacks:

```typescript
// BAD: The event handler fires an unawaited async operation
test('form submission triggers save', async () => {
  const form = renderForm();
  await userEvent.click(form.getByRole('button', { name: 'Submit' }));

  // The click handler calls an async saveUser() internally
  // But we have no way to await it directly
  expect(mockApi.save).toHaveBeenCalled(); // Flaky!
});
```

```typescript
// GOOD: Use waitFor to poll for the expected result
test('form submission triggers save', async () => {
  const form = renderForm();
  await userEvent.click(form.getByRole('button', { name: 'Submit' }));

  await vi.waitFor(() => {
    expect(mockApi.save).toHaveBeenCalled();
  });
});
```

### The vi.waitFor Utility

Vitest 1.4+ includes `vi.waitFor()`, which retries an assertion until it passes or times out. This is essential for testing async side effects:

```typescript
await vi.waitFor(
  () => {
    expect(screen.getByText('Success')).toBeDefined();
  },
  {
    timeout: 2000,
    interval: 50,
  }
);
```

## Shared State Between Tests

Vitest runs tests in the same module scope by default (unless you configure `isolate: true`). This means variables declared at the module level persist across tests.

### Module-Level State Leaks

```typescript
// counter.ts
let count = 0;
export const increment = () => ++count;
export const getCount = () => count;
export const reset = () => (count = 0);
```

```typescript
// BAD: Tests share module state
import { increment, getCount } from './counter';

test('increments to 1', () => {
  increment();
  expect(getCount()).toBe(1); // Passes when run alone
});

test('increments to 1 again', () => {
  increment();
  expect(getCount()).toBe(1); // FAILS: count is already 1 from previous test
});
```

### The Fix: Reset State or Use Test Isolation

```typescript
import { increment, getCount, reset } from './counter';

beforeEach(() => {
  reset();
});

test('increments to 1', () => {
  increment();
  expect(getCount()).toBe(1);
});

test('increments to 1 again', () => {
  increment();
  expect(getCount()).toBe(1); // Passes
});
```

Alternatively, configure Vitest for full isolation:

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    isolate: true,       // Each test file gets its own module context
    fileParallelism: true, // Files still run in parallel
  },
});
```

Be aware that `isolate: true` increases execution time because each test file spins up a fresh module environment.

## Module Mocking Pitfalls

Vitest's `vi.mock()` works differently from Jest's `jest.mock()` because Vitest uses real ES modules. This difference is a significant source of confusion and flakiness.

### Hoisting Behavior

`vi.mock()` calls are hoisted to the top of the file, but the factory function runs at import time. This means you cannot reference variables declared later in the file:

```typescript
// BAD: Variable is not yet defined when the mock factory runs
const mockFn = vi.fn();

vi.mock('./api', () => ({
  fetchData: mockFn, // mockFn is undefined at hoist time!
}));
```

```typescript
// GOOD: Use vi.hoisted() to declare variables before hoisting
const { mockFn } = vi.hoisted(() => ({
  mockFn: vi.fn(),
}));

vi.mock('./api', () => ({
  fetchData: mockFn,
}));
```

### Partial Mocking with importOriginal

When you need to mock only part of a module, use `importOriginal`:

```typescript
vi.mock('./utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./utils')>();
  return {
    ...actual,
    calculateDiscount: vi.fn().mockReturnValue(0.1),
  };
});
```

### Mock Cleanup Between Tests

Mocks that are not cleaned up cause cascading failures:

```typescript
afterEach(() => {
  vi.restoreAllMocks(); // Restores original implementations
  vi.clearAllMocks();   // Clears call history and return values
});
```

## Vitest-Specific Configuration for Stability

Several Vitest configuration options directly impact test stability.

### Pool Configuration

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    pool: 'forks',          // Use child processes instead of threads
    poolOptions: {
      forks: {
        singleFork: false,  // Each file in its own process
      },
    },
  },
});
```

The `forks` pool provides better isolation than the default `threads` pool. If you have tests that modify global state or native modules, switching to `forks` often eliminates flakiness at the cost of startup time.

### Sequence and Ordering

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    sequence: {
      shuffle: true, // Randomize test order to catch hidden dependencies
    },
  },
});
```

Running tests in random order exposes order-dependent flakiness early. If a test fails only when shuffled, it depends on state from another test.

### Retry Configuration

For tests that are inherently flaky due to external dependencies, Vitest supports retries:

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    retry: 2, // Retry failed tests up to 2 times
  },
});
```

However, retries are a band-aid, not a cure. Use them only while you work on the root cause.

## Environment-Related Flakiness

Vitest supports multiple test environments: `node`, `jsdom`, `happy-dom`, and custom environments. Choosing the wrong one causes subtle failures.

### jsdom vs happy-dom

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'jsdom', // or 'happy-dom'
  },
});
```

`happy-dom` is faster but less complete. If your tests rely on specific browser APIs (like `IntersectionObserver`, `ResizeObserver`, or advanced CSS), `jsdom` is more reliable. Mixed environments across test files can also cause confusion:

```typescript
// At the top of a specific test file
// @vitest-environment jsdom
```

### Global Setup and Teardown

For integration tests that need shared resources (database connections, servers), use `globalSetup`:

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    globalSetup: './test/global-setup.ts',
  },
});
```

```typescript
// test/global-setup.ts
export async function setup() {
  // Start test database, seed data
  globalThis.__TEST_DB__ = await startTestDatabase();
}

export async function teardown() {
  await globalThis.__TEST_DB__?.stop();
}
```

## Snapshot Testing Flakiness

Snapshot tests in Vitest can become flaky when they capture non-deterministic data:

```typescript
// BAD: Snapshot includes timestamps and random IDs
test('renders user card', () => {
  const result = render(<UserCard user={testUser} />);
  expect(result).toMatchSnapshot();
  // Snapshot contains: id="user-a7b3c9", timestamp="2026-04-13T10:23:45Z"
});
```

```typescript
// GOOD: Use inline snapshots or serializers to exclude dynamic values
expect.addSnapshotSerializer({
  test: (val) => typeof val === 'string' && /user-[a-f0-9]+/.test(val),
  serialize: () => '"user-STABLE_ID"',
});
```

## Debugging Vitest Flaky Tests

When tracking down flaky tests, these Vitest features are invaluable:

### Reporter Configuration

```bash
# Run with verbose output to see test ordering
npx vitest --reporter=verbose

# Run a specific test file in isolation
npx vitest run src/utils.test.ts

# Run with a specific seed to reproduce shuffled order
npx vitest --sequence.seed=12345
```

### Using the Vitest UI

```bash
npx vitest --ui
```

The Vitest UI provides a visual test runner that shows timing, module graph dependencies, and test results in real time. It is excellent for spotting slow tests and unexpected module loading patterns.

## A Systematic Approach to Fixing Vitest Flaky Tests

When you encounter **vitest flaky tests**, follow this systematic approach:

1. **Isolate the test**: Run it alone with `vitest run path/to/test.ts`. If it passes alone but fails in the suite, you have a shared state issue.
2. **Shuffle the suite**: Use `--sequence.shuffle` to confirm order dependency.
3. **Check for async leaks**: Add `afterEach(() => vi.restoreAllMocks())` and ensure every Promise is awaited.
4. **Review timer usage**: Ensure `vi.useFakeTimers()` is paired with `vi.useRealTimers()` in every test.
5. **Inspect the pool**: Try switching between `threads` and `forks` pools to see if isolation resolves the issue.
6. **Check environment**: Ensure the test environment matches what the code expects.

## Automate Flaky Test Detection with DeFlaky

Manually tracking down vitest flaky tests is time-consuming and error-prone. Flaky tests can hide for weeks, only appearing intermittently in CI pipelines. By the time you notice them, developer trust in the test suite has already eroded.

DeFlaky automates the detection, tracking, and resolution of flaky tests across your entire test suite. Instead of guessing which tests are unreliable, you get concrete data on flake rates, failure patterns, and root causes.

Stop wasting engineering hours chasing intermittent failures. Run a quick analysis of your test suite right now:

```bash
npx deflaky run
```

DeFlaky will identify your flakiest tests, categorize their failure patterns, and provide actionable recommendations to fix them -- so your team can ship with confidence.
