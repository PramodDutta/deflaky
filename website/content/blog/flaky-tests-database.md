---
title: "Database-Related Flaky Tests: Transaction Conflicts, Seeding, and Isolation"
description: "Fix database-related flaky tests caused by transaction conflicts, inconsistent test data seeding, cleanup failures, connection pooling issues, deadlocks, and poor test database patterns. Includes practical code examples."
date: "2026-04-13"
slug: "flaky-tests-database"
keywords:
  - flaky tests database
  - database test failures
  - test data management
  - database testing
  - transaction isolation tests
author: "Pramod Dutta"
---

# Database-Related Flaky Tests: Transaction Conflicts, Seeding, and Isolation

Databases are the most common external dependency in application test suites, and they are also the most common source of flaky tests. When your tests interact with a real database -- whether PostgreSQL, MySQL, MongoDB, or SQLite -- you introduce an entire category of non-determinism that does not exist in pure unit tests.

**Flaky tests database** interactions produce are particularly insidious because they often pass 9 out of 10 times. The failures appear random, but they are actually caused by timing-dependent database behavior: transactions interleaving, locks expiring, connections exhausting, or test data colliding.

This guide covers every major database-related flakiness pattern, explains the underlying database mechanics, and provides proven strategies to make your database tests deterministic.

## Transaction Isolation and Its Impact on Tests

Transaction isolation is the "I" in ACID, and it is the single most important concept for understanding **flaky tests database** operations cause. Different isolation levels determine what one transaction can see of another transaction's changes.

### The Four Isolation Levels

| Level | Dirty Reads | Non-Repeatable Reads | Phantom Reads |
|-------|------------|---------------------|---------------|
| READ UNCOMMITTED | Yes | Yes | Yes |
| READ COMMITTED | No | Yes | Yes |
| REPEATABLE READ | No | No | Yes (Postgres: No) |
| SERIALIZABLE | No | No | No |

### How Isolation Levels Cause Flakiness

Most applications use READ COMMITTED (the default in PostgreSQL). This means a test can see data committed by another test between its own statements:

```typescript
// Test Worker 1
test('counts active users', async () => {
  await db.users.create({ name: 'Alice', status: 'active' });
  const count = await db.users.count({ where: { status: 'active' } });
  expect(count).toBe(1);
  // FLAKY: Worker 2 may have inserted another active user between create and count
});

// Test Worker 2
test('creates admin user', async () => {
  await db.users.create({ name: 'Admin', status: 'active' });
  // This committed data is visible to Worker 1's count query
});
```

### The Fix: Test-Scoped Transactions

Wrap each test in a transaction that never commits:

```typescript
// Prisma example with transaction rollback
let prisma: PrismaClient;
let transaction: Prisma.TransactionClient;

beforeEach(async () => {
  // Start a transaction
  transaction = await prisma.$begin();
});

afterEach(async () => {
  // Roll back all changes
  await transaction.$rollback();
});

test('counts active users', async () => {
  await transaction.users.create({ data: { name: 'Alice', status: 'active' } });
  const count = await transaction.users.count({ where: { status: 'active' } });
  expect(count).toBe(1); // Deterministic: only sees this transaction's data
});
```

For frameworks that do not support nested transactions, use savepoints:

```sql
-- Before each test
SAVEPOINT test_start;

-- After each test
ROLLBACK TO SAVEPOINT test_start;
```

## Test Data Seeding Strategies

How you create test data has a direct impact on test reliability. Poor seeding practices are a leading source of **flaky tests database** suites encounter.

### Anti-Pattern: Shared Seed Data

```typescript
// BAD: All tests share the same seed data
beforeAll(async () => {
  await db.users.createMany([
    { id: 1, name: 'Alice', email: 'alice@test.com' },
    { id: 2, name: 'Bob', email: 'bob@test.com' },
  ]);
});

test('finds user by email', async () => {
  const user = await db.users.findByEmail('alice@test.com');
  expect(user.name).toBe('Alice');
  // Fragile: fails if another test modifies or deletes Alice
});
```

### Pattern: Factory Functions

Create fresh, unique test data for each test:

```typescript
// factories/user.ts
let sequence = 0;

export function buildUser(overrides?: Partial<User>): User {
  sequence++;
  return {
    name: `Test User ${sequence}`,
    email: `testuser-${sequence}-${Date.now()}@test.com`,
    status: 'active',
    ...overrides,
  };
}

export async function createUser(overrides?: Partial<User>): Promise<User> {
  const data = buildUser(overrides);
  return db.users.create({ data });
}
```

```typescript
test('finds user by email', async () => {
  const user = await createUser({ name: 'Alice' });
  const found = await db.users.findByEmail(user.email);
  expect(found.name).toBe('Alice');
  // Deterministic: uses a unique email that no other test uses
});
```

### Pattern: Test Fixtures with Isolation

For complex scenarios that need predefined data relationships:

```typescript
async function createOrderFixture() {
  const customer = await createUser({ role: 'customer' });
  const product = await createProduct({ price: 29.99 });
  const order = await createOrder({
    customerId: customer.id,
    items: [{ productId: product.id, quantity: 2 }],
  });

  return { customer, product, order };
}

test('calculates order total', async () => {
  const { order } = await createOrderFixture();
  expect(order.total).toBe(59.98);
});
```

## Cleanup Strategies

Cleaning up test data is as important as creating it. Incomplete cleanup causes data to accumulate and interfere with subsequent tests.

### Strategy 1: Transaction Rollback (Fastest)

```typescript
// Each test runs inside a rolled-back transaction
// No cleanup needed -- changes never persist
```

This is the gold standard for speed and isolation, but it has limitations:
- Cannot test transaction behavior itself
- Some ORMs do not support transaction injection cleanly
- Does not work for tests that span multiple database connections

### Strategy 2: Truncate Tables (Reliable)

```typescript
afterEach(async () => {
  // Truncate in reverse dependency order to avoid foreign key violations
  await db.raw('TRUNCATE TABLE order_items, orders, products, users CASCADE');
});
```

`TRUNCATE` is faster than `DELETE` because it does not generate row-level WAL records. The `CASCADE` option handles foreign key dependencies.

### Strategy 3: Delete Created Records (Granular)

```typescript
const createdIds: { table: string; id: string }[] = [];

function trackCreated(table: string, id: string) {
  createdIds.push({ table, id });
}

afterEach(async () => {
  // Delete in reverse order to respect foreign keys
  for (const { table, id } of createdIds.reverse()) {
    await db.raw(`DELETE FROM ${table} WHERE id = ?`, [id]);
  }
  createdIds.length = 0;
});
```

This approach is the most targeted but also the most error-prone. If you forget to track a created record, it leaks into subsequent tests.

### Strategy 4: Database Templates (PostgreSQL)

PostgreSQL can create databases from templates, which is essentially a filesystem-level copy:

```typescript
// Global setup: create a template with migrated schema and seed data
beforeAll(async () => {
  await db.raw('CREATE DATABASE test_template');
  await runMigrations('test_template');
  await seedBaseData('test_template');
  await db.raw(`UPDATE pg_database SET datistemplate = true WHERE datname = 'test_template'`);
});

// Before each test file: create a fresh database from template
beforeAll(async () => {
  const dbName = `test_${process.env.WORKER_ID}_${Date.now()}`;
  await db.raw(`CREATE DATABASE ${dbName} TEMPLATE test_template`);
});
```

This gives you a fresh, fully-seeded database for each test file in milliseconds.

## Connection Pooling Issues

Database connection pools are a frequent source of **flaky tests database** operations trigger. Tests can exhaust the pool, causing subsequent tests to timeout waiting for a connection.

### Pool Exhaustion

```typescript
// BAD: Each test opens connections but doesn't release them
test('concurrent queries', async () => {
  const promises = Array.from({ length: 100 }, () =>
    db.query('SELECT pg_sleep(0.1)')
  );
  await Promise.all(promises);
  // 100 concurrent connections may exceed pool limit
});
```

```typescript
// GOOD: Limit concurrency to stay within pool bounds
import pLimit from 'p-limit';

const limit = pLimit(10); // Max 10 concurrent queries

test('concurrent queries', async () => {
  const promises = Array.from({ length: 100 }, () =>
    limit(() => db.query('SELECT pg_sleep(0.1)'))
  );
  await Promise.all(promises);
});
```

### Pool Configuration for Tests

```typescript
// knexfile.test.ts
export default {
  client: 'pg',
  connection: process.env.DATABASE_URL,
  pool: {
    min: 2,
    max: 10,
    acquireTimeoutMillis: 30000,  // Wait up to 30s for a connection
    idleTimeoutMillis: 10000,     // Release idle connections after 10s
    reapIntervalMillis: 1000,     // Check for idle connections every 1s
  },
};
```

### Connection Leak Detection

```typescript
afterAll(async () => {
  // Check for leaked connections
  const pool = db.client.pool;
  const activeConnections = pool.numUsed();

  if (activeConnections > 0) {
    console.warn(
      `WARNING: ${activeConnections} database connections still active after tests completed`
    );
  }

  await db.destroy(); // Force-close all connections
});
```

## Deadlocks in Tests

Deadlocks occur when two transactions wait for each other to release locks. In production, the database detects and resolves deadlocks by killing one transaction. In tests, this manifests as random failures.

### Common Deadlock Patterns

```typescript
// Test 1: Updates user then order
test('updates user profile and recalculates order', async () => {
  await db.users.update({ where: { id: 1 }, data: { name: 'Alice Updated' } });
  // Holds lock on users row id=1
  await db.orders.update({ where: { userId: 1 }, data: { status: 'recalculated' } });
  // Needs lock on orders row
});

// Test 2: Updates order then user (opposite lock order)
test('processes order and updates user', async () => {
  await db.orders.update({ where: { userId: 1 }, data: { status: 'processed' } });
  // Holds lock on orders row
  await db.users.update({ where: { id: 1 }, data: { lastOrderAt: new Date() } });
  // Needs lock on users row id=1 -- DEADLOCK with Test 1
});
```

### Preventing Deadlocks

1. **Consistent lock ordering**: Always acquire locks in the same order (e.g., users before orders).
2. **Test isolation**: Use separate data per test so locks never conflict.
3. **Short transactions**: Minimize the time locks are held.
4. **Advisory locks**: Use PostgreSQL advisory locks for explicit coordination:

```typescript
// Acquire advisory lock before accessing shared resources
await db.raw('SELECT pg_advisory_lock(12345)');
try {
  // ... perform operations
} finally {
  await db.raw('SELECT pg_advisory_unlock(12345)');
}
```

## Test Database Patterns

### Pattern 1: In-Memory Database for Unit Tests

For tests that need a database but not production-level behavior:

```typescript
// Use SQLite in-memory for fast unit tests
import Database from 'better-sqlite3';

let db: Database.Database;

beforeEach(() => {
  db = new Database(':memory:');
  db.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL
    )
  `);
});

afterEach(() => {
  db.close();
});
```

Caveats: SQLite behavior differs from PostgreSQL in important ways (data types, JSON support, window functions). Use this only for logic tests, not behavior that depends on database-specific features.

### Pattern 2: Containerized Test Database

For integration tests that need production-equivalent behavior:

```typescript
// Using testcontainers
import { PostgreSqlContainer } from '@testcontainers/postgresql';

let container: StartedPostgreSqlContainer;

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16')
    .withDatabase('testdb')
    .withUsername('test')
    .withPassword('test')
    .start();

  process.env.DATABASE_URL = container.getConnectionUri();
  await runMigrations();
}, 30000); // Allow time for container startup

afterAll(async () => {
  await container.stop();
});
```

### Pattern 3: Schema Migrations in Tests

Always run migrations as part of your test setup to catch migration-related issues:

```typescript
beforeAll(async () => {
  // Run pending migrations
  await migrate.latest();
});

afterAll(async () => {
  // Optionally rollback to verify down migrations work
  await migrate.rollback({ all: true });
  await db.destroy();
});
```

## Handling Auto-Increment and Sequences

Auto-incrementing IDs are a subtle source of test flakiness. Tests that assert on specific ID values break when execution order changes:

```typescript
// BAD: Assumes a specific auto-increment value
test('creates user with expected ID', async () => {
  const user = await createUser({ name: 'Alice' });
  expect(user.id).toBe(1); // Breaks if another test creates a user first
});
```

```typescript
// GOOD: Assert on relationships, not specific IDs
test('creates user and retrieves it', async () => {
  const user = await createUser({ name: 'Alice' });
  const found = await findUserById(user.id);
  expect(found.name).toBe('Alice');
});
```

If you absolutely need predictable IDs, reset the sequence before each test:

```sql
ALTER SEQUENCE users_id_seq RESTART WITH 1;
```

But this conflicts with parallel execution, so it is only safe for single-worker test suites.

## Timing-Dependent Database Tests

Tests that depend on timestamps, TTLs, or time-based queries are inherently fragile:

```typescript
// BAD: Assumes test runs within a specific second
test('finds recently created users', async () => {
  await createUser({ name: 'Alice', createdAt: new Date() });
  const recent = await db.users.findMany({
    where: { createdAt: { gte: new Date(Date.now() - 1000) } }, // Last 1 second
  });
  expect(recent).toHaveLength(1);
  // Flaky if test takes > 1 second (common in CI)
});
```

```typescript
// GOOD: Use explicit timestamps and wider windows
test('finds recently created users', async () => {
  const testStart = new Date();
  await createUser({ name: 'Alice' });

  const recent = await db.users.findMany({
    where: { createdAt: { gte: testStart } },
  });
  expect(recent).toHaveLength(1);
});
```

## Monitoring Database Test Health

Track these metrics to catch **flaky tests database** issues early:

```typescript
// Instrument your test database wrapper
class TestDatabase {
  private queryCount = 0;
  private slowQueries: string[] = [];

  async query(sql: string, params?: unknown[]) {
    this.queryCount++;
    const start = performance.now();
    const result = await this.client.query(sql, params);
    const duration = performance.now() - start;

    if (duration > 100) {
      this.slowQueries.push(`${duration.toFixed(0)}ms: ${sql.substring(0, 100)}`);
    }

    return result;
  }

  getStats() {
    return {
      queryCount: this.queryCount,
      slowQueries: this.slowQueries,
    };
  }
}

afterEach(async () => {
  const stats = testDb.getStats();
  if (stats.slowQueries.length > 0) {
    console.warn('Slow queries detected:', stats.slowQueries);
  }
});
```

## A Decision Framework for Database Test Isolation

Choose your isolation strategy based on your constraints:

| Requirement | Strategy |
|------------|----------|
| Maximum speed, simple queries | Transaction rollback |
| Parallel workers, PostgreSQL | Schema-per-worker |
| Parallel workers, any DB | Database-per-worker |
| Full production parity | Testcontainers |
| Unit tests only | In-memory SQLite |
| Complex seeding, fast reset | PostgreSQL templates |

## Automate Flaky Test Detection with DeFlaky

**Flaky tests database** interactions produce are among the hardest to diagnose manually. The failures depend on timing, execution order, and concurrent access patterns that are nearly impossible to reproduce consistently on a developer's machine.

DeFlaky specializes in identifying database-related test flakiness. It analyzes your test results across multiple runs, correlates failures with database operations, and identifies the specific patterns causing non-determinism -- whether it is a missing cleanup, a shared fixture, a connection pool exhaustion, or a deadlock.

Get a complete picture of your database test reliability:

```bash
npx deflaky run
```

DeFlaky will surface your flakiest database tests, categorize the root causes, and provide actionable recommendations to fix them. Your team deserves a test suite they can trust.
