# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: failing.spec.ts >> always fails — broken assertion
- Location: tests/failing.spec.ts:4:5

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 3
Received: 2
```

# Test source

```ts
  1 | import { test, expect } from "@playwright/test";
  2 | 
  3 | // This test ALWAYS FAILS — it's a bug, not a flake
  4 | test("always fails — broken assertion", () => {
> 5 |   expect(1 + 1).toBe(3);
    |                 ^ Error: expect(received).toBe(expected) // Object.is equality
  6 | });
  7 | 
```