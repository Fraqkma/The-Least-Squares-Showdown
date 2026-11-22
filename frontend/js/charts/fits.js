const colors = {
  grid: "rgba(225, 239, 233, 0.16)",
  ink: "#eff5f1",
  muted: "#c2d2ca",
  ols: "#61c9b2",
  ridge: "#ef9a73",
  train: "#d9eee5",
  validation: "#eec273",
};

export function renderFitChart(target, data) {
  const trainIndex = data.train.x.reduce(
    (best, x, index, values) => Math.abs(x - 0.5) < Math.abs(values[best] - 0.5) ? index : best,
    0,
  );
  const residualX = data.train.x[trainIndex];
  const residualY = data.train.y[trainIndex];
  const residualFit = interpolate(data.grid.x, data.grid.ols, residualX);
  const traces = [
    { x: data.grid.x, y: data.grid.truth, type: "scatter", mode: "lines", name: "Known signal", line: { color: "#9aa39e", dash: "dot", width: 1.5 }, hovertemplate: "x %{x:.2f}<br>signal %{y:.3f}<extra>Known signal</extra>" },
    { x: data.grid.x, y: data.grid.ols, type: "scatter", mode: "lines", name: "OLS", line: { color: colors.ols, width: 2.5 }, hovertemplate: "x %{x:.2f}<br>fit %{y:.3f}<extra>OLS</extra>" },
    { x: data.grid.x, y: data.grid.ridge, type: "scatter", mode: "lines", name: "Ridge", line: { color: colors.ridge, width: 2.5 }, hovertemplate: "x %{x:.2f}<br>fit %{y:.3f}<extra>Ridge</extra>" },
    { x: data.train.x, y: data.train.y, type: "scatter", mode: "markers", name: "Train", marker: { color: colors.train, size: 7, line: { color: "#101719", width: 1 } }, customdata: data.train.x.map((_, i) => data.train.y[i] - interpolate(data.grid.x, data.grid.ols, data.train.x[i])), hovertemplate: "train<br>x %{x:.3f}<br>y %{y:.3f}<br>residual %{customdata:.3f}<extra></extra>" },
    { x: data.validation.x, y: data.validation.y, type: "scatter", mode: "markers", name: "Validation", marker: { color: colors.validation, symbol: "diamond-open", size: 9, line: { color: colors.validation, width: 1.5 } }, hovertemplate: "validation<br>x %{x:.3f}<br>y %{y:.3f}<extra></extra>" },
  ];
  const layout = {
    autosize: true,
    height: 356,
    margin: { l: 48, r: 12, t: 8, b: 56 },
    paper_bgcolor: "transparent",
    plot_bgcolor: "transparent",
    font: { family: "Inter, system-ui, sans-serif", size: 12, color: colors.ink },
    hovermode: "closest",
    legend: { orientation: "h", x: 0, y: -0.24, font: { size: 11 }, traceorder: "normal" },
    xaxis: { title: { text: "Input x", standoff: 8 }, range: [0, 1], zeroline: false, gridcolor: colors.grid, linecolor: colors.grid, tickfont: { color: colors.muted }, automargin: true },
    yaxis: { title: { text: "Observed response y", standoff: 8 }, zeroline: true, zerolinecolor: colors.grid, gridcolor: colors.grid, linecolor: colors.grid, tickfont: { color: colors.muted }, automargin: true },
    shapes: [{ type: "line", x0: residualX, x1: residualX, y0: residualY, y1: residualFit, line: { color: colors.ridge, width: 1.5, dash: "dot" } }],
    annotations: [{ x: residualX, y: (residualY + residualFit) / 2, text: "residual", showarrow: false, xshift: 32, font: { size: 10, color: colors.ridge } }],
    uirevision: "seeded-fit",
  };
  return Plotly.react(target, traces, layout, { displayModeBar: false, responsive: true, scrollZoom: false });
}

function interpolate(xs, ys, x) {
  let nearest = 0;
  for (let i = 1; i < xs.length; i += 1) {
    if (Math.abs(xs[i] - x) < Math.abs(xs[nearest] - x)) nearest = i;
  }
  return ys[nearest];
}
