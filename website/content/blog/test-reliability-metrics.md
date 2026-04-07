---
title: "Test Reliability Metrics Every QA Team Should Track (FlakeScore and Beyond)"
description: "Learn the essential test reliability metrics every QA team needs: FlakeScore, MTTR for flaky tests, flake rate calculation, test suite health scoring, and industry benchmarks. Build dashboards that drive real improvement in test stability."
date: "2026-04-07"
slug: "test-reliability-metrics"
keywords:
  - test reliability metrics
  - test quality metrics
  - flake rate
  - test stability score
  - FlakeScore
  - test suite health
  - QA metrics dashboard
  - test flakiness measurement
  - MTTR flaky tests
  - test reliability benchmarks
author: "Pramod Dutta"
---

# Test Reliability Metrics Every QA Team Should Track (FlakeScore and Beyond)

You cannot improve what you do not measure. This principle applies to test reliability as much as it does to application performance, revenue, or customer satisfaction. Yet most QA teams fly blind when it comes to understanding the health of their test suite. They know that "tests are flaky sometimes" but cannot tell you which tests, how often, or whether things are getting better or worse.

This guide defines the essential metrics for measuring test reliability, explains how to calculate each one, provides industry benchmarks, and shows you how to build dashboards that drive actual improvement. Whether you are a QA lead trying to justify investment in test reliability, or an engineer trying to prioritize which flaky tests to fix first, these metrics give you the data to make informed decisions.

## Why Test Reliability Metrics Matter

Before diving into specific metrics, let us establish why measurement matters for test reliability.

### The Hidden Cost Problem

Most organizations have no idea how much flaky tests cost them. Without metrics, the cost is invisible -- spread across dozens of developers, thousands of CI runs, and countless hours of lost productivity. Metrics make the cost visible and actionable.

Consider a team that runs their test suite 50 times per day across all branches. If 3% of those runs fail due to flaky tests, that is 1.5 false failures per day. Each false failure costs an average of 30 minutes of developer time (investigating, re-running, waiting). That is 45 minutes per day, or roughly 16 hours per month of engineering time wasted on phantom failures from a single developer's perspective. Multiply by team size, and you are looking at hundreds of hours per month.

### The Trust Problem

Test reliability directly affects developer trust in the test suite. Research consistently shows that when test suite reliability drops below 95%, developers start ignoring test failures. Once that happens, real bugs slip through alongside the false failures, and the entire testing investment is undermined.

Metrics create accountability and visibility. When the team can see that test reliability has dropped from 98% to 93%, they can take action before trust erodes.

### The Prioritization Problem

A team might have 50 flaky tests. Which ones should they fix first? Without metrics, the answer is usually "whichever one annoyed someone most recently." With metrics, you can prioritize by impact: fix the test that fails most often, blocks the most pipelines, or wastes the most developer time.

## Core Metric 1: Flake Rate

The flake rate is the most fundamental test reliability metric. It measures the percentage of test executions that produce non-deterministic results.

### Definition

**Flake Rate** = (Number of non-deterministic test results) / (Total number of test executions) x 100

A "non-deterministic result" means the test produced a different result (pass vs. fail) across multiple runs with no code changes.

### How to Calculate It

There are two approaches to calculating flake rate:

**Approach 1: Binary detection (simple)**

Run each test N times. If it ever produces different results across those N runs, it is flaky. The flake rate is the percentage of tests that are flaky.

```python
# Simple flake rate calculation
def calculate_flake_rate(test_results):
    """
    test_results: dict mapping test_name -> list of booleans (True=pass, False=fail)
    Returns: float between 0 and 1
    """
    flaky_count = 0
    total_tests = len(test_results)

    for test_name, results in test_results.items():
        unique_results = set(results)
        if len(unique_results) > 1:  # Both True and False appear
            flaky_count += 1

    return flaky_count / total_tests if total_tests > 0 else 0
```

**Approach 2: Weighted by frequency (more accurate)**

Calculate the flake rate for each test individually, then aggregate:

```python
def calculate_per_test_flake_rate(results):
    """
    results: list of booleans (True=pass, False=fail)
    Returns: float between 0 and 1
    """
    if len(results) < 2:
        return 0.0

    # A test that always passes or always fails is not flaky
    pass_rate = sum(results) / len(results)

    if pass_rate == 0.0 or pass_rate == 1.0:
        return 0.0

    # Flake rate is how far from deterministic the test is
    # A test that fails 50% of the time has the highest flake rate
    return 2 * min(pass_rate, 1 - pass_rate)

def calculate_suite_flake_rate(all_test_results):
    """
    all_test_results: dict mapping test_name -> list of booleans
    Returns: float between 0 and 1
    """
    rates = [calculate_per_test_flake_rate(results)
             for results in all_test_results.values()]
    return sum(rates) / len(rates) if rates else 0
```

### Industry Benchmarks

| Flake Rate | Assessment | Action |
|-----------|-----------|--------|
| < 0.5% | Excellent | Maintain current practices |
| 0.5% - 2% | Acceptable | Monitor trends, fix high-impact flakes |
| 2% - 5% | Concerning | Prioritize reliability improvements |
| 5% - 10% | Critical | Dedicated sprint for reliability |
| > 10% | Emergency | Stop feature work, fix test suite |

### Common Pitfalls

- **Sample size matters**: Running a test 3 times is insufficient to detect a 5% flake rate. Use at least 20 runs for reliable detection.
- **Time dependency**: Some flaky tests only fail at certain times of day. Measure across different times.
- **Environment dependency**: A test might be flaky only in CI, not locally. Always measure in the environment that matters most.

## Core Metric 2: FlakeScore

FlakeScore is a composite metric that goes beyond simple flake rate to capture the severity and impact of flakiness. While flake rate tells you "how often," FlakeScore tells you "how much does it hurt."

### Definition

FlakeScore combines multiple factors into a single 0-100 score:

**FlakeScore** = w1 * FlakeFrequency + w2 * FlakeImpact + w3 * FlakeRecency + w4 * FlakePersistence

Where:

- **FlakeFrequency** (0-100): How often the test flakes, normalized to a 0-100 scale
- **FlakeImpact** (0-100): How much damage a flake causes (blocks deployments, wastes CI time)
- **FlakeRecency** (0-100): How recently the test flaked (recent flakes score higher)
- **FlakePersistence** (0-100): How long the test has been flaky

The weights (w1-w4) are configurable but commonly set to:
- w1 (Frequency) = 0.35
- w2 (Impact) = 0.30
- w3 (Recency) = 0.20
- w4 (Persistence) = 0.15

### Calculating FlakeScore

```python
from datetime import datetime, timedelta

def calculate_flake_score(test_data):
    """
    test_data: {
        'results': [(timestamp, pass/fail), ...],  # Last 30 days of results
        'blocks_deployment': bool,
        'ci_minutes_per_run': float,
        'first_flake_date': datetime,
        'test_file': str,
    }
    """
    results = test_data['results']

    # 1. Frequency Score (0-100)
    if len(results) < 2:
        return 0

    total_runs = len(results)
    pass_count = sum(1 for _, result in results if result == 'pass')
    fail_count = total_runs - pass_count

    # Flake frequency is highest when pass/fail is 50/50
    if fail_count == 0 or pass_count == 0:
        frequency_score = 0
    else:
        raw_flake_rate = min(pass_count, fail_count) / total_runs
        frequency_score = min(100, raw_flake_rate * 200)  # Scale so 50% = 100

    # 2. Impact Score (0-100)
    impact_score = 0
    if test_data.get('blocks_deployment'):
        impact_score += 50

    ci_minutes = test_data.get('ci_minutes_per_run', 5)
    impact_score += min(50, ci_minutes * 2)  # 25 minutes = max impact

    # 3. Recency Score (0-100)
    # Recent flakes score higher
    now = datetime.now()
    recent_flakes = [ts for ts, result in results
                     if result == 'fail' and (now - ts) < timedelta(days=7)]

    if recent_flakes:
        most_recent = max(recent_flakes)
        days_since = (now - most_recent).days
        recency_score = max(0, 100 - (days_since * 15))  # Decays over ~7 days
    else:
        recency_score = 0

    # 4. Persistence Score (0-100)
    first_flake = test_data.get('first_flake_date')
    if first_flake:
        days_flaky = (now - first_flake).days
        persistence_score = min(100, days_flaky * 3)  # Max at ~33 days
    else:
        persistence_score = 0

    # Weighted composite
    flake_score = (
        0.35 * frequency_score +
        0.30 * impact_score +
        0.20 * recency_score +
        0.15 * persistence_score
    )

    return round(flake_score, 1)
```

### Using FlakeScore for Prioritization

FlakeScore enables data-driven prioritization. Instead of fixing flaky tests based on gut feeling, sort them by FlakeScore and work from the top:

| Test | FlakeScore | Frequency | Impact | Action |
|------|-----------|-----------|--------|--------|
| checkout.test.js | 87.3 | High | Blocks deploy | Fix immediately |
| search.test.js | 62.1 | Medium | Long CI time | Fix this sprint |
| profile.test.js | 31.5 | Low | Low impact | Quarantine for now |
| settings.test.js | 12.2 | Very low | Low impact | Monitor |

DeFlaky calculates FlakeScore automatically for every test in your suite, updating it after each CI run. This gives you a continuously updated priority list that reflects the current state of your test suite, not a snapshot from the last time someone manually investigated.

## Core Metric 3: MTTR for Flaky Tests (Mean Time to Resolve)

MTTR (Mean Time to Resolve) is a well-known DevOps metric, typically applied to production incidents. Applying it to flaky tests gives you insight into how quickly your team responds to test reliability issues.

### Definition

**MTTR** = Average time from when a flaky test is detected to when it is fixed and stable

### How to Track It

```python
def calculate_flaky_mttr(flaky_tests):
    """
    flaky_tests: list of dicts with 'detected_at' and 'resolved_at' timestamps
    Returns: average resolution time in hours
    """
    resolved = [t for t in flaky_tests if t.get('resolved_at')]

    if not resolved:
        return None

    total_hours = sum(
        (t['resolved_at'] - t['detected_at']).total_seconds() / 3600
        for t in resolved
    )

    return total_hours / len(resolved)
```

### Breaking Down MTTR

MTTR can be decomposed into sub-metrics that reveal where time is being spent:

- **MTTD (Mean Time to Detect)**: How long before a flaky test is identified as flaky (not just a one-time failure)
- **MTTA (Mean Time to Acknowledge)**: How long before someone takes ownership of fixing it
- **MTTF (Mean Time to Fix)**: How long the actual fix takes
- **MTTV (Mean Time to Verify)**: How long to confirm the fix resolved the flakiness

MTTR = MTTD + MTTA + MTTF + MTTV

In most teams, MTTD is the largest component. Developers often do not realize a test is flaky until it has been failing intermittently for weeks. Automated detection tools like DeFlaky dramatically reduce MTTD by continuously monitoring test results and flagging non-deterministic patterns.

### Industry Benchmarks

| MTTR | Assessment | Notes |
|------|-----------|-------|
| < 24 hours | Excellent | Rapid response, strong ownership culture |
| 1-3 days | Good | Reasonable for most teams |
| 3-7 days | Acceptable | Might indicate resourcing issues |
| 1-2 weeks | Concerning | Flaky tests are accumulating |
| > 2 weeks | Critical | Test reliability is not a priority, trust is eroding |

## Core Metric 4: Test Suite Health Score

The Test Suite Health Score is a single number that represents the overall reliability of your test suite. It is useful for executive reporting and trend tracking.

### Definition

**Health Score** = 100 - (Penalties)

Penalties are calculated from:

```python
def calculate_health_score(suite_data):
    """
    suite_data: {
        'total_tests': int,
        'flaky_tests': int,
        'quarantined_tests': int,
        'disabled_tests': int,
        'avg_flake_rate': float,  # 0-1
        'suite_pass_rate': float,  # 0-1 (across last 30 days of CI runs)
        'avg_execution_time': float,  # seconds
        'flaky_mttr_hours': float,
    }
    """
    score = 100.0

    # Penalty for flaky tests (max -30 points)
    flaky_ratio = suite_data['flaky_tests'] / suite_data['total_tests']
    score -= min(30, flaky_ratio * 500)  # 6% flaky = -30

    # Penalty for quarantined tests (max -15 points)
    quarantine_ratio = suite_data['quarantined_tests'] / suite_data['total_tests']
    score -= min(15, quarantine_ratio * 300)  # 5% quarantined = -15

    # Penalty for disabled tests (max -10 points)
    disabled_ratio = suite_data['disabled_tests'] / suite_data['total_tests']
    score -= min(10, disabled_ratio * 200)  # 5% disabled = -10

    # Penalty for low suite pass rate (max -25 points)
    if suite_data['suite_pass_rate'] < 1.0:
        score -= min(25, (1 - suite_data['suite_pass_rate']) * 500)

    # Penalty for slow MTTR (max -10 points)
    if suite_data['flaky_mttr_hours'] > 24:
        score -= min(10, (suite_data['flaky_mttr_hours'] - 24) / 24 * 5)

    # Penalty for slow execution (max -10 points)
    if suite_data['avg_execution_time'] > 600:  # > 10 minutes
        score -= min(10, (suite_data['avg_execution_time'] - 600) / 120)

    return max(0, round(score, 1))
```

### Health Score Grades

| Score | Grade | Description |
|-------|-------|-------------|
| 90-100 | A | Excellent -- test suite is highly reliable |
| 80-89 | B | Good -- minor issues that should be addressed |
| 70-79 | C | Acceptable -- noticeable reliability issues |
| 60-69 | D | Poor -- significant investment needed |
| < 60 | F | Critical -- test suite is not trustworthy |

## Core Metric 5: Pipeline Reliability Rate

This metric measures the percentage of CI pipeline runs that succeed without requiring retries due to test flakiness.

### Definition

**Pipeline Reliability Rate** = (Runs that pass on first attempt) / (Total runs) x 100

### Calculation

```python
def calculate_pipeline_reliability(runs):
    """
    runs: list of dicts with 'attempts' (int) and 'final_result' (pass/fail)
    """
    total = len(runs)
    first_attempt_passes = sum(1 for r in runs if r['attempts'] == 1 and r['final_result'] == 'pass')

    return (first_attempt_passes / total * 100) if total > 0 else 100
```

### Why It Matters

Pipeline Reliability Rate is the metric that most directly correlates with developer experience. When this number drops, developers feel the pain in the form of longer wait times, more re-runs, and decreased confidence in the pipeline.

| Rate | Assessment |
|------|-----------|
| > 98% | Excellent -- minimal disruption |
| 95-98% | Good -- occasional retries |
| 90-95% | Concerning -- noticeable friction |
| 80-90% | Poor -- significant productivity impact |
| < 80% | Critical -- pipeline is unreliable |

## Advanced Metric 6: Flake Correlation Score

Some flaky tests always fail together, suggesting a shared root cause. The Flake Correlation Score identifies these clusters.

### Definition

The Flake Correlation Score measures how strongly two tests' failure patterns are correlated. A score of 1.0 means they always fail together; a score of 0.0 means their failures are independent.

### Calculation

```python
import numpy as np

def calculate_flake_correlation(test_a_results, test_b_results):
    """
    Both inputs: list of booleans (True=pass, False=fail) from the same runs
    Returns: correlation coefficient (-1 to 1)
    """
    if len(test_a_results) != len(test_b_results):
        raise ValueError("Both tests must have the same number of runs")

    a = np.array([1 if r else 0 for r in test_a_results])
    b = np.array([1 if r else 0 for r in test_b_results])

    # Handle constant arrays (no variation)
    if np.std(a) == 0 or np.std(b) == 0:
        return 0.0

    correlation = np.corrcoef(a, b)[0, 1]
    return round(correlation, 3)

def find_correlated_flakes(all_results, threshold=0.5):
    """
    all_results: dict mapping test_name -> list of booleans
    Returns: list of correlated test pairs
    """
    test_names = list(all_results.keys())
    correlations = []

    for i in range(len(test_names)):
        for j in range(i + 1, len(test_names)):
            corr = calculate_flake_correlation(
                all_results[test_names[i]],
                all_results[test_names[j]]
            )
            if abs(corr) >= threshold:
                correlations.append({
                    'test_a': test_names[i],
                    'test_b': test_names[j],
                    'correlation': corr,
                })

    return sorted(correlations, key=lambda x: abs(x['correlation']), reverse=True)
```

### Practical Application

Correlated flakes usually share a root cause:

- **High positive correlation** (both fail together): Shared dependency, database state, or service
- **High negative correlation** (one fails when the other passes): Resource contention, ordering dependency
- **Cluster of correlated tests**: Likely a shared infrastructure issue (database connection pool, file system, network)

Fixing one test in a correlated cluster often fixes all of them, making this metric extremely valuable for prioritization.

## Advanced Metric 7: Cost per Flake

This metric translates flaky test impact into dollars, making it easy to communicate with non-technical stakeholders.

### Calculation

```python
def calculate_cost_per_flake(config):
    """
    config: {
        'avg_developer_hourly_rate': float,  # e.g., 75.0
        'avg_investigation_minutes': float,  # e.g., 30
        'avg_ci_cost_per_minute': float,  # e.g., 0.05
        'avg_pipeline_duration_minutes': float,  # e.g., 20
        'retries_per_flake': float,  # e.g., 1.5
    }
    """
    # Developer time cost
    dev_cost = (
        config['avg_developer_hourly_rate'] / 60 *
        config['avg_investigation_minutes']
    )

    # CI compute cost
    ci_cost = (
        config['avg_ci_cost_per_minute'] *
        config['avg_pipeline_duration_minutes'] *
        config['retries_per_flake']
    )

    # Opportunity cost (blocked deployments)
    # Rough estimate: 15 minutes of blocked team productivity
    opportunity_cost = config['avg_developer_hourly_rate'] / 60 * 15

    total = dev_cost + ci_cost + opportunity_cost

    return {
        'developer_time': round(dev_cost, 2),
        'ci_compute': round(ci_cost, 2),
        'opportunity_cost': round(opportunity_cost, 2),
        'total_per_flake': round(total, 2),
    }

# Example calculation
cost = calculate_cost_per_flake({
    'avg_developer_hourly_rate': 75.0,
    'avg_investigation_minutes': 30,
    'avg_ci_cost_per_minute': 0.05,
    'avg_pipeline_duration_minutes': 20,
    'retries_per_flake': 1.5,
})

# Result:
# developer_time: $37.50
# ci_compute: $1.50
# opportunity_cost: $18.75
# total_per_flake: $57.75
```

Multiply the cost per flake by the number of daily flakes to get the monthly cost. For a team experiencing 5 flakes per day at $57.75 each, that is roughly $8,663 per month -- money that justifies investment in flaky test detection and resolution.

## Building a Test Reliability Dashboard

Metrics are only useful if they are visible. Here is how to build a dashboard that drives action.

### What to Include

A good test reliability dashboard has three sections:

**1. Executive Summary (for managers and directors)**
- Test Suite Health Score (single number, trending)
- Pipeline Reliability Rate (percentage, trending)
- Monthly cost of flaky tests (dollars)
- Flaky test count trend (last 90 days)

**2. Operational View (for QA leads and team leads)**
- Top 10 flakiest tests by FlakeScore
- Quarantine status (count, age, trend)
- MTTR breakdown (MTTD, MTTA, MTTF, MTTV)
- Flake rate by test category (unit, integration, E2E)

**3. Detail View (for engineers)**
- Individual test FlakeScores with history
- Failure pattern analysis (time-based, ordering-based)
- Correlated test clusters
- Fix recommendations

### Implementation

For teams using DeFlaky, the dashboard is built in and updates automatically after every CI run. For teams building their own, here is a data model:

```sql
-- Test results table
CREATE TABLE test_results (
    id SERIAL PRIMARY KEY,
    test_name VARCHAR(500) NOT NULL,
    test_file VARCHAR(500) NOT NULL,
    suite_name VARCHAR(200),
    status VARCHAR(10) NOT NULL,  -- 'pass', 'fail', 'skip'
    duration_ms INTEGER,
    error_message TEXT,
    run_id VARCHAR(100) NOT NULL,
    branch VARCHAR(200),
    commit_sha VARCHAR(40),
    ci_platform VARCHAR(50),
    worker_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Flaky test tracking
CREATE TABLE flaky_tests (
    id SERIAL PRIMARY KEY,
    test_name VARCHAR(500) NOT NULL,
    test_file VARCHAR(500) NOT NULL,
    flake_score DECIMAL(5,2),
    flake_rate DECIMAL(5,4),
    first_detected TIMESTAMP,
    last_flake TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active',  -- 'active', 'quarantined', 'fixed'
    assigned_to VARCHAR(100),
    resolved_at TIMESTAMP,
    root_cause VARCHAR(50),  -- 'timing', 'isolation', 'environment', 'data', 'unknown'
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Pipeline runs
CREATE TABLE pipeline_runs (
    id SERIAL PRIMARY KEY,
    run_id VARCHAR(100) NOT NULL,
    branch VARCHAR(200),
    commit_sha VARCHAR(40),
    status VARCHAR(10),  -- 'pass', 'fail'
    attempts INTEGER DEFAULT 1,
    total_tests INTEGER,
    passed_tests INTEGER,
    failed_tests INTEGER,
    flaky_tests INTEGER,
    duration_seconds INTEGER,
    ci_platform VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Useful views
CREATE VIEW flaky_test_summary AS
SELECT
    ft.test_name,
    ft.test_file,
    ft.flake_score,
    ft.status,
    ft.first_detected,
    ft.last_flake,
    EXTRACT(EPOCH FROM (COALESCE(ft.resolved_at, NOW()) - ft.first_detected)) / 3600 AS hours_open,
    COUNT(tr.id) AS total_runs,
    SUM(CASE WHEN tr.status = 'fail' THEN 1 ELSE 0 END) AS failure_count,
    ROUND(
        SUM(CASE WHEN tr.status = 'fail' THEN 1 ELSE 0 END)::DECIMAL / COUNT(tr.id) * 100,
        2
    ) AS failure_percentage
FROM flaky_tests ft
LEFT JOIN test_results tr ON ft.test_name = tr.test_name
WHERE tr.created_at > NOW() - INTERVAL '30 days'
GROUP BY ft.id
ORDER BY ft.flake_score DESC;
```

### Querying for Dashboard Panels

```sql
-- Executive: Health score trend (weekly)
SELECT
    DATE_TRUNC('week', created_at) AS week,
    COUNT(*) AS total_runs,
    SUM(CASE WHEN attempts = 1 AND status = 'pass' THEN 1 ELSE 0 END) AS clean_passes,
    ROUND(
        SUM(CASE WHEN attempts = 1 AND status = 'pass' THEN 1 ELSE 0 END)::DECIMAL / COUNT(*) * 100,
        1
    ) AS reliability_rate
FROM pipeline_runs
WHERE created_at > NOW() - INTERVAL '90 days'
GROUP BY week
ORDER BY week;

-- Operational: Top flaky tests
SELECT
    test_name,
    test_file,
    flake_score,
    flake_rate,
    status,
    first_detected,
    last_flake,
    assigned_to
FROM flaky_tests
WHERE status IN ('active', 'quarantined')
ORDER BY flake_score DESC
LIMIT 20;

-- Detail: Test failure pattern (time-of-day analysis)
SELECT
    test_name,
    EXTRACT(HOUR FROM created_at) AS hour_of_day,
    COUNT(*) AS total_runs,
    SUM(CASE WHEN status = 'fail' THEN 1 ELSE 0 END) AS failures,
    ROUND(
        SUM(CASE WHEN status = 'fail' THEN 1 ELSE 0 END)::DECIMAL / COUNT(*) * 100,
        1
    ) AS failure_rate
FROM test_results
WHERE test_name = 'should process payment successfully'
AND created_at > NOW() - INTERVAL '30 days'
GROUP BY test_name, hour_of_day
ORDER BY hour_of_day;
```

## Setting Targets and SLAs

Metrics without targets are just numbers. Here is how to set realistic targets for your team.

### Starting Point Assessment

Before setting targets, measure your current baseline over 2-4 weeks. This gives you a realistic starting point and prevents setting targets that are either too easy or impossibly aggressive.

```python
def assess_baseline(historical_data):
    """
    Determine your team's current test reliability baseline
    """
    current_metrics = {
        'flake_rate': calculate_suite_flake_rate(historical_data['test_results']),
        'pipeline_reliability': calculate_pipeline_reliability(historical_data['pipeline_runs']),
        'flaky_test_count': len([t for t in historical_data['tests'] if t['is_flaky']]),
        'mttr_hours': calculate_flaky_mttr(historical_data['flaky_tests']),
        'health_score': calculate_health_score(historical_data['suite_data']),
    }

    return current_metrics
```

### Progressive Targets

Set targets that improve gradually over quarters:

| Metric | Q1 Target | Q2 Target | Q3 Target | Q4 Target |
|--------|----------|----------|----------|----------|
| Flake Rate | < 5% | < 3% | < 1% | < 0.5% |
| Pipeline Reliability | > 90% | > 95% | > 97% | > 99% |
| MTTR (hours) | < 120 | < 72 | < 48 | < 24 |
| Health Score | > 60 | > 70 | > 80 | > 90 |
| Quarantine Size | < 10% | < 5% | < 2% | < 1% |

### Team SLAs

Define response SLAs based on FlakeScore severity:

| FlakeScore | Severity | Response SLA | Resolution SLA |
|-----------|---------|-------------|---------------|
| > 80 | Critical | 4 hours | 24 hours |
| 60-80 | High | 24 hours | 3 days |
| 40-60 | Medium | 48 hours | 1 week |
| 20-40 | Low | 1 week | 2 weeks |
| < 20 | Minimal | Monitor | Best effort |

## Reporting and Communication

Different stakeholders need different levels of detail.

### Weekly Team Report

```markdown
## Test Reliability Weekly Report

**Week of**: April 7 - April 13, 2026

### Summary
- Health Score: 82/100 (up from 78)
- Pipeline Reliability: 96.2% (up from 94.1%)
- Flaky Tests: 12 active, 3 quarantined (down from 15 active)

### Wins
- Fixed 4 flaky tests (checkout, search, auth, notifications)
- MTTR improved from 5.2 days to 3.1 days
- Zero deployment blockages from flaky tests this week

### Action Items
- [ ] Investigate payment.test.js cluster (FlakeScore: 73)
- [ ] Review quarantined tests for possible unquarantine
- [ ] Add DeFlaky monitoring to new microservice repos

### Trends (30-day)
- Flake rate: 3.2% -> 1.8% (improving)
- Pipeline reliability: 93% -> 96.2% (improving)
- MTTR: 6.4 days -> 3.1 days (improving)
```

### Monthly Executive Report

```markdown
## Test Reliability Monthly Report - March 2026

### Business Impact
- Engineering hours saved: 45 hours (vs. February baseline)
- CI cost reduction: $1,200/month from fewer retries
- Deployment frequency: Increased from 3/week to 5/week
- Production incidents from test gaps: 0 (down from 2)

### Key Metrics
| Metric | February | March | Target | Status |
|--------|---------|-------|--------|--------|
| Health Score | 71 | 82 | 80 | Met |
| Pipeline Reliability | 91% | 96% | 95% | Met |
| Flake Rate | 4.1% | 1.8% | 3% | Met |
| MTTR | 6.4 days | 3.1 days | 5 days | Met |

### Investment Recommendation
Current trajectory suggests we will reach our Q3 targets ahead of schedule.
Recommend maintaining current investment level.
```

## Tools and Automation

### DeFlaky for Automated Metrics

DeFlaky automates the collection, calculation, and visualization of all the metrics described in this guide. After integrating with your CI pipeline, it automatically:

1. Tracks every test execution result
2. Calculates FlakeScore, flake rate, and correlation scores
3. Updates the dashboard in real time
4. Sends alerts when metrics exceed thresholds
5. Generates weekly and monthly reports
6. Recommends which tests to fix based on impact analysis

```bash
# Set up DeFlaky metrics tracking
deflaky init --ci github-actions
deflaky config set --metric-targets '{
  "flake_rate": 0.02,
  "pipeline_reliability": 0.95,
  "mttr_hours": 72,
  "health_score": 80
}'
deflaky config set --alerts '{
  "slack_webhook": "https://hooks.slack.com/...",
  "alert_on": ["health_score_drop", "new_flaky_test", "sla_breach"]
}'
```

### Building Your Own Metrics Pipeline

If you prefer to build your own, use this architecture:

1. **Collection**: Parse test results from CI (JUnit XML, JSON reports) and store in a time-series database
2. **Calculation**: Run metric calculations daily or after each CI run
3. **Storage**: PostgreSQL for relational queries, or InfluxDB/TimescaleDB for time-series
4. **Visualization**: Grafana, Metabase, or a custom dashboard
5. **Alerting**: PagerDuty, Slack, or email based on threshold breaches

## Anti-Patterns in Test Reliability Measurement

### Anti-Pattern 1: Measuring Only Pass Rate

Suite pass rate (percentage of tests that pass) is not enough. A suite with 100% pass rate might have 20 quarantined tests and 10 disabled tests. The pass rate looks great, but the suite is actually unreliable.

Always measure pass rate alongside quarantine size, disabled test count, and overall coverage.

### Anti-Pattern 2: Counting Flaky Tests Without Weighting

Not all flaky tests are equal. A test that fails 1% of the time on a non-critical path is less important than a test that fails 10% of the time and blocks deployments. Use FlakeScore or a similar weighted metric.

### Anti-Pattern 3: Ignoring Trends

A flake rate of 2% is concerning, but a flake rate of 2% that was 5% last month is excellent progress. Always show metrics as trends, not point-in-time snapshots.

### Anti-Pattern 4: Setting Unrealistic Targets

A team with a 10% flake rate cannot reach 0.5% in one quarter. Set progressive targets that are challenging but achievable. Celebrate progress at each milestone.

### Anti-Pattern 5: Measuring Without Acting

Dashboards are not solutions. If you track flaky test metrics but never prioritize fixing them, the dashboard becomes demoralizing rather than motivating. Connect metrics to action: every metric should have a clear owner and response plan.

## Conclusion

Test reliability metrics transform flaky tests from an invisible, frustrating problem into a visible, manageable one. By tracking FlakeScore, flake rate, MTTR, pipeline reliability, and test suite health, you give your team the data they need to prioritize effectively and demonstrate progress to stakeholders.

Start with the basics: measure your current flake rate and pipeline reliability. Then add FlakeScore for prioritization and MTTR for tracking your response time. Build a simple dashboard (or use DeFlaky to get one out of the box), set progressive targets, and report regularly.

The teams that take test reliability metrics seriously consistently outperform those that do not. They deploy faster, catch more real bugs, waste less time on false failures, and maintain higher developer satisfaction. The metrics described in this guide are your roadmap to joining them.
