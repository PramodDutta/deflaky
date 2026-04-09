---
title: "How to Detect Flaky Tests in GitHub Actions with DeFlaky"
description: "Step-by-step guide to integrating DeFlaky into your GitHub Actions workflow. Detect flaky tests automatically on every push and PR with examples for Playwright, Cypress, Jest, and Pytest."
date: "2026-04-08"
slug: "github-actions-deflaky-setup"
keywords:
  - deflaky github actions
  - detect flaky tests github actions
  - github actions flaky test detection
  - ci flaky test automation
  - deflaky ci integration
  - playwright github actions flaky
  - cypress github actions flaky
  - jest flaky tests ci
  - pytest flaky tests ci
  - github actions test reliability
  - flakescore github actions
  - deflaky cli setup
author: "Pramod Dutta"
---

# How to Detect Flaky Tests in GitHub Actions with DeFlaky

Flaky tests silently erode confidence in your CI pipeline. A test that passes locally but fails randomly in GitHub Actions wastes developer time, blocks deployments, and eventually leads teams to ignore CI failures entirely. The solution is not to retry and hope -- it is to systematically detect which tests are flaky and fix them.

DeFlaky automates this detection. It runs your test suite multiple times, identifies tests that produce inconsistent results, calculates a FlakeScore, and pushes everything to a dashboard where you can track reliability over time. This guide walks through setting it up in GitHub Actions from scratch.

## Why Run Flaky Test Detection in CI

Running DeFlaky locally tells you about flakiness on your machine. Running it in CI tells you about flakiness where it actually matters -- in the environment where your tests gate deployments.

There are several reasons CI-based detection is essential:

- **Environment differences**: GitHub Actions runners have different CPU, memory, and network characteristics than developer machines. Tests that are stable locally may flake in CI due to resource contention or network latency.
- **Consistency**: Every run happens on a clean VM with identical dependencies. This removes the "works on my machine" variable and gives you reliable flakiness data.
- **Automation**: Schedule weekly detection runs without anyone having to remember. New flaky tests get caught before they become entrenched.
- **PR gating**: Fail PRs that introduce new flaky tests before they merge into main.
- **Historical tracking**: The DeFlaky dashboard aggregates results across all CI runs, showing trends over time.

## Prerequisites

Before starting, you need:

1. A GitHub repository with a test suite (Playwright, Cypress, Jest, Pytest, or any other framework)
2. A DeFlaky account -- sign up at [deflaky.com](https://deflaky.com)
3. A DeFlaky API token (format: `df_<uuid>`)

## Step 1: Get Your DeFlaky Token

1. Go to the [DeFlaky Dashboard](https://deflaky.com/dashboard) and sign in.
2. Click **New Project** and give it a name matching your repository.
3. Copy the generated API token. It looks like `df_a1b2c3d4-e5f6-7890-abcd-ef1234567890`.
4. Keep this token -- you will add it to GitHub in the next step.

## Step 2: Add the Token as a GitHub Secret

Your DeFlaky token must never be committed to source control. GitHub Secrets keeps it encrypted and only exposes it to workflows at runtime.

1. Open your GitHub repository in a browser.
2. Go to **Settings > Secrets and variables > Actions**.
3. Click **New repository secret**.
4. Set the name to `DEFLAKY_TOKEN` and paste your token as the value.
5. Click **Add secret**.

The token is now available in your workflows as `${{ secrets.DEFLAKY_TOKEN }}`.

## Step 3: Create the Workflow File

Create a new file at `.github/workflows/deflaky.yml` in your repository. Below is a complete workflow for a Playwright project:

```yaml
name: DeFlaky - Flaky Test Detection

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 2 * * 1'  # Weekly on Monday at 2am UTC

jobs:
  deflaky:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Install DeFlaky CLI
        run: npm install -g deflaky-cli

      - name: Run DeFlaky
        run: deflaky -c "npx playwright test" -r 3 --push --token ${{ secrets.DEFLAKY_TOKEN }}
        env:
          DEFLAKY_TOKEN: ${{ secrets.DEFLAKY_TOKEN }}
```

This workflow triggers on three events:

- **Push to main**: Detect flakiness in code that just merged.
- **Pull requests**: Catch flaky tests before they merge.
- **Weekly schedule**: Ongoing monitoring even when no code changes.

## Framework-Specific Examples

The only thing that changes between frameworks is the test command passed to `deflaky -c`. Here are ready-to-use examples for the most popular frameworks.

### Playwright

```yaml
- name: Install Playwright browsers
  run: npx playwright install --with-deps

- name: Run DeFlaky
  run: deflaky -c "npx playwright test" -r 3 --push --token ${{ secrets.DEFLAKY_TOKEN }}
```

For single-browser testing to save CI minutes:

```yaml
- name: Run DeFlaky (Chromium only)
  run: deflaky -c "npx playwright test --project=chromium" -r 3 --push --token ${{ secrets.DEFLAKY_TOKEN }}
```

### Cypress

```yaml
- name: Run DeFlaky
  run: deflaky -c "npx cypress run" -r 3 --push --token ${{ secrets.DEFLAKY_TOKEN }}
```

For a specific spec file:

```yaml
- name: Run DeFlaky
  run: deflaky -c "npx cypress run --spec cypress/e2e/checkout.cy.ts" -r 3 --push --token ${{ secrets.DEFLAKY_TOKEN }}
```

### Jest

```yaml
- name: Run DeFlaky
  run: deflaky -c "npx jest --ci" -r 3 --push --token ${{ secrets.DEFLAKY_TOKEN }}
```

The `--ci` flag in Jest disables interactive mode and provides better output for CI environments.

### Pytest

For Python projects, make sure Python and your dependencies are installed first:

```yaml
- uses: actions/setup-python@v5
  with:
    python-version: '3.12'

- run: pip install -r requirements.txt

- name: Install DeFlaky CLI
  run: npm install -g deflaky-cli

- name: Run DeFlaky
  run: deflaky -c "pytest" -r 3 --push --token ${{ secrets.DEFLAKY_TOKEN }}
```

For Pytest with JUnit XML output for richer reporting:

```yaml
- name: Run DeFlaky
  run: deflaky -c "pytest --junitxml=report.xml" -r 3 --push --token ${{ secrets.DEFLAKY_TOKEN }}
```

## Configuration Options

DeFlaky supports several flags that control behavior in CI:

| Flag | Description | Example |
|------|-------------|---------|
| `-c` | Test command to run | `-c "npx playwright test"` |
| `-r` | Number of runs | `-r 5` |
| `--push` | Push results to dashboard | `--push` |
| `--token` | API token | `--token ${{ secrets.DEFLAKY_TOKEN }}` |
| `--fail-threshold` | Fail CI if FlakeScore below N% | `--fail-threshold 90` |
| `--verbose` | Show detailed output per run | `--verbose` |

### Failing CI on Low FlakeScore

Use `--fail-threshold` to enforce a minimum FlakeScore. If the score drops below the threshold, the workflow step exits with code 1 and the CI check fails:

```yaml
- name: Run DeFlaky (strict mode)
  run: deflaky -c "npx playwright test" -r 5 --push --token ${{ secrets.DEFLAKY_TOKEN }} --fail-threshold 90
```

This is useful for preventing PRs from merging when they introduce flaky tests.

## Scheduling Weekly Runs

The `schedule` trigger in GitHub Actions uses cron syntax. Here are common schedules:

```yaml
on:
  schedule:
    # Every Monday at 2am UTC
    - cron: '0 2 * * 1'

    # Every day at midnight UTC
    # - cron: '0 0 * * *'

    # Every Monday and Thursday at 3am UTC
    # - cron: '0 3 * * 1,4'
```

Weekly runs give you a reliable baseline even during periods with no active development. The DeFlaky dashboard shows trends over time so you can see whether your test suite is becoming more or less reliable.

## Viewing Results on the Dashboard

After your workflow runs, results are automatically pushed to the [DeFlaky Dashboard](https://deflaky.com/dashboard). There you can see:

- **FlakeScore trend**: A graph showing your test suite's reliability over time.
- **Flaky test list**: Every test that produced inconsistent results, sorted by severity.
- **Pass rate per test**: How many runs passed vs. failed for each flaky test.
- **Stack traces**: The actual error messages from failed runs.
- **First seen / last seen**: When each flaky test was first detected and when it last flaked.

Filter by branch, date range, or test name to drill into specific issues.

## PR Comments with FlakeScore (Coming Soon)

We are working on a feature that automatically posts a comment on every pull request with the FlakeScore and a summary of any flaky tests detected. The comment will include:

- Overall FlakeScore for the PR
- List of flaky tests with pass/fail counts
- Comparison against the main branch baseline
- Direct link to the test details on the dashboard

Until this feature ships, you can achieve the same result using `actions/github-script` in your workflow. See the [full example workflow](https://deflaky.com/examples/github-actions-workflow.yml) for a working implementation that posts PR comments.

## Troubleshooting

### "deflaky: command not found"

Make sure you install the CLI before running it:

```yaml
- run: npm install -g deflaky-cli
```

Or use npx:

```yaml
- run: npx deflaky-cli -c "npx playwright test" -r 3 --push --token ${{ secrets.DEFLAKY_TOKEN }}
```

### Token Not Working

- Verify the secret name matches exactly: `DEFLAKY_TOKEN` in both the secret and the workflow reference.
- Tokens use the format `df_<uuid>`. Make sure you copied the full token from the dashboard.
- Secrets are not available in workflows triggered by forks. If you are running PRs from forks, consider using the `pull_request_target` event (with caution).

### Tests Timing Out

GitHub Actions has a default job timeout of 6 hours. For faster feedback, set an explicit timeout:

```yaml
jobs:
  deflaky:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps: ...
```

Since DeFlaky runs your tests multiple times, multiply your normal test duration by the number of runs plus some buffer.

### Playwright Browser Installation Fails

Always use `--with-deps` to install system dependencies:

```yaml
- run: npx playwright install --with-deps
```

This installs the browser binaries and all required system libraries (like libgbm and libwoff2) on the Ubuntu runner.

## Complete Example Workflow

For a ready-to-copy workflow file with PR comments, step outputs, and multi-framework support, download the [example workflow](https://deflaky.com/examples/github-actions-workflow.yml) and place it at `.github/workflows/deflaky.yml` in your repository.

## What's Next

- Read the full [DeFlaky documentation](/docs/github-actions) for advanced configuration
- Set up [dashboard alerts](/pricing) to get notified when FlakeScore drops
- Explore the [CLI reference](/docs) for all available commands and flags
- Check out our guide on [fixing flaky tests](/blog/flaky-test-strategies) for strategies to eliminate flakiness at the source

Detecting flaky tests is the first step. The goal is to fix them and build a test suite your team can trust. DeFlaky gives you the data to prioritize which flaky tests to fix first, based on how frequently they flake and how much CI time they waste.
