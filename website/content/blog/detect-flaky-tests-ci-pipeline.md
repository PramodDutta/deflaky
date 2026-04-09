---
title: "How to Detect Flaky Tests in Your CI Pipeline (Automated Detection Guide)"
description: "Learn practical methods to automatically detect flaky tests in CI/CD pipelines using rerun analysis, historical tracking, and DeFlaky CLI integration."
date: 2026-04-01
slug: detect-flaky-tests-ci-pipeline
keywords:
  - detect flaky tests CI
  - flaky test detection
  - CI pipeline test reliability
  - automated flaky test detection
  - flaky test CI/CD
  - test failure analysis
  - CI test monitoring
  - flaky test alerts
  - test result tracking
  - continuous integration testing
author: "DeFlaky Team"
---

# How to Detect Flaky Tests in Your CI Pipeline (Automated Detection Guide)

You cannot fix what you cannot see. The biggest challenge with flaky tests is not fixing them -- it is finding them in the first place. A test that fails once every twenty runs is easy to dismiss. A test that fails once every hundred runs might go unnoticed for months. Meanwhile, these invisible failures erode pipeline trust, waste compute, and train your team to ignore red builds.

This guide focuses specifically on detection -- the systematic methods for identifying flaky tests inside your CI pipeline before they become entrenched problems.

## Why Manual Detection Fails

Most teams discover flaky tests the hard way: a developer sees a failed build, investigates, finds nothing wrong, reruns the pipeline, and it passes. They shrug and move on. This reactive approach has three critical problems.

First, it only catches tests that fail during someone's active work. If a flaky test fails at 2 AM during a scheduled build, nobody investigates. The rerun passes and the flakiness is invisible.

Second, it depends on individual memory. Developer A sees a test fail on Monday. Developer B sees the same test fail on Thursday. Neither connects the two events because there is no centralized tracking.

Third, it biases detection toward frequently flaky tests. Tests with a 1% failure rate might never be noticed by any individual developer, but across a team of fifty engineers running the pipeline hundreds of times per day, that 1% failure rate causes multiple wasted investigations per week.

## Method 1: Rerun-Based Detection

The simplest detection method runs each test multiple times and checks for inconsistent results. If a test passes on some runs and fails on others with zero code changes, it is flaky by definition.

### Implementing Rerun Detection in GitHub Actions

```yaml
# .github/workflows/flaky-detection.yml
name: Flaky Test Detection
on:
  schedule:
    - cron: '0 3 * * 1'  # Every Monday at 3 AM
  workflow_dispatch:

jobs:
  detect-flaky:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        run_number: [1, 2, 3, 4, 5]
    steps:
      - uses: actions/checkout@v4

      - name: Install dependencies
        run: npm ci

      - name: Run tests (attempt ${{ matrix.run_number }})
        run: npx jest --json --outputFile=results-${{ matrix.run_number }}.json
        continue-on-error: true

      - name: Upload results
        uses: actions/upload-artifact@v4
        with:
          name: test-results-${{ matrix.run_number }}
          path: results-${{ matrix.run_number }}.json
```

This workflow runs your entire test suite five times in parallel. By comparing the results across runs, you can identify tests that produced different outcomes.

### Rerun Detection with pytest

pytest has a plugin specifically designed for this.

```bash
# Install pytest-repeat
pip install pytest-repeat

# Run every test 10 times
pytest --count=10 -x --tb=short

# Run every test 10 times but don't stop on first failure
pytest --count=10 --tb=short
```

The `-x` flag stops on the first failure, which is useful for interactive debugging. Without it, you get a complete picture of which tests are flaky across all ten runs.

### Rerun Detection with Jest

```javascript
// jest.config.js
module.exports = {
  // Run each test file 5 times
  // Note: This is not a built-in Jest feature.
  // Use a script to run Jest multiple times instead.
};
```

```bash
#!/bin/bash
# detect-flaky.sh - Run Jest multiple times and compare results
RUNS=5
FAILURES=""

for i in $(seq 1 $RUNS); do
  echo "=== Run $i of $RUNS ==="
  npx jest --json --outputFile="results-run-${i}.json" 2>/dev/null

  if [ $? -ne 0 ]; then
    # Extract failed test names
    FAILED=$(node -e "
      const r = require('./results-run-${i}.json');
      r.testResults.forEach(suite => {
        suite.testResults.filter(t => t.status === 'failed')
          .forEach(t => console.log(t.fullName));
      });
    ")
    FAILURES="${FAILURES}\nRun ${i}: ${FAILED}"
  fi
done

echo ""
echo "=== Flaky Test Analysis ==="
echo -e "$FAILURES" | sort | uniq -c | sort -rn
```

This script runs Jest five times and aggregates which tests failed in which runs. Tests that failed in some runs but not others are flaky.

## Method 2: Historical Result Analysis

Rerun-based detection is thorough but expensive -- it multiplies your CI compute by the number of reruns. Historical analysis achieves the same goal by analyzing results you have already collected.

### How It Works

Every CI pipeline run produces test results. By storing these results and analyzing them over time, you can identify tests whose pass/fail status varies without corresponding code changes.

The algorithm is straightforward:

1. For each test, collect the last N results (e.g., last 50 runs).
2. Group results by the commit hash that was being tested.
3. If a test has both pass and fail results for the same commit, it is flaky.
4. Compute a flakiness score: `flaky_runs / total_runs`.

### Implementing Historical Analysis

```python
# analyze_history.py
import json
import sys
from collections import defaultdict

def analyze_flakiness(result_files):
    """Analyze test results across multiple runs to detect flakiness."""
    test_results = defaultdict(lambda: {"pass": 0, "fail": 0, "commits": set()})

    for filepath in result_files:
        with open(filepath) as f:
            data = json.load(f)

        commit = data.get("commit_sha", "unknown")

        for suite in data.get("testResults", []):
            for test in suite.get("testResults", []):
                name = test["fullName"]
                status = test["status"]
                test_results[name]["commits"].add(commit)

                if status == "passed":
                    test_results[name]["pass"] += 1
                elif status == "failed":
                    test_results[name]["fail"] += 1

    # Identify flaky tests
    flaky_tests = []
    for name, results in test_results.items():
        total = results["pass"] + results["fail"]
        if results["pass"] > 0 and results["fail"] > 0:
            flake_rate = results["fail"] / total
            flaky_tests.append({
                "name": name,
                "flake_rate": flake_rate,
                "total_runs": total,
                "failures": results["fail"],
                "unique_commits": len(results["commits"]),
            })

    # Sort by flake rate descending
    flaky_tests.sort(key=lambda x: x["flake_rate"], reverse=True)
    return flaky_tests

if __name__ == "__main__":
    flaky = analyze_flakiness(sys.argv[1:])
    for test in flaky:
        print(f"  {test['flake_rate']:.1%} flaky | {test['name']}")
        print(f"    {test['failures']}/{test['total_runs']} runs failed")
```

### Using DeFlaky for Historical Analysis

DeFlaky automates this entire process. Point it at your test results and it handles the rest.

```bash
# Analyze results from the current run
deflaky analyze --input test-results.xml --format junit

# Push results to the DeFlaky dashboard for historical tracking
deflaky push --input test-results.xml --project my-app

# View flakiness trends
deflaky dashboard --open
```

The [DeFlaky Dashboard](/demo) tracks every test across every run and computes FlakeScore -- a weighted reliability metric that accounts for failure frequency, recency, and impact. Tests that fail frequently and recently get higher FlakeScores, helping you prioritize fixes.

## Method 3: Differential Detection

Differential detection identifies flaky tests by comparing test results between runs that have identical code. This method is particularly effective in CI environments where the same commit is tested multiple times (e.g., when a pipeline is rerun after a flaky failure).

### Implementation in CI

```yaml
# Add to your CI pipeline
- name: Check for flaky failures
  if: failure()
  run: |
    # Compare current failures against known flaky tests
    deflaky check \
      --input test-results.xml \
      --threshold 0.05 \
      --exit-code
```

The `deflaky check` command compares the current test failures against historical data. If a failed test has previously passed and failed on the same codebase, DeFlaky flags it as likely flaky rather than a genuine regression. This helps your team distinguish between "this test is broken because of my code change" and "this test is flaky and my code change is fine."

## Method 4: Parallel Execution Comparison

Running the same tests in parallel on different machines exposes environment-sensitive flakiness. If a test passes on Worker A but fails on Worker B with the same code and configuration, the test depends on something that varies between environments.

```yaml
# GitHub Actions: Run tests on multiple runners simultaneously
jobs:
  test-matrix:
    strategy:
      fail-fast: false
      matrix:
        runner: [ubuntu-latest, ubuntu-22.04]
        shard: [1, 2, 3]
    runs-on: ${{ matrix.runner }}
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - name: Run shard ${{ matrix.shard }}
        run: |
          npx jest --shard=${{ matrix.shard }}/3 \
            --json --outputFile=results-${{ matrix.runner }}-${{ matrix.shard }}.json
        continue-on-error: true
      - uses: actions/upload-artifact@v4
        with:
          name: results-${{ matrix.runner }}-${{ matrix.shard }}
          path: results-*.json
```

## Method 5: Smart Alerting on Failure Patterns

Instead of treating every test failure as equal, build alerting that recognizes flaky patterns.

```python
# flaky_alert.py - Alert only on likely-real failures
def should_alert(test_name, current_status, history):
    """Determine if a test failure warrants an alert."""
    if current_status == "passed":
        return False

    # Check historical flakiness
    recent_results = history.get_recent(test_name, count=20)
    if not recent_results:
        return True  # New test, always alert on failure

    flake_rate = sum(1 for r in recent_results if r == "fail") / len(recent_results)

    if flake_rate > 0.3:
        # Known highly flaky test -- suppress alert, log for tracking
        log_flaky_occurrence(test_name)
        return False
    elif flake_rate > 0.05:
        # Moderately flaky -- alert but tag as possibly flaky
        return True  # Alert with "[Possibly Flaky]" prefix
    else:
        # Rarely or never flaky -- this is likely a real failure
        return True
```

## Setting Up Continuous Flaky Test Monitoring

The most effective approach combines multiple detection methods into a continuous monitoring pipeline.

### Step 1: Instrument Your CI Pipeline

Add test result collection to every CI run, not just special detection runs.

```bash
# Add to every CI pipeline run
npx jest --json --outputFile=test-results.json
deflaky push --input test-results.json --project $PROJECT_NAME --commit $GITHUB_SHA
```

### Step 2: Configure Alerting Thresholds

Set thresholds for when flaky tests require attention.

```yaml
# deflaky.config.yml
thresholds:
  flake_rate_warning: 0.05    # 5% failure rate triggers warning
  flake_rate_critical: 0.15   # 15% failure rate triggers critical alert
  new_flaky_test_alert: true  # Alert when a previously stable test becomes flaky
  resolution_sla_hours: 48    # SLA for fixing critical flaky tests
```

### Step 3: Review the Dashboard Weekly

Schedule a weekly review of your [DeFlaky Dashboard](/demo) to catch trends before they become crises. Look for:

- Tests whose flake rate is increasing over time
- New tests that were added with high flake rates
- Tests that were fixed but are becoming flaky again
- Clusters of flaky tests that share a common root cause

### Step 4: Integrate with Your Workflow

Connect flaky test detection to your team's existing workflow tools.

```bash
# Create a Jira ticket for each new flaky test
deflaky report --format jira --threshold 0.05

# Post flaky test summary to Slack
deflaky report --format slack --webhook $SLACK_WEBHOOK_URL

# Block PR merges if the PR introduces new flaky tests
deflaky check --input test-results.xml --baseline main --exit-code
```

## Detection Metrics to Track

Once your detection system is running, track these metrics to measure its effectiveness.

**Mean Time to Detection (MTTD)**: How long between when a test first becomes flaky and when your system flags it. Target: under 48 hours.

**Detection Coverage**: What percentage of your test suite is monitored for flakiness. Target: 100%.

**False Positive Rate**: How often your system flags a test as flaky when it is actually failing due to a real bug. Target: under 5%.

**Flaky Test Inventory Size**: The total number of known flaky tests at any given time. This should trend downward as you fix them.

## Conclusion

Detecting flaky tests is the prerequisite to fixing them. Without systematic detection, flaky tests accumulate silently until they reach a critical mass that makes your CI pipeline unreliable.

Start with the method that fits your current infrastructure. If you already store test results, historical analysis gives you immediate value with no additional CI compute. If you are starting fresh, rerun-based detection is simple to implement and highly accurate.

For a complete solution that combines all these methods, try [DeFlaky](/pricing). The CLI integrates with your existing test runner in minutes, and the dashboard gives your team visibility into test reliability across every pipeline run.

The goal is not zero flaky tests overnight. The goal is continuous visibility -- knowing exactly which tests are flaky, how flaky they are, and whether the trend is improving or worsening. With that visibility, your team can make informed decisions about where to invest their fix efforts for maximum impact.
