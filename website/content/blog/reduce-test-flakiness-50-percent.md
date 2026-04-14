---
title: "How We Reduced Test Flakiness by 50% in 2 Weeks: A Step-by-Step Playbook"
description: "A practical, step-by-step playbook for reducing test flakiness by 50% or more in two weeks. Covers auditing existing tests, identifying top offenders, categorizing root causes, applying systematic fixes, and establishing team processes to prevent regression."
date: "2026-04-13"
slug: "reduce-test-flakiness-50-percent"
keywords:
  - reduce test flakiness
  - fix flaky tests
  - test suite reliability
  - flaky test reduction
  - improve test stability
  - test flakiness playbook
  - flaky test audit
  - test reliability improvement
  - eliminate flaky tests
  - test suite health
author: "Pramod Dutta"
---

# How We Reduced Test Flakiness by 50% in 2 Weeks: A Step-by-Step Playbook

Two weeks. That is all it took to cut our test flakiness in half. Not with a massive rewrite. Not by throwing out our test suite and starting over. We did it with a structured, methodical approach that any team can replicate.

Before the initiative, our CI pipeline had a 35% first-pass failure rate. Roughly one in three builds failed for reasons unrelated to the actual code change. Developers had learned to reflexively click "re-run" on failed pipelines. Some had stopped trusting CI altogether and were merging with failing tests. The situation was untenable.

This playbook documents exactly what we did to reduce test flakiness, day by day, including the tools we used, the patterns we found, and the process changes we made to prevent regression.

## The Problem: Quantifying the Damage

Before convincing leadership (and ourselves) to dedicate two weeks to this effort, we needed hard numbers. Here is what we found:

- **1,847 tests** in the full suite
- **127 tests** (6.9%) flagged as flaky based on the last 30 days of CI data
- **35% of CI builds** contained at least one flaky failure
- **Average 23 minutes** spent per developer per day investigating false failures
- **~$18,000/month** in wasted engineering time (12 engineers x 23 min/day x 22 working days x $75/hr average cost)

That $18,000 figure got leadership's attention. But the real cost was harder to quantify: eroded trust in the test suite, increased time-to-merge, and a growing culture of "just re-run it."

## Week 1: Audit, Identify, and Categorize

### Day 1-2: The Audit

The first step to reduce test flakiness is knowing exactly which tests are flaky and how flaky they are. We used three data sources:

**1. CI Build History**

We pulled the last 30 days of CI build results and identified every test that had both passed and failed on the same commit:

```python
import pandas as pd
from collections import defaultdict

def identify_flaky_tests(build_results):
    """
    build_results: list of dicts with keys:
    commit, test_name, status (pass/fail), build_id
    """
    test_results = defaultdict(lambda: defaultdict(set))

    for result in build_results:
        commit = result['commit']
        test = result['test_name']
        status = result['status']
        test_results[test][commit].add(status)

    flaky_tests = {}
    for test, commits in test_results.items():
        flaky_commits = sum(
            1 for statuses in commits.values()
            if 'pass' in statuses and 'fail' in statuses
        )
        total_commits = len(commits)
        if flaky_commits > 0:
            flaky_tests[test] = {
                'flake_rate': flaky_commits / total_commits,
                'total_runs': total_commits,
                'flaky_runs': flaky_commits
            }

    return dict(sorted(
        flaky_tests.items(),
        key=lambda x: x[1]['flake_rate'],
        reverse=True
    ))
```

**2. Developer Reports**

We sent a quick survey to the team: "Which tests do you re-run most often?" This surfaced tests that were technically flaky but had not triggered enough to appear in automated detection -- tests that were flaky only in specific conditions like Monday mornings (when a shared staging environment was being refreshed) or the last build of the day (when test data accumulated).

**3. Automated Detection with DeFlaky**

We ran DeFlaky across our test suite to get a comprehensive, statistically validated list:

```bash
npx deflaky run --history 30d --threshold 0.02
```

This identified 127 flaky tests, ranked by FlakeScore -- a composite metric that accounts for flake frequency, pipeline impact, and investigation time.

### Day 3-4: Root Cause Categorization

With our list of 127 flaky tests in hand, we spent two days categorizing every one by root cause. This was the most important step. Without understanding why tests are flaky, you cannot fix them efficiently.

We used five categories:

| Category | Count | % of Total |
|---|---|---|
| Timing/Race Conditions | 41 | 32% |
| Shared State / Test Isolation | 29 | 23% |
| External Dependencies | 24 | 19% |
| Environment Differences (local vs CI) | 18 | 14% |
| Non-deterministic Data | 15 | 12% |

**Timing/Race Conditions (32%)**: Tests using `sleep()`, polling without proper timeouts, or asserting on elements before they were fully rendered. This was by far the largest category.

**Shared State (23%)**: Tests that relied on database rows, files, or in-memory state created by other tests. These only failed when test execution order changed.

**External Dependencies (19%)**: Tests hitting real APIs, shared staging databases, or third-party services that were intermittently slow or unavailable.

**Environment Differences (14%)**: Tests that passed locally but failed in CI due to differences in timezone, locale, screen resolution, or available resources (CPU, memory).

**Non-deterministic Data (12%)**: Tests using `Math.random()`, `UUID.randomUUID()`, `new Date()`, or other sources of randomness without seeding.

### Day 5: Prioritization

Not all 127 flaky tests were equally worth fixing. We ranked them using a priority formula:

```
Priority = Flake Rate x Daily Run Count x Pipeline Weight
```

Where Pipeline Weight was:
- PR pipeline: 3x (blocks every developer, multiple times daily)
- Main branch pipeline: 2x (blocks deployments)
- Nightly suite: 1x (informational only)

The top 20 tests accounted for 68% of all flaky failures. This is typical -- flakiness follows a power law. Fixing a small number of high-impact tests produces outsized results.

## Week 2: Systematic Fixes

With our prioritized list and root cause categories, we split the team into pairs and attacked each category systematically.

### Fixing Timing Issues (Days 6-7)

The 41 timing-related flaky tests fell into three sub-patterns:

**Pattern 1: Hard-coded sleeps**

```javascript
// BEFORE: Flaky
test('modal appears after click', async () => {
  await page.click('#open-modal');
  await new Promise(r => setTimeout(r, 1000));
  expect(await page.isVisible('.modal')).toBe(true);
});

// AFTER: Reliable
test('modal appears after click', async () => {
  await page.click('#open-modal');
  await page.waitForSelector('.modal', { state: 'visible', timeout: 5000 });
  expect(await page.isVisible('.modal')).toBe(true);
});
```

**Pattern 2: Asserting too early on async operations**

```java
// BEFORE: Flaky
@Test
public void testOrderProcessing() {
    orderService.submitOrder(order);
    // Order processing is async - this might check before it's done
    assertEquals("PROCESSED", orderRepository.getStatus(order.getId()));
}

// AFTER: Reliable
@Test
public void testOrderProcessing() {
    orderService.submitOrder(order);
    await().atMost(10, SECONDS)
           .pollInterval(500, MILLISECONDS)
           .until(() -> orderRepository.getStatus(order.getId()),
                  equalTo("PROCESSED"));
}
```

**Pattern 3: Animation and rendering races**

```javascript
// BEFORE: Flaky
test('counter increments', async () => {
  await page.click('#increment');
  const value = await page.textContent('#counter');
  expect(value).toBe('1');
});

// AFTER: Reliable
test('counter increments', async () => {
  await page.click('#increment');
  await expect(page.locator('#counter')).toHaveText('1', { timeout: 3000 });
});
```

We fixed all 41 timing tests in two days. Result: 17 were immediately stable. The remaining 24 had a secondary root cause that we addressed in subsequent passes.

### Fixing Shared State Issues (Days 8-9)

The 29 shared-state tests required more careful work. The fundamental fix was always the same: make each test set up and tear down its own state.

**Database state leakage:**

```python
# BEFORE: Tests share database state
class TestUserService:
    def test_create_user(self):
        user = user_service.create("test@example.com")
        assert user.id is not None

    def test_list_users(self):
        # Depends on test_create_user having run
        users = user_service.list_all()
        assert len(users) == 1  # Fails if order changes

# AFTER: Each test is independent
class TestUserService:
    def setup_method(self):
        db.execute("DELETE FROM users")

    def test_create_user(self):
        user = user_service.create("test@example.com")
        assert user.id is not None

    def test_list_users(self):
        user_service.create("a@example.com")
        user_service.create("b@example.com")
        users = user_service.list_all()
        assert len(users) == 2
```

**In-memory singleton pollution:**

```java
// BEFORE: Singleton accumulates state across tests
@Test
public void testAddToCart() {
    ShoppingCart.getInstance().addItem(new Item("Widget", 9.99));
    assertEquals(1, ShoppingCart.getInstance().getItemCount());
}

// AFTER: Reset singleton between tests
@BeforeMethod
public void resetCart() {
    ShoppingCart.getInstance().clear();
}

@Test
public void testAddToCart() {
    ShoppingCart.getInstance().addItem(new Item("Widget", 9.99));
    assertEquals(1, ShoppingCart.getInstance().getItemCount());
}
```

### Fixing External Dependencies (Day 10)

For the 24 tests hitting external services, we applied three strategies:

**Strategy 1: Replace with mocks for unit/integration tests**

```javascript
// BEFORE: Hitting real Stripe API
test('processes payment', async () => {
  const result = await paymentService.charge('tok_visa', 1000);
  expect(result.status).toBe('succeeded');
});

// AFTER: Using mock
jest.mock('../services/stripe');
test('processes payment', async () => {
  stripe.charges.create.mockResolvedValue({ status: 'succeeded' });
  const result = await paymentService.charge('tok_visa', 1000);
  expect(result.status).toBe('succeeded');
});
```

**Strategy 2: Use containers for databases**

We replaced shared staging database connections with Testcontainers instances that spin up fresh for each test class.

**Strategy 3: Add retry with backoff for tests that genuinely need network access**

For a small number of E2E tests that intentionally tested real integrations, we added explicit retry logic with exponential backoff and clear timeout boundaries.

### Fixing Environment Issues (Day 10)

Most environment-related flakiness came from three sources:

- **Timezone assumptions**: Tests using `new Date()` and asserting on formatted strings. Fixed by setting `TZ=UTC` in CI and using explicit timezones in assertions.
- **Locale-dependent sorting**: Tests asserting on the order of string-sorted lists. Fixed by specifying locale in sort comparators.
- **Resource constraints in CI**: Tests that worked locally with 16GB RAM but failed in CI containers with 4GB. Fixed by reducing test data sizes and adding appropriate resource limits to CI configuration.

### Day 10 Results Check

After five days of focused fixes, we re-ran our full analysis:

- **127 flaky tests at start** → **58 remaining** (54% reduction)
- **35% CI build failure rate** → **16%**
- We had already exceeded our 50% target

## Preventing Regression

Fixing flaky tests is only half the battle. Without prevention measures, new flaky tests will accumulate just as fast as you fix the old ones. Here is what we put in place.

### Process Change 1: Flaky Test Gate in PR Reviews

We added a CI check that runs new or modified tests 5 times in sequence. If any run produces a different result, the PR is flagged for review:

```yaml
# .github/workflows/flake-check.yml
flake-detection:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - name: Detect changed test files
      id: changed
      run: |
        TESTS=$(git diff --name-only origin/main...HEAD | grep -E '\.(test|spec)\.' || true)
        echo "tests=$TESTS" >> $GITHUB_OUTPUT
    - name: Run flake check
      if: steps.changed.outputs.tests != ''
      run: |
        for i in {1..5}; do
          npm test -- --testPathPattern="${{ steps.changed.outputs.tests }}"
        done
```

### Process Change 2: Weekly Flaky Test Review

Every Monday, the on-call engineer reviews the flaky test dashboard and assigns the top 3 new offenders to appropriate team members. This takes 15 minutes and prevents the backlog from growing unchecked.

### Process Change 3: Flaky Test Budget

We set a target: suite flake rate must stay below 5%. If it exceeds 5%, fixing flaky tests takes priority over new feature work until we are back under threshold. This created organizational pressure to prevent flakiness rather than just tolerate it.

### Process Change 4: Continuous Monitoring

We set up automated monitoring that tracks our flake rate daily and alerts when it trends upward:

```bash
npx deflaky run --monitor --alert-threshold 0.05
```

## The Results

Two weeks after starting, here is where we landed:

| Metric | Before | After | Change |
|---|---|---|---|
| Flaky tests | 127 | 58 | -54% |
| CI first-pass rate | 65% | 84% | +19pp |
| Avg developer time on false failures | 23 min/day | 9 min/day | -61% |
| Monthly cost of flakiness | ~$18,000 | ~$7,000 | -61% |
| Developer trust in CI (survey, 1-10) | 4.2 | 7.1 | +69% |

The most impactful change was not any single fix, but the systematic approach. By categorizing root causes first, we could batch similar fixes together and develop muscle memory for each pattern. The second-most impactful change was establishing prevention processes. Without those, we would have been back to 127 flaky tests within a month.

## Lessons Learned

**1. The Pareto principle applies strongly.** Our top 20 flaky tests caused 68% of pipeline failures. If you are short on time, focus ruthlessly on the top offenders.

**2. Most flakiness is caused by the test, not the code.** Of our 127 flaky tests, only 4 were flaky because of an actual bug in the application. The rest were test design problems.

**3. Shared state is the silent killer.** It is the hardest category to detect because it only manifests when tests run in specific orders. Invest in test isolation from day one.

**4. You need ongoing monitoring to reduce test flakiness permanently.** A one-time cleanup effort will decay without continuous tracking. Make flake rate as visible as uptime or error rate.

**5. Developer buy-in matters.** Once engineers saw the dashboard and the dollar figure, they became advocates for the initiative. Make the problem visible and the solution will follow.

## Your Two-Week Playbook (Summary)

**Days 1-2**: Audit your test suite. Identify every flaky test using CI history, developer reports, and automated detection.

**Days 3-4**: Categorize every flaky test by root cause (timing, shared state, external deps, environment, non-deterministic data).

**Day 5**: Prioritize by impact. Focus on the top 20-30 tests that cause the most pipeline failures.

**Days 6-7**: Fix timing-related flaky tests (replace sleeps with waits, add proper polling, handle async correctly).

**Days 8-9**: Fix shared state issues (add proper setup/teardown, eliminate singleton pollution, isolate database state).

**Day 10**: Fix external dependency and environment issues (add mocks, use containers, normalize CI environment).

**Days 11-14**: Establish prevention processes (flake gates on PRs, weekly reviews, flake rate budgets, continuous monitoring).

## Get Started Today

You do not need two weeks to start seeing improvement. Even a single day of focused effort on your top 5 flaky tests can meaningfully reduce test flakiness and improve your team's CI experience.

**Start by identifying your flakiest tests right now.** DeFlaky scans your test suite, detects flaky tests automatically, and ranks them by impact so you know exactly where to focus:

```bash
npx deflaky run
```
