---
title: "Parallel Test Execution Causing Flaky Tests? Here's How to Fix It"
description: "Understand why parallel test execution causes flaky tests and learn proven strategies to fix shared state, database conflicts, port collisions, file locks, and test isolation issues with practical examples."
date: "2026-04-13"
slug: "parallel-test-execution-flaky"
keywords:
  - parallel tests flaky
  - parallel test execution
  - test isolation
  - concurrent testing
  - test sharding flaky
author: "Pramod Dutta"
---

# Parallel Test Execution Causing Flaky Tests? Here's How to Fix It

Parallel test execution is one of the most effective ways to reduce CI pipeline time. Running tests concurrently can cut a 30-minute suite down to 5 minutes. But it comes with a cost: tests that passed reliably in sequential mode suddenly become flaky when run in parallel.

If your **parallel tests flaky** failures are undermining developer trust and slowing down deployments, you are dealing with one of the most common -- and solvable -- problems in test engineering. The root cause is almost always some form of shared mutable state that tests inadvertently depend on.

This guide covers every major category of parallel test flakiness, from shared databases to port collisions to file system locks, and provides battle-tested strategies to achieve fast, reliable concurrent test execution.

## Why Sequential Tests Hide Problems

When tests run sequentially, order is deterministic. Test A always runs before Test B. If Test A creates a user record and Test B reads it, the dependency goes unnoticed because the execution order never changes.

Parallel execution shatters this illusion. Tests run in unpredictable order across multiple workers. Suddenly:

- Test B runs before Test A and finds no user record
- Test A and Test C both create the same record and conflict
- Test D reads a record that Test E is simultaneously deleting

The tests were always fragile. Parallel execution merely exposes the fragility.

## Shared State: The Root of All Parallel Flakiness

Every **parallel tests flaky** failure traces back to shared mutable state. This state takes many forms:

### In-Memory Global State

```typescript
// BAD: Global variable shared across parallel workers
let requestCount = 0;

export function trackRequest() {
  requestCount++;
}

export function getRequestCount() {
  return requestCount;
}
```

If tests in different workers both import this module, they each get their own copy (since workers have separate memory spaces). But if tests within the same worker share this module, they compete for the same counter.

```typescript
// GOOD: Scope state to individual test contexts
export function createRequestTracker() {
  let count = 0;
  return {
    track: () => count++,
    getCount: () => count,
  };
}
```

### Singleton Patterns

Singletons are the enemy of parallel testing:

```typescript
// BAD: Singleton database connection
class Database {
  private static instance: Database;
  private connection: Connection;

  static getInstance() {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }
}
```

```typescript
// GOOD: Factory function that creates isolated instances
function createDatabase(config: DatabaseConfig): Database {
  return new Database(config);
}
```

## Database Conflicts in Parallel Tests

Database-related failures are the most common category of **parallel tests flaky** issues. When multiple test workers share a database, they inevitably step on each other's data.

### The Problem: Shared Test Database

```typescript
// Test Worker 1
test('creates a user', async () => {
  await db.users.create({ email: 'test@example.com', name: 'Alice' });
  const user = await db.users.findByEmail('test@example.com');
  expect(user.name).toBe('Alice');
});

// Test Worker 2 (running simultaneously)
test('lists all users', async () => {
  await db.users.deleteAll(); // Deletes Worker 1's user!
  await db.users.create({ email: 'admin@example.com', name: 'Admin' });
  const users = await db.users.findAll();
  expect(users).toHaveLength(1); // May be 2 if Worker 1 inserts in between
});
```

### Solution 1: Database-Per-Worker

Give each test worker its own database:

```typescript
// global-setup.ts
export async function setup() {
  const workerCount = Number(process.env.VITEST_POOL_SIZE) || 4;

  for (let i = 0; i < workerCount; i++) {
    await createDatabase(`testdb_worker_${i}`);
    await runMigrations(`testdb_worker_${i}`);
  }
}

export async function teardown() {
  const workerCount = Number(process.env.VITEST_POOL_SIZE) || 4;
  for (let i = 0; i < workerCount; i++) {
    await dropDatabase(`testdb_worker_${i}`);
  }
}
```

```typescript
// test-setup.ts
const workerId = Number(process.env.VITEST_POOL_ID) || 0;
const databaseUrl = `postgres://test:test@localhost:5432/testdb_worker_${workerId}`;

beforeAll(async () => {
  await connectDatabase(databaseUrl);
});
```

### Solution 2: Schema-Per-Worker

Instead of separate databases, use PostgreSQL schemas:

```typescript
const workerId = process.env.VITEST_POOL_ID || '0';
const schema = `test_worker_${workerId}`;

beforeAll(async () => {
  await db.raw(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
  await db.raw(`SET search_path TO ${schema}`);
  await runMigrations();
});

afterAll(async () => {
  await db.raw(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
});
```

### Solution 3: Transaction Rollback

Wrap each test in a transaction that rolls back:

```typescript
let transaction: Transaction;

beforeEach(async () => {
  transaction = await db.beginTransaction();
});

afterEach(async () => {
  await transaction.rollback();
});
```

This is the fastest approach because it avoids re-seeding data, but it does not work for tests that require committed data (e.g., testing transaction isolation levels).

## Port Collisions

When tests start HTTP servers, WebSocket servers, or other network services, port collisions are inevitable in parallel execution.

### The Problem

```typescript
// BAD: Multiple workers try to bind to port 3000
beforeAll(async () => {
  server = app.listen(3000);
});
```

### The Fix: Dynamic Port Assignment

```typescript
// GOOD: Let the OS assign an available port
beforeAll(async () => {
  server = app.listen(0); // Port 0 = OS picks a free port
  const address = server.address() as AddressInfo;
  baseURL = `http://localhost:${address.port}`;
});
```

For services started via Docker Compose or external processes, use port offsetting based on worker ID:

```typescript
const workerId = Number(process.env.VITEST_POOL_ID) || 0;
const basePort = 3000 + workerId * 100;

// Worker 0: ports 3000-3099
// Worker 1: ports 3100-3199
// Worker 2: ports 3200-3299
```

## File System Locks and Conflicts

Tests that read from or write to the filesystem create contention in parallel execution.

### Temp Directory Conflicts

```typescript
// BAD: All workers write to the same temp directory
const outputPath = '/tmp/test-output/report.json';

test('generates report', async () => {
  await generateReport(outputPath);
  const report = await readFile(outputPath);
  expect(JSON.parse(report)).toHaveProperty('summary');
});
```

```typescript
// GOOD: Worker-specific temp directories
import { mkdtemp } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'test-'));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true });
});

test('generates report', async () => {
  const outputPath = join(tempDir, 'report.json');
  await generateReport(outputPath);
  const report = await readFile(outputPath);
  expect(JSON.parse(report)).toHaveProperty('summary');
});
```

### SQLite File Locks

SQLite uses file-level locking. Multiple workers writing to the same SQLite database will encounter SQLITE_BUSY errors:

```typescript
// GOOD: Separate SQLite file per worker
const workerId = process.env.VITEST_POOL_ID || '0';
const dbPath = join(tmpdir(), `test-${workerId}.sqlite`);
```

## Test Isolation Strategies

### Strategy 1: Process-Level Isolation

Each test file runs in its own process with its own memory space:

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: false, // Each file gets its own process
      },
    },
  },
});
```

This is the strongest isolation but the slowest. Use it when tests modify global state that cannot be easily reset.

### Strategy 2: Module-Level Isolation

Each test file gets its own module cache:

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    isolate: true, // Fresh module cache per file
  },
});
```

This prevents module-level state from leaking between test files while keeping the performance benefits of thread-based execution.

### Strategy 3: Test-Level Isolation with Setup/Teardown

The most granular approach, where each test explicitly sets up and tears down its state:

```typescript
let testContext: TestContext;

beforeEach(async () => {
  testContext = await createTestContext({
    database: true,
    server: true,
    fixtures: ['users', 'products'],
  });
});

afterEach(async () => {
  await testContext.destroy();
});
```

## Sharding: Distributing Tests Across Machines

Sharding takes parallelism beyond a single machine by distributing test files across multiple CI runners.

### Vitest Sharding

```bash
# Runner 1
npx vitest run --shard=1/3

# Runner 2
npx vitest run --shard=2/3

# Runner 3
npx vitest run --shard=3/3
```

### Jest Sharding

```bash
npx jest --shard=1/3
npx jest --shard=2/3
npx jest --shard=3/3
```

### Sharding Pitfalls That Cause Flakiness

**Uneven shard distribution**: If one shard gets all the slow tests, it becomes a bottleneck and may timeout:

```yaml
# GitHub Actions: Parallel sharding
jobs:
  test:
    strategy:
      matrix:
        shard: [1, 2, 3, 4]
    steps:
      - run: npx vitest run --shard=${{ matrix.shard }}/4
```

**Shard-dependent setup**: If your global setup assumes all tests run on the same machine, sharding breaks it:

```typescript
// BAD: Global setup seeds data that only shard 1's tests need
export async function setup() {
  await seedAllTestData(); // Unnecessary for shards 2-4
}

// GOOD: Each shard seeds only what it needs
export async function setup() {
  const shard = process.env.VITEST_SHARD;
  await seedDataForShard(shard);
}
```

## Detecting Order-Dependent Tests

To find tests that are flaky only in parallel, run your suite with randomized ordering:

```bash
# Vitest: Randomize test order
npx vitest run --sequence.shuffle

# Reproduce a specific order
npx vitest run --sequence.seed=42
```

If a test fails with shuffling but passes with the default order, it depends on another test's side effects. Track the seed value so you can reproduce the exact failing order.

## Real-World Parallel Testing Architecture

Here is a production-tested architecture for running **parallel tests flaky**-free in CI:

```
CI Pipeline
├── Shard 1 (GitHub Actions Runner)
│   ├── Worker 1 → testdb_1_1 → port range 3000-3099
│   ├── Worker 2 → testdb_1_2 → port range 3100-3199
│   └── Worker 3 → testdb_1_3 → port range 3200-3299
├── Shard 2 (GitHub Actions Runner)
│   ├── Worker 1 → testdb_2_1 → port range 3000-3099
│   ├── Worker 2 → testdb_2_2 → port range 3100-3199
│   └── Worker 3 → testdb_2_3 → port range 3200-3299
└── Shard 3 (GitHub Actions Runner)
    ├── Worker 1 → testdb_3_1 → port range 3000-3099
    ├── Worker 2 → testdb_3_2 → port range 3100-3199
    └── Worker 3 → testdb_3_3 → port range 3200-3299
```

Each worker has:
- Its own database (or schema)
- Its own port range
- Its own temp directory
- Its own module cache (with `isolate: true`)

This architecture eliminates cross-worker interference and makes **parallel tests flaky** failures a thing of the past.

## Monitoring Parallel Test Health

Track these metrics to catch parallel flakiness early:

1. **Flake rate per worker**: If one worker has more flakes, it may have resource contention.
2. **Test duration variance**: High variance between parallel runs suggests timing-dependent tests.
3. **Failure correlation**: If tests A and B always fail together in parallel, they share state.
4. **Shard imbalance**: If one shard consistently takes longer, redistribute tests.

## Automate Flaky Test Detection with DeFlaky

Diagnosing parallel test flakiness manually requires correlating failures across workers, shards, and CI runs. This is exactly the kind of analysis that should be automated.

DeFlaky analyzes your parallel test results, identifies tests that fail only in concurrent execution, and pinpoints the shared state causing the conflict. It tracks flake rates per worker, per shard, and per test -- giving you complete visibility into your parallel testing health.

Find and fix your parallel testing issues now:

```bash
npx deflaky run
```

DeFlaky maps the dependency graph between your tests, detects order-dependent failures, and recommends the minimum isolation strategy needed to eliminate flakiness without sacrificing execution speed.
