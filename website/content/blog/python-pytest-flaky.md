---
title: "Fixing Flaky Pytest Tests: A Comprehensive Guide for Python Developers"
description: "Master the art of fixing flaky pytest tests. Learn how fixture scoping, database state, parametrize pitfalls, and conftest ordering cause test flakiness in Python, with practical solutions and tooling recommendations."
date: "2026-04-07"
slug: "python-pytest-flaky-tests"
keywords:
  - pytest flaky tests
  - python test reliability
  - fix pytest
  - pytest fixtures flaky
  - pytest fixture scoping
  - pytest database testing
  - pytest parametrize flaky
  - conftest ordering
  - pytest-randomly
  - pytest-repeat
  - flaky python tests
  - pytest best practices
author: "Pramod Dutta"
---

# Fixing Flaky Pytest Tests: A Comprehensive Guide for Python Developers

Pytest is the gold standard for Python testing. Its fixture system is powerful, its plugin ecosystem is vast, and its assertion introspection is genuinely magical. But pytest's flexibility is a double-edged sword. The same features that make it expressive and powerful also create subtle traps that lead to flaky tests.

If you have ever stared at a pytest run where 3 out of 200 tests failed, re-run it, and watched all 200 pass, you know the frustration. The failures seem random. The tests look correct. The code hasn't changed. Yet something is wrong, and it only manifests intermittently.

This guide covers the most common causes of flaky pytest tests and provides concrete, battle-tested solutions for each one. By the end, you will know how to identify, diagnose, and fix the flakiness in your Python test suite.

## Fixture Scoping Issues: The Number One Source of Pytest Flakiness

Pytest fixtures are brilliant. They let you define reusable setup and teardown logic with clean, declarative syntax. But fixture scoping is where most pytest flakiness originates.

### Understanding Fixture Scopes

Pytest offers five fixture scopes: `function` (default), `class`, `module`, `package`, and `session`. The scope determines how often the fixture is created and destroyed:

- **function**: Created fresh for each test function (safest, slowest)
- **class**: Shared across all tests in a class
- **module**: Shared across all tests in a module (file)
- **session**: Created once for the entire test run (fastest, riskiest)

### How Scoping Causes Flakiness

The problems begin when a wider-scoped fixture provides mutable state that narrower-scoped tests modify.

```python
# conftest.py
@pytest.fixture(scope="module")
def shared_user(db_session):
    """Created once per module. All tests in the module share this user."""
    user = User(name="Test User", email="test@example.com", status="active")
    db_session.add(user)
    db_session.commit()
    return user

# test_user_operations.py
def test_deactivate_user(shared_user, db_session):
    shared_user.status = "inactive"
    db_session.commit()
    assert shared_user.status == "inactive"

def test_user_is_active(shared_user):
    # This test DEPENDS on running before test_deactivate_user
    assert shared_user.status == "active"  # FLAKY!
```

In this example, `test_user_is_active` passes when it runs first but fails when it runs after `test_deactivate_user`. The fixture is module-scoped, so both tests share the same user object. When one test mutates the shared state, the other test sees the mutation.

### Fixing Fixture Scoping Issues

**Rule 1: Use function scope for mutable fixtures.** If a fixture provides data that tests might modify, it must be function-scoped. The performance cost of recreating the fixture for each test is almost always worth the reliability gain.

```python
@pytest.fixture  # Default scope is "function" - created fresh for each test
def user(db_session):
    user = User(name="Test User", email="test@example.com", status="active")
    db_session.add(user)
    db_session.commit()
    yield user
    # Cleanup
    db_session.delete(user)
    db_session.commit()
```

**Rule 2: Make wide-scoped fixtures truly read-only.** If you use module or session scope for performance, make the fixture return frozen or immutable data. Use `namedtuple`, `frozenset`, or `dataclasses.dataclass(frozen=True)`.

```python
from dataclasses import dataclass

@dataclass(frozen=True)
class APIConfig:
    base_url: str
    api_key: str
    timeout: int

@pytest.fixture(scope="session")
def api_config():
    return APIConfig(
        base_url="http://localhost:8080",
        api_key="test-key-123",
        timeout=30
    )
```

**Rule 3: Use factories instead of shared fixtures.** Instead of sharing a single instance, provide a factory function that creates a new instance each time.

```python
@pytest.fixture
def create_user(db_session):
    """Factory fixture - creates a new user each time it's called."""
    created_users = []

    def _create_user(name="Test User", email=None, status="active"):
        email = email or f"test-{uuid.uuid4()}@example.com"
        user = User(name=name, email=email, status=status)
        db_session.add(user)
        db_session.commit()
        created_users.append(user)
        return user

    yield _create_user

    # Cleanup all created users
    for user in created_users:
        db_session.delete(user)
    db_session.commit()
```

## Database State: The Persistent Source of Test Pollution

Database-backed tests are inherently stateful. Every INSERT, UPDATE, and DELETE changes the world that subsequent tests see. Without proper isolation, database tests are almost guaranteed to become flaky as the test suite grows.

### Common Database Flakiness Patterns

**Leaking test data across tests.** Test A creates a record. Test B queries the table and gets unexpected results because it sees Test A's data.

**Auto-increment ID assumptions.** Tests that assert on specific auto-incremented IDs. These break when test execution order changes or when previous test runs leave data behind.

**Constraint violations from leftover data.** Tests that create records with unique fields (email, username) fail when a previous test already created a record with the same value.

**Connection pool exhaustion.** Tests that open database connections without closing them. Eventually the pool is exhausted and subsequent tests fail with connection errors.

### Database Isolation Strategies

**Strategy 1: Transaction rollback.** Wrap each test in a database transaction and roll it back after the test completes. This is the fastest approach because it avoids actually writing data to disk.

```python
@pytest.fixture
def db_session(db_engine):
    """Provide a transactional database session that rolls back after each test."""
    connection = db_engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()
```

**Strategy 2: Truncate tables between tests.** After each test, truncate all tables to reset to a clean state. This is slower than transaction rollback but works when your code commits transactions internally.

```python
@pytest.fixture(autouse=True)
def clean_db(db_session):
    yield
    # After each test, truncate all tables
    for table in reversed(Base.metadata.sorted_tables):
        db_session.execute(table.delete())
    db_session.commit()
```

**Strategy 3: Use a fresh database per test module.** For maximum isolation, create a new database for each test module. This is expensive but guarantees no state leaks.

```python
@pytest.fixture(scope="module")
def db_engine(tmp_path_factory):
    """Create a fresh SQLite database for each test module."""
    db_path = tmp_path_factory.mktemp("data") / "test.db"
    engine = create_engine(f"sqlite:///{db_path}")
    Base.metadata.create_all(engine)
    yield engine
    engine.dispose()
```

### Working with SQLAlchemy

SQLAlchemy introduces its own layer of complexity. The session's identity map caches objects, which means that reading an object from the database might return a stale cached version rather than the current database state.

```python
def test_user_update(db_session, user):
    # Update via raw SQL (simulating another process)
    db_session.execute(
        text("UPDATE users SET name = 'Updated' WHERE id = :id"),
        {"id": user.id}
    )
    db_session.commit()

    # This might return the CACHED version, not "Updated"
    assert user.name == "Updated"  # FLAKY!

    # Fix: Expire the object to force a fresh read
    db_session.expire(user)
    assert user.name == "Updated"  # Reliable
```

**Always call `db_session.expire_all()` or `db_session.refresh(obj)` when testing code that modifies data outside the ORM.** This prevents stale cache reads.

## Parametrize Pitfalls: When Test Generation Creates Flakiness

`pytest.mark.parametrize` is one of pytest's most powerful features. It generates multiple test cases from a single test function. But it can also introduce subtle flakiness.

### Mutable Default Arguments in Parametrize

Python's mutable default argument gotcha strikes again in parametrized tests.

```python
# BAD: Mutable default shared across parametrized test cases
@pytest.mark.parametrize("input_data", [
    {"items": []},  # This list is SHARED across all invocations
    {"items": []},
])
def test_add_item(input_data):
    input_data["items"].append("new_item")
    assert len(input_data["items"]) == 1  # FLAKY - depends on execution order
```

The fix is to use immutable test data or create fresh copies inside the test.

```python
# GOOD: Create fresh data inside the test
@pytest.mark.parametrize("initial_items", [
    [],
    ["existing"],
])
def test_add_item(initial_items):
    data = {"items": list(initial_items)}  # Fresh copy
    data["items"].append("new_item")
    assert "new_item" in data["items"]
```

### Order-Dependent Parametrized Tests

When parametrized tests interact with shared state (databases, files, APIs), the execution order of the parameter combinations matters. Pytest does not guarantee a specific order for parametrized tests, and plugins like `pytest-randomly` will deliberately shuffle them.

```python
# BAD: Parametrized tests that depend on execution order
@pytest.mark.parametrize("action,expected_count", [
    ("create", 1),   # Must run first
    ("create", 2),   # Must run second
    ("delete", 1),   # Must run third
])
def test_item_operations(db, action, expected_count):
    if action == "create":
        create_item(db)
    elif action == "delete":
        delete_last_item(db)
    assert count_items(db) == expected_count  # FLAKY!
```

The fix: each parametrized case must be independent. It should set up its own preconditions and not depend on the side effects of other cases.

### Large Parameter Sets and Resource Exhaustion

Parametrized tests with large parameter sets can exhaust system resources. If each parametrized case opens a database connection, creates a file, or starts a subprocess, you can run out of connections, file handles, or memory.

```python
# Potentially dangerous: 1000 parametrized cases, each creating a DB connection
@pytest.mark.parametrize("user_id", range(1000))
def test_get_user(db_connection, user_id):
    # If db_connection fixture doesn't properly pool/reuse connections,
    # this will exhaust the connection pool
    pass
```

Use connection pooling, limit the parameter set to meaningful cases, and ensure fixtures properly clean up resources.

## Conftest Ordering: The Hidden Configuration Cascade

Pytest's conftest.py system is a powerful but subtle configuration mechanism. Conftest files form a hierarchy based on directory structure, and the order in which they are loaded affects fixture resolution, plugin registration, and hook execution.

### How Conftest Ordering Causes Problems

Consider this directory structure:

```
tests/
  conftest.py          # Root conftest
  unit/
    conftest.py        # Unit test conftest
    test_models.py
  integration/
    conftest.py        # Integration test conftest
    test_api.py
```

Each conftest.py can define fixtures with the same name. Pytest resolves fixtures by walking up the directory hierarchy from the test file. If both the root conftest and the unit conftest define a `db_session` fixture, the unit conftest's version takes precedence for tests in the unit directory.

This becomes flaky when:
- A fixture in a child conftest depends on a fixture in the parent conftest being loaded first
- Two conftest files define hooks that conflict with each other
- Plugin registration in one conftest affects the behavior of tests in another directory

### Debugging Conftest Issues

Use `pytest --fixtures` to see which fixtures are available and where they are defined. Use `pytest --co` (collect only) to see which tests would run and which fixtures they would use. Use `pytest -p no:randomly` to disable random ordering and see if the flakiness disappears.

### Best Practices for Conftest Organization

**Keep the root conftest minimal.** Only define fixtures and configuration that are truly shared across all tests.

**Avoid fixture name collisions.** If two conftest files define a fixture with the same name, it is unclear which one a test will get. Use unique, descriptive names.

**Be explicit about fixture dependencies.** If a fixture depends on another fixture, declare the dependency in the function signature. Do not rely on implicit loading order.

```python
# Explicit dependency chain
@pytest.fixture(scope="session")
def db_engine():
    engine = create_engine(TEST_DB_URL)
    yield engine
    engine.dispose()

@pytest.fixture(scope="session")
def db_tables(db_engine):  # Explicit dependency on db_engine
    Base.metadata.create_all(db_engine)
    yield
    Base.metadata.drop_all(db_engine)

@pytest.fixture
def db_session(db_engine, db_tables):  # Explicit dependencies
    session = Session(bind=db_engine)
    yield session
    session.rollback()
    session.close()
```

## pytest-randomly: Exposing Hidden Order Dependencies

`pytest-randomly` is one of the most valuable plugins for detecting flaky tests. It randomizes the order of test execution, exposing tests that depend on running in a specific order.

### Why Random Ordering Matters

Tests that pass in their default order but fail when randomized have hidden order dependencies. They depend on side effects from tests that run before them: database records created by other tests, environment variables set by other tests, module-level state modified by other tests, or files created in temporary directories by other tests.

### Using pytest-randomly Effectively

Install it with `pip install pytest-randomly` and it activates automatically. Every test run uses a different random seed, which is printed at the beginning of the output.

```
$ pytest
Using --randomly-seed=12345
```

When a randomized run fails, you can reproduce the exact order by reusing the seed:

```
$ pytest --randomly-seed=12345
```

This lets you reliably reproduce the failure while you debug it.

### Fixing Order-Dependent Tests

When `pytest-randomly` exposes a flaky test, the debugging process is:

1. **Identify the failing test** and the seed that caused the failure
2. **Reproduce the failure** using `--randomly-seed=<seed>`
3. **Narrow down the dependency** by running the failing test with different subsets of other tests. Use `pytest --randomly-seed=<seed> -k "test_a or test_b"` to run specific combinations
4. **Find the interfering test** - the test whose side effects cause the failure
5. **Fix the isolation** - ensure both tests properly set up and tear down their state

```bash
# Step 1: See which tests ran before the failing test
pytest --randomly-seed=12345 -v 2>&1 | grep -B 20 "FAILED"

# Step 2: Run just the suspect combination
pytest --randomly-seed=12345 tests/test_a.py::test_setup tests/test_b.py::test_flaky

# Step 3: Confirm by running the failing test alone
pytest tests/test_b.py::test_flaky  # If this passes, it's order-dependent
```

## pytest-repeat: Catching Intermittent Failures Locally

`pytest-repeat` lets you run the same test multiple times to verify that it is deterministic. This is invaluable for catching flakiness before it reaches CI.

### Basic Usage

```bash
# Run each test 10 times
pytest --count=10

# Run a specific test 50 times
pytest tests/test_api.py::test_create_user --count=50

# Run until the first failure
pytest --count=100 -x tests/test_api.py::test_flaky_one
```

### When to Use pytest-repeat

**Before merging tests that interact with external systems.** API tests, database tests, and file system tests should be run multiple times locally to verify determinism.

**When investigating a suspected flaky test.** If a test failed once in CI, run it 100 times locally with `pytest-repeat` to see if you can reproduce the failure.

**As part of test review.** Include `pytest --count=10` in your test review checklist for new tests that interact with stateful systems.

### Combining pytest-randomly with pytest-repeat

The combination of these two plugins is powerful. Run each test 10 times with random ordering to stress-test both the individual test determinism and the inter-test isolation.

```bash
pytest --count=10 --randomly-seed=random
```

## Using DeFlaky with Pytest

While `pytest-randomly` and `pytest-repeat` are excellent for catching flakiness during development, they do not solve the problem of detecting flakiness in CI. That is where DeFlaky comes in.

### How DeFlaky Integrates with Pytest

DeFlaky works as a CLI tool and dashboard that analyzes your pytest results over time. You point DeFlaky at your test results (JUnit XML, pytest JSON reports, or DeFlaky's native format), and it tracks the pass/fail history of every test.

```bash
# Generate pytest results in JUnit XML format
pytest --junitxml=results.xml

# Feed results to DeFlaky
deflaky ingest results.xml

# View the flakiness report
deflaky report
```

DeFlaky identifies tests that have inconsistent results across runs. A test that passed 95 out of 100 times is flagged as flaky, even though it passes most of the time. This is the kind of flakiness that is nearly impossible to catch manually but erodes CI reliability over time.

### DeFlaky's Pytest Plugin

DeFlaky also offers a pytest plugin that reports results directly, eliminating the need for manual XML ingestion.

```bash
pip install deflaky-pytest

# Results are automatically reported to DeFlaky
pytest --deflaky
```

The plugin captures not just pass/fail status but also timing data, failure messages, and fixture information. This rich data makes it easier to diagnose the root cause of flakiness.

### Quarantine Integration

When DeFlaky identifies a flaky test, it can automatically quarantine it. Quarantined tests still run but do not block the CI pipeline. This prevents flaky tests from causing unnecessary deployment delays while keeping them visible so they get fixed.

```bash
# List quarantined tests
deflaky quarantine list

# Manually quarantine a test
deflaky quarantine add tests/test_api.py::test_flaky_endpoint

# Check if a quarantined test has stabilized
deflaky quarantine check
```

## Common Pytest Flakiness Patterns and Their Fixes

### Pattern 1: Time-Dependent Tests

Tests that depend on the current time are inherently flaky. They might pass at 11:59 PM and fail at 12:01 AM. They might pass in one timezone and fail in another.

```python
# BAD: Time-dependent test
def test_user_created_today(create_user):
    user = create_user()
    assert user.created_at.date() == datetime.date.today()  # Flaky at midnight!

# GOOD: Freeze time
from freezegun import freeze_time

@freeze_time("2026-04-07 12:00:00")
def test_user_created_today(create_user):
    user = create_user()
    assert user.created_at == datetime(2026, 4, 7, 12, 0, 0)
```

### Pattern 2: File System Race Conditions

Tests that create, read, and delete files can experience race conditions, especially on networked file systems or in CI environments with slow I/O.

```python
# BAD: Race condition between write and read
def test_write_config(tmp_path):
    config_file = tmp_path / "config.json"
    write_config(config_file, {"key": "value"})
    # On slow filesystems, the file might not be flushed yet
    data = read_config(config_file)  # FLAKY!
    assert data["key"] == "value"

# GOOD: Explicitly flush and sync
def test_write_config(tmp_path):
    config_file = tmp_path / "config.json"
    write_config(config_file, {"key": "value"}, flush=True)
    assert config_file.exists()  # Verify file is visible
    data = read_config(config_file)
    assert data["key"] == "value"
```

### Pattern 3: Port Conflicts

Tests that start servers on specific ports fail when the port is already in use, either by another test or by a leftover process from a previous test run.

```python
# BAD: Hardcoded port
@pytest.fixture
def test_server():
    server = start_server(port=8080)  # FLAKY if port is in use
    yield server
    server.stop()

# GOOD: Dynamic port allocation
@pytest.fixture
def test_server():
    server = start_server(port=0)  # OS assigns a free port
    yield server
    server.stop()
```

### Pattern 4: Dictionary Ordering Assumptions

In modern Python (3.7+), dictionaries maintain insertion order. But tests that compare dictionary representations as strings can still be flaky if the dictionary is constructed from unordered sources.

```python
# BAD: Comparing dict string representations
def test_api_response(client):
    response = client.get("/status")
    assert str(response.json()) == "{'status': 'ok', 'version': '1.0'}"  # FLAKY!

# GOOD: Compare dictionaries directly
def test_api_response(client):
    response = client.get("/status")
    data = response.json()
    assert data["status"] == "ok"
    assert data["version"] == "1.0"
```

### Pattern 5: Async Test Timing

Tests that involve asynchronous operations (background tasks, message queues, webhooks) are frequently flaky because they assert on results before the async operation completes.

```python
# BAD: No wait for async operation
def test_send_email(client, mailbox):
    client.post("/users", json={"email": "test@example.com"})
    # Welcome email is sent asynchronously
    assert len(mailbox.messages) == 1  # FLAKY - email might not be sent yet

# GOOD: Poll with timeout
import time

def test_send_email(client, mailbox):
    client.post("/users", json={"email": "test@example.com"})

    # Wait for the async operation with a timeout
    deadline = time.time() + 10  # 10 second timeout
    while time.time() < deadline:
        if len(mailbox.messages) >= 1:
            break
        time.sleep(0.1)

    assert len(mailbox.messages) == 1
    assert mailbox.messages[0].to == "test@example.com"
```

### Pattern 6: Global State Pollution

Python's module-level state persists across tests within the same process. Tests that modify module-level variables, class attributes, or singleton instances leak state to subsequent tests.

```python
# BAD: Modifying module-level state
import myapp.config as config

def test_debug_mode():
    config.DEBUG = True  # This persists across tests!
    result = myapp.process_request(bad_request)
    assert result.show_traceback is True

def test_production_mode():
    # This test assumes DEBUG is False, but it might be True
    # if test_debug_mode ran first
    result = myapp.process_request(bad_request)
    assert result.show_traceback is False  # FLAKY!

# GOOD: Use monkeypatch to temporarily modify state
def test_debug_mode(monkeypatch):
    monkeypatch.setattr("myapp.config.DEBUG", True)
    result = myapp.process_request(bad_request)
    assert result.show_traceback is True
    # monkeypatch automatically restores the original value after the test
```

### Pattern 7: Resource Leaks

Tests that open connections, file handles, or subprocesses without closing them cause flakiness through resource exhaustion.

```python
# BAD: Leaking database connections
def test_query_users():
    conn = psycopg2.connect(DSN)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users")
    users = cursor.fetchall()
    assert len(users) > 0
    # Connection is never closed!

# GOOD: Use context managers
def test_query_users():
    with psycopg2.connect(DSN) as conn:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM users")
            users = cursor.fetchall()
            assert len(users) > 0
```

## Systematic Approach to Fixing Flaky Pytest Tests

When facing a flaky test suite, follow this systematic approach:

### Step 1: Quantify the Problem

Before fixing anything, understand the scope. Run your full test suite 10 times and record the results. Which tests fail? How often? Do the same tests fail each time, or is it different tests?

```bash
# Run the suite 10 times, saving results
for i in $(seq 1 10); do
    pytest --junitxml=results-$i.xml 2>&1 | tail -1
done

# Or use DeFlaky for automated tracking
deflaky analyze --runs 10
```

### Step 2: Categorize the Failures

Group failures by root cause:
- **Order-dependent**: Fails only in certain orderings (use pytest-randomly to detect)
- **Timing-related**: Fails intermittently, often with timeout errors
- **Resource-related**: Fails after many tests have run (connection pools, memory)
- **Data-dependent**: Fails when specific data exists or is missing
- **Environment-dependent**: Fails only in CI, not locally

### Step 3: Fix From the Bottom Up

Start with the foundational issues:
1. Fix resource leaks (connections, file handles, subprocesses)
2. Fix database isolation (transaction rollback or truncation)
3. Fix fixture scoping (use function scope for mutable fixtures)
4. Fix timing issues (add proper waits, freeze time)
5. Fix order dependencies (each test sets up its own state)

### Step 4: Prevent Regression

Add `pytest-randomly` to your default pytest configuration to prevent new order dependencies from being introduced. Use DeFlaky to continuously monitor test reliability and catch new flaky tests early.

```ini
# pytest.ini
[pytest]
addopts = -p randomly --randomly-seed=random
```

## Conclusion

Flaky pytest tests are a solvable problem. The root causes are well-understood: fixture scoping issues, database state leaks, timing dependencies, shared mutable state, and resource management failures. Each of these has proven solutions.

The most impactful changes you can make today are:

1. **Use function-scoped fixtures for mutable state.** This eliminates the largest category of flakiness.
2. **Implement database transaction rollback.** This gives you clean state isolation with minimal performance cost.
3. **Install pytest-randomly.** This exposes hidden order dependencies before they cause problems in CI.
4. **Use monkeypatch instead of direct state mutation.** This prevents global state pollution.
5. **Track test reliability with DeFlaky.** This catches flaky tests that slip through manual review.

A reliable test suite is not a luxury. It is a prerequisite for fast, confident deployments. Every minute your team spends investigating a false test failure is a minute they are not spending on features, bug fixes, or improvements. Fix your flaky pytest tests, and you free your team to do the work that actually matters.
