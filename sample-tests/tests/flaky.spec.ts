import { test, expect } from "@playwright/test";

// This test is DELIBERATELY FLAKY — it passes ~50% of the time
test("flaky — random number check", () => {
  const value = Math.random();
  expect(value).toBeGreaterThan(0.5);
});

// This test is DELIBERATELY FLAKY — it passes ~70% of the time
test("flaky — timing-based check", () => {
  const start = Date.now();
  // Simulate some work
  let sum = 0;
  for (let i = 0; i < 1_000_000; i++) {
    sum += Math.sqrt(i);
  }
  const elapsed = Date.now() - start;
  // Sometimes this takes longer than 10ms depending on system load
  expect(elapsed).toBeLessThan(10);
});

// This test is DELIBERATELY FLAKY — passes ~60% of the time
test("flaky — date seconds check", () => {
  const seconds = new Date().getSeconds();
  // Fails when seconds > 36 (roughly 40% of the time)
  expect(seconds).toBeLessThan(36);
});
