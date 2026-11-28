import { axis, baseLayout, colors, plotConfig } from "./theme.js";

export function renderFitChart(target, data, selection) {
  const defaultIndex = data.train.x.reduce(
    (best, x, index, values) => Math.abs(x - 0.5) < Math.abs(values[best] - 0.5) ? index : best,
    0,
  );
  const { set, index } = selection ?? { set: "train", index: defaultIndex };
  const residualX = data[set].x[index];
  const residualY = data[set].y[index];
  const residualFit = data.predictions[set].ridge[index];
  const traces = [
    { x: data.grid.x, y: data.grid.truth, type: "scatter", mode: "lines", name: "Known signal", line: { color: colors.signal, dash: "dash", width: 2 }, hovertemplate: "x %{x:.2f}<br>signal %{y:.3f}<extra>Known signal</extra>" },
    { x: data.grid.x, y: data.grid.ols, type: "scatter", mode: "lines", name: "OLS", line: { color: colors.ols, width: 3 }, hovertemplate: "x %{x:.2f}<br>fit %{y:.3f}<extra>OLS</extra>" },
    { x: data.grid.x, y: data.grid.ridge, type: "scatter", mode: "lines", name: "Ridge", line: { color: colors.ridge, width: 3, dash: "dash" }, hovertemplate: "x %{x:.2f}<br>fit %{y:.3f}<extra>Ridge</extra>" },
    { x: data.train.x, y: data.train.y, type: "scatter", mode: "markers", name: "Train", marker: { color: colors.train, size: 8, line: { color: colors.surface, width: 1.5 } }, customdata: data.train.y.map((y, i) => y - data.predictions.train.ridge[i]), hovertemplate: "train<br>x %{x:.3f}<br>y %{y:.3f}<br>Ridge residual %{customdata:.3f}<extra></extra>" },
    { x: data.validation.x, y: data.validation.y, type: "scatter", mode: "markers", name: "Validation", marker: { color: colors.validation, symbol: "diamond-open", size: 10, line: { color: colors.validation, width: 2 } }, hovertemplate: "validation<br>x %{x:.3f}<br>y %{y:.3f}<extra></extra>" },
  ];
  const layout = baseLayout({
    margin: { l: 56, r: 14, t: 8, b: 64 },
    hovermode: "closest",
    legend: { orientation: "h", x: 0, y: -0.2, font: { size: 13 }, traceorder: "normal" },
    xaxis: axis("Input x", { range: [0, 1], zeroline: false }),
    yaxis: axis("Observed response y", { zeroline: true }),
    shapes: [{ type: "line", x0: residualX, x1: residualX, y0: residualY, y1: residualFit, line: { color: colors.ridge, width: 2, dash: "dot" } }],
    annotations: [{ x: residualX, y: (residualY + residualFit) / 2, text: "residual", showarrow: false, xshift: residualX > 0.9 ? -32 : 32, font: { size: 13, color: colors.rust } }],
    uirevision: "seeded-fit",
  });
  return Plotly.react(target, traces, layout, plotConfig);
}
