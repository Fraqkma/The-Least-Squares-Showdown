// Chart colours. Keep these in step with the "Chart series" block in css/tokens.css.
// OLS, Ridge, Lasso and gradient descent pass the all-pairs colour-vision checks on white.
export const colors = {
  ols: "#00658d",
  ridge: "#b5503b",
  lasso: "#05a0a2",
  gd: "#d9a01e",
  train: "#042768",
  validation: "#c29a2e",
  signal: "#8c8f86",
  rust: "#7b2d24",
  ink: "#042768",
  inkSoft: "#33466e",
  muted: "#5b6782",
  grid: "#e6edf2",
  axis: "#a9bfcc",
  surface: "#ffffff",
  surfaceRamp: [[0, "#f3fafb"], [0.3, "#bfe6e8"], [0.65, "#3aa1b6"], [1, "#0b4f86"]],
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
