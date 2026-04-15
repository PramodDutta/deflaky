# DeFlaky -- Day 1 Launch Content

All content below is ready to copy-paste. Published by Pramod Dutta.

---

## 1. Show HN Post (Hacker News)

**Title:** Show HN: DeFlaky -- Open-source CLI to detect and analyze flaky tests

**Body:**

Hi HN,

I'm Pramod, a Lead SDET. I've spent the last decade watching flaky tests slowly destroy team trust in test suites. The usual response is "just re-run it" or "mark it as skip." Neither actually fixes anything.

So I built DeFlaky -- an open-source CLI that runs your test command N times, detects which tests are flaky, assigns each one a FlakeScore (0-100 stability metric), and optionally uses AI to suggest root causes.

How it works:

    npm i -g deflaky-cli
    deflaky run -c "npx playwright test" -r 5

It runs your tests 5 times, diffs the results, and gives you a report. That's it. No config files, no lock-in.

Key details:
- Works with any test framework (Playwright, Selenium, Cypress, Jest, Pytest, etc.) -- it just wraps your test command
- FlakeScore metric: deterministic score based on pass/fail variance across runs
- AI root cause analysis (optional): supports 5 LLM providers for analyzing failure patterns
- CI/CD ready -- works in GitHub Actions, GitLab CI, Jenkins, etc.
- MIT licensed

Free CLI forever. There's a Pro SaaS dashboard at $19/mo if you want historical tracking and team features, but the CLI does the heavy lifting on its own.

GitHub: https://github.com/PramodDutta/deflaky
Website: https://deflaky.com
npm: https://www.npmjs.com/package/deflaky-cli

Happy to answer questions about the detection algorithm, the FlakeScore metric, or flaky test patterns in general.

---

## 2. Dev.to Article

```
---
title: "I built an open-source CLI to detect flaky tests -- here's what I learned"
published: true
tags: testing, opensource, javascript, devops
cover_image: https://deflaky.com/blog/cover-launch.png
canonical_url: https://deflaky.com/blog/launch-story
---
```

# I built an open-source CLI to detect flaky tests -- here's what I learned

I've been a Lead SDET for over a decade. In that time, one problem has followed me across every team, every company, every stack: **flaky tests**.

You know the drill. A test passes on your machine, fails in CI, passes when you re-run it, fails again tomorrow. Someone adds `@skip` or `retry: 3` and moves on. The test suite slowly becomes a graveyard of unreliable signals.

Six months ago, I got fed up enough to actually build something about it.

## The real cost of flaky tests

Before I talk about the tool, let me share some numbers from my own experience:

- A team I worked with had a CI pipeline that took 22 minutes. Flaky test failures caused an average of 2.3 re-runs per PR. That's ~50 minutes of wasted CI time per PR.
- Developers started ignoring test failures entirely. "It's probably flaky" became the default assumption -- even for real bugs.
- We once shipped a regression to production because the actual failing test was hidden in a pile of known-flaky noise.

Flaky tests don't just waste time. They erode trust. And once your team stops trusting the test suite, you've lost the entire point of having tests.

## What I built

**DeFlaky** is an open-source CLI that detects flaky tests by running your test suite multiple times and analyzing the results.

Install it:

```bash
npm i -g deflaky-cli
```

Run it against any test command:

```bash
deflaky run -c "npx playwright test" -r 5
```

That runs your Playwright tests 5 times, collects the results, and outputs a report showing which tests are flaky, along with a **FlakeScore** for each one.

### What's a FlakeScore?

FlakeScore is a 0-100 metric that quantifies how unstable a test is. A test that passes 5/5 times scores 0 (stable). A test that passes 3/5 times scores higher. The scoring accounts for pass/fail variance, consecutive failure patterns, and historical data if available.

It gives you a single number to prioritize which flaky tests to fix first.

### AI root cause analysis

This is the part I'm most excited about. DeFlaky can optionally analyze your flaky test failures using LLMs to suggest probable root causes.

```bash
deflaky run -c "pytest tests/" -r 5 --analyze
```

It looks at the failure stack traces, test code, timing data, and failure patterns, then suggests whether the flakiness is likely caused by:
- Race conditions or timing issues
- Shared state between tests
- External dependency instability
- Environment-specific problems
- Non-deterministic data

It supports 5 LLM providers, so you can use whichever one you're already paying for.

### Framework-agnostic by design

DeFlaky doesn't parse your test files or understand your framework's internals. It wraps your test command, captures the output, and analyzes the results. This means it works with:

- **Playwright** (my primary use case)
- **Selenium** / WebDriver
- **Cypress**
- **Jest**
- **Pytest**
- **Any framework** that outputs test results to stdout or generates JUnit XML

This was a deliberate design choice. Integrating deeply with one framework means maintaining compatibility with every version. Wrapping the command means DeFlaky works with whatever you're already using.

## What I learned building this

**1. Flakiness detection is harder than it sounds.** Running tests N times seems simple, but you need to handle partial failures, timeouts, framework crashes, and the difference between "test failed" and "test runner failed."

**2. People don't know which tests are flaky.** Most teams have a vague sense ("oh yeah, that login test is weird"), but nobody has an actual inventory. Just generating the list is valuable.

**3. AI analysis is surprisingly useful here.** I was skeptical, but LLMs are genuinely good at looking at a stack trace + test code and saying "this looks like a race condition because you're not waiting for the network request to complete." It's not magic, but it saves investigation time.

**4. The CLI-first approach was right.** I considered building a SaaS dashboard first, but starting with the CLI meant developers could try it in 30 seconds with zero signup. That feedback loop was invaluable.

## Try it

The CLI is free and MIT licensed. Always will be.

```bash
npm i -g deflaky-cli
deflaky run -c "your-test-command" -r 5
```

If you want historical tracking, team dashboards, and CI integration, there's a Pro tier at $19/mo with a 15-day free trial at [deflaky.com](https://deflaky.com).

- **GitHub:** [github.com/PramodDutta/deflaky](https://github.com/PramodDutta/deflaky)
- **npm:** [npmjs.com/package/deflaky-cli](https://www.npmjs.com/package/deflaky-cli)
- **Blog:** [deflaky.com/blog](https://deflaky.com/blog) (41 posts on flaky test patterns and strategies)

I'd love feedback. What's your worst flaky test story?

---

*I'm Pramod Dutta, Lead SDET and creator of The Testing Academy on YouTube. I build testing tools and write about test automation at [deflaky.com/blog](https://deflaky.com/blog).*

---

## 3. LinkedIn Post (Pramod's Profile)

I just launched DeFlaky -- an open-source CLI for detecting flaky tests.

After 10+ years as a Lead SDET, I've watched flaky tests silently drain engineering teams. Wasted CI minutes. Eroded trust in test suites. Real bugs hidden behind "just re-run it."

So I built something to fix it.

DeFlaky runs your tests multiple times, identifies which ones are flaky, assigns a FlakeScore (0-100), and uses AI to suggest root causes. Works with Playwright, Selenium, Cypress, Jest, Pytest -- any framework.

One command to get started:
npm i -g deflaky-cli
deflaky run -c "npx playwright test" -r 5

The CLI is free and open source (MIT). Forever.

For teams that want historical tracking and dashboards, there's a Pro tier at $19/mo with a 15-day trial.

If you've ever wasted a morning debugging a test that "works on my machine" -- give it a try.

Website: https://deflaky.com
GitHub: https://github.com/PramodDutta/deflaky

Stop guessing. DeFlaky your tests.

#testing #opensource #testautomation #qa #devtools #softwaredevelopment #flakytests

---

## 4. Twitter/X Launch Thread (5 tweets)

**Tweet 1:**
I just open-sourced DeFlaky -- a CLI that detects flaky tests, scores them, and uses AI to find root causes.

One install. Any test framework. Zero config.

npm i -g deflaky-cli

Stop guessing. DeFlaky your tests.

Thread on why I built this:

**Tweet 2:**
Flaky tests are a silent tax on every engineering team:

- ~25% of CI failures are flaky (not real bugs)
- Devs start ignoring ALL test failures
- Real regressions slip through to production
- "Just re-run it" becomes the fix for everything

I watched this pattern repeat for 10 years. Had to build a fix.

**Tweet 3:**
How DeFlaky works:

1. Wraps your existing test command
2. Runs it N times
3. Diffs results across runs
4. Assigns a FlakeScore (0-100) to each test
5. (Optional) Uses AI to analyze failure patterns and suggest root causes

Framework-agnostic. Works with Playwright, Cypress, Selenium, Jest, Pytest.

**Tweet 4:**
Try it in 30 seconds:

npm i -g deflaky-cli
deflaky run -c "npx playwright test" -r 5

That's it. No config files. No signup. No SDK integration.

It just wraps your test command and finds the flaky ones.

MIT licensed, free forever.

**Tweet 5:**
Links:

Website: https://deflaky.com
GitHub: https://github.com/PramodDutta/deflaky
npm: https://www.npmjs.com/package/deflaky-cli
Blog: https://deflaky.com/blog (41 posts on flaky test strategies)

Free CLI forever. Pro dashboard $19/mo (15-day trial).

Star the repo if this is useful. PRs welcome.

---

## 5. Reddit Post (r/softwaretesting)

**Title:** I built a free CLI to detect which of your tests are flaky -- works with any framework

**Body:**

Hey everyone,

Long-time lurker, Lead SDET by day. I've been working on an open-source CLI called DeFlaky and just shipped v1.

The problem it solves: you suspect some tests are flaky, but you don't have a definitive list. You don't know which ones to fix first. The typical approach is "wait until someone complains" or "grep the CI logs for the last month."

DeFlaky takes a different approach. You give it your test command, tell it how many runs, and it gives you a report:

```
npm i -g deflaky-cli
deflaky run -c "npx playwright test" -r 5
```

It runs your tests 5 times, tracks which ones pass/fail inconsistently, and assigns a FlakeScore (0-100) to each test. Higher score = more flaky = fix this first.

It also has an optional AI analysis mode that looks at failure patterns and suggests probable root causes (timing issues, shared state, environment dependencies, etc.).

Works with Playwright, Selenium, Cypress, Jest, Pytest -- basically anything that outputs test results.

CLI is free and MIT licensed. There's a paid SaaS dashboard if you want to track flakiness over time across your team, but the CLI itself does the main job.

Curious what you all think. What's your current process for dealing with flaky tests?

GitHub: https://github.com/PramodDutta/deflaky
Website: https://deflaky.com

---

## 6. Reddit Post (r/QualityAssurance)

**Title:** Using AI to analyze why your tests are flaky (open-source tool)

**Body:**

I'm a Lead SDET and I just released DeFlaky, an open-source CLI with a feature I haven't seen elsewhere: AI-powered root cause analysis for flaky tests.

Here's the idea. Most flaky test tools tell you WHICH tests are flaky. That's useful but not enough. You still have to manually investigate each one to figure out WHY it's flaky. Is it a race condition? Shared state? A timing issue? An external service?

DeFlaky's `--analyze` flag feeds the failure stack traces, test code, timing data, and pass/fail patterns into an LLM and gets back a categorized diagnosis:

```
deflaky run -c "pytest tests/" -r 5 --analyze
```

Output example:
- `test_checkout_flow` -- FlakeScore: 72 -- Probable cause: Race condition. The test clicks the submit button before the API response populates the cart total. Suggest adding an explicit wait for the network request.

It supports 5 LLM providers so you can use whichever you already have access to.

Obviously AI analysis isn't perfect, but in my testing it correctly identifies the root cause category about 70-80% of the time. That's enough to save significant investigation time when you have 20+ flaky tests to triage.

The CLI itself is free/open-source (MIT). It works with any test framework -- Playwright, Selenium, Cypress, Jest, Pytest, etc.

Would love feedback from other QA folks. How do you currently investigate flaky test root causes?

GitHub: https://github.com/PramodDutta/deflaky
Website: https://deflaky.com

---

## 7. Indie Hackers Intro Post

**Title:** DeFlaky -- open-source CLI + SaaS for detecting flaky tests. Just launched.

**Body:**

Hey IH,

I'm Pramod, a Lead SDET with 10+ years in test automation. I also run The Testing Academy on YouTube. Launching my first SaaS today: **DeFlaky**.

**What it does:** Detects flaky tests in any test suite, scores them by severity, and uses AI to suggest root causes.

**The problem:** Flaky tests (tests that pass and fail randomly) are one of the biggest productivity drains in software teams. Google published a paper saying ~16% of their tests exhibit flakiness. Most teams don't even know which tests are flaky -- they just re-run CI and hope.

**Business model:**
- Free CLI forever (MIT open source) -- installs via npm, works with any test framework
- Pro SaaS dashboard at $19/mo -- historical tracking, team analytics, CI integration, trend reports
- 15-day free trial on Pro

**Tech stack:**
- CLI: Node.js, TypeScript
- Dashboard: Next.js, PostgreSQL
- AI analysis: Multi-provider LLM integration (OpenAI, Anthropic, etc.)
- Infrastructure: Vercel + Railway

**Revenue goals:**
- Month 1: 50 CLI installs, 10 Pro trials
- Month 3: $500 MRR
- Month 6: $2,000 MRR
- Month 12: $5,000 MRR

**Distribution strategy:**
- 41 SEO blog posts already published on deflaky.com/blog targeting long-tail keywords like "playwright flaky test fix," "jest intermittent test failure," etc.
- Open-source CLI as top-of-funnel
- YouTube content via The Testing Academy (existing audience in testing/QA niche)
- Direct outreach to DevRel and SDET communities

**Lessons learned so far:**
1. Start with the CLI, not the dashboard. Developers won't sign up for a SaaS to try a new tool. They'll run a CLI command.
2. SEO content before launch. Those 41 blog posts are already ranking for some terms and generating organic traffic before I even had a product page.
3. Framework-agnostic was the right call. Every framework-specific tool limits its own TAM. DeFlaky wraps your test command -- it doesn't care what framework you use.

Try it: `npm i -g deflaky-cli`

Website: https://deflaky.com
GitHub: https://github.com/PramodDutta/deflaky

Happy to share more details on the tech or the go-to-market. AMA.

---

## 8. BetaList Submission

**One-liner:** Open-source CLI that detects flaky tests and uses AI to find root causes.

**Description (280 chars):**
DeFlaky runs your test suite multiple times, identifies flaky tests, assigns a FlakeScore (0-100), and uses AI to suggest why they're failing. Works with Playwright, Cypress, Jest, Pytest. Free CLI, Pro dashboard $19/mo.

**URL:** https://deflaky.com

**Maker:** Pramod Dutta

**Category:** Developer Tools

---

## 9. Product Hunt Ship Page

**Tagline:** Stop guessing. DeFlaky your tests.

**Description:**
DeFlaky is an open-source CLI + SaaS dashboard for detecting flaky tests. Install the CLI, point it at your test command, and get a report of every flaky test in your suite -- ranked by a FlakeScore metric so you know what to fix first.

Features:
- Instant flaky test detection across any number of runs
- FlakeScore (0-100) to prioritize the worst offenders
- AI root cause analysis with 5 LLM provider options
- Framework-agnostic: Playwright, Selenium, Cypress, Jest, Pytest, and more
- CI/CD ready: GitHub Actions, GitLab CI, Jenkins
- Free CLI forever (MIT licensed)
- Pro dashboard at $19/mo for historical tracking, team analytics, and trend reports

Built by a Lead SDET who got tired of hearing "just re-run it."

**Topics/Tags:** Developer Tools, Testing, Open Source, Artificial Intelligence, SaaS, DevOps, Productivity

**Links:**
- Website: https://deflaky.com
- GitHub: https://github.com/PramodDutta/deflaky
- npm: https://www.npmjs.com/package/deflaky-cli

**Maker:** Pramod Dutta (@proaborjmg)
