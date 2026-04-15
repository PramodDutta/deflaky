import type { SavedRunData } from "./types.js";

export function generateDashboardHTML(data: SavedRunData, aiAnalysis?: string): string {
  const { result, command, date, runs, totalDurationMs } = data;
  const totalDurationSec = (totalDurationMs / 1000).toFixed(1);
  const scoreColor = result.flakeScore > 90 ? "#4ade80" : result.flakeScore > 70 ? "#facc15" : "#f87171";
  const formattedDate = new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const testRows = result.details
    .map((d) => {
      let status: "passed" | "flaky" | "failed";
      let statusBg: string;
      let statusText: string;
      let statusBorder: string;
      let rowBg: string;

      if (d.passRate === 100) {
        status = "passed";
        statusBg = "rgba(74, 222, 128, 0.2)";
        statusText = "#4ade80";
        statusBorder = "rgba(74, 222, 128, 0.3)";
        rowBg = "transparent";
      } else if (d.passRate === 0) {
        status = "failed";
        statusBg = "rgba(248, 113, 113, 0.2)";
        statusText = "#f87171";
        statusBorder = "rgba(248, 113, 113, 0.3)";
        rowBg = "rgba(248, 113, 113, 0.03)";
      } else {
        status = "flaky";
        statusBg = "rgba(250, 204, 21, 0.2)";
        statusText = "#facc15";
        statusBorder = "rgba(250, 204, 21, 0.3)";
        rowBg = "rgba(250, 204, 21, 0.03)";
      }

      const barColor = d.passRate === 100 ? "#22c55e" : d.passRate >= 80 ? "#eab308" : "#ef4444";

      return `
        <tr style="border-bottom: 1px solid rgba(26, 26, 46, 0.3); background: ${rowBg};">
          <td style="padding: 10px 24px;">
            <span style="font-size: 10px; font-weight: 600; text-transform: uppercase; padding: 2px 8px; border-radius: 4px; border: 1px solid ${statusBorder}; background: ${statusBg}; color: ${statusText};">
              ${status}
            </span>
          </td>
          <td style="padding: 10px 24px; font-family: 'SF Mono', 'Fira Code', monospace; color: #e5e5e5; font-size: 12px;">${escapeHtml(d.testName)}</td>
          <td style="padding: 10px 24px; color: #888; font-size: 12px;" class="hide-mobile">${escapeHtml(d.filePath)}</td>
          <td style="padding: 10px 24px; text-align: center; font-family: 'SF Mono', 'Fira Code', monospace; font-size: 12px;">
            <span style="color: #4ade80;">${d.passCount}&#10003;</span>
            <span style="color: #f87171; margin-left: 4px;">${d.failCount}&#10007;</span>
          </td>
          <td style="padding: 10px 24px; text-align: right;">
            <div style="display: flex; align-items: center; justify-content: flex-end; gap: 8px;">
              <div style="width: 64px; height: 6px; border-radius: 9999px; background: rgba(26, 26, 46, 0.5); overflow: hidden;">
                <div style="height: 100%; border-radius: 9999px; background: ${barColor}; width: ${d.passRate}%; transition: width 1s ease-out;"></div>
              </div>
              <span style="color: #888; width: 32px; text-align: right; font-size: 12px;">${d.passRate.toFixed(0)}%</span>
            </div>
          </td>
        </tr>`;
    })
    .join("");

  const aiSection = aiAnalysis
    ? `
      <div style="padding: 16px 24px; border-top: 1px solid #1a1a2e; background: rgba(74, 222, 128, 0.03);">
        <div style="display: flex; align-items: flex-start; gap: 12px;">
          <div style="width: 20px; height: 20px; border-radius: 50%; background: rgba(74, 222, 128, 0.2); display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <p style="font-size: 11px; font-weight: 600; color: #4ade80; margin: 0;">AI Root Cause Analysis</p>
            <p style="font-size: 11px; color: #888; margin: 4px 0 0 0; line-height: 1.6;">${escapeHtml(aiAnalysis)}</p>
          </div>
        </div>
      </div>`
    : `
      <div style="padding: 16px 24px; border-top: 1px solid #1a1a2e; background: rgba(74, 222, 128, 0.03);">
        <div style="display: flex; align-items: flex-start; gap: 12px;">
          <div style="width: 20px; height: 20px; border-radius: 50%; background: rgba(74, 222, 128, 0.2); display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <p style="font-size: 11px; font-weight: 600; color: #4ade80; margin: 0;">AI Root Cause Analysis</p>
            <p style="font-size: 11px; color: #888; margin: 4px 0 0 0; line-height: 1.6;">
              Get AI-powered root cause analysis for your flaky tests.
              <a href="https://deflaky.com" target="_blank" style="color: #4ade80; text-decoration: underline;">Get your API key at deflaky.com</a>
              and pass it via <code style="background: rgba(255,255,255,0.05); padding: 1px 4px; border-radius: 3px; font-size: 10px;">--token</code> or set the <code style="background: rgba(255,255,255,0.05); padding: 1px 4px; border-radius: 3px; font-size: 10px;">DEFLAKY_TOKEN</code> env variable.
            </p>
          </div>
        </div>
      </div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>DeFlaky Local Report</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #0a0a0a;
      color: #e5e5e5;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      min-height: 100vh;
      padding: 32px 16px;
    }
    a { color: #4ade80; }
    code { font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace; }
    .container { max-width: 960px; margin: 0 auto; }
    .card {
      border-radius: 16px;
      border: 1px solid #1a1a2e;
      background: #111118;
      overflow: hidden;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);
    }
    .header {
      padding: 16px 24px;
      border-bottom: 1px solid #1a1a2e;
      background: rgba(26, 26, 46, 0.2);
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
    }
    .header-left { display: flex; align-items: center; gap: 12px; }
    .logo {
      width: 28px; height: 28px;
      border-radius: 8px;
      background: #4ade80;
      display: flex; align-items: center; justify-content: center;
      color: #000; font-weight: 700; font-size: 10px;
    }
    .header-title { font-size: 14px; font-weight: 700; }
    .header-sub { font-size: 10px; color: #888; }
    .header-right { display: flex; align-items: center; gap: 8px; }
    .pulse {
      width: 8px; height: 8px;
      border-radius: 50%;
      background: #4ade80;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
    .header-status { font-size: 10px; color: #4ade80; font-weight: 500; }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 1px;
      background: rgba(26, 26, 46, 0.3);
    }
    .stat-card {
      background: #111118;
      padding: 16px;
    }
    .stat-label {
      font-size: 10px;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .stat-value {
      font-size: 20px;
      font-weight: 700;
      margin-top: 4px;
    }
    .score-bar-container {
      width: 100%; height: 8px;
      border-radius: 9999px;
      background: rgba(26, 26, 46, 0.5);
      overflow: hidden;
      margin-top: 8px;
    }
    .score-bar {
      height: 100%;
      border-radius: 9999px;
      transition: width 1s ease-out;
    }
    .filter-bar {
      padding: 12px 24px;
      border-top: 1px solid #1a1a2e;
      border-bottom: 1px solid #1a1a2e;
      display: flex;
      align-items: center;
      gap: 4px;
      flex-wrap: wrap;
    }
    .filter-tab {
      font-size: 11px;
      padding: 4px 12px;
      border-radius: 9999px;
      font-weight: 500;
      cursor: pointer;
      border: none;
      background: transparent;
      color: #888;
      transition: all 0.2s;
    }
    .filter-tab:hover { color: #e5e5e5; }
    .filter-tab.active { background: #4ade80; color: #000; }
    table { width: 100%; border-collapse: collapse; }
    thead tr {
      text-align: left;
      font-size: 10px;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 1px solid #1a1a2e;
    }
    thead th { padding: 8px 24px; font-weight: 500; }
    .footer {
      padding: 12px 24px;
      border-top: 1px solid #1a1a2e;
      text-align: center;
      font-size: 10px;
      color: #555;
    }
    @media (max-width: 768px) {
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
      .hide-mobile { display: none; }
      body { padding: 16px 8px; }
    }
    @media (max-width: 480px) {
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <!-- Header -->
      <div class="header">
        <div class="header-left">
          <div class="logo">df</div>
          <div>
            <div class="header-title">DeFlaky Local Report</div>
            <div class="header-sub">${escapeHtml(command)} &middot; ${escapeHtml(formattedDate)}</div>
          </div>
        </div>
        <div class="header-right">
          <div class="pulse"></div>
          <span class="header-status">${runs} iterations complete</span>
        </div>
      </div>

      <!-- Stat Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">FlakeScore</div>
          <div class="stat-value" style="color: ${scoreColor};">${result.flakeScore.toFixed(1)}%</div>
          <div class="score-bar-container">
            <div class="score-bar" style="width: ${result.flakeScore}%; background: ${scoreColor};"></div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Total Tests</div>
          <div class="stat-value" style="color: #e5e5e5;">${result.totalTests}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Stable</div>
          <div class="stat-value" style="color: #4ade80;">${result.stableTests}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Flaky</div>
          <div class="stat-value" style="color: #facc15;">${result.flakyTests}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Failing</div>
          <div class="stat-value" style="color: #f87171;">${result.failingTests}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Total Duration</div>
          <div class="stat-value" style="color: #e5e5e5;">${totalDurationSec}s</div>
        </div>
      </div>

      <!-- Filter Tabs -->
      <div class="filter-bar">
        <button class="filter-tab active" onclick="filterTests('all')">All (${result.totalTests})</button>
        <button class="filter-tab" onclick="filterTests('passed')">Stable (${result.stableTests})</button>
        <button class="filter-tab" onclick="filterTests('flaky')">Flaky (${result.flakyTests})</button>
        <button class="filter-tab" onclick="filterTests('failed')">Failed (${result.failingTests})</button>
      </div>

      <!-- Test Results Table -->
      <div style="overflow-x: auto;">
        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th>Test Name</th>
              <th class="hide-mobile">File</th>
              <th style="text-align: center;">Results</th>
              <th style="text-align: right;">Pass Rate</th>
            </tr>
          </thead>
          <tbody id="test-table-body">
            ${testRows}
          </tbody>
        </table>
      </div>

      <!-- AI Analysis Section -->
      ${aiSection}

      <!-- Footer -->
      <div class="footer">
        Generated by <a href="https://deflaky.com" target="_blank">DeFlaky CLI</a>
      </div>
    </div>
  </div>

  <script>
    function filterTests(status) {
      var rows = document.querySelectorAll('#test-table-body tr');
      var tabs = document.querySelectorAll('.filter-tab');
      tabs.forEach(function(tab) { tab.classList.remove('active'); });
      event.target.classList.add('active');

      rows.forEach(function(row) {
        var badge = row.querySelector('span');
        if (!badge) return;
        var rowStatus = badge.textContent.trim().toLowerCase();
        if (status === 'all') {
          row.style.display = '';
        } else if (status === rowStatus) {
          row.style.display = '';
        } else {
          row.style.display = 'none';
        }
      });
    }
  </script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
