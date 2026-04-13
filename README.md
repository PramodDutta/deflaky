<div align="center">

# DeFlaky

**Detect & Fix Flaky Tests**

[![npm version](https://img.shields.io/npm/v/deflaky-cli?color=blue)](https://www.npmjs.com/package/deflaky-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Website](https://img.shields.io/badge/Website-deflaky.com-purple)](https://deflaky.com)
[![GitHub](https://img.shields.io/badge/GitHub-PramodDutta%2Fdeflaky-black?logo=github)](https://github.com/PramodDutta/deflaky)

A free, open-source CLI tool and dashboard that runs your test suite multiple times, detects flaky tests, and gives you a clear **FlakeScore** to track test reliability over time.

[Website](https://deflaky.com) | [npm](https://www.npmjs.com/package/deflaky-cli) | [GitHub](https://github.com/PramodDutta/deflaky) | [Documentation](https://deflaky.com/docs)

</div>

---

## What is DeFlaky?

Flaky tests erode confidence in your test suite and slow down your team. DeFlaky is a CLI tool that executes your test command across multiple iterations, compares results, and identifies tests that produce inconsistent outcomes. It works with **any test framework** that outputs JUnit XML or JSON -- Playwright, Selenium, Cypress, Jest, Pytest, and more.

DeFlaky calculates a **FlakeScore** for your suite:

```
FlakeScore = (stable_tests / total_tests) * 100
```

A score of 100 means every test passed or failed consistently across all runs. Anything below that tells you exactly how flaky your suite is, and which tests are the culprits.

---

## Features

- **Multi-Run Flaky Detection** -- Run your test suite N times and automatically identify tests with inconsistent results.
- **FlakeScore Calculation** -- Get a single, trackable number representing the reliability of your test suite.
- **Framework Agnostic** -- Works with any framework that outputs JUnit XML or JSON (Playwright, Selenium, Cypress, Jest, Pytest, etc.).
- **Dashboard Visualization** -- Push results to the DeFlaky dashboard and track flaky test trends over time.
- **BYOK AI Integration** -- Bring Your Own Key for AI-powered root cause analysis, failure categorization, and fix suggestions using Anthropic, OpenAI, Groq, OpenRouter, or Ollama.
- **CI/CD Friendly** -- Use `--fail-threshold` to fail pipelines when test reliability drops below an acceptable level.
- **Free and Open Source** -- MIT licensed. No vendor lock-in.

---

## Quick Start

### Install and Run

No installation required. Use `npx` to run DeFlaky directly:

```bash
# Run your Playwright tests 5 times and detect flaky tests
npx deflaky -c "npx playwright test" -r 5
```

### Push Results to Dashboard

```bash
# Run 10 iterations and push results to your DeFlaky dashboard
npx deflaky -c "npx playwright test" -r 10 --push --token YOUR_TOKEN
```

### Gate Your CI Pipeline

```bash
# Fail the build if FlakeScore drops below 90
npx deflaky -c "npx jest" -r 3 --fail-threshold 90
```

---

## CLI Reference

| Flag | Alias | Description | Default |
|------|-------|-------------|---------|
| `--command` | `-c` | Test command to run (required) | -- |
| `--runs` | `-r` | Number of iterations to execute | `5` |
| `--push` | | Send results to the DeFlaky dashboard | `false` |
| `--token` | `-t` | API token for dashboard authentication | -- |
| `--format` | | Report format: `junit`, `json`, or `auto` | `auto` |
| `--fail-threshold` | | Fail if FlakeScore is below this value (0-100) | -- |
| `--verbose` | | Show detailed output for each run | `false` |

### Examples

```bash
# Basic usage with Playwright
npx deflaky -c "npx playwright test" -r 5

# Pytest with verbose output
npx deflaky -c "pytest tests/" -r 3 --verbose

# Cypress with CI threshold gate
npx deflaky -c "npx cypress run" -r 5 --fail-threshold 95

# Jest with JSON format and dashboard push
npx deflaky -c "npx jest --json" -r 10 --format json --push --token YOUR_TOKEN
```

---

## BYOK AI Integration

DeFlaky supports **Bring Your Own Key** AI integration for intelligent analysis of your test failures. Your API key stays in your browser and is never stored on DeFlaky servers.

### Supported Providers

| Provider | Models | Setup |
|----------|--------|-------|
| **Anthropic** | Claude 3.5 Sonnet, Claude 4 | Enter your Anthropic API key in the dashboard |
| **OpenAI** | GPT-4o, GPT-4o-mini | Enter your OpenAI API key in the dashboard |
| **Groq** | Llama, Mixtral | Enter your Groq API key in the dashboard |
| **OpenRouter** | Multiple models | Enter your OpenRouter API key in the dashboard |
| **Ollama** | Local models | Point to your local Ollama instance |

### AI-Powered Capabilities

- **Root Cause Analysis** -- Analyzes stack traces and error messages to explain *why* a test is failing, not just *that* it failed.
- **Failure Categorization** -- Automatically classifies each failure into one of five categories: Infrastructure, App Bug, Test Code, Environment, or Flaky.
- **Fix Suggestions** -- Provides code-diff style recommendations for resolving the issue.

### Privacy

Your API key is stored only in your browser's local storage. It is sent directly from your browser to the AI provider. DeFlaky servers never see or store your key.

---

## Dashboard

The DeFlaky dashboard provides a visual interface for tracking test reliability over time.

<!-- Screenshot placeholder: Replace with actual dashboard screenshot -->
<!-- ![DeFlaky Dashboard](https://deflaky.com/images/dashboard-preview.png) -->

Key dashboard features:

- **FlakeScore Trend** -- Track your suite's reliability score across builds and time.
- **Flaky Test List** -- See which specific tests are flaking, with pass/fail history.
- **AI Analysis Panel** -- Get AI-powered insights into failure root causes (BYOK required).
- **Team View** -- Share results across your team with a single dashboard URL.

Visit [deflaky.com](https://deflaky.com) to set up your dashboard.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **CLI** | Node.js, Commander.js, chalk, cli-table3, fast-xml-parser |
| **Website / Dashboard** | Next.js 16, Tailwind CSS, TypeScript |
| **Database** | Neon Postgres with Drizzle ORM |
| **AI** | BYOK -- Anthropic Claude, OpenAI GPT-4o, Groq, OpenRouter, Ollama |
| **Deployment** | Vercel |

---

## Project Structure

```
deflaky/
├── cli/            # CLI npm package (Commander.js)
├── website/        # Next.js dashboard + marketing site
├── sample-tests/   # Sample Playwright tests for demo
└── README.md
```

---

## Contributing

Contributions are welcome. To get started:

1. Fork the repository at [github.com/PramodDutta/deflaky](https://github.com/PramodDutta/deflaky).
2. Clone your fork locally.
3. Create a feature branch: `git checkout -b feature/your-feature`.
4. Make your changes and add tests where applicable.
5. Submit a pull request with a clear description of the change.

Please open an issue first for major changes so we can discuss the approach.

---

## License

DeFlaky is released under the [MIT License](LICENSE).

---

<div align="center">

Built by **[The Testing Academy](https://thetestingacademy.com)** (Pramod Dutta)

[Website](https://deflaky.com) | [npm](https://www.npmjs.com/package/deflaky-cli) | [GitHub](https://github.com/PramodDutta/deflaky) | [The Testing Academy](https://thetestingacademy.com)

</div>
