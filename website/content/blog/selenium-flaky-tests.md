---
title: "Why Your Selenium Tests Are Flaky and How to Fix Them (2026 Guide)"
description: "Comprehensive guide to fixing flaky Selenium tests. Learn about implicit vs explicit waits, handling stale element exceptions, dynamic content strategies, page load configurations, and Selenium Grid reliability patterns."
date: 2026-04-07
slug: selenium-flaky-tests
keywords:
  - selenium flaky tests
  - selenium test reliability
  - fix selenium flaky tests
  - selenium wait strategies
  - selenium stale element exception
  - selenium explicit wait
  - selenium implicit wait
  - selenium grid flaky
  - selenium dynamic content
  - selenium page load strategy
author: "Pramod Dutta"
---

# Why Your Selenium Tests Are Flaky and How to Fix Them (2026 Guide)

Selenium remains the most widely used browser automation framework in the world. Despite newer alternatives like Playwright and Cypress, Selenium's language flexibility, mature ecosystem, and broad browser support keep it firmly at the center of most enterprise test automation strategies.

But Selenium has a reputation problem: flaky tests. Ask any test automation engineer about their biggest pain point with Selenium, and "flakiness" will be near the top of the list. The framework's design -- which gives you maximum control but minimal guardrails -- means that writing reliable Selenium tests requires deep understanding of how browsers work, how web applications render, and how to properly synchronize your test code with asynchronous browser operations.

This guide covers the most common causes of flaky Selenium tests and provides battle-tested solutions for each one. Whether you are working with Selenium in Java, Python, C#, or JavaScript, the patterns and principles apply universally.

## The Fundamental Problem: Synchronization

Nearly every flaky Selenium test can be traced back to a synchronization problem. Your test code executes on one machine (or process), while the browser executes on another. These two processes run asynchronously. When your test tells the browser to click a button, the test code does not pause and wait for the browser to finish processing the click, render the resulting changes, and settle into a stable state. It just fires the command and moves on.

This fundamental asynchrony is the root of most Selenium flakiness. Your test asserts something before the browser has finished doing what you asked it to do.

Understanding this principle is critical because it shifts your mindset from "Selenium is buggy" to "I need to properly synchronize my test with the browser." The framework is not buggy -- it just does not make synchronization easy or automatic.

## Cause 1: Implicit Waits vs. Explicit Waits

The single most common source of Selenium flakiness is improper use of waits. Selenium provides two types of waits, and using them incorrectly -- or mixing them -- is a recipe for flaky tests.

### Implicit Waits

Implicit waits tell Selenium to poll the DOM for a specified amount of time when trying to find an element that is not immediately available.

```python
# Setting an implicit wait
driver.implicitly_wait(10)  # seconds

# Now findElement will wait up to 10 seconds before throwing NoSuchElementException
element = driver.find_element(By.ID, "submit-button")
```

**Problems with implicit waits:**

1. **They apply globally.** Once set, implicit waits affect every `find_element` call for the life of the driver session. This makes it hard to have different wait times for different operations.

2. **They only wait for element presence.** Implicit waits check whether the element exists in the DOM. They do not wait for the element to be visible, clickable, or enabled. An element can be present in the DOM but hidden, disabled, or covered by another element.

3. **They interact poorly with explicit waits.** When you combine implicit and explicit waits, the behavior becomes unpredictable. The total wait time may be the sum of both waits, or it may be just one of them, depending on the driver implementation.

4. **They slow down failure detection.** If an element genuinely does not exist (e.g., a test bug or a missing feature), the implicit wait forces Selenium to wait the full timeout before reporting the failure. This makes tests unnecessarily slow when they fail.

### Explicit Waits

Explicit waits tell Selenium to wait for a specific condition to be true before proceeding.

```python
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

# Wait for a specific element to be clickable
wait = WebDriverWait(driver, 10)
button = wait.until(EC.element_to_be_clickable((By.ID, "submit-button")))
button.click()
```

**Explicit waits are superior because:**

1. **They wait for specific conditions.** You can wait for visibility, clickability, text presence, URL changes, or any custom condition.
2. **They are scoped.** Each explicit wait has its own timeout and condition.
3. **They are readable.** The code clearly states what it is waiting for.

### The Golden Rule: Use Explicit Waits, Avoid Implicit Waits

```python
# BAD: Implicit wait + find_element
driver.implicitly_wait(10)
driver.find_element(By.ID, "submit-button").click()

# GOOD: Explicit wait with specific condition
wait = WebDriverWait(driver, 10)
wait.until(EC.element_to_be_clickable((By.ID, "submit-button"))).click()
```

### Common Expected Conditions

Selenium provides a rich set of expected conditions. Use the right one for each situation.

```python
from selenium.webdriver.support import expected_conditions as EC

# Wait for element to be present in DOM (not necessarily visible)
wait.until(EC.presence_of_element_located((By.ID, "my-element")))

# Wait for element to be visible on page
wait.until(EC.visibility_of_element_located((By.ID, "my-element")))

# Wait for element to be clickable (visible + enabled)
wait.until(EC.element_to_be_clickable((By.ID, "my-element")))

# Wait for element to disappear (useful after closing modals)
wait.until(EC.invisibility_of_element_located((By.ID, "loading-spinner")))

# Wait for specific text to appear in element
wait.until(EC.text_to_be_present_in_element((By.ID, "status"), "Complete"))

# Wait for URL to contain a specific string
wait.until(EC.url_contains("/dashboard"))

# Wait for title to contain a specific string
wait.until(EC.title_contains("Dashboard"))

# Wait for an alert to be present
wait.until(EC.alert_is_present())

# Wait for a frame to be available and switch to it
wait.until(EC.frame_to_be_available_and_switch_to_it("my-iframe"))

# Wait for number of windows to be a specific count
wait.until(EC.number_of_windows_to_be(2))
```

### Custom Expected Conditions

When the built-in conditions are not sufficient, create custom ones.

```python
class element_has_attribute:
    """Wait for an element to have a specific attribute value."""
    def __init__(self, locator, attribute, value):
        self.locator = locator
        self.attribute = attribute
        self.value = value

    def __call__(self, driver):
        element = driver.find_element(*self.locator)
        if element.get_attribute(self.attribute) == self.value:
            return element
        return False

# Usage
wait.until(element_has_attribute(
    (By.ID, "submit-button"), "data-state", "ready"
))
```

### Java Equivalent

```java
WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));

// Wait for element to be clickable
WebElement button = wait.until(
    ExpectedConditions.elementToBeClickable(By.id("submit-button"))
);
button.click();

// Wait for text
wait.until(
    ExpectedConditions.textToBePresentInElementLocated(
        By.id("status"), "Complete"
    )
);
```

## Cause 2: StaleElementReferenceException

The `StaleElementReferenceException` is one of the most confusing and frustrating exceptions in Selenium. It occurs when you hold a reference to a DOM element that has been removed from the page or re-rendered.

### Why It Happens

Modern web applications constantly re-render parts of the DOM. When a React component re-renders, the old DOM elements are replaced with new ones. Your Selenium element reference still points to the old element, which no longer exists.

```python
# FLAKY: The element reference may become stale between find and click
items = driver.find_elements(By.CLASS_NAME, "product-item")
for item in items:
    # If the page re-renders between iterations, this throws StaleElementReferenceException
    item.click()
    driver.back()
    # After navigating back, ALL previous element references are stale
```

### Fix 1: Re-Find Elements Before Interacting

```python
# STABLE: Re-find the element each time
product_count = len(driver.find_elements(By.CLASS_NAME, "product-item"))
for i in range(product_count):
    # Re-find the element on each iteration
    items = driver.find_elements(By.CLASS_NAME, "product-item")
    items[i].click()
    # Do something on the product page
    driver.back()
    # Wait for the list page to reload
    wait.until(EC.presence_of_all_elements_located((By.CLASS_NAME, "product-item")))
```

### Fix 2: Use a Retry Wrapper

```python
from selenium.common.exceptions import StaleElementReferenceException

def retry_on_stale(func, max_retries=3):
    """Retry a function if it raises StaleElementReferenceException."""
    for attempt in range(max_retries):
        try:
            return func()
        except StaleElementReferenceException:
            if attempt == max_retries - 1:
                raise
            time.sleep(0.5)

# Usage
def click_submit():
    driver.find_element(By.ID, "submit-button").click()

retry_on_stale(click_submit)
```

### Fix 3: Wait for DOM Stability

Before interacting with elements on a dynamic page, wait for the DOM to stabilize.

```python
def wait_for_dom_stability(driver, timeout=5, check_interval=0.5):
    """Wait until the DOM stops changing."""
    previous_source = ""
    stable_count = 0
    start_time = time.time()

    while time.time() - start_time < timeout:
        current_source = driver.page_source
        if current_source == previous_source:
            stable_count += 1
            if stable_count >= 3:  # DOM unchanged for 3 consecutive checks
                return
        else:
            stable_count = 0
        previous_source = current_source
        time.sleep(check_interval)

    raise TimeoutError("DOM did not stabilize within timeout")
```

## Cause 3: Dynamic Content and AJAX

Modern web applications load content dynamically through AJAX calls. Tests that do not account for asynchronous content loading are guaranteed to be flaky.

### Problem: Asserting Before AJAX Completes

```python
# FLAKY: The search results load asynchronously
driver.find_element(By.ID, "search-input").send_keys("selenium")
driver.find_element(By.ID, "search-button").click()
# Results haven't loaded yet!
results = driver.find_elements(By.CLASS_NAME, "search-result")
assert len(results) > 0
```

### Fix: Wait for AJAX to Complete

**Option 1: Wait for specific elements**

```python
# STABLE: Wait for results to appear
driver.find_element(By.ID, "search-input").send_keys("selenium")
driver.find_element(By.ID, "search-button").click()

# Wait for at least one result to appear
wait.until(EC.presence_of_element_located((By.CLASS_NAME, "search-result")))
results = driver.find_elements(By.CLASS_NAME, "search-result")
assert len(results) > 0
```

**Option 2: Wait for loading indicator to disappear**

```python
# STABLE: Wait for loading spinner to disappear
driver.find_element(By.ID, "search-button").click()
wait.until(EC.invisibility_of_element_located((By.ID, "loading-spinner")))
results = driver.find_elements(By.CLASS_NAME, "search-result")
```

**Option 3: Wait for jQuery AJAX to complete (for jQuery-based apps)**

```python
def wait_for_ajax(driver, timeout=10):
    """Wait for all jQuery AJAX requests to complete."""
    wait = WebDriverWait(driver, timeout)
    wait.until(lambda d: d.execute_script("return jQuery.active == 0"))

driver.find_element(By.ID, "search-button").click()
wait_for_ajax(driver)
```

**Option 4: Wait for a specific network request (using JavaScript)**

```python
def wait_for_network_idle(driver, timeout=10):
    """Wait for all pending network requests to complete."""
    driver.execute_script("""
        window.__networkIdlePromise = new Promise(resolve => {
            let pending = 0;
            const originalFetch = window.fetch;
            window.fetch = function(...args) {
                pending++;
                return originalFetch.apply(this, args).finally(() => {
                    pending--;
                    if (pending === 0) resolve();
                });
            };
            if (pending === 0) resolve();
        });
    """)

    WebDriverWait(driver, timeout).until(
        lambda d: d.execute_script("return window.__networkIdlePromise !== undefined")
    )
```

## Cause 4: Page Load Strategy

Selenium's page load strategy determines when `driver.get()` and `driver.navigate()` consider the page to be loaded. The wrong strategy can cause tests to start interacting with the page before it is ready.

### The Three Strategies

```python
from selenium.webdriver.chrome.options import Options

options = Options()

# NORMAL (default): Waits for the 'load' event
# All resources (images, stylesheets, etc.) are fully loaded
options.page_load_strategy = 'normal'

# EAGER: Waits for the 'DOMContentLoaded' event
# HTML is parsed and DOM is ready, but resources may still be loading
options.page_load_strategy = 'eager'

# NONE: Does not wait at all
# Returns immediately after the navigation is initiated
options.page_load_strategy = 'none'
```

### Which Strategy to Use

For most test suites, `normal` (the default) is the safest choice. It ensures all resources are loaded before your test starts interacting with the page.

Use `eager` when you are testing a single-page application that does not need all resources to be loaded before the test can interact with it. This speeds up tests but requires more explicit waits.

Use `none` only when you have full control over your waits and need maximum speed. This is an advanced option that can cause significant flakiness if not handled carefully.

### SPA Page Load Pattern

For single-page applications, traditional page load strategies are less relevant because navigation happens within the same page. Use content-based waits instead.

```python
def navigate_to_route(driver, route, expected_heading):
    """Navigate to a SPA route and wait for content to load."""
    driver.get(f"http://localhost:3000{route}")
    wait = WebDriverWait(driver, 10)
    wait.until(EC.visibility_of_element_located(
        (By.XPATH, f"//h1[contains(text(), '{expected_heading}')]")
    ))

# Usage
navigate_to_route(driver, "/settings", "Account Settings")
```

## Cause 5: Element Interaction Failures

Even when an element is found, interacting with it can fail for several reasons.

### Element Not Clickable (Intercepted)

```
ElementClickInterceptedException: element click intercepted:
Element <button id="submit"> is not clickable at point (x, y).
Other element would receive the click: <div class="overlay">
```

This happens when another element (often a modal overlay, cookie banner, or loading spinner) is covering the target element.

**Fix: Wait for the covering element to disappear**

```python
# Wait for overlay to disappear before clicking
wait.until(EC.invisibility_of_element_located((By.CLASS_NAME, "overlay")))
wait.until(EC.element_to_be_clickable((By.ID, "submit"))).click()
```

**Fix: Scroll the element into view**

```python
element = driver.find_element(By.ID, "submit")
driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", element)
time.sleep(0.3)  # Brief pause for scroll animation
element.click()
```

**Fix: Use JavaScript click as a last resort**

```python
# JavaScript click bypasses overlay checks -- use sparingly
element = driver.find_element(By.ID, "submit")
driver.execute_script("arguments[0].click();", element)
```

Note: JavaScript click should be a last resort because it bypasses Selenium's built-in checks. If you need JavaScript click frequently, it usually indicates a deeper issue with your test or application.

### Element Not Interactable

```
ElementNotInteractableException: element not interactable
```

This occurs when an element is present and visible but cannot receive input -- typically because it is disabled, has zero dimensions, or is hidden by CSS.

```python
# Wait for element to be enabled
wait.until(lambda d: d.find_element(By.ID, "email-input").is_enabled())
driver.find_element(By.ID, "email-input").send_keys("test@example.com")

# Or clear and send keys with explicit waits
element = wait.until(EC.element_to_be_clickable((By.ID, "email-input")))
element.clear()
element.send_keys("test@example.com")
```

## Cause 6: Frame and Window Handling

Switching between frames and windows is a frequent source of flakiness because the target frame or window may not be ready when you try to switch to it.

### Frame Handling

```python
# FLAKY: Frame might not be loaded yet
driver.switch_to.frame("payment-iframe")

# STABLE: Wait for frame to be available
wait.until(EC.frame_to_be_available_and_switch_to_it("payment-iframe"))

# After interacting with the frame, switch back
driver.switch_to.default_content()
```

### Window Handling

```python
# FLAKY: New window might not have opened yet
driver.find_element(By.LINK_TEXT, "Open in new window").click()
driver.switch_to.window(driver.window_handles[-1])

# STABLE: Wait for the new window to appear
original_window = driver.current_window_handle
driver.find_element(By.LINK_TEXT, "Open in new window").click()
wait.until(EC.number_of_windows_to_be(2))

# Switch to the new window
for handle in driver.window_handles:
    if handle != original_window:
        driver.switch_to.window(handle)
        break

# Wait for content in the new window
wait.until(EC.title_contains("New Window Title"))
```

## Cause 7: Selenium Grid Reliability

When running tests on Selenium Grid (or cloud-based grid services like BrowserStack, Sauce Labs, or LambdaTest), additional failure modes appear.

### Common Grid Issues

1. **Session creation timeout**: The grid may not have an available node, causing session creation to fail.
2. **Network latency**: Commands sent over the network have higher latency, increasing the chance of timeouts.
3. **Node instability**: Grid nodes may run out of memory or crash under load.
4. **Browser version mismatches**: The requested browser version may not be available on the grid.

### Grid-Specific Fixes

```python
from selenium import webdriver
from selenium.webdriver.remote.remote_connection import RemoteConnection

# Increase command timeout for grid communication
RemoteConnection.set_timeout(120)

# Use capabilities to request specific browser configurations
options = webdriver.ChromeOptions()
options.set_capability("se:noVnc", True)  # Enable VNC for debugging
options.set_capability("se:screenResolution", "1920x1080")

driver = webdriver.Remote(
    command_executor="http://grid-hub:4444/wd/hub",
    options=options
)

# Increase implicit and explicit wait timeouts for grid latency
driver.set_page_load_timeout(60)
```

### Retry Pattern for Grid Failures

```python
def create_grid_driver(grid_url, options, max_retries=3):
    """Create a WebDriver session with retries for grid reliability."""
    for attempt in range(max_retries):
        try:
            driver = webdriver.Remote(
                command_executor=grid_url,
                options=options
            )
            return driver
        except Exception as e:
            if attempt == max_retries - 1:
                raise
            print(f"Grid session creation failed (attempt {attempt + 1}): {e}")
            time.sleep(5 * (attempt + 1))  # Exponential backoff
```

## Building a Reliable Selenium Test Framework

Here is a complete base framework that incorporates all the reliability patterns discussed above.

### Base Test Class (Python)

```python
import unittest
import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import (
    StaleElementReferenceException,
    ElementClickInterceptedException,
    TimeoutException
)


class ReliableTestBase(unittest.TestCase):
    """Base test class with built-in reliability patterns."""

    TIMEOUT = 10
    POLL_FREQUENCY = 0.5

    @classmethod
    def setUpClass(cls):
        options = Options()
        options.add_argument("--window-size=1920,1080")
        options.add_argument("--disable-animations")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")

        if os.environ.get("CI"):
            options.add_argument("--headless=new")

        cls.driver = webdriver.Chrome(options=options)
        cls.driver.set_page_load_timeout(30)
        cls.wait = WebDriverWait(
            cls.driver,
            cls.TIMEOUT,
            poll_frequency=cls.POLL_FREQUENCY,
            ignored_exceptions=[StaleElementReferenceException]
        )

    @classmethod
    def tearDownClass(cls):
        if cls.driver:
            cls.driver.quit()

    def setUp(self):
        """Clear cookies and local storage between tests."""
        self.driver.delete_all_cookies()
        try:
            self.driver.execute_script("window.localStorage.clear();")
            self.driver.execute_script("window.sessionStorage.clear();")
        except Exception:
            pass  # May fail if no page is loaded yet

    def safe_click(self, locator, timeout=None):
        """Click an element with retry logic for common failures."""
        timeout = timeout or self.TIMEOUT
        wait = WebDriverWait(self.driver, timeout)

        for attempt in range(3):
            try:
                element = wait.until(EC.element_to_be_clickable(locator))
                element.click()
                return
            except ElementClickInterceptedException:
                # Scroll element into view and try again
                element = self.driver.find_element(*locator)
                self.driver.execute_script(
                    "arguments[0].scrollIntoView({block: 'center'});",
                    element
                )
                time.sleep(0.5)
            except StaleElementReferenceException:
                if attempt == 2:
                    raise
                time.sleep(0.5)

    def safe_type(self, locator, text, clear_first=True, timeout=None):
        """Type into an input with retry logic."""
        timeout = timeout or self.TIMEOUT
        wait = WebDriverWait(self.driver, timeout)

        element = wait.until(EC.element_to_be_clickable(locator))
        if clear_first:
            element.clear()
        element.send_keys(text)

    def wait_for_text(self, locator, text, timeout=None):
        """Wait for specific text to appear in an element."""
        timeout = timeout or self.TIMEOUT
        wait = WebDriverWait(self.driver, timeout)
        wait.until(EC.text_to_be_present_in_element(locator, text))

    def wait_for_url(self, url_fragment, timeout=None):
        """Wait for the URL to contain a specific string."""
        timeout = timeout or self.TIMEOUT
        wait = WebDriverWait(self.driver, timeout)
        wait.until(EC.url_contains(url_fragment))
```

### Base Test Class (Java)

```java
import org.openqa.selenium.*;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.support.ui.*;
import org.junit.jupiter.api.*;

import java.time.Duration;

public abstract class ReliableTestBase {

    protected static WebDriver driver;
    protected static WebDriverWait wait;
    private static final int TIMEOUT_SECONDS = 10;

    @BeforeAll
    static void setUpDriver() {
        ChromeOptions options = new ChromeOptions();
        options.addArguments("--window-size=1920,1080");
        options.addArguments("--disable-animations");

        if (System.getenv("CI") != null) {
            options.addArguments("--headless=new");
            options.addArguments("--no-sandbox");
            options.addArguments("--disable-dev-shm-usage");
        }

        driver = new ChromeDriver(options);
        driver.manage().timeouts().pageLoadTimeout(Duration.ofSeconds(30));

        wait = new WebDriverWait(driver, Duration.ofSeconds(TIMEOUT_SECONDS));
        wait.ignoring(StaleElementReferenceException.class);
        wait.pollingEvery(Duration.ofMillis(500));
    }

    @AfterAll
    static void tearDownDriver() {
        if (driver != null) {
            driver.quit();
        }
    }

    @BeforeEach
    void clearState() {
        driver.manage().deleteAllCookies();
    }

    protected void safeClick(By locator) {
        for (int attempt = 0; attempt < 3; attempt++) {
            try {
                WebElement element = wait.until(
                    ExpectedConditions.elementToBeClickable(locator)
                );
                element.click();
                return;
            } catch (ElementClickInterceptedException e) {
                WebElement element = driver.findElement(locator);
                ((JavascriptExecutor) driver).executeScript(
                    "arguments[0].scrollIntoView({block: 'center'});", element
                );
                try { Thread.sleep(500); } catch (InterruptedException ie) {}
            } catch (StaleElementReferenceException e) {
                if (attempt == 2) throw e;
                try { Thread.sleep(500); } catch (InterruptedException ie) {}
            }
        }
    }
}
```

## Tracking Selenium Test Reliability

Once you have applied these fixes, you need to measure whether your test suite is actually becoming more reliable. This requires tracking test results over time and computing flakiness metrics.

### JUnit XML Output

Configure your test framework to produce JUnit XML reports, which most CI systems and analysis tools can consume.

**pytest:**
```bash
pytest --junitxml=selenium-results.xml
```

**JUnit 5 (Maven):**
```xml
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-surefire-plugin</artifactId>
    <configuration>
        <reportFormat>xml</reportFormat>
    </configuration>
</plugin>
```

**TestNG:**
```xml
<listeners>
    <listener class-name="org.testng.reporters.JUnitXMLReporter"/>
</listeners>
```

### Using DeFlaky for Selenium Test Analysis

DeFlaky can analyze your Selenium test results to identify flaky tests and track reliability trends.

```bash
# Analyze Selenium test results
deflaky analyze --input selenium-results.xml --format junit

# Compare flakiness before and after applying fixes
deflaky compare \
  --baseline results-before-fix.xml \
  --current results-after-fix.xml
```

The DeFlaky dashboard provides a per-test view of reliability over time, making it easy to see whether your fixes are holding and to identify new sources of flakiness as they emerge.

## Migration Considerations: Selenium to Playwright

For teams considering whether to migrate from Selenium to Playwright to reduce flakiness, here is a honest assessment.

### What Playwright Does Better

- **Auto-waiting**: Playwright waits for elements to be actionable by default. This eliminates the need for most explicit waits.
- **Browser contexts**: Lightweight isolation without creating new browser instances. Faster and more reliable test isolation.
- **Network interception**: Built-in request mocking and interception. No need for external proxy tools.
- **Tracing**: Built-in trace capture for debugging failures.

### What Selenium Still Does Better

- **Language support**: Selenium supports more languages (Java, Python, C#, Ruby, JavaScript, Kotlin). Playwright supports JavaScript/TypeScript, Python, Java, and C#.
- **Ecosystem maturity**: Selenium has 20 years of community-built tools, frameworks, and integrations.
- **Browser support**: Selenium supports more browsers and browser versions through WebDriver protocol.
- **Enterprise adoption**: Most large enterprises have invested heavily in Selenium. Migration cost is significant.

### The Pragmatic Approach

You do not have to migrate your entire suite. Consider using Playwright for new tests while maintaining existing Selenium tests with improved reliability patterns. Tools like DeFlaky can track flakiness across both frameworks, giving you data to inform your migration decisions.

## A Selenium Reliability Checklist

Use this checklist when writing or reviewing Selenium tests.

### Waits
- [ ] No `time.sleep()` or `Thread.sleep()` calls (use explicit waits instead)
- [ ] No implicit waits set (use explicit waits exclusively)
- [ ] Explicit waits use appropriate expected conditions (not just `presence_of_element_located`)
- [ ] Custom expected conditions for application-specific states
- [ ] Timeouts are appropriate (not too short, not excessively long)

### Element Interaction
- [ ] Re-find elements after any page navigation or re-render
- [ ] Handle StaleElementReferenceException with retries
- [ ] Scroll elements into view before clicking
- [ ] Wait for covering elements (modals, spinners) to disappear
- [ ] Use explicit waits before form input

### Test Isolation
- [ ] Each test creates its own test data
- [ ] Cookies and local storage cleared between tests
- [ ] No shared mutable state between tests
- [ ] Tests pass when run in any order

### Environment
- [ ] Consistent browser window size set explicitly
- [ ] Headless mode for CI with appropriate flags
- [ ] Page load timeout configured
- [ ] No dependency on local timezone or locale

### CI/CD
- [ ] JUnit XML reports generated for result tracking
- [ ] Screenshots captured on failure
- [ ] Browser logs captured on failure
- [ ] Retry mechanism for infrastructure-related failures

## Conclusion

Selenium test flakiness is not a fundamental limitation of the framework -- it is a consequence of the framework's design philosophy of giving developers full control without guardrails. By understanding the root causes of flakiness and applying the patterns described in this guide, you can build a Selenium test suite that is reliable, maintainable, and trustworthy.

The key principles are straightforward: use explicit waits with appropriate conditions, handle stale element references, isolate test state, and account for asynchronous content loading. Apply these consistently, measure your reliability with tools like DeFlaky, and your Selenium tests will become an asset rather than a liability.

Reliable tests are not about using the "right" framework. They are about understanding how browsers work and synchronizing your test code accordingly. Master that, and your tests will be reliable regardless of which framework you choose.
