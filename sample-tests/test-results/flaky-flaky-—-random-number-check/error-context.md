# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: flaky.spec.ts >> flaky — random number check
- Location: tests/flaky.spec.ts:4:5

# Error details

```
Error: expect(received).toBeGreaterThan(expected)

Expected: > 0.5
Received:   0.04942389200866515
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | // This test is DELIBERATELY FLAKY — it passes ~50% of the time
  4  | test("flaky — random number check", () => {
  5  |   const value = Math.random();
> 6  |   expect(value).toBeGreaterThan(0.5);
     |                 ^ Error: expect(received).toBeGreaterThan(expected)
  7  | });
  8  | 
  9  | // This test is DELIBERATELY FLAKY — it passes ~70% of the time
  10 | test("flaky — timing-based check", () => {
  11 |   const start = Date.now();
  12 |   // Simulate some work
  13 |   let sum = 0;
  14 |   for (let i = 0; i < 1_000_000; i++) {
  15 |     sum += Math.sqrt(i);
  16 |   }
  17 |   const elapsed = Date.now() - start;
  18 |   // Sometimes this takes longer than 10ms depending on system load
  19 |   expect(elapsed).toBeLessThan(10);
  20 | });
  21 | 
  22 | // This test is DELIBERATELY FLAKY — passes ~60% of the time
  23 | test("flaky — date seconds check", () => {
  24 |   const seconds = new Date().getSeconds();
  25 |   // Fails when seconds > 36 (roughly 40% of the time)
  26 |   expect(seconds).toBeLessThan(36);
  27 | });
  28 | 
```