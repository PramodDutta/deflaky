import { test, expect } from "@playwright/test";

test("should always pass — addition", () => {
  expect(2 + 2).toBe(4);
});

test("should always pass — string concat", () => {
  expect("hello" + " " + "world").toBe("hello world");
});

test("should always pass — array length", () => {
  expect([1, 2, 3].length).toBe(3);
});

test("should always pass — truthy check", () => {
  expect(true).toBeTruthy();
});
