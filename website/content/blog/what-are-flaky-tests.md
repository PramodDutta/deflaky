---
title: "What Are Flaky Tests? The Complete Guide for QA Engineers (2026)"
description: "Learn what flaky tests are, why they happen, and how they silently destroy your CI/CD pipeline. This comprehensive guide covers causes, real-world examples, and proven strategies to eliminate test flakiness."
date: 2026-04-07
slug: what-are-flaky-tests
keywords:
  - flaky tests
  - what are flaky tests
  - flaky test definition
  - test flakiness
  - unreliable tests
  - intermittent test failures
  - CI/CD test reliability
  - test automation reliability
  - non-deterministic tests
  - test stability
author: "Pramod Dutta"
---

# What Are Flaky Tests? The Complete Guide for QA Engineers (2026)

Every QA engineer has experienced the frustration: a test that passed five minutes ago suddenly fails, and when you re-run it, it passes again. No code changed. No configuration shifted. The test simply decided to fail for no apparent reason. That test is what the industry calls a **flaky test**, and it is one of the most insidious problems in modern software testing.

Flaky tests are not merely annoying. They erode confidence in your test suite, waste engineering hours, slow down deployments, and create a culture where teams start ignoring test failures altogether. In this comprehensive guide, we will break down exactly what flaky tests are, why they happen, and what you can do about them.

## What Is a Flaky Test? A Clear Definition

A **flaky test** is a test that produces inconsistent results -- sometimes passing and sometimes failing -- without any changes to the code under test or the test itself. The test is non-deterministic: given the same input and the same codebase, it does not reliably produce the same outcome.

The key characteristic that separates a flaky test from a genuinely broken test is **non-reproducibility**. A broken test fails consistently because the code it tests has a bug or because the test itself has an error. A flaky test fails intermittently because it depends on some external factor that varies between runs.

### The Formal Definition

In academic literature and Google's widely cited research on flaky tests, a flaky test is defined as:

> A test that both passes and fails when run against the same version of the source code.

This definition is important because it explicitly excludes tests that fail due to legitimate code changes. A test that starts failing after a commit that introduces a regression is not flaky -- it is doing its job. A test that fails on Monday, passes on Tuesday, and fails again on Wednesday with zero code changes is flaky.

### The Spectrum of Flakiness

Not all flaky tests are equally flaky. Some tests fail once in every ten runs. Others fail once in every thousand. This spectrum matters because it affects how quickly you can detect and diagnose the problem.

- **Highly flaky tests** (fail rate > 10%): These are usually caught quickly because developers encounter failures regularly. They tend to get fixed or disabled relatively fast.
- **Moderately flaky tests** (fail rate 1-10%): These are dangerous because they fail often enough to cause real disruption but infrequently enough that no single developer feels ownership of the problem.
- **Rarely flaky tests** (fail rate < 1%): These are the hardest to diagnose. They might only manifest under specific conditions -- high CPU load, particular timing, or certain infrastructure configurations. They can persist in codebases for years.

Understanding where your flaky tests fall on this spectrum is critical for prioritization. Tools like DeFlaky track failure rates across runs to help you quantify flakiness and prioritize fixes based on actual impact data.

## The Root Causes of Flaky Tests

Flaky tests do not appear out of thin air. They are the result of specific patterns and anti-patterns in test design and infrastructure. Understanding these root causes is the first step toward eliminating them.

### 1. Timing and Race Conditions

Timing issues are the single most common cause of flaky tests, particularly in end-to-end and integration testing. When a test makes assumptions about how long an operation will take, it introduces a dependency on system performance that varies across environments.

**Example: The setTimeout Anti-Pattern**

```javascript
// FLAKY: Assumes the modal appears within 500ms
test('shows confirmation modal after submit', async () => {
  await page.click('#submit-button');
  await new Promise(resolve => setTimeout(resolve, 500));
  const modal = await page.$('#confirmation-modal');
  expect(modal).not.toBeNull();
});
```

This test assumes the confirmation modal will render within 500 milliseconds. On a developer's fast machine, it usually does. On a CI server under heavy load, it might take 800 milliseconds. The test fails, even though the feature works correctly.

**Example: Database Race Condition**

```python
# FLAKY: Two tests share the same database record
def test_update_user_name():
    user = User.objects.get(id=1)
    user.name = "Alice"
    user.save()
    assert User.objects.get(id=1).name == "Alice"

def test_update_user_email():
    user = User.objects.get(id=1)
    user.email = "bob@example.com"
    user.save()
    assert User.objects.get(id=1).email == "bob@example.com"
```

When these tests run in parallel, they may interfere with each other. One test might overwrite the database record while the other test is in the middle of reading it. The result is non-deterministic failures that depend on execution order and timing.

### 2. Shared Mutable State

Tests that share state -- whether through databases, files, global variables, or in-memory caches -- are inherently fragile. When one test modifies shared state, it can affect the outcome of another test.

**Example: Global Variable Pollution**

```java
public class ShoppingCartTest {
    static List<Item> cart = new ArrayList<>();

    @Test
    public void testAddItem() {
        cart.add(new Item("Widget", 9.99));
        assertEquals(1, cart.size());
    }

    @Test
    public void testCartTotal() {
        cart.add(new Item("Gadget", 19.99));
        assertEquals(19.99, calculateTotal(cart), 0.01);
    }
}
```

If `testAddItem` runs before `testCartTotal`, the cart will already have one item in it when the second test starts. The total calculation will include the widget from the first test, causing the assertion to fail. The outcome depends entirely on test execution order, which many test frameworks do not guarantee.

### 3. Network Dependencies

Tests that depend on external network services -- APIs, databases hosted on remote servers, CDNs, or third-party services -- are vulnerable to network-related flakiness.

**Common network-related failures include:**

- **DNS resolution timeouts**: Intermittent DNS failures can cause tests to fail when they cannot resolve hostnames.
- **Service unavailability**: A third-party API might be temporarily down or rate-limiting your test runs.
- **Latency spikes**: Network latency varies, and tests with tight timeouts may fail during high-latency periods.
- **SSL certificate issues**: Certificate renewals or chain changes can cause intermittent TLS handshake failures.

```python
# FLAKY: Depends on external API availability
def test_fetch_weather_data():
    response = requests.get("https://api.weather.example.com/current")
    assert response.status_code == 200
    data = response.json()
    assert "temperature" in data
```

This test will fail whenever the weather API is down, slow, or rate-limiting. The failure has nothing to do with your code.

### 4. Environment Differences

Tests that behave differently across environments are a major source of flakiness. These differences can be subtle and hard to detect.

**Common environment-related causes:**

- **Operating system differences**: File path separators, line endings, timezone handling, and file system case sensitivity vary across OSes.
- **Resource constraints**: CI servers often have less memory and CPU than developer machines, causing timeouts and resource exhaustion.
- **Installed software versions**: Different versions of browsers, database engines, or runtime environments can produce different behavior.
- **Locale and timezone**: Tests that depend on date formatting or sorting can produce different results in different locales.

```python
# FLAKY: Depends on system timezone
def test_event_date_formatting():
    event = Event(timestamp=1680000000)
    assert event.formatted_date() == "March 28, 2023"
```

This test will pass in UTC but fail in timezones where the timestamp falls on a different calendar date.

### 5. Asynchronous Operations

Modern applications are heavily asynchronous. Tests that do not properly handle asynchronous operations are a major source of flakiness.

**Example: Unresolved Promise**

```javascript
// FLAKY: Does not wait for async operation to complete
test('user profile loads correctly', () => {
  const component = render(<UserProfile userId={42} />);
  // The API call hasn't completed yet!
  expect(component.getByText('John Doe')).toBeInTheDocument();
});
```

The test renders a component that fetches data asynchronously, then immediately checks for the rendered data. Sometimes the data loads fast enough; sometimes it does not.

### 6. Test Order Dependency

When tests implicitly depend on running in a specific order, shuffling the execution order (which many test frameworks do by default) causes failures.

**Example: Setup leaked from a previous test**

```python
# test_suite.py
def test_create_account():
    """This test creates a user account as a side effect."""
    response = client.post('/api/accounts', json={'name': 'Test User'})
    assert response.status_code == 201

def test_list_accounts():
    """This test assumes the account from the previous test exists."""
    response = client.get('/api/accounts')
    accounts = response.json()
    assert len(accounts) == 1  # Fails if test_create_account didn't run first
```

### 7. Resource Leaks

Tests that do not properly clean up resources -- file handles, database connections, network sockets, spawned processes -- can cause subsequent tests to fail.

```python
# FLAKY: File handle leak causes failures in later tests
def test_write_large_file():
    f = open('/tmp/test_output.txt', 'w')
    f.write('x' * 10_000_000)
    # Missing f.close() -- file handle leaked
    assert os.path.getsize('/tmp/test_output.txt') > 0
```

After enough test runs, the process runs out of file handles, causing unrelated tests to fail with "too many open files" errors.

### 8. Floating Point Arithmetic

Floating point comparisons are a subtle but common source of flakiness, especially across different CPU architectures or compiler optimization levels.

```python
# FLAKY: Floating point precision varies across platforms
def test_calculation():
    result = 0.1 + 0.2
    assert result == 0.3  # This can fail! 0.1 + 0.2 = 0.30000000000000004
```

### 9. Random Data Generation

Tests that use random data without controlling the seed introduce non-determinism by design.

```python
# FLAKY: Random input means random behavior
def test_sort_algorithm():
    data = [random.randint(0, 1000) for _ in range(100)]
    result = my_sort(data)
    assert result == sorted(data)
    # This might fail if the sort has a bug with specific input patterns
    # that only appear with certain random seeds
```

### 10. UI Rendering Variability

Front-end tests are particularly susceptible to flakiness because rendering behavior depends on window size, font loading, animation timing, and browser rendering engine specifics.

```javascript
// FLAKY: Screenshot comparison fails due to font rendering differences
test('homepage matches snapshot', async () => {
  await page.goto('http://localhost:3000');
  const screenshot = await page.screenshot();
  expect(screenshot).toMatchImageSnapshot();
});
```

Visual regression tests are especially prone to flakiness because pixel-level differences in anti-aliasing, sub-pixel rendering, and font hinting can vary across runs.

## The Impact of Flaky Tests on CI/CD Pipelines

Flaky tests do not exist in isolation. They have cascading effects across your entire development workflow.

### Eroded Trust in the Test Suite

The most damaging effect of flaky tests is psychological. When developers regularly encounter test failures that are not their fault, they develop a Pavlovian response: they stop trusting the test suite. The internal monologue shifts from "this test failed, I should investigate" to "this test failed, it's probably just flaky, let me re-run."

This is catastrophic. The entire value of automated testing rests on the assumption that a failing test means something is wrong. When that assumption breaks down, real bugs slip through because developers dismiss legitimate failures as flakiness.

### Wasted Developer Time

Every flaky test failure triggers an investigation. A developer sees a red build, clicks through to the failure, reads the error message, checks the code changes, realizes nothing relevant changed, re-runs the pipeline, and waits for it to complete. This cycle takes 15-30 minutes each time, and in large organizations, it happens dozens of times per day.

Google's research found that approximately 16% of their tests exhibited some flakiness, and dealing with flaky tests consumed a significant portion of their testing infrastructure and engineer time. At scale, the cumulative time waste is staggering.

### Slowed Deployment Velocity

When CI/CD pipelines fail due to flaky tests, deployments get blocked. Teams that practice continuous deployment find themselves waiting for re-runs, manually retriggering builds, or worse -- merging code with known test failures. Each of these responses undermines the speed and safety that CI/CD is supposed to provide.

### Increased CI/CD Infrastructure Costs

Re-running failed tests means running your CI/CD pipeline more often. For organizations that pay per-minute for CI/CD compute (which is most organizations using cloud-based CI services), flaky tests directly increase costs. A test suite that gets re-run 20% more often due to flakiness costs 20% more to operate.

### Masked Real Failures

Perhaps the most dangerous impact: flaky tests can mask real failures. When a test that is "known to be flaky" starts failing due to an actual regression, teams may dismiss it as another flaky failure. The bug ships to production because the signal was lost in the noise.

## Real-World Examples of Flaky Tests

### Example 1: The Midnight Test

A team had a test that checked whether a user's subscription was "active." The test created a subscription with a start date of "today" and an end date of "today + 30 days." The test passed perfectly during the day but failed every night at midnight because the "today" value shifted between the test setup and the assertion.

```python
def test_subscription_is_active():
    sub = Subscription(
        start_date=date.today(),
        end_date=date.today() + timedelta(days=30)
    )
    # If this line executes after midnight but setup ran before midnight:
    assert sub.is_active()  # FAILS because start_date is yesterday
```

**Fix**: Use a fixed reference time instead of `date.today()`.

### Example 2: The Port Conflict

An integration test suite spun up a test server on port 8080. When two CI jobs ran simultaneously on the same machine, they both tried to bind to port 8080. One succeeded; the other failed.

```javascript
const server = app.listen(8080, () => {
  // FLAKY: Port 8080 might already be in use
  runTests();
});
```

**Fix**: Use dynamic port allocation (port 0) and pass the assigned port to the test.

### Example 3: The Scroll Position Bug

A Selenium test checked whether a "Buy Now" button was visible on an e-commerce product page. The test passed on screens taller than 900 pixels but failed on shorter screens because the button was below the fold and required scrolling.

```python
def test_buy_button_visible():
    driver.get("http://localhost:3000/product/42")
    button = driver.find_element(By.ID, "buy-now")
    assert button.is_displayed()  # FLAKY: depends on viewport height
```

**Fix**: Scroll the element into view before checking visibility, or set a consistent viewport size.

### Example 4: The Email Delivery Delay

A test verified that a welcome email was sent after user registration. The test checked the email inbox immediately after registration, but the email was sent asynchronously through a queue. On fast machines, the email arrived in time. On slow machines, it did not.

```python
def test_welcome_email_sent():
    register_user("alice@example.com")
    time.sleep(2)  # Hope the email arrives within 2 seconds
    emails = get_emails_for("alice@example.com")
    assert len(emails) == 1
```

**Fix**: Use polling with a timeout instead of a fixed sleep, or mock the email service.

## How to Identify Flaky Tests in Your Codebase

Identifying flaky tests requires a systematic approach. Simply waiting for them to appear in CI failures is reactive and slow. Here are proactive strategies.

### Track Test Results Over Time

The most reliable way to identify flaky tests is to track pass/fail results across multiple runs. A test that passes 95% of the time and fails 5% of the time is clearly flaky. This requires logging test results to a database and analyzing patterns.

DeFlaky automates this process by collecting test results from your CI/CD pipeline runs and computing flakiness scores for every test in your suite. Its CLI integrates directly with your existing test runner, and the dashboard provides a clear view of which tests are most flaky and how their flakiness trends over time.

### Run Tests Multiple Times

A simple but effective technique is to run your entire test suite multiple times in sequence without any code changes. Any test that fails in some runs but passes in others is flaky by definition.

```bash
# Run tests 10 times and log results
for i in $(seq 1 10); do
  pytest --tb=short >> test_results.log 2>&1
  echo "--- Run $i complete ---" >> test_results.log
done
```

This approach works well for detecting highly flaky tests but may miss rarely flaky tests (those with low failure rates).

### Analyze CI/CD History

Look at your CI/CD build history for patterns:

- Tests that fail and then pass on re-run without code changes
- Tests that fail only on specific days or times
- Tests that fail more often on certain CI worker types
- Tests that fail in clusters (multiple tests failing together suggests an environmental issue)

### Use Test Quarantine

Quarantine suspected flaky tests by running them in a separate job that does not block the main pipeline. If a quarantined test continues to fail intermittently without code changes, it confirms flakiness. If it stops failing, the underlying issue may have been resolved.

## Strategies for Preventing Flaky Tests

Prevention is always better than cure. Here are strategies to prevent flaky tests from entering your codebase in the first place.

### Isolate Test State

Every test should create its own state and clean it up afterward. Never depend on state left behind by previous tests.

```python
# GOOD: Each test creates its own data
def test_user_update(self):
    user = create_test_user(name="Alice")
    user.update(name="Bob")
    assert user.name == "Bob"
    delete_test_user(user.id)
```

### Use Deterministic Waits

Replace arbitrary sleeps with explicit waits that poll for a specific condition.

```python
# BAD
time.sleep(5)
assert element.is_visible()

# GOOD
WebDriverWait(driver, 10).until(
    EC.visibility_of_element_located((By.ID, "my-element"))
)
```

### Mock External Dependencies

Any test that calls an external service over the network is a candidate for mocking. Use mock servers, stubs, or recorded responses (VCR pattern) to eliminate network variability.

### Control Randomness

If your tests use random data, always seed the random number generator with a fixed value. Log the seed so you can reproduce failures.

```python
import random

def test_with_controlled_randomness():
    seed = 42
    random.seed(seed)
    data = [random.randint(0, 100) for _ in range(50)]
    assert my_function(data) == expected_result
```

### Set Explicit Timeouts

Always set explicit timeouts for operations that might hang. A test that hangs is worse than a test that fails fast.

### Use Fixed Time References

Never use "now" or "today" in tests. Use a fixed reference time or a clock mock.

```python
from freezegun import freeze_time

@freeze_time("2026-01-15 12:00:00")
def test_subscription_active():
    sub = Subscription(
        start_date=date(2026, 1, 1),
        end_date=date(2026, 2, 1)
    )
    assert sub.is_active()
```

### Run Tests in Random Order

Configure your test framework to randomize test execution order. This surfaces order-dependent tests early, before they become entrenched.

```bash
# pytest with random ordering
pytest -p randomly

# JUnit 5 with random ordering
@TestMethodOrder(MethodOrderer.Random.class)
```

## Fixing Flaky Tests: A Practical Framework

When you discover a flaky test, follow this framework to diagnose and fix it.

### Step 1: Reproduce the Failure

Run the test in isolation multiple times. If it passes consistently in isolation but fails when run with other tests, the issue is likely shared state or resource contention.

```bash
# Run the specific test 50 times
for i in $(seq 1 50); do
  pytest tests/test_checkout.py::test_apply_coupon -x
done
```

### Step 2: Classify the Root Cause

Use the categories described earlier to classify the root cause. Is it timing? Shared state? Network dependency? Environment difference? Knowing the category guides the fix.

### Step 3: Apply the Appropriate Fix

Each root cause has a corresponding fix pattern:

| Root Cause | Fix Pattern |
|------------|-------------|
| Timing/Race Condition | Use explicit waits, polling, or synchronization |
| Shared State | Isolate test data, use per-test setup/teardown |
| Network Dependency | Mock external services |
| Environment Difference | Normalize environment, use containers |
| Async Operations | Properly await all async operations |
| Test Order | Ensure tests are independent |
| Resource Leaks | Use try/finally or context managers for cleanup |

### Step 4: Verify the Fix

After applying a fix, run the test many times to verify stability. A single successful run is not sufficient -- you need statistical confidence that the flakiness is resolved.

```bash
# Run 100 times to verify stability
pytest tests/test_checkout.py::test_apply_coupon --count=100
```

DeFlaky can help here by tracking the test's pass rate over time. After deploying a fix, you can monitor the test's flakiness score on the DeFlaky dashboard to confirm that the fix held.

### Step 5: Add Regression Prevention

Once you fix a flaky test, add guards to prevent the same pattern from recurring. This might include linting rules, code review checklists, or automated checks in your CI pipeline.

## Measuring Test Suite Reliability

To manage flaky tests effectively, you need metrics. Here are the key metrics to track.

### Flakiness Rate

The percentage of test runs that produce different results (pass vs. fail) without code changes. Track this per test and for the suite as a whole.

**Formula**: `Flakiness Rate = (Number of inconsistent runs / Total runs) x 100`

### Mean Time to Detection (MTTD)

How long it takes from when a flaky test is introduced to when it is identified as flaky. Lower MTTD means less wasted time investigating false failures.

### Mean Time to Resolution (MTTR)

How long it takes from when a flaky test is identified to when it is fixed. Track this to ensure flaky tests are being addressed promptly.

### Test Suite Confidence Score

A composite metric that reflects the overall reliability of your test suite. DeFlaky computes this automatically based on individual test flakiness rates, weighting by test frequency and criticality.

### Re-run Rate

How often your CI/CD pipeline needs to be re-run due to flaky test failures. This directly measures the operational impact of flakiness.

## The Role of Culture in Managing Flaky Tests

Technical solutions alone are not sufficient. Organizational culture plays a critical role.

### Zero-Tolerance Policy

Teams that treat flaky tests as acceptable incur compounding costs. Adopt a zero-tolerance policy: when a flaky test is identified, it must be fixed or removed within a defined SLA (e.g., 48 hours).

### Ownership and Accountability

Assign ownership of flaky tests to the team that owns the code being tested. Without clear ownership, flaky tests become everyone's problem, which means they become nobody's problem.

### Celebrate Reliability Improvements

Make test reliability a visible metric. Celebrate when the team's flakiness rate drops. Show the dashboard in team meetings. Make reliability improvement a recognized achievement, not just a chore.

### Include Flakiness in Definition of Done

When reviewing pull requests, check not just whether the tests pass, but whether the new tests are designed to be deterministic. Include flakiness prevention in your code review checklist.

## Tools for Managing Flaky Tests

The ecosystem of tools for managing flaky tests has matured significantly. Here is an overview of the categories.

### Test Result Aggregation

Tools that collect test results from multiple CI runs and identify flaky tests through statistical analysis. DeFlaky falls into this category, offering both a CLI for local analysis and a dashboard for team-wide visibility.

### Test Quarantine Systems

Systems that automatically quarantine tests identified as flaky, running them separately from the main pipeline to prevent them from blocking deployments.

### Retry Mechanisms

Built-in retry capabilities in test frameworks that automatically re-run failed tests. While this masks flakiness rather than fixing it, it can be a useful short-term mitigation.

- **pytest-rerunfailures**: Automatically re-runs failed tests in pytest
- **Jest --retries**: Built-in retry support in Jest
- **JUnit Pioneer @RetryingTest**: Retry annotation for JUnit 5

### Environment Standardization

Tools like Docker, Nix, and Bazel that create reproducible test environments, eliminating environment-related flakiness.

## Flaky Tests by Test Type

Different types of tests have different flakiness profiles.

### Unit Tests

Unit tests are the least flaky category because they typically have no external dependencies. When unit tests are flaky, the cause is usually shared mutable state, floating point comparisons, or reliance on system time.

**Flakiness rate**: Typically < 1%

### Integration Tests

Integration tests interact with databases, message queues, and other infrastructure components. They are moderately prone to flakiness due to network issues, resource contention, and timing.

**Flakiness rate**: Typically 2-5%

### End-to-End Tests

E2E tests are the most flaky category. They involve full browser rendering, network calls, database operations, and complex user interactions. Every layer of the stack introduces potential flakiness.

**Flakiness rate**: Typically 5-15%

### Performance Tests

Performance tests are inherently variable because system performance depends on resource availability, which fluctuates. Setting appropriate thresholds and using statistical significance tests is critical.

**Flakiness rate**: Can exceed 20% without proper statistical handling

## Conclusion: Taking Control of Test Flakiness

Flaky tests are not an inevitable cost of doing business. They are a solvable engineering problem. The path to a reliable test suite involves understanding the root causes of flakiness, implementing prevention strategies, measuring reliability metrics, and building a culture that values test determinism.

Start by assessing the current state of your test suite. Identify the most flaky tests, classify their root causes, and fix them systematically. Use tools like DeFlaky to automate detection and tracking, so you can focus your engineering effort on fixes rather than manual investigation.

The investment in test reliability pays dividends across your entire development workflow: faster deployments, fewer false alarms, higher developer confidence, and ultimately, better software.

A test suite that your team trusts is a test suite that makes your team faster. Eliminating flaky tests is one of the highest-leverage investments a QA team can make.
