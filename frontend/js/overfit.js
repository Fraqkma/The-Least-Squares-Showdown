import { fetchDemo } from "./api.js";
import { axis, baseLayout, colors, plotConfig } from "./charts/theme.js";

const cases = [
  { key: "underfit", degree: 1, label: "Underfit" },
  { key: "goodfit", degree: 3, label: "Good fit" },
  { key: "overfit", degree: 12, label: "Overfit" },
];
const sharedRange = [-1.4, 1.4];
const format = (value) => value.toFixed(5);
const short = (value) => value.toFixed(3);

function fitTraces(data) {
  return [
    { x: data.grid.x, y: data.grid.ols, type: "scatter", mode: "lines", name: "OLS fit", line: { color: colors.ols, width: 3 }, hovertemplate: "x %{x:.2f}<br>fit %{y:.3f}<extra>OLS fit</extra>" },
    { x: data.train.x, y: data.train.y, type: "scatter", mode: "markers", name: "Training", marker: { color: colors.train, size: 7, line: { color: colors.surface, width: 1.2 } }, hovertemplate: "train x %{x:.2f}<br>y %{y:.3f}<extra></extra>" },
    { x: data.validation.x, y: data.validation.y, type: "scatter", mode: "markers", name: "Validation", marker: { color: colors.validation, symbol: "diamond-open", size: 9, line: { color: colors.validation, width: 2 } }, hovertemplate: "validation x %{x:.2f}<br>y %{y:.3f}<extra></extra>" },
  ];
}

function fitLayout(extra = {}) {
  return baseLayout({
    margin: { l: 50, r: 10, t: 8, b: 48 },
    showlegend: false,
    xaxis: axis("Input x", { range: [0, 1], zeroline: false }),
    yaxis: axis("Observed y", { range: sharedRange }),
    ...extra,
  });
}

function renderCase({ key }, data) {
  document.getElementById(`${key}-train`).textContent = format(data.metrics.ols.train_mse);
  document.getElementById(`${key}-validation`).textContent = format(data.metrics.ols.validation_mse);
  return Plotly.react(`${key}-plot`, fitTraces(data), fitLayout(), plotConfig);
}

function setBars(results) {
  const largest = Math.max(...results.flatMap((data) => [data.metrics.ols.train_mse, data.metrics.ols.validation_mse]));
  cases.forEach(({ key }, index) => {
    const card = document.querySelector(`.overfit-card[data-case="${key}"]`);
    const { train_mse: train, validation_mse: validation } = results[index].metrics.ols;
    card.querySelector(".mse-bar-train i").style.width = `${(100 * train) / largest}%`;
    card.querySelector(".mse-bar-validation i").style.width = `${(100 * validation) / largest}%`;
  });
}

function describeTrend(results) {
  const train = results.map((data) => data.metrics.ols.train_mse);
  const validation = results.map((data) => data.metrics.ols.validation_mse);
  const degrees = cases.map(({ degree }) => degree).join(", ");
  const trainFalls = train[0] > train[1] && train[1] > train[2];
  const validationDips = validation[1] < validation[0] && validation[1] < validation[2];
  const trainText = trainFalls
    ? `training MSE keeps falling: ${train.map(short).join(" → ")}`
    : `training MSE moves ${train.map(short).join(" → ")}`;
  const validationText = validationDips
    ? `validation MSE falls to ${short(validation[1])} and then rises to ${short(validation[2])}`
    : `validation MSE moves ${validation.map(short).join(" → ")}`;
  const verdict = validationDips
    ? `Degree ${cases[1].degree} predicts the validation points best of the three. Degree ${cases[2].degree} fits the training points most closely and still predicts new points worst.`
    : "On this split the validation errors do not form a clear dip, so compare the curves directly.";
  return `As degree rises (${degrees}), ${trainText}, while ${validationText}. ${verdict}`;
}

function renderComparison(results) {
  const labels = cases.map(({ degree, label }) => `${label}<br>degree ${degree}`);
  const bars = [
    ["Train MSE", colors.train, (data) => data.metrics.ols.train_mse],
    ["Validation MSE", colors.validation, (data) => data.metrics.ols.validation_mse],
  ].map(([name, color, pick]) => ({
    type: "bar",
    name,
    x: labels,
    y: results.map(pick),
    text: results.map((data) => short(pick(data))),
    textposition: "outside",
    cliponaxis: false,
    textfont: { size: 13, color: colors.ink },
    marker: { color, line: { color: colors.surface, width: 1.5 } },
    hovertemplate: `%{x}<br>${name} %{y:.5f}<extra></extra>`,
  }));
  return Plotly.react("overfit-mse-chart", bars, baseLayout({
    margin: { l: 58, r: 10, t: 30, b: 64 },
    barmode: "group",
    bargap: 0.3,
    bargroupgap: 0.08,
    legend: { orientation: "h", x: 0, y: 1.14, font: { size: 13 } },
    xaxis: axis("", { showgrid: false, tickfont: { size: 13, color: colors.ink } }),
    yaxis: axis("MSE (lower is better)", { rangemode: "tozero" }),
  }), plotConfig);
}

async function loadComparison() {
  const status = document.getElementById("overfit-status");
  status.textContent = "Loading the fixed comparison…";
  try {
    const data = await Promise.all(cases.map(({ degree }) => fetchDemo({ degree, lambda: 0 })));
    const reference = data[0];
    for (const item of data.slice(1)) {
      if (JSON.stringify(item.train) !== JSON.stringify(reference.train)
          || JSON.stringify(item.validation) !== JSON.stringify(reference.validation)) {
        throw new Error("The fixed cases did not share the same observations.");
      }
    }
    await Promise.all(cases.map((entry, index) => renderCase(entry, data[index])));
    setBars(data);
    document.getElementById("overfit-trend-text").textContent = describeTrend(data);
    await renderComparison(data);
    status.textContent = "Seed 42, noise standard deviation (SD) 0.2, and the same 24 training and 24 validation points in every panel. Every panel is an ordinary least squares (OLS) fit.";
  } catch (error) {
    for (const { key } of cases) {
      document.getElementById(`${key}-train`).textContent = "—";
      document.getElementById(`${key}-validation`).textContent = "—";
    }
    document.getElementById("overfit-trend-text").textContent = "The measured errors are unavailable until the fixed comparison loads.";
    status.textContent = `Fixed comparison unavailable: ${error.message}. `;
    const retry = document.createElement("button");
    retry.type = "button";
    retry.className = "inline-retry";
    retry.textContent = "Try again";
    retry.addEventListener("click", loadComparison);
    status.append(retry);
  }
}

// The explorer follows the shared Degree control, so the fixed cards never change underneath it.
document.addEventListener("demoupdate", ({ detail: data }) => {
  document.getElementById("explore-heading").textContent = `OLS at degree ${data.degree}`;
  const outside = data.grid.ols.some((value) => value < sharedRange[0] || value > sharedRange[1]);
  Plotly.react("explore-chart", fitTraces(data), fitLayout({
    margin: { l: 56, r: 12, t: outside ? 30 : 8, b: 52 },
    annotations: outside ? [{ xref: "paper", yref: "paper", x: 1, y: 1.08, showarrow: false, xanchor: "right", text: "The curve leaves the shared axes in places", font: { size: 13, color: colors.inkSoft } }] : [],
  }), plotConfig);
});
document.addEventListener("demoerror", () => {
  document.getElementById("explore-heading").textContent = "OLS explorer unavailable";
});

loadComparison();
