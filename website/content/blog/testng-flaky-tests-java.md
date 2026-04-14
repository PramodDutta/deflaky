---
title: "Fixing Flaky TestNG Tests in Java: Thread Safety, Dependencies, and Retry"
description: "A comprehensive guide to diagnosing and fixing flaky TestNG tests in Java. Covers test dependency ordering, thread safety with parallel execution, DataProvider issues, retry analyzers, and TestNG-specific configurations that eliminate test instability."
date: "2026-04-13"
slug: "testng-flaky-tests-java"
keywords:
  - testng flaky tests
  - java test flaky
  - testng parallel tests
  - testng retry
  - java testing flaky
  - testng test dependencies
  - testng dataprovider issues
  - testng thread safety
  - java test reliability
  - testng configuration
author: "Pramod Dutta"
---

# Fixing Flaky TestNG Tests in Java: Thread Safety, Dependencies, and Retry

TestNG is one of the most popular testing frameworks in the Java ecosystem, widely adopted for both unit and integration testing. Its powerful features like parallel execution, data-driven testing, and flexible configuration make it a favorite among enterprise teams. But those same features, when misunderstood or misconfigured, are the leading source of testng flaky tests.

If you have ever stared at a green local build that turns red in CI for no apparent reason, you are not alone. Flaky TestNG tests erode developer trust, slow down releases, and silently drain engineering hours. This guide walks through the most common causes of testng flaky tests, explains the mechanics behind each, and gives you battle-tested fixes.

## Why TestNG Tests Become Flaky

Flakiness in TestNG rarely comes from the framework itself. Instead, it emerges from the interaction between your test code, the system under test, and the execution environment. The most common root causes fall into five categories:

1. **Test dependency ordering** -- tests that rely on running in a specific sequence
2. **Thread safety violations** -- shared mutable state in parallel execution
3. **DataProvider timing and state issues** -- data generation with side effects
4. **External resource contention** -- databases, files, network services
5. **Configuration lifecycle misunderstandings** -- misuse of @BeforeSuite, @BeforeClass, and @BeforeMethod

Understanding which category your flaky test falls into is the first step to fixing it.

## Test Dependency Ordering Problems

TestNG supports explicit test dependencies via the `dependsOnMethods` and `dependsOnGroups` attributes. While this can be useful, implicit dependencies are where the trouble starts.

### The Hidden Ordering Trap

Consider this common pattern:

```java
public class UserServiceTest {
    private static User createdUser;

    @Test
    public void testCreateUser() {
        createdUser = userService.create("john@example.com");
        assertNotNull(createdUser.getId());
    }

    @Test
    public void testGetUser() {
        // Assumes testCreateUser ran first
        User fetched = userService.getById(createdUser.getId());
        assertEquals("john@example.com", fetched.getEmail());
    }

    @Test
    public void testDeleteUser() {
        // Assumes testCreateUser ran first AND testGetUser hasn't deleted it
        userService.delete(createdUser.getId());
        assertNull(userService.getById(createdUser.getId()));
    }
}
```

This works when TestNG happens to run methods in declaration order, but TestNG does not guarantee method execution order by default. When the suite configuration changes, or when you add more tests, the ordering can shift and tests start failing.

### The Fix: Explicit Dependencies or Independent Tests

Option 1 -- declare dependencies explicitly:

```java
@Test
public void testCreateUser() {
    createdUser = userService.create("john@example.com");
    assertNotNull(createdUser.getId());
}

@Test(dependsOnMethods = "testCreateUser")
public void testGetUser() {
    User fetched = userService.getById(createdUser.getId());
    assertEquals("john@example.com", fetched.getEmail());
}

@Test(dependsOnMethods = "testCreateUser")
public void testDeleteUser() {
    userService.delete(createdUser.getId());
    assertNull(userService.getById(createdUser.getId()));
}
```

Option 2 (preferred) -- make each test fully independent:

```java
@Test
public void testGetUser() {
    User created = userService.create("john@example.com");
    User fetched = userService.getById(created.getId());
    assertEquals("john@example.com", fetched.getEmail());
    userService.delete(created.getId()); // cleanup
}
```

Independent tests are always more reliable. Reserve `dependsOnMethods` for cases where setup is genuinely expensive and well understood.

## Thread Safety with Parallel Execution

Parallel execution is one of TestNG's killer features, but it is also the number one cause of testng flaky tests in large suites. When you enable parallelism in your `testng.xml`, every piece of shared state becomes a potential race condition.

### Common Parallel Execution Configurations

```xml
<suite name="MySuite" parallel="methods" thread-count="5">
    <test name="AllTests">
        <classes>
            <class name="com.example.UserServiceTest"/>
            <class name="com.example.OrderServiceTest"/>
        </classes>
    </test>
</suite>
```

The `parallel` attribute accepts `methods`, `classes`, `tests`, and `instances`. Each has different implications for shared state.

### Shared State Anti-Patterns

The most dangerous pattern is static mutable state:

```java
public class PaymentTest {
    // DANGEROUS: shared across all threads
    private static PaymentGateway gateway = new PaymentGateway();
    private static int transactionCount = 0;

    @Test
    public void testPayment() {
        gateway.process(new Payment(100));
        transactionCount++; // Race condition!
        assertTrue(transactionCount > 0);
    }
}
```

Even instance fields are unsafe when `parallel="methods"` because multiple test methods on the same class instance run concurrently.

### Making Tests Thread-Safe

Use `ThreadLocal` for per-thread state, or restructure to eliminate sharing:

```java
public class PaymentTest {
    private static final ThreadLocal<PaymentGateway> gateway =
        ThreadLocal.withInitial(PaymentGateway::new);

    @Test
    public void testPayment() {
        PaymentGateway gw = gateway.get();
        PaymentResult result = gw.process(new Payment(100));
        assertNotNull(result.getTransactionId());
    }

    @AfterMethod
    public void cleanup() {
        gateway.remove(); // Prevent memory leaks
    }
}
```

For WebDriver-based tests, use `ThreadLocal<WebDriver>` to ensure each thread has its own browser instance:

```java
public class BaseSeleniumTest {
    protected static ThreadLocal<WebDriver> driver = new ThreadLocal<>();

    @BeforeMethod
    public void setUp() {
        driver.set(new ChromeDriver());
    }

    @AfterMethod
    public void tearDown() {
        if (driver.get() != null) {
            driver.get().quit();
            driver.remove();
        }
    }
}
```

## DataProvider Issues

TestNG's `@DataProvider` is a powerful mechanism for data-driven testing, but it introduces its own class of flakiness when not used carefully.

### Lazy DataProviders with Side Effects

```java
@DataProvider(name = "userEmails")
public Object[][] userData() {
    // BAD: Fetching from a live database that might change
    List<User> users = userRepository.findAll();
    return users.stream()
        .map(u -> new Object[]{u.getEmail()})
        .toArray(Object[][]::new);
}
```

If the database state changes between runs, your test data changes too. This leads to tests that pass one minute and fail the next.

### Parallel DataProvider Pitfalls

When you set `parallel = true` on a DataProvider, TestNG runs the test method concurrently for each row of data:

```java
@DataProvider(name = "amounts", parallel = true)
public Object[][] paymentAmounts() {
    return new Object[][]{{10}, {20}, {50}, {100}, {200}};
}

@Test(dataProvider = "amounts")
public void testPaymentProcessing(int amount) {
    // If this modifies shared state, you'll have flakiness
    PaymentResult result = sharedProcessor.process(amount);
    assertEquals("SUCCESS", result.getStatus());
}
```

The fix is the same as with parallel methods: eliminate shared mutable state or protect it with proper synchronization.

### Deterministic DataProviders

Always make DataProviders return static, deterministic data:

```java
@DataProvider(name = "validEmails")
public Object[][] validEmailData() {
    return new Object[][]{
        {"user@example.com", true},
        {"admin@company.org", true},
        {"test.user+tag@domain.co.uk", true},
        {"invalid-email", false},
        {"@nodomain.com", false}
    };
}
```

## Retry Analyzers: A Double-Edged Sword

TestNG provides the `IRetryAnalyzer` interface for automatically retrying failed tests. Many teams use this to mask testng flaky tests instead of fixing them.

### Implementing a Retry Analyzer

```java
public class RetryAnalyzer implements IRetryAnalyzer {
    private int retryCount = 0;
    private static final int MAX_RETRY = 2;

    @Override
    public boolean retry(ITestResult result) {
        if (retryCount < MAX_RETRY) {
            retryCount++;
            System.out.println("Retrying " + result.getName()
                + " | Attempt " + (retryCount + 1));
            return true;
        }
        return false;
    }
}

@Test(retryAnalyzer = RetryAnalyzer.class)
public void testFlakeyOperation() {
    // This test gets up to 3 attempts
    boolean result = externalService.call();
    assertTrue(result);
}
```

### Applying Retry Globally

Instead of annotating every test, use a listener:

```java
public class RetryTransformer implements IAnnotationTransformer {
    @Override
    public void transform(ITestAnnotation annotation,
                          Class testClass,
                          Constructor testConstructor,
                          Method testMethod) {
        annotation.setRetryAnalyzer(RetryAnalyzer.class);
    }
}
```

Add it to your `testng.xml`:

```xml
<suite name="MySuite">
    <listeners>
        <listener class-name="com.example.RetryTransformer"/>
    </listeners>
</suite>
```

### Why Retry Is Not a Fix

Retries mask the problem. A test that needs retries is a test that has a bug -- either in the test itself or in the system under test. Use retries as a temporary measure while you investigate, but track which tests are being retried and prioritize fixing them.

A better approach: log every retry, aggregate the data, and create a dashboard of your most-retried tests. Those are your highest-priority targets for flakiness fixes.

## TestNG Configuration Lifecycle Misunderstandings

TestNG has a rich lifecycle with annotations like `@BeforeSuite`, `@BeforeTest`, `@BeforeClass`, `@BeforeMethod`, and their `@After` counterparts. Misunderstanding when each runs causes subtle flakiness.

### Lifecycle Execution Order

```
@BeforeSuite    -- once per suite
  @BeforeTest   -- once per <test> tag in testng.xml
    @BeforeClass  -- once per test class
      @BeforeMethod -- before every @Test method
        @Test
      @AfterMethod  -- after every @Test method
    @AfterClass
  @AfterTest
@AfterSuite
```

### Common Mistake: Wrong Scope for Setup

```java
public class DatabaseTest {
    private Connection connection;

    @BeforeClass
    public void setUp() {
        connection = DriverManager.getConnection(DB_URL);
        // Insert test data
        connection.createStatement().execute(
            "INSERT INTO users VALUES (1, 'test@example.com')"
        );
    }

    @Test
    public void testFindUser() {
        // Works fine
        User user = userDao.findById(1);
        assertNotNull(user);
    }

    @Test
    public void testDeleteUser() {
        userDao.delete(1);
        assertNull(userDao.findById(1));
        // But now testFindUser fails if it runs after this!
    }

    @AfterClass
    public void tearDown() {
        connection.close();
    }
}
```

The fix: use `@BeforeMethod` to reset state before each test:

```java
@BeforeMethod
public void setUp() {
    connection.createStatement().execute("DELETE FROM users");
    connection.createStatement().execute(
        "INSERT INTO users VALUES (1, 'test@example.com')"
    );
}
```

## Handling External Dependencies

Many java test flaky scenarios involve external services -- databases, APIs, message queues. These introduce network latency, timeouts, and state that is outside your test's control.

### Use Containers for Isolation

Testcontainers eliminates environment inconsistency:

```java
@Testcontainers
public class UserRepositoryTest {
    @Container
    static PostgreSQLContainer<?> postgres =
        new PostgreSQLContainer<>("postgres:15")
            .withDatabaseName("testdb")
            .withUsername("test")
            .withPassword("test");

    @BeforeClass
    public void setUp() {
        // Configure your app to use the container's JDBC URL
        System.setProperty("db.url", postgres.getJdbcUrl());
    }

    @Test
    public void testUserCreation() {
        UserRepository repo = new UserRepository();
        User created = repo.create("test@example.com");
        assertNotNull(created.getId());
    }
}
```

### Timeout Configuration

Set explicit timeouts to prevent tests from hanging:

```java
@Test(timeOut = 5000) // Fail after 5 seconds
public void testApiCall() {
    Response response = apiClient.get("/users");
    assertEquals(200, response.getStatusCode());
}
```

For suite-level timeout configuration:

```xml
<suite name="MySuite" time-out="30000">
    <!-- All tests fail after 30 seconds -->
</suite>
```

## TestNG-Specific Configuration Tips

### Preserve Order When Needed

```xml
<test name="OrderedTests" preserve-order="true">
    <classes>
        <class name="com.example.SetupTest"/>
        <class name="com.example.MainTest"/>
        <class name="com.example.CleanupTest"/>
    </classes>
</test>
```

### Group-Based Execution for Isolation

```java
@Test(groups = {"smoke"})
public void testLogin() { /* ... */ }

@Test(groups = {"regression"})
public void testComplexWorkflow() { /* ... */ }
```

```xml
<suite name="MySuite">
    <test name="SmokeTests">
        <groups>
            <run>
                <include name="smoke"/>
            </run>
        </groups>
    </test>
</suite>
```

### Factory Pattern for Parameterized Instances

When you need multiple test instances with different configurations, use `@Factory` instead of hacking around with static state:

```java
public class ConfigurableTest {
    private final String environment;

    public ConfigurableTest(String environment) {
        this.environment = environment;
    }

    @Test
    public void testEndpoint() {
        String baseUrl = getBaseUrl(environment);
        Response response = HttpClient.get(baseUrl + "/health");
        assertEquals(200, response.getStatusCode());
    }

    @Factory
    public static Object[] createInstances() {
        return new Object[]{
            new ConfigurableTest("dev"),
            new ConfigurableTest("staging")
        };
    }
}
```

## A Systematic Approach to Fixing Flaky TestNG Tests

Rather than fixing testng flaky tests one at a time, take a systematic approach:

### Step 1: Identify the Flaky Tests

Run your suite multiple times and track which tests fail intermittently. Use the TestNG reporter or a tool like DeFlaky to automatically detect flaky tests:

```bash
npx deflaky run --framework testng --path ./src/test
```

### Step 2: Categorize Each Flaky Test

For each flaky test, determine whether the root cause is:

- **Ordering** -- fails only when run after/before specific tests
- **Concurrency** -- fails only with parallel execution enabled
- **Environment** -- fails only in CI or on specific machines
- **Timing** -- fails intermittently regardless of ordering
- **Data** -- fails when test data changes

### Step 3: Apply the Appropriate Fix

| Root Cause | Fix |
|---|---|
| Ordering dependency | Make tests independent or use explicit `dependsOnMethods` |
| Shared mutable state | Use `ThreadLocal` or eliminate sharing |
| Database state leakage | Use `@BeforeMethod` for setup/teardown |
| External service instability | Use containers, mocks, or WireMock |
| Race conditions | Add proper synchronization or eliminate parallelism for affected tests |

### Step 4: Prevent Regression

Add flakiness detection to your CI pipeline. Run your test suite multiple times in CI on a schedule and alert when flake rates increase.

## Conclusion

Testng flaky tests are not inevitable. Every flaky test has a deterministic root cause, and most fall into well-known categories: dependency ordering, thread safety, DataProvider misuse, configuration lifecycle errors, or external resource contention.

The key is to approach flakiness systematically rather than treating each failure as a one-off. Identify your most frequently failing tests, categorize the root causes, and apply the targeted fixes described in this guide.

Stop accepting retry analyzers as a permanent solution. Start building a test suite you can trust.

**Ready to identify every flaky test in your TestNG suite automatically?** DeFlaky analyzes your test runs, detects flaky patterns, and prioritizes which tests to fix first. Try it now:

```bash
npx deflaky run
```
