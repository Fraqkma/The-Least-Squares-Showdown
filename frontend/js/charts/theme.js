// Chart colours. Keep these in step with the "Chart series" block in css/tokens.css.
// OLS, Ridge, Lasso and gradient descent pass colour-blind separation checks on white.
export const colors = {
  ols: "#3a6aaf",
  ridge: "#b5503b",
  lasso: "#18978a",
  gd: "#d49a1e",
  train: "#26355e",
  validation: "#c29a2e",
  signal: "#9192b0",
  rust: "#b5503b",
  ink: "#37547c",
  inkSoft: "#41597a",
  muted: "#526385",
  grid: "#e8e6f0",
  axis: "#9192b0",
  surface: "#ffffff",
  surfaceRamp: [[0, "#f4f2f8"], [0.3, "#ccbac9"], [0.65, "#67769f"], [1, "#37547c"]],
};

export const fontFamily = '"Nunito Sans", "Segoe UI", system-ui, sans-serif';

export const plotConfig = { displayModeBar: false, responsive: true, scrollZoom: false };

export function axis(title, extra = {}) {
  return {
    title: { text: title, standoff: 10, font: { size: 14, color: colors.ink } },
    gridcolor: colors.grid,
    linecolor: colors.axis,
    zerolinecolor: colors.axis,
    tickfont: { size: 13, color: colors.inkSoft },
    automargin: true,
    ...extra,
  };
}

export function baseLayout(extra = {}) {
  return {
    autosize: true,
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: { family: fontFamily, size: 13, color: colors.ink },
    hoverlabel: { bgcolor: colors.surface, bordercolor: colors.axis, font: { family: fontFamily, size: 13, color: colors.ink } },
    legend: { orientation: "h", x: 0, y: -0.2, font: { size: 13, color: colors.ink } },
    ...extra,
  };
}
