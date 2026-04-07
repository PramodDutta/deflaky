import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  reporter: [["junit", { outputFile: "test-results/results.xml" }]],
  use: {
    headless: true,
  },
  retries: 0,
});
