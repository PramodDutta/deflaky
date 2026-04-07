---
title: "Flaky Tests vs Bugs: How to Tell the Difference and Fix Each One"
description: "Learn how to distinguish between flaky tests and real bugs with a practical decision tree, root cause analysis techniques, bisecting failures, log analysis, and reproduction strategies. Discover how DeFlaky automates test failure classification."
date: "2026-04-07"
slug: "flaky-tests-vs-bugs"
keywords:
  - flaky test vs bug
  - is my test flaky
  - test failure analysis
  - debug flaky tests
  - root cause analysis testing
  - test failure bisecting
  - flaky test detection
  - test debugging techniques
  - test failure classification
  - intermittent test failure
  - test reliability analysis
  - DeFlaky test analysis
author: "Pramod Dutta"
---

# Flaky Tests vs Bugs: How to Tell the Difference and Fix Each One

A test fails in CI. You look at the failure message. You check the diff. Nothing has changed. You re-run the pipeline. It passes. What just happened? Was the test flaky, or did you just witness an intermittent bug?

This distinction matters enormously. If the test is flaky, you need to fix the test. If it is a bug, you need to fix the application. Treating a bug as flakiness means the bug reaches production. Treating flakiness as a bug means wasting hours investigating code that is actually correct.

Most teams default to the assumption of flakiness. A test failed once but passed on retry, so it must be flaky. This is dangerous. Some of the worst production incidents come from intermittent bugs that teams dismissed as flaky tests. A race condition that manifests 2% of the time in tests will also manifest 2% of the time in production, but at scale, 2% means hundreds of affected users per day.

This guide provides a systematic approach to distinguishing between flaky tests and real bugs, with concrete techniques for investigating each one.

## The Decision Tree: Is It Flaky or Is It a Bug?

When a test fails intermittently, work through this decision tree to classify the failure.

### Question 1: Did any application code change?

If the test started failing after a code change, the failure is likely a bug introduced by that change. Even if the test only fails intermittently, the code change may have introduced a race condition, a timing issue, or a state-dependent bug.

If no application code changed, the failure is more likely to be flakiness related to test infrastructure, environment, or test design.

**Action:** Check `git log` for recent changes to the code under test.

```bash
# Find recent changes to the code being tested
git log --oneline -20 -- src/orders/

# Check if the failure started after a specific commit
git bisect start
git bisect bad HEAD
git bisect good HEAD~20
```

### Question 2: Is the failure consistent or intermittent?

Run the test 50 times. If it fails every time, it is not flaky. It is either a deterministic bug or a broken test. If it fails sometimes and passes sometimes, proceed to the next question.

```bash
# Run the test 50 times
pytest tests/test_orders.py::test_create_order --count=50 -v

# Track the pass/fail ratio
pytest tests/test_orders.py::test_create_order --count=50 -v 2>&1 | grep -c "PASSED"
pytest tests/test_orders.py::test_create_order --count=50 -v 2>&1 | grep -c "FAILED"
```

If the test passes 100% of the time locally but fails in CI, it is likely an environment-dependent issue, which could be either flakiness (environment instability) or a bug (environment-specific behavior).

### Question 3: Does the failure message indicate a logic error or an infrastructure error?

**Logic errors** suggest bugs:
- `AssertionError: expected 5 but got 4`
- `ValueError: invalid status 'pending' for completed order`
- `KeyError: 'shipping_address'`

**Infrastructure errors** suggest flakiness:
- `ConnectionRefusedError: [Errno 111] Connection refused`
- `TimeoutError: Read timed out after 30 seconds`
- `OperationalError: could not connect to server`
- `OSError: [Errno 24] Too many open files`

This is a heuristic, not a rule. A logic error can be caused by a race condition (bug) or by shared test state (flakiness). An infrastructure error can be caused by a resource leak in the application (bug) or by a flaky CI environment (flakiness).

### Question 4: Does the failure depend on execution order?

Run the failing test in isolation. If it passes in isolation but fails when run with other tests, the failure is likely caused by test pollution (another test's side effects affecting this test). This is flakiness in the test suite, not a bug in the application.

```bash
# Run in isolation
pytest tests/test_orders.py::test_create_order -v

# Run with the full suite
pytest tests/test_orders.py -v

# Run with random ordering
pytest tests/test_orders.py --randomly-seed=12345 -v
```

If the test fails in isolation as well, the problem is either in the test itself or in the application code.

### Question 5: Does the failure correlate with system load or timing?

If the test fails more often under high load (busy CI server, many parallel jobs), the failure might be:
- A real performance bug or race condition in the application (bug)
- A timeout that is too aggressive for loaded environments (flakiness)
- A resource exhaustion issue in the test infrastructure (flakiness)

Check the timing of failures. Do they correlate with high CPU usage on the CI server? With specific times of day when the CI cluster is busy? With specific test runners or machines?

### The Classification Matrix

Based on the decision tree, here is how to classify common scenarios:

| Scenario | Classification |
|----------|---------------|
| Test fails after code change, consistently | Bug |
| Test fails after code change, intermittently | Likely bug (race condition) |
| Test fails with no code changes, connection errors | Flakiness (infrastructure) |
| Test fails with no code changes, assertion errors | Investigate further |
| Test fails only with other tests (order-dependent) | Flakiness (test pollution) |
| Test fails only in CI, passes locally | Environment difference (investigate) |
| Test fails under load, assertion error | Likely bug (race condition/performance) |
| Test fails under load, timeout | Likely flakiness (resource constraints) |

## Root Cause Analysis Techniques

Once you have classified the failure, use these techniques to find the root cause.

### Technique 1: Failure Message Analysis

The failure message is your first and most important clue. Read it carefully. Do not just note that the test failed; understand what the failure is telling you.

```python
# Example failure message
# AssertionError: assert response.json()["status"] == "completed"
#   where response.json()["status"] = "processing"
```

This failure tells you that an order's status is "processing" when the test expects "completed." Now ask: Is "processing" a valid intermediate state? Could the test be asserting too early before the order finishes processing? Is there an asynchronous operation that the test is not waiting for?

```python
# Another example
# AssertionError: assert len(results) == 3
#   where len(results) = 4
```

This failure tells you there are more results than expected. Ask: Where did the extra result come from? Is another test creating data that is not cleaned up? Is the test's setup creating more data than intended?

### Technique 2: Comparing Passing and Failing Runs

When a test is intermittent, compare the details of passing and failing runs. Look for differences in:

**Timing.** Is the failing run slower or faster? A test that fails when it runs faster might be asserting before an async operation completes. A test that fails when it runs slower might have a timeout that is too tight.

**Data.** Are the assertion values different between runs? If the expected value is always the same but the actual value varies, the test is reading non-deterministic state.

**Environment.** Is the failure happening on a specific CI runner? With specific resource constraints? At specific times of day?

**Test ordering.** Which tests ran before the failing test in the failing run versus the passing run? Different preceding tests might leave different state.

### Technique 3: Bisecting Failures

When a test started failing recently but not consistently, use git bisect to find the commit that introduced the problem.

```bash
# Standard git bisect
git bisect start
git bisect bad HEAD          # Current state is bad (test fails)
git bisect good v2.3.0       # This version was good (test passed)

# Git bisect runs your test at each step
git bisect run pytest tests/test_orders.py::test_create_order -x
```

For intermittent failures, modify the bisect command to run the test multiple times at each step:

```bash
# Bisect script for intermittent failures
#!/bin/bash
# bisect-test.sh
PASS_COUNT=0
TOTAL=20

for i in $(seq 1 $TOTAL); do
    if pytest tests/test_orders.py::test_create_order -x --timeout=30 > /dev/null 2>&1; then
        PASS_COUNT=$((PASS_COUNT + 1))
    fi
done

# Consider the commit "bad" if the test failed more than once
if [ $PASS_COUNT -lt $TOTAL ]; then
    exit 1  # bad
else
    exit 0  # good
fi
```

```bash
git bisect run ./bisect-test.sh
```

This approach runs the test 20 times at each bisect step and marks the commit as "bad" if any runs fail. It is slower but much more effective at finding the commit that introduced an intermittent failure.

### Technique 4: Log Analysis

Logs from the application and the test infrastructure provide context that assertions alone cannot. When investigating a failure, collect and analyze:

**Application logs** around the time of the failure. Look for errors, warnings, and unusual timing patterns.

```python
# Add detailed logging to your tests
import logging

logger = logging.getLogger("test")

def test_create_order(client, db_session):
    logger.info("Starting test_create_order")

    # Log the request
    payload = {"product_id": "SKU-123", "quantity": 5}
    logger.info(f"Creating order with payload: {payload}")

    response = client.post("/orders", json=payload)
    logger.info(f"Response status: {response.status_code}")
    logger.info(f"Response body: {response.json()}")

    if response.status_code != 201:
        # Log additional context on failure
        logger.error(f"Order creation failed. Checking database state...")
        orders = db_session.query(Order).all()
        logger.error(f"Existing orders: {[o.to_dict() for o in orders]}")

    assert response.status_code == 201
```

**Test framework logs** showing fixture setup and teardown, especially for tests that use complex fixture chains.

**Infrastructure logs** from databases, message brokers, and other services. A database connection pool exhaustion or a Kafka consumer rebalance can cause failures that are invisible at the application level.

### Technique 5: Reproduction Under Controlled Conditions

If you cannot reproduce the failure locally with normal runs, try reproducing the conditions that trigger it.

**Simulate CI resource constraints.** CI environments often have less CPU and memory than developer machines. Use cgroups or Docker resource limits to simulate these constraints.

```bash
# Run tests with limited CPU and memory (simulating CI)
docker run --cpus=1 --memory=1g -v $(pwd):/app myapp pytest tests/ -v
```

**Simulate network latency.** If the failure involves network calls, add artificial latency.

```bash
# Add 100ms latency to network calls (Linux)
tc qdisc add dev eth0 root netem delay 100ms 50ms

# Run tests with latency
pytest tests/test_api.py -v

# Remove the latency
tc qdisc del dev eth0 root
```

**Simulate concurrent load.** If the failure might be a race condition, run multiple instances of the test concurrently.

```bash
# Run the same test concurrently with pytest-xdist
pytest tests/test_orders.py::test_create_order -n 4 --count=10
```

**Simulate clock skew.** If the failure involves timestamps or time-dependent logic, shift the system clock.

```python
from freezegun import freeze_time

@freeze_time("2026-12-31 23:59:59")
def test_new_year_boundary():
    """Test that order processing handles year boundary correctly."""
    order = create_order()
    assert order.fiscal_year == 2026

@freeze_time("2027-01-01 00:00:01")
def test_new_year_after():
    order = create_order()
    assert order.fiscal_year == 2027
```

## Debugging Flaky Tests: A Systematic Process

When you have determined that the failure is flakiness (not a bug), follow this process to fix it.

### Step 1: Categorize the Flakiness

Flaky tests fall into these categories:

**Test pollution.** The test depends on state created or modified by another test. Fix by improving isolation: use fresh fixtures, clean up data, use transaction rollback.

**Timing issues.** The test asserts on state that is not yet ready. Fix by adding proper waits (polling, event listeners) instead of fixed sleeps.

**Resource leaks.** The test or the code under test leaks connections, file handles, or memory. Over many test runs, the resources are exhausted. Fix by adding proper cleanup in fixtures and ensuring the code under test releases resources.

**Non-deterministic data.** The test depends on data that varies between runs: random values, timestamps, auto-incremented IDs, dictionary ordering. Fix by controlling the non-determinism: freeze time, seed random generators, use stable identifiers.

**Environment dependency.** The test depends on specific environment characteristics: available ports, DNS resolution, file system behavior, available disk space. Fix by making the test environment-agnostic or by detecting and skipping when the environment is unsuitable.

### Step 2: Write a Reproduction Script

Before fixing the flakiness, write a script that reliably reproduces it. This serves two purposes: it confirms your diagnosis, and it provides a regression test for your fix.

```bash
#!/bin/bash
# reproduce-flaky.sh
# Reproduces the flakiness in test_create_order

FAILURES=0
TOTAL=100

for i in $(seq 1 $TOTAL); do
    if ! pytest tests/test_orders.py::test_create_order -x --timeout=30 -q 2>/dev/null; then
        FAILURES=$((FAILURES + 1))
        echo "FAILED on run $i (total failures: $FAILURES/$i)"
    fi
done

echo "Results: $FAILURES failures out of $TOTAL runs"
if [ $FAILURES -gt 0 ]; then
    echo "Flakiness reproduced: $(echo "scale=2; $FAILURES * 100 / $TOTAL" | bc)% failure rate"
else
    echo "Could not reproduce flakiness in $TOTAL runs"
fi
```

### Step 3: Apply the Fix

Apply the appropriate fix based on the category of flakiness identified in Step 1.

### Step 4: Verify the Fix

Run the reproduction script again after the fix. The failure rate should drop to zero. If it does not, your fix is incomplete or your diagnosis was wrong.

```bash
# Before fix: 8% failure rate
./reproduce-flaky.sh
# Results: 8 failures out of 100 runs

# After fix: 0% failure rate
./reproduce-flaky.sh
# Results: 0 failures out of 100 runs
```

## Debugging Real Bugs: A Systematic Process

When you have determined that the failure is a real bug, follow this process to fix it.

### Step 1: Characterize the Bug

Understand when and how the bug manifests:
- **Frequency:** How often does it occur? 50% of the time? 1% of the time?
- **Conditions:** What conditions trigger it? High load? Specific data? Specific timing?
- **Symptoms:** What exactly goes wrong? Wrong data? Missing data? Error response?
- **Impact:** What would happen if this bug reached production?

### Step 2: Create a Deterministic Reproduction

Transform the intermittent failure into a deterministic one. If the bug is a race condition, design a test that reliably triggers the race. If the bug is timing-dependent, control the timing.

```python
# Intermittent test (race condition)
def test_concurrent_order_updates():
    """This test exposes a race condition in order updates."""
    order = create_order(status="pending")

    # Simulate concurrent updates
    import concurrent.futures
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = [
            executor.submit(update_order_status, order.id, "processing")
            for _ in range(10)
        ]
        results = [f.result() for f in concurrent.futures.as_completed(futures)]

    # Without proper locking, some updates might be lost
    # or the final status might be inconsistent
    order.refresh_from_db()
    assert order.status == "processing"
    assert order.update_count == 10  # Each update should be counted
```

### Step 3: Fix the Application Code

Fix the bug in the application code. Common fixes for intermittent bugs:

**Race conditions:** Add proper locking, use database transactions with appropriate isolation levels, use optimistic concurrency control.

**Timing issues:** Add proper timeouts, implement retry logic with backoff, handle timeout errors gracefully.

**Resource leaks:** Ensure connections, file handles, and other resources are properly closed in all code paths, including error paths.

**Boundary conditions:** Handle edge cases in date/time processing, numeric overflow, empty collections, and null values.

### Step 4: Keep the Test

Once the bug is fixed, the test that exposed it becomes a regression test. Keep it in the test suite to prevent the bug from being reintroduced.

```python
def test_concurrent_order_updates_regression():
    """
    Regression test for BUG-1234: Race condition in order status updates.

    This test verifies that concurrent status updates are properly serialized
    and no updates are lost.
    """
    order = create_order(status="pending")

    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = [
            executor.submit(update_order_status, order.id, "processing")
            for _ in range(10)
        ]
        [f.result() for f in concurrent.futures.as_completed(futures)]

    order.refresh_from_db()
    assert order.status == "processing"
    assert order.update_count == 10
```

## DeFlaky's Approach to Failure Classification

Manually classifying every test failure is not scalable. As test suites grow to thousands of tests running many times per day, automated classification becomes essential.

### How DeFlaky Classifies Failures

DeFlaky uses several signals to automatically classify test failures:

**Historical pass rate.** A test that has been passing consistently for weeks and suddenly starts failing intermittently is likely experiencing a new bug. A test that has always been intermittent is likely flaky.

**Failure message consistency.** If a test always fails with the same error message, it is more likely a deterministic bug. If the error messages vary (sometimes timeout, sometimes assertion error), it is more likely flaky.

**Correlation with code changes.** DeFlaky integrates with your version control to correlate test failures with commits. A test that starts failing after a specific commit is flagged as a potential bug.

**Correlation with other tests.** If multiple unrelated tests start failing at the same time, the cause is likely infrastructure-related (flakiness), not a bug in any specific code.

**Environment correlation.** If a test fails only on specific CI runners or at specific times, the failure is likely environmental (flakiness).

```bash
# DeFlaky's failure classification
deflaky classify --test "test_orders.py::test_create_order"

# Output:
# Test: test_orders.py::test_create_order
# Classification: LIKELY BUG
# Confidence: 87%
# Reasons:
#   - Started failing after commit abc1234 (2026-04-05)
#   - Failure message is consistent: "AssertionError: status == 'processing'"
#   - No infrastructure errors in failure logs
#   - Fails in isolation (not order-dependent)
# Recommendation: Investigate commit abc1234 for race condition in order processing
```

### Setting Up Automated Classification

```bash
# Configure DeFlaky for automated classification
deflaky config set classification.enabled true
deflaky config set classification.notify-on-bug true
deflaky config set classification.auto-quarantine-on-flaky true

# DeFlaky will now:
# 1. Classify each failure as "bug" or "flaky"
# 2. Send notifications for likely bugs
# 3. Auto-quarantine likely flaky tests
```

### The DeFlaky Dashboard for Failure Analysis

DeFlaky's dashboard provides a visual interface for failure analysis:

**Timeline view.** See when a test started failing and correlate it with code changes and infrastructure events.

**Failure pattern view.** See the distribution of failure messages for a given test. Consistent messages suggest bugs; varying messages suggest flakiness.

**Cross-test correlation view.** See if other tests are failing at the same time, suggesting a shared root cause.

**Environment view.** See if failures correlate with specific CI runners, times of day, or resource utilization levels.

## Case Studies: Real-World Examples

### Case Study 1: The "Flaky" Test That Was a Race Condition

A team had a test that failed about 5% of the time. They labeled it flaky and added retries. Six months later, users reported that orders were occasionally missing items. The root cause was a race condition in the order processing code, the same race condition that the "flaky" test was detecting. If the team had investigated the test failure instead of retrying it, they would have caught the bug before it affected users.

**Lesson:** Never assume a test is flaky without investigation. The 5% failure rate in tests translates directly to a 5% failure rate in production.

### Case Study 2: The Bug That Looked Like Flakiness

A test for user registration failed intermittently with `AssertionError: expected 201 but got 409 (Conflict)`. The team investigated and found that the test was using a hardcoded email address. When the test ran after a failed run that did not clean up, the email already existed in the database, causing the conflict.

The fix was simple: use unique email addresses in tests. But the investigation also revealed that the application was not properly cleaning up failed registrations, which was a real (though minor) bug.

**Lesson:** Even when the root cause is flakiness, the investigation often reveals real issues.

### Case Study 3: Infrastructure Flakiness Masking a Real Bug

A team's integration tests were failing intermittently with various timeout and connection errors. They assumed all failures were due to CI infrastructure instability and added blanket retries. Hidden among the infrastructure failures was a legitimate memory leak that caused the test server to slow down and eventually crash after running for 30 minutes. The retries masked this by restarting the process.

When they implemented DeFlaky and started classifying failures, they noticed that the failure rate was increasing over time, even though the infrastructure was improving. This led them to investigate the memory leak.

**Lesson:** Blanket retries hide real problems. Classify failures individually.

## Building a Failure Analysis Culture

### Make Investigation the Default

When a test fails, the default response should be investigation, not retry. Train your team to ask "why did this fail?" before hitting the re-run button.

### Document Root Causes

Every investigated failure should result in a documented root cause. Over time, this builds a knowledge base of common failure patterns that makes future investigations faster.

```markdown
## Failure: test_create_order intermittent 409 Conflict
- **Root cause:** Hardcoded email in test data colliding with leftover data
- **Fix:** Use unique email per test run (uuid suffix)
- **Category:** Test pollution (flakiness)
- **PR:** #1234
- **Date:** 2026-04-03
```

### Track Metrics

Measure your team's failure analysis performance:
- **Mean time to classify:** How long does it take to determine if a failure is a bug or flakiness?
- **Classification accuracy:** When you classify a failure, how often is the classification correct?
- **Mean time to resolve:** Once classified, how long does it take to fix the underlying issue?
- **Recurrence rate:** How often do fixed issues recur?

### Use DeFlaky for Continuous Monitoring

DeFlaky's continuous monitoring ensures that new flaky tests and new bugs are detected quickly. Configure alerts for:
- New intermittent failures (tests that were stable but are now failing sometimes)
- Increasing failure rates (tests that are getting flakier over time)
- Correlated failures (multiple tests failing at the same time)
- Post-deploy failures (tests that start failing after a deployment)

```bash
# Configure DeFlaky alerts
deflaky alerts add --type new-flaky --channel slack --threshold 0.95
deflaky alerts add --type increasing-failures --channel email --window 7d
deflaky alerts add --type correlated-failures --channel pagerduty --min-tests 3
```

## Conclusion

The distinction between flaky tests and bugs is not academic. It determines whether you fix the test or fix the application. Getting it wrong in either direction has real consequences: dismissed bugs reach production, and misdiagnosed flakiness wastes engineering time.

The decision tree in this guide gives you a systematic framework for classification. The analysis techniques give you tools for investigation. And DeFlaky gives you automated classification and monitoring at scale.

The key principles are:

1. **Never assume flakiness without investigation.** Intermittent failures can be real bugs.
2. **Classify before acting.** Use the decision tree to determine the appropriate response.
3. **Reproduce before fixing.** Whether it is a bug or flakiness, reproduce the failure reliably before attempting a fix.
4. **Verify the fix.** Run the reproduction script after the fix to confirm the failure is resolved.
5. **Monitor continuously.** Use DeFlaky to detect new failures and track the effectiveness of your fixes.

Your test suite is trying to tell you something. The question is whether you are listening. A test failure is either a warning about a bug in your code or a signal that your test infrastructure needs attention. Either way, it deserves investigation, not dismissal. Build a culture where test failures are taken seriously, and you will catch more bugs before they reach your users.
