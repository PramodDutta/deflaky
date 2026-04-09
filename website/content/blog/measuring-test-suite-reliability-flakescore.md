---
title: "Measuring Test Suite Reliability with FlakeScore: A Practical Scoring System"
description: "Learn how to compute FlakeScore for your test suite, set reliability benchmarks, and build dashboards that drive real improvement."
date: 2026-04-04
slug: measuring-test-suite-reliability-flakescore
keywords:
  - test suite reliability score
  - FlakeScore
  - test reliability metrics
  - test suite health
  - flaky test measurement
  - test quality score
  - CI reliability metrics
  - test suite confidence
  - test flakiness scoring
  - test automation KPIs
author: "DeFlaky Team"
---

# Measuring Test Suite Reliability with FlakeScore: A Practical Scoring System

"Our tests are kind of flaky" is not a metric. It is a feeling. Feelings do not drive engineering decisions, allocate budgets, or prove improvement. If you want to fix flaky tests, you need a number -- a single, actionable metric that tells you how reliable your test suite is, how it is trending, and where to focus your effort.

That metric is **FlakeScore**.

## What Is FlakeScore?

FlakeScore is a composite reliability metric that assigns a score from 0 to 100 to every test in your suite and to the suite as a whole. A FlakeScore of 100 means perfectly deterministic -- the test has never produced inconsistent results. A FlakeScore of 0 means completely unreliable -- the test's outcome is essentially random.

Unlike a simple pass/fail rate, FlakeScore accounts for three dimensions of flakiness:

1. **Frequency**: How often does the test flip between pass and fail?
2. **Recency**: Did the flakiness happen recently or months ago?
3. **Consistency**: Does the test fail at a steady rate, or does it have sporadic bursts?

## The FlakeScore Formula

Here is the formula DeFlaky uses to compute FlakeScore for an individual test:

```
FlakeScore = 100 - (FrequencyPenalty + RecencyPenalty + BurstPenalty)
```

### Frequency Penalty

The frequency penalty is based on the proportion of runs that produced inconsistent results over a rolling window.

```python
def frequency_penalty(results, window=50):
    """
    Calculate the frequency penalty based on flip rate.
    A 'flip' is when a test result differs from the previous run.

    Args:
        results: List of booleans (True=pass, False=fail), newest first.
        window: Number of recent results to consider.
    """
    recent = results[:window]
    if len(recent) < 2:
        return 0

    flips = sum(
        1 for i in range(1, len(recent))
        if recent[i] != recent[i - 1]
    )

    flip_rate = flips / (len(recent) - 1)
    # Scale to 0-50 range (max 50 points penalty)
    return min(50, flip_rate * 100)
```

A test that flips between pass and fail on every other run has a flip rate of 1.0, earning the maximum 50-point penalty. A test that flipped once in the last 50 runs has a flip rate of 0.02, earning a 2-point penalty.

### Recency Penalty

Recent flakiness matters more than historical flakiness. A test that was flaky six months ago but has been stable since is not a current concern.

```python
def recency_penalty(results, window=50):
    """
    Weight recent flips more heavily than old ones.

    Uses exponential decay: recent flips get more weight.
    """
    recent = results[:window]
    if len(recent) < 2:
        return 0

    total_weight = 0
    flip_weight = 0

    for i in range(1, len(recent)):
        # Exponential decay: most recent results have weight ~1.0,
        # oldest results have weight ~0.1
        weight = 0.95 ** i
        total_weight += weight
        if recent[i] != recent[i - 1]:
            flip_weight += weight

    if total_weight == 0:
        return 0

    recency_rate = flip_weight / total_weight
    # Scale to 0-30 range (max 30 points penalty)
    return min(30, recency_rate * 60)
```

### Burst Penalty

Some tests are not consistently flaky -- they have bursts of failures followed by periods of stability. This pattern is often caused by infrastructure issues (a particular CI runner, a cloud provider outage) and warrants a smaller penalty than consistent flakiness.

```python
def burst_penalty(results, window=50):
    """
    Penalize tests with clustered failures (bursts) less than
    tests with evenly distributed failures.

    Rationale: Bursts often indicate environmental issues rather
    than fundamental test problems.
    """
    recent = results[:window]
    failures = [i for i, r in enumerate(recent) if not r]

    if len(failures) < 2:
        return 0

    # Calculate the variance of failure positions
    # High variance = spread out = consistent flakiness = more penalty
    # Low variance = clustered = burst = less penalty
    mean_pos = sum(failures) / len(failures)
    variance = sum((f - mean_pos) ** 2 for f in failures) / len(failures)
    max_variance = (window / 2) ** 2  # Maximum possible variance

    spread_ratio = variance / max_variance if max_variance > 0 else 0
    # Scale to 0-20 range (max 20 points penalty)
    return min(20, spread_ratio * 20)
```

## Computing Suite-Level FlakeScore

The overall suite FlakeScore is the weighted average of individual test FlakeScores, weighted by test execution frequency.

```python
def suite_flakescore(tests):
    """
    Compute the suite-level FlakeScore.

    Tests that run more frequently get more weight because their
    flakiness has more impact on the team.
    """
    total_weight = 0
    weighted_score = 0

    for test in tests:
        weight = test["run_count"]  # More runs = more weight
        total_weight += weight
        weighted_score += test["flakescore"] * weight

    if total_weight == 0:
        return 100

    return weighted_score / total_weight
```

## FlakeScore Benchmarks

Based on data from thousands of test suites analyzed through DeFlaky, here are the benchmark tiers:

| Suite FlakeScore | Rating | What It Means |
|-----------------|--------|---------------|
| 95-100 | Excellent | Minimal flakiness. Team trusts the suite fully. |
| 85-94 | Good | Occasional flakiness. Team trusts the suite with minor reservations. |
| 70-84 | Fair | Regular flakiness. Developers sometimes rerun builds. |
| 50-69 | Poor | Frequent flakiness. Developers routinely ignore failures. |
| Below 50 | Critical | Pervasive flakiness. Test suite provides little value. |

Most teams start in the 60-75 range when they first measure. After focused effort, reaching 90+ is achievable within 2-3 months.

## Building a FlakeScore Dashboard

A FlakeScore dashboard should answer three questions at a glance:

1. **What is our current FlakeScore?** The headline number.
2. **Is it improving?** The trend over time.
3. **What should we fix next?** The prioritized list of worst offenders.

### Dashboard Components

**The Headline Score:**

Display the suite-level FlakeScore prominently. Use color coding: green for 90+, yellow for 70-89, red for below 70.

**The Trend Chart:**

Plot the suite FlakeScore daily over the last 30 days. This reveals whether your efforts are moving the needle.

**The Worst Offenders Table:**

| Test Name | FlakeScore | Flake Rate | Last Flake | Runs |
|-----------|-----------|-----------|-----------|------|
| checkout.test.ts > processes payment | 23 | 34% | 2 hours ago | 156 |
| auth.test.ts > refreshes expired token | 41 | 18% | 1 day ago | 203 |
| search.test.ts > handles empty results | 67 | 8% | 3 days ago | 178 |

**The Improvement Tracker:**

Show tests whose FlakeScore has improved (or degraded) the most in the last 7 days. This celebrates progress and surfaces regressions.

### The DeFlaky Dashboard

The [DeFlaky Dashboard](/demo) provides all of these components out of the box. Connect your CI pipeline and the dashboard populates automatically:

```bash
# Add to your CI pipeline to feed the dashboard
deflaky push \
  --input test-results.xml \
  --project my-app \
  --commit $GITHUB_SHA \
  --branch $GITHUB_REF_NAME
```

## Setting Improvement Targets

FlakeScore targets should be time-bound and incremental.

### Example Improvement Plan

**Current state:** Suite FlakeScore of 68.

**Month 1 target: 78** (10-point improvement)
- Fix the top 5 flakiest tests (FlakeScore < 30)
- Expected effort: 3-4 engineering days

**Month 2 target: 85** (7-point improvement)
- Fix tests with FlakeScore 30-60
- Add `deflaky check` to PR pipeline to prevent new flaky tests
- Expected effort: 3-4 engineering days

**Month 3 target: 92** (7-point improvement)
- Fix remaining tests with FlakeScore < 80
- Refactor test infrastructure for better isolation
- Expected effort: 5-6 engineering days

**Maintenance target: Stay above 90**
- Monitor dashboard weekly
- Fix new flaky tests within 48 hours of detection
- Expected effort: 1-2 hours per week

## Using FlakeScore in CI Gates

FlakeScore can be used as a CI gate to prevent flakiness from increasing.

```yaml
# GitHub Actions: Block PR merge if FlakeScore drops
- name: Check FlakeScore
  run: |
    deflaky check \
      --input test-results.xml \
      --min-flakescore 85 \
      --exit-code
```

This fails the pipeline if any test introduced by the PR has a FlakeScore below 85, preventing new flaky tests from entering the codebase.

## FlakeScore vs Other Metrics

### FlakeScore vs Pass Rate

Pass rate tells you how often tests pass. It does not distinguish between legitimate failures (due to real bugs) and flaky failures. A test with a 90% pass rate might be flaky, or it might be catching real bugs 10% of the time. FlakeScore only penalizes non-deterministic behavior.

### FlakeScore vs Flake Rate

Flake rate is the raw percentage of runs that produce inconsistent results. FlakeScore improves on flake rate by weighting for recency and burst patterns. Two tests with the same 10% flake rate can have different FlakeScores if one was flaky recently and the other was flaky months ago.

### FlakeScore vs MTTR

Mean Time to Resolution (MTTR) measures how quickly flaky tests are fixed once detected. FlakeScore measures the current state of flakiness. Together, they provide a complete picture: FlakeScore tells you how bad things are, and MTTR tells you how quickly your team responds.

## Conclusion

You cannot improve what you do not measure. FlakeScore gives you a single, understandable number that captures the reliability of your test suite. It transforms "our tests are kind of flaky" into "our suite FlakeScore is 72, down from 68 last month, and the top offender is the checkout payment test at FlakeScore 23."

Start measuring today. Compute your baseline, set targets, and track progress. Use the [DeFlaky Dashboard](/demo) to automate the entire process -- from data collection to scoring to prioritization.

The path from a FlakeScore of 68 to 92 is not a massive rewrite. It is a series of small, focused fixes guided by data. FlakeScore tells you exactly where those fixes will have the most impact.

Check your current [FlakeScore with DeFlaky](/pricing) and start your improvement journey today.
