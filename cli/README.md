# DeFlaky

**Detect flaky tests by running your test suite multiple times.**

DeFlaky wraps your existing test command, runs it N times, and identifies which tests are flaky, always-failing, or stable. It calculates a **FlakeScore** and optionally pushes results to the [DeFlaky Dashboard](https://deflaky.com).

Works with **Playwright, Selenium, Cypress, Jest, Pytest, Mocha** and any framework that outputs JUnit XML or JSON reports.

## Install

```bash
npm install -g deflaky-cli
```

Or use without installing:

```bash
npx deflaky-cli --help
```

## Quick Start

```bash
# Run your test suite 5 times and detect flaky tests
deflaky run -c "npx playwright test" -r 5

# Run 10 times with verbose output
deflaky run -c "npx jest --ci" -r 10 --verbose

# Push results to DeFlaky dashboard
deflaky run -c "npx playwright test" -r 5 --push --token YOUR_TOKEN

# Fail CI if FlakeScore drops below 90%
deflaky run -c "npx pytest" -r 3 --fail-threshold 90
```

## CLI Reference

| Flag | Alias | Description | Default |
|------|-------|-------------|---------|
| `--command <cmd>` | `-c` | Test command to run | *required* |
| `--runs <number>` | `-r` | Number of iterations | `5` |
| `--push` | | Send results to DeFlaky dashboard | `false` |
| `--token <token>` | `-t` | API token (or `DEFLAKY_TOKEN` env) | |
| `--format <format>` | | Report format: `junit`, `json`, `auto` | `auto` |
| `--fail-threshold <n>` | | Fail if FlakeScore is below this % | |
| `--verbose` | | Show detailed output | `false` |

## What is FlakeScore?

FlakeScore = (stable tests / total tests) x 100

- **100%** = All tests are stable (pass or fail consistently)
- **< 100%** = Some tests are flaky (sometimes pass, sometimes fail)
- A test is "flaky" if it passes in some runs and fails in others

## GitHub Actions

Run DeFlaky automatically on every push and PR. Add this workflow to `.github/workflows/deflaky.yml` in your repository:

```yaml
name: DeFlaky - Flaky Test Detection

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 2 * * 1'  # Weekly on Monday at 2am

jobs:
  deflaky:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm install -g deflaky-cli
      - name: Run DeFlaky
        run: deflaky run -c "npx playwright test" -r 3 --push --token ${{ secrets.DEFLAKY_TOKEN }}
        env:
          DEFLAKY_TOKEN: ${{ secrets.DEFLAKY_TOKEN }}
```

Add your DeFlaky token as a GitHub repository secret named `DEFLAKY_TOKEN` (Settings > Secrets and variables > Actions). Get your token at [deflaky.com/dashboard](https://deflaky.com/dashboard).

For the full setup guide with PR comments, framework examples (Playwright, Cypress, Jest, Pytest, Selenium), and troubleshooting, see the [GitHub Actions documentation](https://deflaky.com/docs/github-actions).

## Links

- **Website**: [deflaky.com](https://deflaky.com)
- **Dashboard**: [deflaky.com/dashboard](https://deflaky.com/dashboard)
- **Docs**: [deflaky.com/docs](https://deflaky.com/docs)
- **GitHub**: [github.com/PramodDutta/deflaky](https://github.com/PramodDutta/deflaky)

## License

MIT
