import { fetchDemo } from "./api.js";

const cases = [
  { key: "underfit", degree: 1 },
  { key: "goodfit", degree: 3 },
  { key: "overfit", degree: 12 },
];

const colors = { line: "#61c9b2", train: "#d9eee5", validation: "#eec273" };

function renderCase({ key }, data) {
  const traces = [
    { x: data.grid.x, y: data.grid.ols, type: "scatter", mode: "lines", name: "OLS fit", line: { color: colors.line, width: 3 }, hovertemplate: "x %{x:.2f}<br>fit %{y:.3f}<extra>OLS fit</extra>" },
    { x: data.train.x, y: data.train.y, type: "scatter", mode: "markers", name: "Training", marker: { color: colors.train, size: 6, line: { color: "#101719", width: 1 } }, hovertemplate: "train x %{x:.2f}<br>y %{y:.3f}<extra></extra>" },
    { x: data.validation.x, y: data.validation.y, type: "scatter", mode: "markers", name: "Validation", marker: { color: colors.validation, symbol: "diamond-open", size: 8, line: { color: colors.validation, width: 1.5 } }, hovertemplate: "validation x %{x:.2f}<br>y %{y:.3f}<extra></extra>" },
  ];
  document.getElementById(`${key}-train`).textContent = data.metrics.ols.train_mse.toFixed(5);
  document.getElementById(`${key}-validation`).textContent = data.metrics.ols.validation_mse.toFixed(5);
  return Plotly.react(`${key}-plot`, traces, {
    height: 265,
    margin: { l: 43, r: 8, t: 8, b: 42 },
    paper_bgcolor: "#1b2527", plot_bgcolor: "#1b2527",
    font: { color: "#c2d2ca", size: 11 },
    showlegend: false,
    xaxis: { title: "Input x", range: [0, 1], gridcolor: "#39484a", zeroline: false },
    yaxis: { title: "Observed y", range: [-1.4, 1.4], gridcolor: "#39484a", zerolinecolor: "#5a686a" },
  }, { displayModeBar: false, responsive: true });
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
    status.textContent = "Seed 42 · noise standard deviation (SD) 0.2 · same 24 training and 24 validation points · ordinary least squares (OLS) in every panel.";
  } catch (error) {
    for (const { key } of cases) {
      document.getElementById(`${key}-train`).textContent = "—";
      document.getElementById(`${key}-validation`).textContent = "—";
    }
    status.textContent = `Fixed comparison unavailable: ${error.message}. `;
    const retry = document.createElement("button");
    retry.type = "button";
    retry.className = "inline-retry";
    retry.textContent = "Try again";
    retry.addEventListener("click", loadComparison);
    status.append(retry);
  }
}

loadComparison();
