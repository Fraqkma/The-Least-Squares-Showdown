import { axis, baseLayout, colors, plotConfig } from "./theme.js";

const modelColors = { OLS: colors.ols, Ridge: colors.ridge, Lasso: colors.lasso };
const solverColors = [colors.ols, colors.ridge, colors.lasso, colors.gd];

function chartAxis(title, type = "linear") {
  return axis(title, { type, zeroline: false, exponentformat: "power", showexponent: "all", nticks: 6 });
}

function layout(extra = {}) {
  return baseLayout({ margin: { l: 64, r: 16, t: 12, b: 70 }, legend: { orientation: "h", x: 0, y: -0.28, font: { size: 13 } }, ...extra });
}

export function renderBikeWindows(rows) {
  const traces = rows.map(({ method, windows }, i) => ({
    type: "scatter", mode: "lines+markers", name: method,
    x: windows.map((_, j) => j + 1), y: windows.map((window) => window.rmse),
    line: { color: modelColors[method] ?? solverColors[i], width: 2.5, dash: ["solid", "dash", "dot"][i] },
    marker: { color: modelColors[method] ?? solverColors[i], size: 14 - 3 * i, symbol: ["circle-open", "diamond-open", "circle"][i], line: { width: 2.5 } },
    hovertemplate: "%{y:.4f} rentals/hour<extra>" + method + "</extra>",
  }));
  return Plotly.react("bike-window-plot", traces, layout({
    hovermode: "x unified",
    xaxis: { ...chartAxis("Development window"), dtick: 1 },
    yaxis: chartAxis("RMSE (rentals/hour)"),
  }), plotConfig);
}

export function renderSolverTradeoff(rows) {
  const shapes = ["circle", "square", "diamond", "triangle-up"];
  const traces = rows.flatMap((row, i) => {
    if (!(row.seconds > 0 && row.coefficient_relative_error > 0)) return [];
    return [{
      type: "scatter", mode: "markers", name: row.method, x: [row.seconds], y: [row.coefficient_relative_error],
      marker: { color: solverColors[i], size: 15, symbol: shapes[i] + (row.status === "completed" ? "" : "-open"), line: { color: row.status === "completed" ? colors.surface : solverColors[i], width: 2 } },
      hovertemplate: "%{x:.3e} s<br>Relative error %{y:.3e}<extra>" + row.method + "</extra>",
    }];
  });
  return Plotly.react("solver-plot", traces, layout({
    xaxis: chartAxis("Median runtime (s)", "log"),
    yaxis: chartAxis("Relative coefficient error", "log"),
  }), plotConfig);
}

export function renderSyntheticDegrees(target, traces) {
  return Plotly.react(target, traces.map((trace) => ({
    ...trace,
    line: { color: modelColors[trace.name], width: 3, dash: { OLS: "solid", Ridge: "dash", Lasso: "dot" }[trace.name] },
    marker: { color: modelColors[trace.name], size: 8, symbol: { OLS: "circle", Ridge: "diamond", Lasso: "square" }[trace.name] },
  })), layout({
    margin: { l: 76, r: 16, t: 12, b: 70 },
    xaxis: { ...chartAxis("Polynomial degree"), dtick: 2, nticks: undefined },
    yaxis: { ...chartAxis("Validation MSE (log scale)", "log"), tickvals: [0.01, 0.1, 1, 10], ticktext: ["0.01", "0.1", "1", "10"], exponentformat: "none" },
  }), plotConfig);
}
