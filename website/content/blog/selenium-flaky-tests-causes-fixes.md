---
title: "Flaky Tests in Selenium: 7 Common Causes and Production-Ready Fixes"
description: "Diagnose and fix the 7 most common causes of Selenium test flakiness with battle-tested code examples in Java and Python."
date: 2026-04-02
slug: selenium-flaky-tests-causes-fixes
keywords:
  - selenium flaky tests
  - selenium test failures
  - fix selenium tests
  - selenium wait strategies
  - selenium StaleElementReferenceException
  - selenium CI failures
  - selenium WebDriverWait
  - selenium test automation
  - selenium debugging
  - browser automation reliability
author: "DeFlaky Team"
---

# Flaky Tests in Selenium: 7 Common Causes and Production-Ready Fixes

Selenium is the backbone of enterprise test automation, used by millions of teams worldwide. But its flexibility comes at a cost: Selenium does not protect you from yourself. Unlike newer frameworks that auto-wait and auto-retry, Selenium hands you the raw browser API and expects you to manage synchronization, state, and timing on your own.

This article cuts straight to the seven most frequent causes of Selenium flakiness, each with a concrete fix you can apply today. No theory lectures -- just patterns that work in production.

## Cause 1: Using sleep() Instead of Explicit Waits

The most common flaky test pattern across every Selenium codebase on the planet:

```python
# This is the source of 40% of all Selenium flakiness
driver.find_element(By.ID, "search-box").send_keys("laptop")
driver.find_element(By.ID, "search-btn").click()
time.sleep(3)  # "Should be enough time..."
results = driver.find_elements(By.CLASS_NAME, "product-card")
assert len(results) > 0
```

On a fast machine or low-load CI runner, 3 seconds is plenty. On a constrained CI runner during peak hours, the search API takes 4 seconds. The test fails.

### The Fix: Explicit Waits with Expected Conditions

```python
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

driver.find_element(By.ID, "search-box").send_keys("laptop")
driver.find_element(By.ID, "search-btn").click()

# Wait until at least one result appears, up to 15 seconds
wait = WebDriverWait(driver, 15)
wait.until(EC.presence_of_element_located((By.CLASS_NAME, "product-card")))

results = driver.find_elements(By.CLASS_NAME, "product-card")
assert len(results) > 0
```

The explicit wait polls the DOM every 500ms (by default) until the condition is met or the timeout expires. If the results load in 1 second, the test proceeds in 1 second. If they take 12 seconds, the test waits 12 seconds. No wasted time, no premature failures.

**Java equivalent:**

```java
WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(15));
wait.until(ExpectedConditions.presenceOfElementLocated(
    By.className("product-card")
));

List<WebElement> results = driver.findElements(By.className("product-card"));
assertTrue(results.size() > 0);
```

## Cause 2: StaleElementReferenceException After Page Updates

React, Vue, and Angular applications constantly re-render DOM elements. When you store a reference to an element and the framework re-renders, your reference points to a DOM node that no longer exists.

```python
# Step 1: Find the element
add_button = driver.find_element(By.ID, "add-to-cart")

# Step 2: Something causes a re-render (price update, stock check, etc.)
# The DOM node for add-to-cart is replaced with a new one

# Step 3: Click the stale reference -- BOOM
add_button.click()  # StaleElementReferenceException
```

### The Fix: A Resilient Click Helper

```python
from selenium.common.exceptions import StaleElementReferenceException

def resilient_click(driver, locator, timeout=10, max_retries=3):
    """Click an element, retrying if it goes stale."""
    for attempt in range(max_retries):
        try:
            element = WebDriverWait(driver, timeout).until(
                EC.element_to_be_clickable(locator)
            )
            element.click()
            return
        except StaleElementReferenceException:
            if attempt == max_retries - 1:
                raise
            # Element was re-rendered, try again

# Usage
resilient_click(driver, (By.ID, "add-to-cart"))
```

**Java equivalent:**

```java
public void resilientClick(By locator, int maxRetries) {
    for (int i = 0; i < maxRetries; i++) {
        try {
            WebElement element = wait.until(
                ExpectedConditions.elementToBeClickable(locator)
            );
            element.click();
            return;
        } catch (StaleElementReferenceException e) {
            if (i == maxRetries - 1) throw e;
        }
    }
}
```

**Rule of thumb:** Never store element references across actions that could trigger a re-render. Re-find the element immediately before interacting with it.

## Cause 3: ElementClickInterceptedException

Your test tries to click a button but another element -- a cookie banner, loading overlay, or tooltip -- is covering it.

```
selenium.common.exceptions.ElementClickInterceptedException:
Message: element click intercepted: Element <button id="checkout">
is not clickable at point (340, 560).
Other element would receive the click: <div class="cookie-banner">
```

### The Fix: Clear Obstructions Before Clicking

```python
def click_unobstructed(driver, locator, timeout=10):
    """Wait for obstructions to clear, then click."""
    wait = WebDriverWait(driver, timeout)

    # Wait for common obstructions to disappear
    obstructions = [
        (By.CLASS_NAME, "cookie-banner"),
        (By.CLASS_NAME, "loading-overlay"),
        (By.ID, "modal-backdrop"),
    ]

    for obstruction in obstructions:
        try:
            wait.until(EC.invisibility_of_element_located(obstruction))
        except:
            pass  # Obstruction doesn't exist, that's fine

    # Scroll into view and click
    element = wait.until(EC.element_to_be_clickable(locator))
    driver.execute_script(
        "arguments[0].scrollIntoView({block: 'center'});", element
    )
    element.click()
```

For persistent cookie banners in test environments, dismiss them once at the start of each test session:

```python
@classmethod
def setUpClass(cls):
    cls.driver = webdriver.Chrome()
    cls.driver.get("https://staging.example.com")
    # Dismiss cookie banner once
    try:
        cls.driver.find_element(By.ID, "accept-cookies").click()
    except:
        pass  # No cookie banner
```

## Cause 4: Iframe Switching Failures

Iframes are a notorious source of flakiness because the iframe content loads asynchronously. If you try to switch to an iframe before it is ready, Selenium throws a NoSuchFrameException.

```python
# FLAKY: iframe might not be loaded yet
driver.switch_to.frame("payment-iframe")
driver.find_element(By.ID, "card-number").send_keys("4242424242424242")
```

### The Fix: Wait for the Frame

```python
wait = WebDriverWait(driver, 15)

# Wait for iframe to be available AND switch to it in one step
wait.until(EC.frame_to_be_available_and_switch_to_it(
    (By.ID, "payment-iframe")
))

# Now interact with elements inside the iframe
card_input = wait.until(
    EC.element_to_be_clickable((By.ID, "card-number"))
)
card_input.send_keys("4242424242424242")

# Always switch back when done
driver.switch_to.default_content()
```

## Cause 5: Window Handle Race Conditions

When your application opens a new browser tab or window, Selenium needs to switch to it. But the new window might not appear instantly.

```python
# FLAKY: New window might not exist yet
driver.find_element(By.LINK_TEXT, "View Invoice").click()
handles = driver.window_handles
driver.switch_to.window(handles[-1])  # Might still be the original window
```

### The Fix: Wait for the New Window

```python
original_handle = driver.current_window_handle
original_count = len(driver.window_handles)

driver.find_element(By.LINK_TEXT, "View Invoice").click()

# Wait for the new window to appear
wait.until(lambda d: len(d.window_handles) > original_count)

# Switch to the new window
for handle in driver.window_handles:
    if handle != original_handle:
        driver.switch_to.window(handle)
        break

# Wait for content in the new window
wait.until(EC.title_contains("Invoice"))
```

## Cause 6: Dropdown and Select Element Timing

Dropdown menus often load their options dynamically. Attempting to select an option before the options are populated causes failures.

```python
# FLAKY: Options might not be loaded yet
from selenium.webdriver.support.ui import Select

select = Select(driver.find_element(By.ID, "country-dropdown"))
select.select_by_visible_text("United States")
```

### The Fix: Wait for Options to Populate

```python
def select_dropdown_option(driver, dropdown_locator, option_text, timeout=10):
    """Wait for a dropdown to have options, then select one."""
    wait = WebDriverWait(driver, timeout)

    # Wait for the dropdown element to be present
    dropdown_element = wait.until(
        EC.presence_of_element_located(dropdown_locator)
    )

    # Wait for options to be populated
    wait.until(lambda d: len(
        Select(d.find_element(*dropdown_locator)).options
    ) > 1)  # More than just the placeholder option

    select = Select(driver.find_element(*dropdown_locator))
    select.select_by_visible_text(option_text)

# Usage
select_dropdown_option(
    driver,
    (By.ID, "country-dropdown"),
    "United States"
)
```

## Cause 7: Screenshot and Visual Assertion Instability

Visual tests that compare screenshots are extremely sensitive to rendering differences between environments.

```python
# FLAKY: Font rendering differs between local and CI
def test_homepage_visual():
    driver.get("https://staging.example.com")
    screenshot = driver.get_screenshot_as_png()
    assert screenshots_match(screenshot, "baseline.png", threshold=0)
```

### The Fix: Use Tolerant Comparison Thresholds

```python
def test_homepage_visual():
    driver.get("https://staging.example.com")

    # Wait for all images and fonts to load
    WebDriverWait(driver, 10).until(
        lambda d: d.execute_script(
            "return document.fonts.ready.then(() => true)"
        )
    )

    # Wait for any animations to settle
    time.sleep(0.5)

    screenshot = driver.get_screenshot_as_png()
    # Allow 2% pixel difference for font rendering variation
    assert screenshots_match(screenshot, "baseline.png", threshold=0.02)
```

## A Quick Diagnostic Checklist

When a Selenium test starts flaking, run through this checklist:

1. **Is there a sleep()?** Replace it with an explicit wait.
2. **Does the test store element references across navigations?** Re-find before interacting.
3. **Does the test interact with dynamically loaded content?** Add waits for the content.
4. **Does the test click elements that might be covered?** Wait for obstructions to clear.
5. **Does the test switch frames or windows?** Add waits for frame/window availability.
6. **Does the test work with dropdowns?** Wait for options to populate.
7. **Does the test compare screenshots?** Add rendering tolerance.

If you want automated detection instead of manual investigation, the [DeFlaky CLI](/docs) analyzes your test results and pinpoints which tests are flaky. It integrates with JUnit XML output from any Selenium framework -- pytest, JUnit, TestNG, NUnit -- and tracks reliability trends on the [dashboard](/demo).

## Measuring Improvement

After applying these fixes, measure the impact:

```bash
# Before fixes: run tests 20 times and count failures
for i in $(seq 1 20); do
  pytest tests/selenium/ --junitxml=results-before-$i.xml
done
deflaky analyze --input "results-before-*.xml" --format junit

# After fixes: run tests 20 times and compare
for i in $(seq 1 20); do
  pytest tests/selenium/ --junitxml=results-after-$i.xml
done
deflaky analyze --input "results-after-*.xml" --format junit
```

Track your suite's overall flake rate over weeks, not days. A single clean run does not prove the fixes worked -- you need statistical confidence across many runs.

## Conclusion

Selenium flakiness follows predictable patterns. The seven causes in this article account for the vast majority of intermittent failures in Selenium test suites. Apply the corresponding fixes systematically, starting with the ones that affect the most tests, and you will see measurable improvement in your pipeline reliability within days.

For ongoing monitoring, connect your test results to [DeFlaky](/pricing) and let the dashboard track reliability trends automatically. The combination of robust test code and continuous monitoring is what separates teams with trustworthy pipelines from teams that re-run builds and hope for the best.
