---
title: "Flaky Tests in Next.js Applications: SSR, API Routes, and Testing Strategies"
description: "A comprehensive guide to identifying and fixing flaky tests in Next.js applications. Covers SSR component testing, API route testing, middleware testing, dynamic imports, next/router mocking, and environment variable handling to eliminate intermittent test failures."
date: "2026-04-13"
slug: "flaky-tests-nextjs"
keywords:
  - nextjs flaky tests
  - next js testing
  - nextjs test failures
  - react server component testing
  - nextjs api testing
  - nextjs middleware testing
  - nextjs dynamic imports testing
  - next router mock
  - nextjs environment variables testing
  - nextjs ci testing
author: "Pramod Dutta"
---

# Flaky Tests in Next.js Applications: SSR, API Routes, and Testing Strategies

Next.js has become the dominant React framework for production applications. Its hybrid rendering model, built-in API routes, and middleware layer give teams incredible power, but they also introduce unique testing challenges. If you have spent any time maintaining a Next.js test suite, you have almost certainly encountered nextjs flaky tests that pass locally, fail in CI, and leave your team scratching their heads.

The root causes are specific to Next.js's architecture. Server-side rendering introduces hydration mismatches. API routes behave differently under test runners than they do in production. Dynamic imports create timing issues that traditional React testing patterns cannot handle. This guide walks through every major category of nextjs flaky tests and provides battle-tested strategies to eliminate them.

## Why Next.js Tests Are Uniquely Prone to Flakiness

Standard React testing advice does not fully apply to Next.js. The framework blurs the line between client and server, and your tests need to account for both execution environments.

### The Dual-Environment Problem

A single Next.js component might execute on the server during SSR, then hydrate on the client. Your test environment, typically Jest with jsdom, is neither of these. It approximates a browser but lacks a real DOM, has no server context, and does not perform actual HTTP requests. This mismatch is the single biggest source of nextjs flaky tests.

### Framework Coupling

Next.js components often depend heavily on framework-specific features: the router, image optimization, link prefetching, head management, and middleware. Each of these needs careful mocking, and incomplete or incorrect mocks create intermittent failures that are difficult to reproduce.

## Testing SSR Components Without Flakiness

Server-side rendering tests fail intermittently for several predictable reasons. Understanding these patterns lets you write deterministic tests from the start.

### Hydration Mismatch Errors

When testing components that render differently on server versus client, you will see hydration warnings that sometimes cause test failures. The classic example is a component that uses `window` or `Date.now()`:

```jsx
// components/Greeting.jsx
export default function Greeting() {
  const hour = new Date().getHours();
  return <h1>{hour < 12 ? 'Good morning' : 'Good afternoon'}</h1>;
}
```

This component produces different output depending on when the test runs. The fix is to inject time as a dependency:

```jsx
// components/Greeting.jsx
export default function Greeting({ currentHour = new Date().getHours() }) {
  return <h1>{currentHour < 12 ? 'Good morning' : 'Good afternoon'}</h1>;
}

// __tests__/Greeting.test.jsx
import { render, screen } from '@testing-library/react';
import Greeting from '../components/Greeting';

test('shows morning greeting before noon', () => {
  render(<Greeting currentHour={9} />);
  expect(screen.getByText('Good morning')).toBeInTheDocument();
});

test('shows afternoon greeting after noon', () => {
  render(<Greeting currentHour={14} />);
  expect(screen.getByText('Good afternoon')).toBeInTheDocument();
});
```

### Server Component Testing

React Server Components (RSC) in Next.js present a particular challenge. They execute exclusively on the server and cannot use hooks or browser APIs. Testing them requires a different approach than traditional component testing:

```jsx
// app/users/page.jsx (Server Component)
async function UsersPage() {
  const users = await fetch('https://api.example.com/users').then(r => r.json());
  return (
    <ul>
      {users.map(u => <li key={u.id}>{u.name}</li>)}
    </ul>
  );
}

export default UsersPage;
```

The flaky pattern here is mocking `fetch` inconsistently. Some tests mock it globally, others locally, and cleanup failures leak between tests:

```jsx
// __tests__/UsersPage.test.jsx
import { render, screen } from '@testing-library/react';

// WRONG: Global mock that leaks
global.fetch = jest.fn();

// RIGHT: Scoped mock with proper cleanup
describe('UsersPage', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      json: () => Promise.resolve([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]),
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('renders user list', async () => {
    const UsersPage = (await import('../app/users/page')).default;
    const result = await UsersPage();
    render(result);
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });
});
```

## API Route Testing: Eliminating Request/Response Flakiness

Next.js API routes and Route Handlers are server-side code that runs in a Node.js environment. Testing them introduces a different class of flakiness related to request handling, database connections, and middleware execution order.

### Route Handler Testing Pattern

The most reliable way to test API routes is to call the handler function directly rather than spinning up a test server:

```typescript
// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') || '1');
  const users = await db.users.findMany({ skip: (page - 1) * 10, take: 10 });
  return NextResponse.json(users);
}
```

```typescript
// __tests__/api/users.test.ts
import { GET } from '@/app/api/users/route';
import { NextRequest } from 'next/server';

// Mock the database module, not the HTTP layer
jest.mock('@/lib/database', () => ({
  db: {
    users: {
      findMany: jest.fn(),
    },
  },
}));

import { db } from '@/lib/database';

describe('GET /api/users', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns paginated users', async () => {
    const mockUsers = [{ id: 1, name: 'Alice' }];
    (db.users.findMany as jest.Mock).mockResolvedValue(mockUsers);

    const request = new NextRequest('http://localhost/api/users?page=2');
    const response = await GET(request);
    const data = await response.json();

    expect(data).toEqual(mockUsers);
    expect(db.users.findMany).toHaveBeenCalledWith({ skip: 10, take: 10 });
  });
});
```

### Database Connection Flakiness

API route tests that use real database connections are a major source of nextjs flaky tests. Connection pooling, transaction isolation, and teardown ordering all contribute:

```typescript
// test-utils/database.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function withTestTransaction(
  fn: (tx: PrismaClient) => Promise<void>
) {
  await prisma.$transaction(async (tx) => {
    await fn(tx as unknown as PrismaClient);
    throw new Error('ROLLBACK'); // Force rollback
  }).catch((e) => {
    if (e.message !== 'ROLLBACK') throw e;
  });
}

export async function cleanupDatabase() {
  await prisma.$disconnect();
}
```

This pattern wraps each test in a transaction that always rolls back, ensuring tests never leave state behind.

## Middleware Testing Pitfalls

Next.js middleware runs at the edge, before the request reaches your pages or API routes. Testing it reliably requires careful simulation of the edge runtime environment.

### Common Middleware Flakiness Patterns

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;

  if (!token && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}
```

Tests for this middleware often fail because of URL construction issues in the test environment:

```typescript
// __tests__/middleware.test.ts
import { middleware } from '../middleware';
import { NextRequest } from 'next/server';

function createMockRequest(path: string, cookies: Record<string, string> = {}) {
  const url = new URL(path, 'http://localhost:3000');
  const request = new NextRequest(url);
  Object.entries(cookies).forEach(([key, value]) => {
    request.cookies.set(key, value);
  });
  return request;
}

describe('Authentication Middleware', () => {
  test('redirects unauthenticated users from dashboard', () => {
    const request = createMockRequest('/dashboard');
    const response = middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/login');
  });

  test('allows authenticated users through', () => {
    const request = createMockRequest('/dashboard', {
      'auth-token': 'valid-token',
    });
    const response = middleware(request);

    expect(response.status).toBe(200);
  });
});
```

## Dynamic Imports and Code Splitting

Next.js's `dynamic()` function creates lazy-loaded components that are a frequent source of flakiness. The component loads asynchronously, and tests that do not account for the loading state will intermittently fail.

### The Timing Problem

```jsx
// components/HeavyChart.jsx
import dynamic from 'next/dynamic';

const Chart = dynamic(() => import('./Chart'), {
  loading: () => <p>Loading chart...</p>,
  ssr: false,
});

export default function HeavyChart({ data }) {
  return (
    <div>
      <h2>Analytics</h2>
      <Chart data={data} />
    </div>
  );
}
```

The flaky test pattern is not waiting for the dynamic import to resolve:

```jsx
// FLAKY: Does not wait for dynamic component
test('renders chart', () => {
  render(<HeavyChart data={mockData} />);
  expect(screen.getByTestId('chart')).toBeInTheDocument(); // Sometimes fails
});

// STABLE: Waits for async loading
test('renders chart after loading', async () => {
  render(<HeavyChart data={mockData} />);

  // First, the loading state appears
  expect(screen.getByText('Loading chart...')).toBeInTheDocument();

  // Then wait for the actual component
  const chart = await screen.findByTestId('chart');
  expect(chart).toBeInTheDocument();
});
```

### Mocking Dynamic Imports

For unit tests, you can eliminate the async behavior entirely by mocking `next/dynamic`:

```jsx
// __mocks__/next/dynamic.js
const dynamic = (importFn) => {
  const Component = require(importFn.toString().match(/['"](.+)['"]/)[1]);
  return Component.default || Component;
};

export default dynamic;
```

## Next.js Router Mocking

The Next.js router is one of the most commonly mocked dependencies, and incorrect mocking is responsible for a significant percentage of next js testing failures.

### App Router Mocking

With the App Router, you need to mock `next/navigation` instead of `next/router`:

```jsx
// __mocks__/next/navigation.js
const useRouter = jest.fn(() => ({
  push: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
}));

const usePathname = jest.fn(() => '/');
const useSearchParams = jest.fn(() => new URLSearchParams());
const useParams = jest.fn(() => ({}));

module.exports = {
  useRouter,
  usePathname,
  useSearchParams,
  useParams,
};
```

The critical mistake is not resetting these mocks between tests. If one test sets `usePathname` to return `/dashboard` and forgets to clean up, the next test inherits that value:

```jsx
describe('Navigation component', () => {
  const { usePathname } = require('next/navigation');

  afterEach(() => {
    usePathname.mockReturnValue('/'); // Reset to default
  });

  test('highlights active link', () => {
    usePathname.mockReturnValue('/about');
    render(<Navigation />);
    expect(screen.getByText('About')).toHaveClass('active');
  });
});
```

## Environment Variables and Configuration

Next.js has a specific environment variable loading order that differs between `next dev`, `next build`, and your test runner. This mismatch causes tests that work in development to fail in CI.

### The NEXT_PUBLIC Prefix Problem

Variables prefixed with `NEXT_PUBLIC_` are inlined at build time for client components but available at runtime on the server. In tests, neither behavior applies, leading to undefined values:

```typescript
// lib/config.ts
// FLAKY: Direct env access
export const apiUrl = process.env.NEXT_PUBLIC_API_URL;

// STABLE: Function with fallback
export function getApiUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (!url) {
    throw new Error('NEXT_PUBLIC_API_URL is not configured');
  }
  return url;
}
```

### Setting Up Test Environment Variables

Create a dedicated `.env.test` file and load it in your Jest setup:

```bash
# .env.test
NEXT_PUBLIC_API_URL=http://localhost:3000/api
DATABASE_URL=postgresql://test:test@localhost:5432/testdb
AUTH_SECRET=test-secret-do-not-use-in-production
```

```javascript
// jest.setup.js
const { loadEnvConfig } = require('@next/env');

loadEnvConfig(process.cwd(), true); // true = load .env.test
```

This ensures consistent environment variables across local development and CI, eliminating an entire category of nextjs flaky tests.

## Integration Testing Strategies

For complex Next.js applications, unit tests alone are insufficient. Integration tests that exercise the full rendering pipeline catch issues that mocked tests miss.

### Using Next.js Test Mode

```typescript
// __tests__/integration/homepage.test.tsx
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';

describe('Homepage Integration', () => {
  let app: ReturnType<typeof next>;
  let server: ReturnType<typeof createServer>;
  let port: number;

  beforeAll(async () => {
    app = next({ dev: false, dir: process.cwd() });
    await app.prepare();
    const handle = app.getRequestHandler();

    server = createServer((req, res) => {
      const parsedUrl = parse(req.url!, true);
      handle(req, res, parsedUrl);
    });

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        port = (server.address() as any).port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    server.close();
    await app.close();
  });

  test('homepage returns 200', async () => {
    const response = await fetch(`http://localhost:${port}/`);
    expect(response.status).toBe(200);
  });
});
```

### Playwright for E2E Next.js Testing

For the most reliable next js testing of full-stack behavior, Playwright eliminates many flakiness sources by testing against a real browser:

```typescript
// e2e/navigation.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('navigates between pages without errors', async ({ page }) => {
    await page.goto('/');
    await page.click('a[href="/about"]');
    await expect(page).toHaveURL('/about');
    await expect(page.locator('h1')).toHaveText('About Us');
  });

  test('handles client-side navigation', async ({ page }) => {
    await page.goto('/');

    // Listen for console errors during navigation
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.click('nav a[href="/dashboard"]');
    await expect(page).toHaveURL('/dashboard');

    expect(errors).toHaveLength(0);
  });
});
```

## A Systematic Approach to Fixing Next.js Flaky Tests

When you encounter nextjs flaky tests, follow this diagnostic checklist:

1. **Identify the environment gap**: Is the test failing because the test environment differs from production? Check for missing mocks, incorrect environment variables, or jsdom limitations.

2. **Check for shared state**: Are tests within the same file sharing module-level variables, mock state, or database records? Add proper isolation with `beforeEach`/`afterEach`.

3. **Look for timing issues**: Are you testing async behavior (dynamic imports, data fetching, route transitions) without proper `await` or `waitFor` calls?

4. **Verify mock completeness**: Are your router, fetch, or module mocks missing methods that the component calls? Incomplete mocks cause sporadic `TypeError` exceptions.

5. **Test in isolation**: Run the failing test alone with `jest --testPathPattern`. If it passes alone but fails in the suite, you have a test ordering or shared state problem.

## Automate Flaky Test Detection

Manually tracking down intermittent failures is time-consuming and error-prone. Modern tooling can detect flaky tests before they reach your main branch. DeFlaky monitors your test suite across multiple runs, identifies tests with inconsistent results, and provides actionable diagnostics including timing analysis and failure pattern categorization.

Get started with flaky test detection in your Next.js project today:

```bash
npx deflaky run
```

DeFlaky will analyze your test suite, flag tests that exhibit flaky behavior, and give you a prioritized list of fixes based on failure frequency and business impact. Stop letting nextjs flaky tests slow down your team and start building a reliable test suite that you can trust.
