---
title: "How to Detect Flaky Tests in Your CI/CD Pipeline: 7 Proven Methods"
description: "Discover 7 battle-tested methods to detect flaky tests in your CI/CD pipeline. Learn re-run strategies, statistical analysis, quarantine patterns, and how to use CLI tools to automatically identify unreliable tests."
date: 2026-04-07
slug: how-to-detect-flaky-tests
keywords:
  - detect flaky tests
  - find flaky tests
  - flaky test detection
  - CI/CD flaky tests
  - flaky test identification
  - test reliability analysis
  - quarantine flaky tests
  - flaky test monitoring
  - GitHub Actions flaky tests
  - test result analysis
author: "Pramod Dutta"
---

# How to Detect Flaky Tests in Your CI/CD Pipeline: 7 Proven Methods

You cannot fix what you cannot see. The hardest part of dealing with flaky tests is not fixing them -- it is finding them in the first place. A test that fails once every 50 runs might go unnoticed for weeks, silently eroding trust in your CI/CD pipeline while developers waste time investigating phantom failures.

This guide presents seven proven methods for detecting flaky tests, ranging from simple re-run strategies to sophisticated statistical analysis. Whether you are managing a test suite of 200 tests or 20,000, these methods will help you systematically surface the unreliable tests hiding in your codebase.

## Why Detecting Flaky Tests Is Harder Than You Think

Before diving into detection methods, it is worth understanding why flaky tests are so difficult to identify.

### The Intermittency Problem

A test with a 5% failure rate will pass 95% of the time. That means in a typical daily CI run, you might not see it fail for days. When it does fail, the developer investigating it sees that the test passes on re-run and moves on. Without aggregating data across many runs, the pattern is invisible.

### The Attribution Problem

When a CI build fails, the first question is always: "Is this caused by my code change or is it a flaky test?" Without historical data on test reliability, there is no quick way to answer this question. Developers either waste time investigating (if the test is flaky) or ignore the failure (if the test is legitimate), and they have to guess which situation they are in.

### The Scale Problem

In a large test suite, even a low overall flakiness rate translates to frequent pipeline failures. If you have 5,000 tests and each has a 0.1% chance of flaking on any given run, the probability that at least one test flakes is approximately 99.3%. Your pipeline will fail on virtually every run, even though each individual test seems reliable.

This is why systematic detection is essential. Manual investigation cannot keep pace with the scale of the problem.

## Method 1: The Re-Run Strategy

The simplest and most widely used method for detecting flaky tests is to re-run failed tests and check whether they pass on the second attempt. If a test fails and then passes without any code changes, it is definitively flaky.

### Basic Re-Run Implementation

Most test frameworks support automatic re-runs natively or through plugins.

**pytest (Python):**

```bash
pip install pytest-rerunfailures
pytest --reruns 3 --reruns-delay 2
```

This re-runs any failed test up to 3 times with a 2-second delay between attempts. Tests that eventually pass are marked as "rerun" rather than "passed" or "failed."

**Jest (JavaScript):**

```json
// jest.config.js
module.exports = {
  retryTimes: 3,
  logHeapUsage: true,
};
```

**JUnit 5 (Java) with Pioneer:**

```java
import org.junitpioneer.jupiter.RetryingTest;

class FlakyCandidateTest {
    @RetryingTest(3)
    void testThatMightBeFlaky() {
        // test code
    }
}
```

### Limitations of Basic Re-Runs

While re-runs are effective for detecting highly flaky tests, they have significant drawbacks.

**They mask the problem instead of surfacing it.** When a flaky test passes on re-run, the pipeline shows green. The flakiness is hidden from the team, and the test remains unfixed.

**They increase pipeline duration.** Each re-run adds time to your CI pipeline. If flaky tests fail in the first 10 minutes of a 30-minute test run, the re-run adds another 10+ minutes.

**They miss rarely flaky tests.** A test with a 1% failure rate will almost certainly pass on the second attempt. You need many more re-runs to detect it reliably.

**They do not provide data for prioritization.** Re-runs tell you whether a test flaked on this run, but they do not track trends over time or help you understand which tests are most problematic.

### Enhanced Re-Run Strategy

A better approach is to log re-run events rather than silently masking them. Record every instance where a test failed on the first attempt but passed on retry. This data becomes the foundation for identifying and prioritizing flaky tests.

```yaml
# GitHub Actions workflow with re-run logging
- name: Run tests with flaky detection
  run: |
    pytest --reruns 3 --reruns-delay 2 \
      --junitxml=test-results.xml \
      -v 2>&1 | tee test-output.log

    # Extract re-run information
    grep "RERUN" test-output.log >> flaky-log.txt || true

- name: Upload flaky test log
  uses: actions/upload-artifact@v4
  with:
    name: flaky-tests
    path: flaky-log.txt
```

## Method 2: Statistical Analysis of Test History

The most reliable method for detecting flaky tests is to collect test results over time and analyze them statistically. This approach identifies tests that fail intermittently, even if the failure rate is very low.

### Collecting Test Results

The first step is to persist test results from every CI run. Most CI systems support JUnit XML format, which provides structured test result data.

```yaml
# GitHub Actions: collect and upload test results
- name: Run tests
  run: pytest --junitxml=test-results.xml

- name: Upload test results
  uses: actions/upload-artifact@v4
  with:
    name: test-results-${{ github.run_number }}
    path: test-results.xml
```

### Analyzing Results

Once you have test results from multiple runs, you can compute a flakiness score for each test.

```python
import xml.etree.ElementTree as ET
import glob
from collections import defaultdict

def analyze_flakiness(results_dir):
    test_results = defaultdict(lambda: {"pass": 0, "fail": 0})

    for xml_file in glob.glob(f"{results_dir}/*.xml"):
        tree = ET.parse(xml_file)
        for testcase in tree.iter("testcase"):
            name = f"{testcase.get('classname')}.{testcase.get('name')}"
            if testcase.find("failure") is not None:
                test_results[name]["fail"] += 1
            else:
                test_results[name]["pass"] += 1

    flaky_tests = []
    for name, results in test_results.items():
        total = results["pass"] + results["fail"]
        if total >= 5 and results["pass"] > 0 and results["fail"] > 0:
            flakiness_rate = results["fail"] / total
            flaky_tests.append({
                "name": name,
                "flakiness_rate": flakiness_rate,
                "total_runs": total,
                "failures": results["fail"]
            })

    return sorted(flaky_tests, key=lambda x: x["flakiness_rate"], reverse=True)
```

### Statistical Significance

Not every test that fails once is flaky. A single failure in 100 runs could be a one-time environmental issue. Use statistical significance testing to distinguish genuine flakiness from noise.

A simple approach is to require a minimum number of observations (e.g., at least 10 runs) and a minimum failure count (e.g., at least 2 failures) before classifying a test as flaky.

A more sophisticated approach uses binomial hypothesis testing:

```python
from scipy import stats

def is_statistically_flaky(failures, total_runs, threshold=0.01):
    """
    Test whether the failure rate is statistically significant.
    Uses a binomial test against the null hypothesis that the test
    never fails (p=0).
    """
    if failures == 0:
        return False

    # Test against a very low expected failure rate
    p_value = stats.binom_test(failures, total_runs, p=threshold)
    return p_value < 0.05 and failures / total_runs < 0.5
```

### The DeFlaky Approach to Statistical Analysis

DeFlaky automates this entire process. Its CLI ingests test results from your CI pipeline and computes flakiness scores using a combination of failure rate analysis, trend detection, and change-point analysis to distinguish between tests that are inherently flaky and tests that started failing due to a code change.

```bash
# Install DeFlaky CLI
npm install -g deflaky

# Analyze test results
deflaky analyze --input ./test-results/ --format junit

# Output: ranked list of flaky tests with scores and trends
```

The DeFlaky dashboard provides a time-series view of each test's reliability, making it easy to see whether a test is getting more or less flaky over time and to correlate flakiness changes with specific commits or infrastructure changes.

## Method 3: Repeat-Until-Failure Testing

This method involves running a single test (or a subset of tests) many times in rapid succession to determine whether it is deterministic. It is particularly useful for validating that a specific test is reliable before merging it.

### Implementation

```bash
# Run a single test 100 times
for i in $(seq 1 100); do
  if ! pytest tests/test_checkout.py::test_apply_coupon -x --tb=short 2>/dev/null; then
    echo "FAILED on run $i"
    exit 1
  fi
done
echo "PASSED all 100 runs"
```

### Integration with Pull Requests

You can integrate repeat-until-failure testing into your PR workflow to catch flaky tests before they enter the main branch.

```yaml
# .github/workflows/flaky-check.yml
name: Flaky Test Check
on:
  pull_request:
    paths:
      - 'tests/**'

jobs:
  flaky-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Identify new/modified tests
        id: changed-tests
        run: |
          TESTS=$(git diff --name-only origin/main -- 'tests/**/*.py' | tr '\n' ' ')
          echo "tests=$TESTS" >> $GITHUB_OUTPUT

      - name: Run changed tests 20 times
        if: steps.changed-tests.outputs.tests != ''
        run: |
          for i in $(seq 1 20); do
            echo "=== Attempt $i ==="
            pytest ${{ steps.changed-tests.outputs.tests }} --tb=short
          done
```

This ensures that any new or modified test must pass 20 consecutive times before the PR can be merged. Tests with even a 5% flakiness rate have a 64% chance of failing at least once in 20 runs, making this an effective filter.

### Stress Testing with Parallelism

Running tests repeatedly in sequence catches many flaky tests, but some flakiness only manifests under concurrent load. Run tests in parallel to surface race conditions and resource contention issues.

```bash
# Run the same test in 4 parallel processes simultaneously
for i in $(seq 1 4); do
  pytest tests/test_database.py -x --tb=short &
done
wait
```

## Method 4: Differential Analysis

Differential analysis compares test results between two sets of runs to identify tests whose behavior changed without a corresponding code change.

### The Basic Approach

1. Run your test suite N times on the current main branch (baseline)
2. Run your test suite N times on a feature branch (comparison)
3. Any test that has different pass/fail patterns between the two sets -- especially one that passes consistently on main but fails intermittently on the feature branch -- is a candidate for investigation

### Implementation

```python
def differential_analysis(baseline_results, branch_results):
    """
    Compare test results between two branches to identify
    tests with changed behavior.
    """
    flaky_candidates = []

    for test_name in set(baseline_results.keys()) | set(branch_results.keys()):
        baseline = baseline_results.get(test_name, {"pass": 0, "fail": 0})
        branch = branch_results.get(test_name, {"pass": 0, "fail": 0})

        baseline_rate = baseline["fail"] / max(baseline["pass"] + baseline["fail"], 1)
        branch_rate = branch["fail"] / max(branch["pass"] + branch["fail"], 1)

        # Test was stable on baseline but flaky on branch
        if baseline_rate == 0 and branch_rate > 0 and branch_rate < 1:
            flaky_candidates.append({
                "name": test_name,
                "baseline_fail_rate": baseline_rate,
                "branch_fail_rate": branch_rate,
                "likely_cause": "New code introduced flakiness"
            })

        # Test was already flaky on baseline
        elif baseline_rate > 0 and baseline_rate < 1:
            flaky_candidates.append({
                "name": test_name,
                "baseline_fail_rate": baseline_rate,
                "branch_fail_rate": branch_rate,
                "likely_cause": "Pre-existing flaky test"
            })

    return flaky_candidates
```

### When to Use Differential Analysis

This method is particularly valuable for:

- **Pre-merge validation**: Before merging a PR, compare the test suite's behavior on the PR branch vs. main to ensure the PR does not introduce new flakiness.
- **Infrastructure changes**: When updating CI environments, browser versions, or dependencies, differential analysis reveals tests that are sensitive to these changes.
- **Post-incident investigation**: After a production incident linked to a missed test failure, differential analysis can determine whether the test was already flaky before the incident.

## Method 5: Test Quarantine Patterns

Test quarantine is both a detection and a mitigation strategy. The idea is to isolate suspected flaky tests into a separate execution context where they can be monitored without blocking the main pipeline.

### How Quarantine Works

1. When a test is suspected of being flaky (e.g., it failed and then passed on re-run), it is moved to a quarantine list.
2. Quarantined tests continue to run in CI but their results do not affect the pipeline status.
3. The quarantine system tracks pass/fail rates for quarantined tests.
4. Tests that stabilize (100% pass rate over N runs) are removed from quarantine.
5. Tests that remain flaky are prioritized for investigation and fixing.

### Implementation with Pytest

```python
# conftest.py
import pytest
import json
import os

QUARANTINE_FILE = os.path.join(os.path.dirname(__file__), "quarantine.json")

def load_quarantine():
    if os.path.exists(QUARANTINE_FILE):
        with open(QUARANTINE_FILE) as f:
            return json.load(f)
    return []

quarantined_tests = load_quarantine()

def pytest_collection_modifyitems(config, items):
    quarantine_marker = pytest.mark.xfail(
        reason="Quarantined: known flaky test",
        strict=False
    )
    for item in items:
        if item.nodeid in quarantined_tests:
            item.add_marker(quarantine_marker)
```

```json
// quarantine.json
[
  "tests/test_checkout.py::test_apply_coupon_to_cart",
  "tests/test_notifications.py::test_email_delivery",
  "tests/test_search.py::test_autocomplete_suggestions"
]
```

### Quarantine with DeFlaky

DeFlaky provides built-in quarantine management through its CLI and dashboard. When DeFlaky's analysis identifies a test as flaky above a configurable threshold, it can automatically add it to the quarantine list.

```bash
# Auto-quarantine tests with >5% flakiness rate
deflaky quarantine --threshold 0.05 --output quarantine.json

# List currently quarantined tests
deflaky quarantine --list

# Release tests that have stabilized
deflaky quarantine --release --min-passes 20
```

The dashboard shows the quarantine queue, how long each test has been quarantined, and whether its flakiness is improving or worsening, giving the team actionable data for prioritizing fixes.

### Best Practices for Quarantine

- **Set a maximum quarantine duration.** A test that has been quarantined for more than 2 weeks should be either fixed or deleted. Indefinite quarantine is effectively the same as deleting the test.
- **Limit the quarantine size.** If more than 5% of your tests are quarantined, you have a systemic problem that quarantine alone cannot solve.
- **Track quarantine metrics.** Monitor the inflow and outflow of the quarantine queue. A growing quarantine means flaky tests are being created faster than they are being fixed.

## Method 6: Commit-Based Bisection

When you know a test is flaky but do not know when it became flaky, commit-based bisection can help you identify the exact commit that introduced the flakiness.

### The Process

1. Identify a commit where the test was definitely not flaky (e.g., when it was first written)
2. Identify a commit where the test is definitely flaky (e.g., the current main branch)
3. Use binary search to find the commit where flakiness was introduced

### Using Git Bisect

```bash
# Start bisection
git bisect start

# Mark current commit as flaky (bad)
git bisect bad

# Mark a known-good commit
git bisect good abc123

# For each commit git bisect selects, run the test multiple times
# and mark as good or bad based on results
git bisect run bash -c '
  FAILURES=0
  for i in $(seq 1 20); do
    if ! pytest tests/test_checkout.py::test_apply_coupon -x --tb=no -q 2>/dev/null; then
      FAILURES=$((FAILURES + 1))
    fi
  done
  if [ $FAILURES -gt 0 ]; then
    exit 1  # bad: test is flaky
  else
    exit 0  # good: test is stable
  fi
'
```

### Limitations

Commit-based bisection is time-intensive because each step requires running the test multiple times. It works best for tests with high flakiness rates (>10%) where you can detect flakiness in a small number of runs.

For rarely flaky tests, you may need 100+ runs per commit to determine flakiness with confidence, making bisection impractical. In these cases, code review of the test's dependencies is usually more efficient.

## Method 7: Machine Learning-Based Detection

For large-scale test suites, machine learning can identify patterns that humans and simple statistical methods miss.

### Feature Engineering

Machine learning models for flaky test detection typically use these features:

- **Test characteristics**: execution time, number of assertions, test file size, number of dependencies
- **Historical behavior**: pass/fail history, variance in execution time, time since last failure
- **Code characteristics**: cyclomatic complexity of the code under test, number of external calls, use of async/await patterns
- **Environmental factors**: CI worker type, time of day, concurrent jobs

### A Simple Classifier

```python
from sklearn.ensemble import RandomForestClassifier
import pandas as pd

def train_flaky_detector(test_features_df):
    """
    Train a classifier to predict which tests are likely to be flaky.
    """
    features = [
        'execution_time_variance',
        'failure_count_last_30_days',
        'uses_network',
        'uses_database',
        'uses_sleep',
        'test_file_size',
        'num_assertions',
        'is_async',
        'has_retry_logic'
    ]

    X = test_features_df[features]
    y = test_features_df['is_flaky']  # Labeled based on historical analysis

    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X, y)

    # Feature importance reveals common causes
    importance = dict(zip(features, model.feature_importances_))
    print("Feature importance:", sorted(importance.items(), key=lambda x: -x[1]))

    return model
```

### Practical Application

In practice, most teams do not need a full ML pipeline for flaky test detection. Statistical analysis (Method 2) combined with re-run tracking (Method 1) catches the vast majority of flaky tests. ML-based detection becomes valuable at scale -- when you have thousands of tests and need to proactively identify tests that are likely to become flaky based on their characteristics.

## Integrating Flaky Test Detection into GitHub Actions

Here is a complete GitHub Actions workflow that combines several detection methods into an automated pipeline.

```yaml
name: Test Suite with Flaky Detection

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install pytest-rerunfailures
          npm install -g deflaky

      - name: Run tests with re-run tracking
        run: |
          pytest \
            --reruns 3 \
            --reruns-delay 2 \
            --junitxml=test-results.xml \
            -v 2>&1 | tee test-output.log

      - name: Analyze flaky tests
        if: always()
        run: |
          deflaky analyze \
            --input test-results.xml \
            --format junit \
            --output flaky-report.json

      - name: Report flaky tests
        if: always()
        run: |
          deflaky report \
            --input flaky-report.json \
            --format markdown >> $GITHUB_STEP_SUMMARY

      - name: Upload test artifacts
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-results
          path: |
            test-results.xml
            flaky-report.json
            test-output.log

  flaky-check-new-tests:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Identify new/modified tests
        id: changed
        run: |
          TESTS=$(git diff --name-only origin/main -- 'tests/**/*.py')
          echo "files=$TESTS" >> $GITHUB_OUTPUT
          echo "count=$(echo "$TESTS" | grep -c '.' || true)" >> $GITHUB_OUTPUT

      - name: Stress test new/modified tests
        if: steps.changed.outputs.count > 0
        run: |
          echo "Running changed tests 10 times to check for flakiness..."
          for i in $(seq 1 10); do
            echo "=== Run $i/10 ==="
            pytest ${{ steps.changed.outputs.files }} --tb=short -q
          done
```

### GitLab CI Integration

```yaml
# .gitlab-ci.yml
test:
  stage: test
  script:
    - pip install pytest pytest-rerunfailures
    - pytest --reruns 3 --junitxml=test-results.xml
  artifacts:
    reports:
      junit: test-results.xml
    paths:
      - test-results.xml

flaky-analysis:
  stage: test
  needs: [test]
  when: always
  script:
    - npm install -g deflaky
    - deflaky analyze --input test-results.xml --format junit
  artifacts:
    paths:
      - flaky-report.json
```

### Jenkins Integration

```groovy
// Jenkinsfile
pipeline {
    agent any

    stages {
        stage('Test') {
            steps {
                sh 'pytest --reruns 3 --junitxml=test-results.xml'
            }
            post {
                always {
                    junit 'test-results.xml'
                    sh 'deflaky analyze --input test-results.xml --format junit --output flaky-report.json'
                    archiveArtifacts artifacts: 'flaky-report.json'
                }
            }
        }
    }
}
```

## Building a Flaky Test Detection Dashboard

For teams that want visibility into test reliability trends, a dashboard is essential. Here is what to include.

### Key Metrics to Display

1. **Overall flakiness rate**: Percentage of tests with any flakiness in the last 30 days
2. **Top 10 flakiest tests**: Ranked by failure rate, with trend indicators
3. **Flakiness trend**: Is the overall flakiness rate going up or down?
4. **Quarantine queue**: How many tests are currently quarantined?
5. **Re-run rate**: What percentage of CI runs required re-runs?
6. **Time wasted**: Estimated developer hours lost to flaky test investigation

### DeFlaky Dashboard

DeFlaky provides a pre-built dashboard that tracks all of these metrics out of the box. After integrating the DeFlaky CLI into your CI pipeline, test results are automatically aggregated and displayed on the dashboard.

The dashboard includes:

- **Test reliability scores**: Each test gets a reliability score from 0 (always fails) to 100 (never fails), with scores between 0 and 100 indicating flakiness
- **Failure pattern analysis**: Visual timeline showing when each test failed, making it easy to spot patterns (e.g., tests that only fail during peak hours or on specific days)
- **Root cause categorization**: Automatic classification of likely root causes based on failure patterns and error messages
- **Team leaderboard**: Which teams have the most and fewest flaky tests, fostering healthy competition

## A Practical Detection Workflow

Here is a step-by-step workflow that combines the methods described above into a cohesive detection strategy.

### Phase 1: Establish Baseline (Week 1)

1. Enable test result collection in your CI pipeline (JUnit XML output)
2. Set up re-run tracking with `pytest-rerunfailures` or equivalent
3. Collect results from at least 20 CI runs without changing anything
4. Analyze results to identify currently flaky tests

### Phase 2: Triage and Quarantine (Week 2)

1. Review the list of identified flaky tests
2. Quarantine tests with >5% failure rate that cannot be quickly fixed
3. Assign ownership for investigation and fixing
4. Set SLAs for quarantine duration (recommend 2-week maximum)

### Phase 3: Prevention (Ongoing)

1. Add repeat-until-failure testing to your PR workflow for new/modified tests
2. Monitor the flakiness trend on your dashboard
3. Hold weekly or biweekly reviews of the flaky test backlog
4. Celebrate when tests are unquarantined after fixing

### Phase 4: Continuous Improvement (Ongoing)

1. Set flakiness rate targets (e.g., <2% suite-wide flakiness)
2. Investigate spikes in the flakiness trend
3. Share learnings from flaky test fixes across teams
4. Update coding guidelines based on common flakiness patterns

## Common Pitfalls in Flaky Test Detection

### Pitfall 1: Confusing Flaky Tests with Flaky Infrastructure

Sometimes what appears to be a flaky test is actually a flaky CI environment. If multiple unrelated tests fail simultaneously, the issue is probably environmental (e.g., a Docker image pull failure, a network outage, or a resource-exhausted CI worker).

**Solution**: Look at correlation between failures. If tests that share no code fail together, investigate the infrastructure.

### Pitfall 2: Over-Relying on Re-Runs

Re-runs mask flakiness rather than exposing it. Teams that set up re-runs without tracking re-run events lose visibility into flakiness entirely.

**Solution**: Always log and track re-run events. Treat a test that passes on re-run as a detected flaky test, not as a passing test.

### Pitfall 3: Using Flakiness as an Excuse

Once a team knows that flaky tests exist, it becomes tempting to blame every unexpected failure on flakiness. This leads to ignoring real regressions.

**Solution**: Use data-driven detection (statistical analysis, not developer intuition) to classify tests as flaky. If a test is not in the known-flaky list, treat its failure as a real failure.

### Pitfall 4: Detection Without Action

Detecting flaky tests is only valuable if you act on the information. A dashboard full of identified flaky tests that nobody is fixing is just a display of technical debt.

**Solution**: Pair detection with process changes. Assign ownership, set SLAs, and make flaky test reduction a team OKR.

## Conclusion

Detecting flaky tests is the critical first step in reclaiming your CI/CD pipeline's reliability. The seven methods outlined in this guide -- re-run strategies, statistical analysis, repeat-until-failure testing, differential analysis, test quarantine, commit bisection, and ML-based detection -- provide a comprehensive toolkit for surfacing unreliable tests at any scale.

Start with the simplest methods (re-runs and result collection) and progressively adopt more sophisticated approaches as your detection capabilities mature. Tools like DeFlaky can accelerate this journey by automating result collection, statistical analysis, quarantine management, and trend reporting.

The goal is not perfection -- it is visibility. Once you can see which tests are flaky, how flaky they are, and whether flakiness is trending up or down, you have the information you need to make informed decisions about where to invest your engineering effort.

A reliable CI/CD pipeline starts with reliable tests. And reliable tests start with knowing which ones are not reliable.
