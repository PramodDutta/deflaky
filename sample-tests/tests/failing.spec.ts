import { test, expect } from "@playwright/test";

// This test ALWAYS FAILS — it's a bug, not a flake
test("always fails — broken assertion", () => {
  expect(1 + 1).toBe(3);
});
