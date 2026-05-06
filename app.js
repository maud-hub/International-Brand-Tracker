(function () {
  const data = window.trackerData;
  const state = {
    metric: "unaided",
    wave: data.latestWave,
    market: "All",
    competitorMetric: "unaided",
    competitorMarket: "Canada",
    deepDiveMarket: "Canada"
  };

  const colors = {
    Shapermint: "#0f766e",
    Spanx: "#2f5caa",
    Skims: "#c5533e",
    Knix: "#7a4f8f",
    Honeylove: "#b57b19",
    Maidenform: "#6b7280",
    Berlei: "#2f7d4f",
    "Nancy Ganz": "#a8554f",
    heyShape: "#6a8d92",
    Miraclesuit: "#7c6f64",
    Heist: "#4b5563",
    Canada: "#0f766e",
    AU: "#b57b19",
    UK: "#7a4f8f",
    default: "#5f6f7b"
  };

  const metricLabels = {
    unaided: "Unaided",
    aided: "Aided"
  };

  const movementLabels = {
    unaided: "Unaided awareness",
    aided: "Aided awareness",
    everCurrent: "Ever/current usage",
    currentUse: "Current use",
    futureIntent: "Future intent"
  };

  function pct(value) {
    return `${Number(value).toFixed(1)}%`;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function safeUrl(value) {
    return String(value || "").startsWith("https://") ? value : "#";
  }

  function deltaClass(value) {
    if (value > 0.05) return "delta-up";
    if (value < -0.05) return "delta-down";
    return "delta-flat";
  }

  function deltaText(value) {
    const rounded = Number(value).toFixed(1);
    if (value > 0.05) return `+${rounded} pts`;
    if (value < -0.05) return `${rounded} pts`;
    return "0.0 pts";
  }

  function setActive(container, value) {
    [...container.querySelectorAll("button")].forEach((button) => {
      button.classList.toggle("is-active", button.dataset.value === value);
    });
  }

  function makeButtons(containerId, values, active, onClick, labels = {}) {
    const container = document.getElementById(containerId);
    container.innerHTML = values
      .map((value) => {
        const label = labels[value] || value;
        const activeClass = value === active ? " is-active" : "";
        return `<button type="button" class="${activeClass}" data-value="${escapeHtml(value)}">${escapeHtml(label)}</button>`;
      })
      .join("");
    container.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button) return;
      onClick(button.dataset.value);
      setActive(container, button.dataset.value);
    });
  }

  function sortedEntries(object) {
    return Object.entries(object || {}).sort((a, b) => b[1] - a[1]);
  }

  function getAllMarketRows(metric, wave) {
    return data.markets.map((market) => ({
      label: data.marketNames[market],
      value: data.shapermint[metric][market][wave],
      color: colors[market]
    }));
  }

  function getBrandRows(metric, wave, market) {
    return sortedEntries(data.awareness[metric][wave][market]).map(([label, value]) => ({
      label,
      value,
      color: colors[label] || colors.default
    }));
  }

  function renderBars(container, rows, maxValue) {
    const max = maxValue || Math.max(1, ...rows.map((row) => row.value));
    container.innerHTML = rows
      .map((row) => {
        const width = Math.max(2, (row.value / max) * 100);
        const title = `${row.label}: ${pct(row.value)}`;
        return `
          <div class="bar-row" title="${escapeHtml(title)}">
            <div class="bar-label">${escapeHtml(row.label)}</div>
            <div class="bar-track">
              <div class="bar-fill" style="width:${width}%; background:${row.color || colors.default}"></div>
            </div>
            <div class="bar-value">${pct(row.value)}</div>
          </div>
        `;
      })
      .join("");
  }

  function colorFor(label, index = 0) {
    const fallback = ["#5f6f7b", "#a8554f", "#2f7d4f", "#7c6f64", "#7a4f8f"];
    return colors[label] || fallback[index % fallback.length];
  }

  function niceMax(value) {
    if (value <= 10) return 10;
    if (value <= 25) return 25;
    if (value <= 60) return 60;
    return 100;
  }

  function renderLineSeries(container, series, options = {}) {
    const waves = data.waves;
    const width = 560;
    const height = 248;
    const chart = { left: 42, right: 520, top: 24, bottom: 178 };
    const observedMax = Math.max(
      1,
      ...series.flatMap((item) => waves.map((wave) => item.values[wave]).filter((value) => value !== undefined))
    );
    const maxValue = options.maxValue || niceMax(observedMax);
    const midValue = maxValue / 2;
    const xFor = (index) => chart.left + index * ((chart.right - chart.left) / (waves.length - 1));
    const yFor = (value) => chart.bottom - (value / maxValue) * (chart.bottom - chart.top);
    const pointsFor = (item) =>
      waves
        .map((wave, index) => {
          const value = item.values[wave];
          if (value === undefined || value === null) return null;
          return { wave, value, x: xFor(index), y: yFor(value) };
        })
        .filter(Boolean);
    const polyline = (points) => points.map((point) => `${point.x},${point.y}`).join(" ");
    const valueLabels = (points, labelPosition) =>
      options.showValues
        ? points
            .map((point) => {
              const labelY = labelPosition === "above" ? point.y - 10 : point.y + 18;
              return `<text x="${point.x}" y="${labelY}" text-anchor="middle" class="line-value">${pct(point.value)}</text>`;
            })
            .join("")
        : "";
    const svgSeries = series
      .map((item, index) => {
        const points = pointsFor(item);
        if (!points.length) return "";
        const color = item.color || colorFor(item.label, index);
        const labelPosition = index % 2 === 0 ? "above" : "below";
        return `
          <polyline points="${polyline(points)}" class="trend-line" style="stroke:${color}"></polyline>
          ${points
            .map(
              (point) => `
                <circle cx="${point.x}" cy="${point.y}" r="4.5" fill="${color}">
                  <title>${escapeHtml(`${item.label}, ${point.wave}: ${pct(point.value)}`)}</title>
                </circle>
              `
            )
            .join("")}
          ${valueLabels(points, labelPosition)}
        `;
      })
      .join("");
    const legend = series
      .map((item, index) => {
        const latest = item.values[data.latestWave];
        const latestText = latest === undefined ? "" : ` ${pct(latest)}`;
        return `<span><i class="dot" style="background:${item.color || colorFor(item.label, index)}"></i>${escapeHtml(item.label)}${latestText}</span>`;
      })
      .join("");

    container.innerHTML = `
      <div class="line-wrap">
        <svg class="line-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(options.label || "Awareness trend")}">
          <line x1="${chart.left}" x2="${chart.right}" y1="${chart.bottom}" y2="${chart.bottom}" class="grid-line"></line>
          <line x1="${chart.left}" x2="${chart.right}" y1="${yFor(midValue)}" y2="${yFor(midValue)}" class="grid-line"></line>
          <line x1="${chart.left}" x2="${chart.right}" y1="${chart.top}" y2="${chart.top}" class="grid-line"></line>
          <text x="10" y="${chart.bottom + 4}" class="axis-label">0</text>
          <text x="6" y="${yFor(midValue) + 4}" class="axis-label">${midValue}</text>
          <text x="2" y="${chart.top + 4}" class="axis-label">${maxValue}</text>
          ${svgSeries}
          ${waves
            .map((wave, index) => `<text x="${xFor(index)}" y="216" text-anchor="middle" class="axis-label">${escapeHtml(wave)}</text>`)
            .join("")}
        </svg>
      </div>
      <div class="legend line-legend">${legend}</div>
    `;
  }

  function renderAwareness() {
    const container = document.getElementById("awarenessChart");
    const title = document.getElementById("awarenessChartTitle");
    const note = document.getElementById("awarenessChartNote");

    const rows =
      state.market === "All"
        ? getAllMarketRows(state.metric, state.wave)
        : getBrandRows(state.metric, state.wave, state.market);

    title.textContent =
      state.market === "All"
        ? `Shapermint ${metricLabels[state.metric].toLowerCase()} awareness`
        : `${data.marketNames[state.market]} competitive set ${metricLabels[state.metric].toLowerCase()} awareness`;
    note.textContent =
      state.market === "All"
        ? `${state.wave}, compared across markets.`
        : `${state.wave}, selected competitor set.`;

    renderBars(container, rows, state.metric === "aided" ? 100 : undefined);
  }

  function renderCompetitorAwareness() {
    const market = state.competitorMarket;
    const metric = state.competitorMetric;
    const brands = Array.from(
      new Set(data.waves.flatMap((wave) => Object.keys(data.awareness[metric][wave][market] || {})))
    );
    const series = brands.map((brand, index) => ({
      label: brand,
      color: colorFor(brand, index),
      values: Object.fromEntries(
        data.waves.map((wave) => [wave, data.awareness[metric][wave][market]?.[brand]])
      )
    }));
    renderLineSeries(document.getElementById("competitorChart"), series, {
      maxValue: metric === "aided" ? 100 : undefined,
      showValues: false,
      label: `${data.marketNames[market]} ${metricLabels[metric].toLowerCase()} competitor awareness`
    });
  }

  function movement(metric, market) {
    const series = data.shapermint[metric][market];
    const latest = series["H1 2026"];
    const hoh = latest - series["H2 2025"];
    const yoy = latest - series["H1 2025"];
    return { latest, hoh, yoy };
  }

  function renderComparisonTable() {
    const groups = [
      {
        label: "Awareness",
        description: "Share of total sample who mention Shapermint unaided or recognize it when prompted.",
        rows: ["unaided", "aided"].flatMap((metric) =>
          data.markets.map((market) => ({ metric, market, ...movement(metric, market) }))
        )
      },
      {
        label: "Usage",
        description: "Prompted relationship: ever purchased/currently use, plus current use only.",
        rows: ["everCurrent", "currentUse"].flatMap((metric) =>
          data.markets.map((market) => ({ metric, market, ...movement(metric, market) }))
        )
      },
      {
        label: "Intent",
        description: "Future Shapermint shopping intent is trended; consideration and first choice were added in H1 2026.",
        rows: [
          ...data.markets.map((market) => ({ metric: "futureIntent", market, ...movement("futureIntent", market) })),
          ...data.markets.map((market) => ({
            metric: "consideration",
            market,
            latest: data.shapermint.consideration[market]["H1 2026"],
            hoh: null,
            yoy: null
          })),
          ...data.markets.map((market) => ({
            metric: "firstChoice",
            market,
            latest: data.shapermint.firstChoice[market]["H1 2026"],
            hoh: null,
            yoy: null
          }))
        ]
      }
    ];

    const rowName = {
      ...movementLabels,
      consideration: "Consideration",
      firstChoice: "First choice"
    };

    const deltaCell = (value) =>
      value === null
        ? `<td class="number delta-flat">H1 2026 only</td>`
        : `<td class="number ${deltaClass(value)}">${deltaText(value)}</td>`;

    document.getElementById("comparisonTable").innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Metric</th>
            <th>Market</th>
            <th class="number">H1 2026</th>
            <th class="number">HoH</th>
            <th class="number">YoY</th>
          </tr>
        </thead>
        <tbody>
          ${groups
            .map(
              (group) => `
                <tr class="group-row">
                  <td colspan="5">
                    <strong>${escapeHtml(group.label)}</strong>
                    <span>${escapeHtml(group.description)}</span>
                  </td>
                </tr>
                ${group.rows
                  .map(
                    (row) => `
                <tr>
                  <td>${escapeHtml(rowName[row.metric])}</td>
                  <td>${escapeHtml(data.marketNames[row.market])}</td>
                  <td class="number">${pct(row.latest)}</td>
                  ${deltaCell(row.hoh)}
                  ${deltaCell(row.yoy)}
                </tr>
              `
                  )
                  .join("")}
              `
            )
            .join("")}
        </tbody>
      </table>
    `;
  }

  function renderCrossMarketInsights() {
    document.getElementById("crossMarketInsights").innerHTML = data.crossMarketInsights
      .map((item) => `<li>${escapeHtml(item)}</li>`)
      .join("");
  }

  function renderDeepDive() {
    const market = state.deepDiveMarket;
    const view = data.latest[market];
    const metrics = view.latestMetrics;
    const movementRows = ["unaided", "aided", "everCurrent", "currentUse", "futureIntent"]
      .map((metric) => ({ metric, ...movement(metric, market) }));

    document.getElementById("deepDive").innerHTML = `
      <div class="deep-layout">
        <article class="panel narrative">
          <div>
            <p class="eyebrow">${escapeHtml(data.marketNames[market])}</p>
            <h3>${escapeHtml(view.headline)}</h3>
          </div>
          <p>Sample: n=${view.sample.toLocaleString()} in ${data.latestWave}.</p>
          <div class="pill-list">
            ${Object.entries(metrics)
              .map(([label, value]) => `<span class="pill">${escapeHtml(label)} ${pct(value)}</span>`)
              .join("")}
          </div>
          <div class="callout">
            <strong>Evolution read:</strong>
            <ul>
              ${view.evolution.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
            </ul>
          </div>
        </article>

        <article class="panel">
          <div class="panel-head">
            <h3>Movement table</h3>
            <p>H1 2026 versus H2 2025 and H1 2025.</p>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Metric</th>
                  <th class="number">H1 2026</th>
                  <th class="number">HoH</th>
                  <th class="number">YoY</th>
                </tr>
              </thead>
              <tbody>
                ${movementRows
                  .map(
                    (row) => `
                      <tr>
                        <td>${escapeHtml(movementLabels[row.metric])}</td>
                        <td class="number">${pct(row.latest)}</td>
                        <td class="number ${deltaClass(row.hoh)}">${deltaText(row.hoh)}</td>
                        <td class="number ${deltaClass(row.yoy)}">${deltaText(row.yoy)}</td>
                      </tr>
                    `
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        </article>
      </div>

      <article class="panel macro-panel">
        <div class="panel-head">
          <div>
            <h3>Macroeconomic context</h3>
            <p class="panel-subtitle">H1 2026 developments that could be shaping consumer confidence and sales.</p>
          </div>
        </div>
        <div class="table-wrap">
          <table class="macro-table">
            <thead>
              <tr>
                <th>Theme</th>
                <th>Development</th>
                <th>Potential sales impact</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              ${view.macro
                .map(
                  (row) => `
                    <tr>
                      <td><strong>${escapeHtml(row.theme)}</strong></td>
                      <td>${escapeHtml(row.development)}</td>
                      <td>${escapeHtml(row.implication)}</td>
                      <td><a href="${escapeHtml(safeUrl(row.url))}" target="_blank" rel="noreferrer">${escapeHtml(row.source)}</a></td>
                    </tr>
                  `
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </article>

      <div class="detail-grid">
        <article class="detail-block">
          <h4>Market context</h4>
          <ul>${view.marketContext.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        </article>
        <article class="detail-block">
          <h4>Associations</h4>
          <ul>${view.associations.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        </article>
        <article class="detail-block">
          <h4>Shapermint barriers</h4>
          <ul>${view.barriers.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        </article>
      </div>
    `;
  }

  function initControls() {
    makeButtons(
      "metricControls",
      ["unaided", "aided"],
      state.metric,
      (value) => {
        state.metric = value;
        renderAwareness();
      },
      metricLabels
    );

    makeButtons("waveControls", data.waves, state.wave, (value) => {
      state.wave = value;
      renderAwareness();
    });

    makeButtons(
      "marketControls",
      ["All", ...data.markets],
      state.market,
      (value) => {
        state.market = value;
        renderAwareness();
      },
      { All: "All Markets", ...data.marketNames }
    );

    makeButtons(
      "competitorMetricControls",
      ["unaided", "aided"],
      state.competitorMetric,
      (value) => {
        state.competitorMetric = value;
        renderCompetitorAwareness();
      },
      metricLabels
    );

    makeButtons(
      "competitorMarketControls",
      data.markets,
      state.competitorMarket,
      (value) => {
        state.competitorMarket = value;
        renderCompetitorAwareness();
      },
      data.marketNames
    );

    makeButtons(
      "deepDiveTabs",
      data.markets,
      state.deepDiveMarket,
      (value) => {
        state.deepDiveMarket = value;
        renderDeepDive();
      },
      data.marketNames
    );
  }

  function init() {
    initControls();
    renderAwareness();
    renderCompetitorAwareness();
    renderComparisonTable();
    renderCrossMarketInsights();
    renderDeepDive();
  }

  init();
})();
