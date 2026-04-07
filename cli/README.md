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
deflaky -c "npx playwright test" -r 5

# Run 10 times with verbose output
deflaky -c "npx jest --ci" -r 10 --verbose

# Push results to DeFlaky dashboard
deflaky -c "npx playwright test" -r 5 --push --token YOUR_TOKEN

# Fail CI if FlakeScore drops below 90%
deflaky -c "npx pytest" -r 3 --fail-threshold 90
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

## Links

- **Website**: [deflaky.com](https://deflaky.com)
- **Dashboard**: [deflaky.com/dashboard](https://deflaky.com/dashboard)
- **Docs**: [deflaky.com/docs](https://deflaky.com/docs)
- **GitHub**: [github.com/PramodDutta/deflaky](https://github.com/PramodDutta/deflaky)

## License

MIT
