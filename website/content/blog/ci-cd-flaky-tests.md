---
title: "How to Handle Flaky Tests in GitHub Actions, Jenkins, and GitLab CI"
description: "Learn platform-specific strategies for managing flaky tests in CI/CD pipelines. Covers retry configurations, quarantine workflows, flaky test dashboards, and DeFlaky CI integration with YAML examples for GitHub Actions, Jenkins, and GitLab CI."
date: "2026-04-07"
slug: "ci-cd-flaky-tests"
keywords:
  - flaky tests CI/CD
  - github actions flaky
  - jenkins flaky tests
  - gitlab ci flaky
  - ci test retry
  - test quarantine
  - flaky test dashboard
  - ci pipeline reliability
  - test stability ci
  - deflaky ci integration
author: "Pramod Dutta"
---

# How to Handle Flaky Tests in GitHub Actions, Jenkins, and GitLab CI

Flaky tests are annoying in any context, but they are especially destructive in CI/CD pipelines. A single flaky test can block an entire deployment, waste CI compute minutes, and force developers to repeatedly push empty commits or click "re-run" just to get a green build. Across the industry, engineering teams report that flaky tests account for 15-30% of all CI failures.

This guide provides platform-specific, copy-paste-ready solutions for handling flaky tests in the three most popular CI/CD platforms: GitHub Actions, Jenkins, and GitLab CI. We will cover retry strategies, quarantine workflows, monitoring dashboards, and how to integrate flaky test detection tools like DeFlaky into your pipeline.

## The Cost of Flaky Tests in CI/CD

Before diving into solutions, let us quantify the problem. Consider a team with:

- 2,000 tests in the suite
- A 2% flake rate (40 flaky tests)
- 50 CI runs per day
- Average pipeline duration of 20 minutes

With a 2% flake rate across 2,000 tests and 50 daily runs, the probability that at least one test flakes in any given run is extremely high. In practice, this means:

- **10-15 pipeline failures per day** from flaky tests (not real bugs)
- **3-5 hours of developer time wasted daily** investigating and re-running
- **Increased CI costs** from retry runs consuming compute resources
- **Slower release velocity** as teams wait for "clean" builds
- **Trust erosion** as developers start ignoring test failures entirely

The last point is the most dangerous. Once a team stops trusting their CI pipeline, they start merging code without green builds, which defeats the entire purpose of automated testing.

## Strategy Overview: The Three-Layer Approach

Effective flaky test management in CI requires three layers:

1. **Detection**: Identify which tests are flaky before they cause problems
2. **Mitigation**: Implement retries and quarantines to prevent flaky tests from blocking deployments
3. **Resolution**: Track, prioritize, and fix flaky tests systematically

Each CI platform has different mechanisms for implementing these layers. Let us walk through each one.

## GitHub Actions: Flaky Test Management

GitHub Actions is the most widely used CI platform for open-source and many commercial projects. Here is how to handle flaky tests effectively.

### Basic Retry Configuration

GitHub Actions does not have native test-level retry support, but you can implement it at multiple levels.

**Job-level retry with a reusable workflow:**

```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        attempt: [1, 2, 3]
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        id: test
        run: npm test
        continue-on-error: ${{ matrix.attempt < 3 }}

      - name: Check test result
        if: steps.test.outcome == 'failure' && matrix.attempt == 3
        run: exit 1
```

This approach is wasteful because it runs the entire suite three times. A better strategy is framework-level retry.

**Framework-level retry (recommended):**

```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests with retry
        run: |
          # Jest with retry
          npx jest --forceExit --detectOpenHandles 2>&1 | tee test-output.txt

          if [ $? -ne 0 ]; then
            echo "::warning::First run failed, retrying failed tests..."
            # Extract failed test files and rerun only those
            FAILED=$(grep -E "FAIL " test-output.txt | awk '{print $2}')
            if [ -n "$FAILED" ]; then
              npx jest $FAILED --forceExit --detectOpenHandles
            fi
          fi

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-results
          path: test-output.txt
```

### Quarantine Workflow for GitHub Actions

A quarantine workflow separates known flaky tests from the main pipeline. The main pipeline skips quarantined tests, while a separate workflow runs them and reports results without blocking merges:

```yaml
# .github/workflows/main-tests.yml
name: Main Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: Run stable tests (skip quarantined)
        run: |
          npx jest --testPathIgnorePatterns="$(cat .quarantine | tr '\n' '|' | sed 's/|$//')"
        env:
          CI: true

---

# .github/workflows/quarantine-tests.yml
name: Quarantined Tests
on:
  push:
    branches: [main]
  schedule:
    - cron: '0 */6 * * *'  # Run every 6 hours

jobs:
  quarantine:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: Run quarantined tests (10 times each)
        run: |
          echo "## Quarantined Test Report" > quarantine-report.md
          echo "" >> quarantine-report.md
          echo "| Test | Pass Rate | Status |" >> quarantine-report.md
          echo "|------|-----------|--------|" >> quarantine-report.md

          while IFS= read -r test; do
            passes=0
            total=10
            for i in $(seq 1 $total); do
              if npx jest "$test" --forceExit 2>/dev/null; then
                passes=$((passes + 1))
              fi
            done

            rate=$((passes * 100 / total))

            if [ "$rate" -eq 100 ]; then
              status="Ready to unquarantine"
            elif [ "$rate" -ge 80 ]; then
              status="Improving"
            else
              status="Still flaky"
            fi

            echo "| $test | ${rate}% | $status |" >> quarantine-report.md
          done < .quarantine

          cat quarantine-report.md >> $GITHUB_STEP_SUMMARY

      - name: Create issue for flaky tests
        if: always()
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const report = fs.readFileSync('quarantine-report.md', 'utf8');

            // Find existing issue or create new one
            const issues = await github.rest.issues.listForRepo({
              owner: context.repo.owner,
              repo: context.repo.repo,
              labels: 'flaky-tests',
              state: 'open',
            });

            if (issues.data.length > 0) {
              await github.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: issues.data[0].number,
                body: `## Quarantine Report - ${new Date().toISOString().split('T')[0]}\n\n${report}`,
              });
            } else {
              await github.rest.issues.create({
                owner: context.repo.owner,
                repo: context.repo.repo,
                title: 'Flaky Test Quarantine Report',
                body: report,
                labels: ['flaky-tests'],
              });
            }
```

**The quarantine file (`.quarantine`):**

```text
src/__tests__/checkout.test.js
src/__tests__/payment-integration.test.js
src/__tests__/websocket-notifications.test.js
```

### GitHub Actions Flaky Test Dashboard

Use GitHub Actions job summaries to create a lightweight flaky test dashboard:

```yaml
# .github/workflows/flaky-dashboard.yml
name: Flaky Test Dashboard
on:
  schedule:
    - cron: '0 6 * * 1'  # Weekly on Monday mornings
  workflow_dispatch:

jobs:
  dashboard:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Analyze recent test runs
        uses: actions/github-script@v7
        with:
          script: |
            const runs = await github.rest.actions.listWorkflowRuns({
              owner: context.repo.owner,
              repo: context.repo.repo,
              workflow_id: 'test.yml',
              per_page: 100,
              status: 'completed',
            });

            const totalRuns = runs.data.workflow_runs.length;
            const failedRuns = runs.data.workflow_runs.filter(r => r.conclusion === 'failure').length;
            const successRate = ((totalRuns - failedRuns) / totalRuns * 100).toFixed(1);

            let summary = `# Flaky Test Dashboard\n\n`;
            summary += `**Period**: Last ${totalRuns} runs\n\n`;
            summary += `**Pipeline Success Rate**: ${successRate}%\n\n`;
            summary += `**Failed Runs**: ${failedRuns}/${totalRuns}\n\n`;

            if (successRate < 95) {
              summary += `> **Warning**: Pipeline reliability is below 95%. Investigate flaky tests.\n\n`;
            }

            await core.summary.addRaw(summary).write();
```

## Jenkins: Flaky Test Management

Jenkins has mature flaky test handling capabilities through plugins and its scripted pipeline syntax.

### Jenkins Test Retry with the Flaky Test Handler Plugin

Jenkins has a dedicated plugin for flaky tests:

```groovy
// Jenkinsfile
pipeline {
    agent any

    options {
        // Retry the entire pipeline up to 2 times
        retry(2)
    }

    stages {
        stage('Setup') {
            steps {
                checkout scm
                sh 'npm ci'
            }
        }

        stage('Test') {
            steps {
                script {
                    def testResult = sh(
                        script: 'npm test -- --ci --reporters=default --reporters=jest-junit',
                        returnStatus: true
                    )

                    if (testResult != 0) {
                        echo 'Tests failed, running retry for failed tests...'
                        sh '''
                            # Extract failed test files from JUnit report
                            FAILED=$(grep -l 'failures="[1-9]' test-results/*.xml | \
                                     xargs grep 'classname=' | \
                                     sed 's/.*classname="\\([^"]*\\)".*/\\1/' | \
                                     sort -u)

                            if [ -n "$FAILED" ]; then
                                npx jest $FAILED --ci --reporters=jest-junit
                            fi
                        '''
                    }
                }
            }
            post {
                always {
                    junit 'test-results/**/*.xml'
                }
            }
        }
    }
}
```

### Advanced Jenkins Pipeline with Quarantine

```groovy
// Jenkinsfile with quarantine support
pipeline {
    agent any

    environment {
        QUARANTINE_FILE = '.quarantine'
    }

    stages {
        stage('Setup') {
            steps {
                checkout scm
                sh 'npm ci'
            }
        }

        stage('Run Stable Tests') {
            steps {
                script {
                    def quarantined = ''
                    if (fileExists(env.QUARANTINE_FILE)) {
                        quarantined = readFile(env.QUARANTINE_FILE)
                            .trim()
                            .split('\n')
                            .collect { "--testPathIgnorePatterns='${it}'" }
                            .join(' ')
                    }

                    sh """
                        npx jest --ci --reporters=jest-junit \
                            --outputFile=stable-results.xml \
                            ${quarantined}
                    """
                }
            }
            post {
                always {
                    junit 'stable-results.xml'
                }
            }
        }

        stage('Run Quarantined Tests') {
            when {
                branch 'main'
            }
            steps {
                script {
                    if (fileExists(env.QUARANTINE_FILE)) {
                        def tests = readFile(env.QUARANTINE_FILE).trim().split('\n')

                        def results = [:]
                        tests.each { test ->
                            def passes = 0
                            def runs = 5

                            for (int i = 0; i < runs; i++) {
                                def exitCode = sh(
                                    script: "npx jest '${test}' --ci --forceExit 2>/dev/null",
                                    returnStatus: true
                                )
                                if (exitCode == 0) passes++
                            }

                            results[test] = [passes: passes, runs: runs]
                        }

                        // Generate report
                        def report = "Quarantine Report\\n"
                        report += "=================\\n\\n"
                        results.each { test, data ->
                            def rate = (data.passes * 100 / data.runs) as int
                            report += "${test}: ${rate}% pass rate (${data.passes}/${data.runs})\\n"
                        }

                        echo report
                    }
                }
            }
        }
    }

    post {
        failure {
            script {
                // Send Slack notification for flaky test failures
                if (currentBuild.previousBuild?.result == 'SUCCESS') {
                    slackSend(
                        channel: '#test-reliability',
                        color: 'warning',
                        message: "Pipeline failed after previous success - possible flaky test: ${env.BUILD_URL}"
                    )
                }
            }
        }
    }
}
```

### Jenkins Flaky Test Detection with DeFlaky

```groovy
// Jenkinsfile with DeFlaky integration
pipeline {
    agent any

    stages {
        stage('Setup') {
            steps {
                checkout scm
                sh 'npm ci'
                sh 'npm install -g deflaky'
            }
        }

        stage('Test') {
            steps {
                sh 'npx jest --ci --reporters=jest-junit'
            }
            post {
                always {
                    junit 'junit.xml'
                }
            }
        }

        stage('Flaky Test Analysis') {
            when {
                branch 'main'
                expression {
                    // Run analysis on scheduled builds or manually
                    return params.ANALYZE_FLAKY ?: (env.BUILD_NUMBER.toInteger() % 10 == 0)
                }
            }
            steps {
                sh '''
                    deflaky analyze \
                        --framework jest \
                        --runs 10 \
                        --output deflaky-report.json \
                        --format junit
                '''
            }
            post {
                always {
                    archiveArtifacts 'deflaky-report.json'

                    script {
                        def report = readJSON file: 'deflaky-report.json'
                        def flakyCount = report.flaky_tests?.size() ?: 0

                        if (flakyCount > 0) {
                            echo "Found ${flakyCount} flaky tests"

                            // Update the quarantine file
                            def quarantine = report.flaky_tests
                                .findAll { it.flake_score > 0.1 }
                                .collect { it.test_file }
                                .join('\n')

                            writeFile file: '.quarantine', text: quarantine
                        }
                    }
                }
            }
        }
    }
}
```

### Jenkins Shared Library for Flaky Test Handling

For teams with multiple Jenkins projects, create a shared library:

```groovy
// vars/testWithRetry.groovy
def call(Map config = [:]) {
    def maxRetries = config.maxRetries ?: 2
    def testCommand = config.command ?: 'npm test'
    def reportPath = config.reportPath ?: 'test-results/**/*.xml'

    def attempt = 0
    def success = false

    while (attempt <= maxRetries && !success) {
        attempt++
        echo "Test attempt ${attempt}/${maxRetries + 1}"

        def exitCode = sh(script: testCommand, returnStatus: true)

        if (exitCode == 0) {
            success = true
            if (attempt > 1) {
                echo "WARNING: Tests passed on attempt ${attempt} - flaky tests detected"
                // Tag the build
                currentBuild.description = "Flaky (passed on attempt ${attempt})"
            }
        } else if (attempt <= maxRetries) {
            echo "Tests failed, retrying..."
        }
    }

    junit reportPath

    if (!success) {
        error "Tests failed after ${maxRetries + 1} attempts"
    }
}

// Usage in Jenkinsfile:
// testWithRetry(command: 'npx jest --ci', maxRetries: 2)
```

## GitLab CI: Flaky Test Management

GitLab CI has the most mature built-in support for flaky tests among the three platforms, with native retry configuration and a flaky test reporting feature.

### GitLab CI Retry Configuration

GitLab CI supports test-level retry natively:

```yaml
# .gitlab-ci.yml
stages:
  - test
  - analyze

variables:
  NODE_ENV: test

.test-template: &test-template
  image: node:20
  before_script:
    - npm ci --cache .npm
  cache:
    key: $CI_COMMIT_REF_SLUG
    paths:
      - .npm
  artifacts:
    when: always
    reports:
      junit: junit.xml
    paths:
      - coverage/
    expire_in: 30 days

# Main test job with retry
test:
  <<: *test-template
  stage: test
  retry:
    max: 2
    when:
      - script_failure
      - runner_system_failure
      - stuck_or_timeout_failure
  script:
    - npx jest --ci --reporters=default --reporters=jest-junit
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH

# Parallel test execution with retry
test-parallel:
  <<: *test-template
  stage: test
  parallel: 4
  retry:
    max: 2
    when:
      - script_failure
  script:
    - |
      # Split tests across parallel jobs
      TOTAL_JOBS=$CI_NODE_TOTAL
      CURRENT_JOB=$CI_NODE_INDEX

      # Get all test files and select this job's portion
      ALL_TESTS=$(find src -name "*.test.js" | sort)
      SELECTED_TESTS=$(echo "$ALL_TESTS" | awk "NR % $TOTAL_JOBS == $CURRENT_JOB - 1")

      if [ -n "$SELECTED_TESTS" ]; then
        npx jest $SELECTED_TESTS --ci --reporters=jest-junit
      fi
```

### GitLab CI Quarantine Pipeline

```yaml
# .gitlab-ci.yml

# Run stable tests on every MR
stable-tests:
  <<: *test-template
  stage: test
  script:
    - |
      if [ -f .quarantine ]; then
        IGNORE_PATTERN=$(cat .quarantine | tr '\n' '|' | sed 's/|$//')
        npx jest --ci --reporters=jest-junit \
          --testPathIgnorePatterns="$IGNORE_PATTERN"
      else
        npx jest --ci --reporters=jest-junit
      fi
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH

# Run quarantined tests separately (non-blocking)
quarantine-tests:
  <<: *test-template
  stage: test
  allow_failure: true  # Don't block the pipeline
  script:
    - |
      if [ ! -f .quarantine ]; then
        echo "No quarantined tests"
        exit 0
      fi

      echo "Running quarantined tests..."

      QUARANTINED=$(cat .quarantine)
      REPORT="# Quarantine Report\n\n"
      REPORT+="| Test File | Pass Rate | Recommendation |\n"
      REPORT+="|-----------|-----------|----------------|\n"

      for test in $QUARANTINED; do
        PASSES=0
        RUNS=10

        for i in $(seq 1 $RUNS); do
          if npx jest "$test" --ci --forceExit 2>/dev/null; then
            PASSES=$((PASSES + 1))
          fi
        done

        RATE=$((PASSES * 100 / RUNS))

        if [ "$RATE" -eq 100 ]; then
          REC="Remove from quarantine"
        elif [ "$RATE" -ge 80 ]; then
          REC="Improving - monitor"
        elif [ "$RATE" -ge 50 ]; then
          REC="Needs investigation"
        else
          REC="Critical - fix urgently"
        fi

        REPORT+="| $test | ${RATE}% | $REC |\n"
      done

      echo -e "$REPORT"
      echo -e "$REPORT" > quarantine-report.md
  artifacts:
    paths:
      - quarantine-report.md
    expire_in: 7 days
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
    - if: $CI_PIPELINE_SOURCE == "schedule"

# Scheduled flaky test analysis
flaky-analysis:
  <<: *test-template
  stage: analyze
  script:
    - npm install -g deflaky
    - |
      deflaky analyze \
        --framework jest \
        --runs 15 \
        --output deflaky-report.json \
        --threshold 0.05
    - |
      # Update quarantine file based on DeFlaky results
      deflaky quarantine \
        --input deflaky-report.json \
        --output .quarantine \
        --threshold 0.1
    - |
      # Commit updated quarantine file if changed
      if git diff --quiet .quarantine 2>/dev/null; then
        echo "No quarantine changes"
      else
        git config user.email "ci@example.com"
        git config user.name "CI Bot"
        git add .quarantine
        git commit -m "chore: update flaky test quarantine list"
        git push "https://oauth2:${CI_PUSH_TOKEN}@${CI_SERVER_HOST}/${CI_PROJECT_PATH}.git" HEAD:${CI_COMMIT_REF_NAME}
      fi
  artifacts:
    paths:
      - deflaky-report.json
    expire_in: 30 days
  rules:
    - if: $CI_PIPELINE_SOURCE == "schedule"
      when: always
```

### GitLab CI Unit Test Report with Flaky Detection

GitLab CI has built-in support for identifying flaky tests through its Unit Test Reports feature:

```yaml
# .gitlab-ci.yml
test:
  script:
    - npx jest --ci --reporters=jest-junit
  artifacts:
    when: always
    reports:
      junit: junit.xml
```

When a test fails on one retry but passes on another, GitLab automatically marks it as "flaky" in the merge request UI. This is visible in the Test Report tab of the pipeline.

To enhance this with more detailed tracking:

```yaml
test-with-tracking:
  stage: test
  script:
    - |
      # Run tests and capture results
      npx jest --ci --reporters=jest-junit --outputFile=junit-attempt1.xml 2>&1 || true

      # If there were failures, rerun failed tests
      FAILED=$(grep 'failures="[1-9]' junit-attempt1.xml 2>/dev/null | wc -l)

      if [ "$FAILED" -gt 0 ]; then
        echo "Retrying failed tests..."
        FAILED_FILES=$(grep -oP 'classname="\K[^"]+' junit-attempt1.xml | sort -u)
        npx jest $FAILED_FILES --ci --reporters=jest-junit --outputFile=junit-attempt2.xml

        # Compare results
        STILL_FAILING=$(grep 'failures="[1-9]' junit-attempt2.xml 2>/dev/null | wc -l)
        FLAKY=$((FAILED - STILL_FAILING))

        echo "Results: $FAILED initial failures, $FLAKY flaky, $STILL_FAILING real failures"

        if [ "$STILL_FAILING" -gt 0 ]; then
          exit 1
        fi
      fi
  artifacts:
    when: always
    reports:
      junit:
        - junit-attempt1.xml
        - junit-attempt2.xml
```

## Cross-Platform Strategies

Some strategies work across all CI platforms. These are the most valuable because they are portable.

### Strategy 1: Smart Test Splitting by Flakiness

Instead of splitting tests randomly or by file count, split them by reliability:

```bash
#!/bin/bash
# split-tests.sh - Used by all CI platforms

# Read flakiness data from DeFlaky
FLAKY_TESTS=$(deflaky list --status flaky --format paths)
STABLE_TESTS=$(deflaky list --status stable --format paths)

if [ "$1" = "stable" ]; then
  echo "$STABLE_TESTS"
elif [ "$1" = "flaky" ]; then
  echo "$FLAKY_TESTS"
fi
```

### Strategy 2: Test Impact Analysis

Only run tests affected by the code changes in the current PR:

```yaml
# Works in any CI platform
# GitHub Actions example:
- name: Get changed files
  id: changed
  run: |
    CHANGED=$(git diff --name-only origin/${{ github.base_ref }}...HEAD)
    echo "files=$CHANGED" >> $GITHUB_OUTPUT

- name: Run affected tests
  run: |
    # Use Jest's --findRelatedTests to only run tests affected by changes
    npx jest --findRelatedTests ${{ steps.changed.outputs.files }}
```

### Strategy 3: Automatic Quarantine Management

Create a script that automatically manages the quarantine list:

```bash
#!/bin/bash
# manage-quarantine.sh

ACTION=$1  # add, remove, check, report

QUARANTINE_FILE=".quarantine"

case $ACTION in
  add)
    TEST_FILE=$2
    REASON=$3
    echo "${TEST_FILE} # ${REASON} $(date -I)" >> $QUARANTINE_FILE
    sort -u -o $QUARANTINE_FILE $QUARANTINE_FILE
    echo "Added $TEST_FILE to quarantine"
    ;;

  remove)
    TEST_FILE=$2
    grep -v "^${TEST_FILE}" $QUARANTINE_FILE > tmp && mv tmp $QUARANTINE_FILE
    echo "Removed $TEST_FILE from quarantine"
    ;;

  check)
    TEST_FILE=$2
    if grep -q "^${TEST_FILE}" $QUARANTINE_FILE 2>/dev/null; then
      echo "QUARANTINED"
      exit 0
    else
      echo "ACTIVE"
      exit 1
    fi
    ;;

  report)
    echo "=== Quarantine Report ==="
    echo "Total quarantined: $(wc -l < $QUARANTINE_FILE)"
    echo ""
    echo "Quarantined tests:"
    cat $QUARANTINE_FILE
    echo ""

    # Check age of quarantined tests
    echo "Tests quarantined for more than 7 days:"
    while IFS= read -r line; do
      DATE=$(echo "$line" | grep -oP '\d{4}-\d{2}-\d{2}$')
      if [ -n "$DATE" ]; then
        AGE=$(( ($(date +%s) - $(date -d "$DATE" +%s)) / 86400 ))
        if [ "$AGE" -gt 7 ]; then
          echo "  WARNING: $line ($AGE days old)"
        fi
      fi
    done < $QUARANTINE_FILE
    ;;
esac
```

### Strategy 4: Flaky Test Notifications

Set up notifications that alert the right people when flaky tests are detected:

```yaml
# GitHub Actions notification
- name: Notify on flaky tests
  if: steps.test.outcome == 'failure' && steps.retry.outcome == 'success'
  uses: slackapi/slack-github-action@v1
  with:
    payload: |
      {
        "channel": "#test-reliability",
        "text": "Flaky test detected in ${{ github.repository }}",
        "blocks": [
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "*Flaky Test Detected*\nRepo: `${{ github.repository }}`\nBranch: `${{ github.ref_name }}`\nPR: ${{ github.event.pull_request.html_url || 'N/A' }}\nPipeline: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
            }
          }
        ]
      }
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

## DeFlaky CI Integration (All Platforms)

DeFlaky provides first-class CI integration that works across GitHub Actions, Jenkins, and GitLab CI. Here is how to set it up for each platform.

### GitHub Actions + DeFlaky

```yaml
# .github/workflows/deflaky.yml
name: DeFlaky Analysis
on:
  schedule:
    - cron: '0 2 * * *'  # Nightly at 2 AM
  workflow_dispatch:

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci
      - run: npm install -g deflaky

      - name: Run DeFlaky Analysis
        run: |
          deflaky analyze \
            --framework jest \
            --runs 15 \
            --output report.json \
            --ci github-actions
        env:
          DEFLAKY_API_KEY: ${{ secrets.DEFLAKY_API_KEY }}

      - name: Generate Dashboard
        run: deflaky dashboard --input report.json --output dashboard.html

      - name: Deploy Dashboard
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dashboard.html
          destination_dir: flaky-dashboard

      - name: Comment on Recent PRs
        run: |
          deflaky notify \
            --input report.json \
            --format github-pr \
            --token ${{ secrets.GITHUB_TOKEN }}
```

### Jenkins + DeFlaky

```groovy
// Jenkinsfile
pipeline {
    agent any

    triggers {
        cron('H 2 * * *') // Nightly
    }

    stages {
        stage('DeFlaky Analysis') {
            steps {
                checkout scm
                sh 'npm ci'
                sh 'npm install -g deflaky'

                sh '''
                    deflaky analyze \
                        --framework jest \
                        --runs 15 \
                        --output report.json \
                        --ci jenkins
                '''

                sh 'deflaky dashboard --input report.json --output dashboard.html'
            }
            post {
                always {
                    archiveArtifacts 'report.json, dashboard.html'
                    publishHTML([
                        allowMissing: false,
                        reportDir: '.',
                        reportFiles: 'dashboard.html',
                        reportName: 'Flaky Test Dashboard'
                    ])
                }
            }
        }
    }
}
```

### GitLab CI + DeFlaky

```yaml
# .gitlab-ci.yml
deflaky-analysis:
  stage: analyze
  image: node:20
  before_script:
    - npm ci
    - npm install -g deflaky
  script:
    - |
      deflaky analyze \
        --framework jest \
        --runs 15 \
        --output report.json \
        --ci gitlab
    - deflaky dashboard --input report.json --output public/index.html
  artifacts:
    paths:
      - report.json
      - public/
    expire_in: 30 days
  pages:
    stage: deploy
    script:
      - echo "Deploying dashboard to GitLab Pages"
    artifacts:
      paths:
        - public
  rules:
    - if: $CI_PIPELINE_SOURCE == "schedule"
```

## Building a Flaky Test Dashboard

Regardless of your CI platform, you need visibility into test reliability trends. Here is how to build a lightweight dashboard.

### Data Collection

Store test results in a structured format after every CI run:

```bash
#!/bin/bash
# collect-test-data.sh
# Run after every test execution

TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)
BRANCH=$CI_COMMIT_BRANCH
COMMIT=$CI_COMMIT_SHA
BUILD_ID=$CI_BUILD_ID

# Parse JUnit XML results
node -e "
const fs = require('fs');
const xml = fs.readFileSync('junit.xml', 'utf8');

// Simple XML parsing for test results
const tests = xml.match(/<testcase[^>]*>/g) || [];
const results = tests.map(tc => {
  const name = tc.match(/name=\"([^\"]+)\"/)?.[1] || 'unknown';
  const classname = tc.match(/classname=\"([^\"]+)\"/)?.[1] || 'unknown';
  const time = parseFloat(tc.match(/time=\"([^\"]+)\"/)?.[1] || '0');
  const failed = xml.includes('</failure>', xml.indexOf(tc));

  return {
    name,
    classname,
    time,
    status: failed ? 'fail' : 'pass',
    timestamp: '${TIMESTAMP}',
    branch: '${BRANCH}',
    commit: '${COMMIT}',
    build: '${BUILD_ID}'
  };
});

// Append to JSONL file
const lines = results.map(r => JSON.stringify(r)).join('\n');
fs.appendFileSync('test-history.jsonl', lines + '\n');
"
```

### Analysis and Visualization

```javascript
// analyze-flakiness.js
const fs = require('fs');
const readline = require('readline');

async function analyzeFlakiness() {
  const testHistory = {};

  const lines = fs.readFileSync('test-history.jsonl', 'utf8').split('\n').filter(Boolean);

  lines.forEach(line => {
    const result = JSON.parse(line);
    const key = `${result.classname}::${result.name}`;

    if (!testHistory[key]) {
      testHistory[key] = { passes: 0, failures: 0, runs: 0, times: [] };
    }

    testHistory[key].runs++;
    testHistory[key].times.push(result.time);

    if (result.status === 'pass') {
      testHistory[key].passes++;
    } else {
      testHistory[key].failures++;
    }
  });

  // Calculate flake rates
  const flakeReport = Object.entries(testHistory)
    .map(([name, data]) => ({
      name,
      runs: data.runs,
      flakeRate: data.failures / data.runs,
      avgTime: data.times.reduce((a, b) => a + b, 0) / data.times.length,
      isFlaky: data.failures > 0 && data.passes > 0,
    }))
    .filter(t => t.isFlaky)
    .sort((a, b) => b.flakeRate - a.flakeRate);

  console.log('Flaky Tests Report');
  console.log('==================');
  console.log(`Total tests analyzed: ${Object.keys(testHistory).length}`);
  console.log(`Flaky tests found: ${flakeReport.length}`);
  console.log('');

  flakeReport.forEach(t => {
    console.log(`${t.name}`);
    console.log(`  Flake rate: ${(t.flakeRate * 100).toFixed(1)}%`);
    console.log(`  Runs: ${t.runs}`);
    console.log(`  Avg time: ${t.avgTime.toFixed(2)}s`);
    console.log('');
  });

  return flakeReport;
}

analyzeFlakiness();
```

## Best Practices for CI Flaky Test Management

### 1. Never Ignore Flaky Tests

Ignoring flaky tests leads to "test blindness" where developers stop paying attention to test results. Every flaky test should be either fixed immediately or quarantined with a tracking issue.

### 2. Set a Flake Budget

Define an acceptable flake rate for your pipeline (for example, less than 1% of tests) and treat exceeding this budget as seriously as a production incident. DeFlaky can enforce this automatically.

### 3. Use Deterministic Test Ordering in CI

Random test ordering (available in most frameworks) helps catch ordering-dependent flakiness. Run tests in random order in CI but use a fixed seed that you can reproduce:

```yaml
# Use a deterministic random seed based on the commit
- run: npx jest --randomize --seed=${{ github.sha }}
```

### 4. Monitor CI Infrastructure Health

Sometimes "flaky tests" are actually CI infrastructure problems:

- **Insufficient resources**: Tests pass locally but fail in CI due to limited CPU or memory
- **Network issues**: Flaky network in CI data centers
- **Docker layer caching**: Stale caches causing inconsistent environments

Track CI machine metrics alongside test results to distinguish test flakiness from infrastructure flakiness.

### 5. Implement Progressive Test Suites

Structure your CI pipeline with progressive confidence levels:

```yaml
# Fast, stable unit tests run first
unit-tests:
  stage: test
  timeout: 5 minutes
  script: npx jest --testPathPattern='unit'

# Integration tests run after units pass
integration-tests:
  stage: test
  needs: [unit-tests]
  timeout: 15 minutes
  retry:
    max: 1
    when: script_failure
  script: npx jest --testPathPattern='integration'

# E2E tests run last, with more retry tolerance
e2e-tests:
  stage: test
  needs: [integration-tests]
  timeout: 30 minutes
  retry:
    max: 2
    when: script_failure
  allow_failure: false
  script: npx cypress run
```

### 6. Correlate Failures Across Builds

A test that fails once is not necessarily flaky. Track failure patterns over time:

- A test that fails consistently is broken, not flaky
- A test that fails 1 in 10 times is flaky
- A test that fails at the same time each day likely depends on an external service
- A test that fails only in parallel runs likely has an isolation issue

DeFlaky performs this correlation analysis automatically, saving your team from building and maintaining custom analysis scripts.

## Measuring CI Pipeline Reliability

Track these metrics at the pipeline level:

| Metric | Definition | Target |
|--------|-----------|--------|
| Pipeline Success Rate | Successful runs / Total runs | > 98% |
| Flaky Failure Rate | Flaky failures / Total failures | < 20% |
| Mean Time to Green | Average time from push to green build | < 15 min |
| Retry Rate | Runs needing retry / Total runs | < 5% |
| Quarantine Size | Number of quarantined tests | < 2% of suite |
| Quarantine Age | Average days a test stays quarantined | < 7 days |

## Conclusion

Flaky tests in CI/CD pipelines are a team-wide productivity problem that demands a systematic solution. No single retry configuration or quarantine mechanism is sufficient. You need all three layers: detection (finding flaky tests early), mitigation (preventing them from blocking work), and resolution (fixing the root cause).

GitHub Actions, Jenkins, and GitLab CI each provide different mechanisms for implementing these layers, but the core strategy is the same: run tests with retries, quarantine persistent offenders, monitor trends, and fix the root causes. Tools like DeFlaky automate the detection and monitoring layers, freeing your team to focus on what matters most -- writing reliable tests and shipping reliable software.

Start by implementing the retry and quarantine configurations for your CI platform, then add automated detection and monitoring. Within a few weeks, you will see a measurable improvement in pipeline reliability, developer productivity, and team confidence in your test suite.
