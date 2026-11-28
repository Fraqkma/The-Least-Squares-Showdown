import { axis, baseLayout, colors, plotConfig } from "./theme.js";

export function renderCoefficientChart(target, coefficients) {
  const labels = coefficients.ols.map((_, index) => index === 0 ? "Intercept" : `w${subscript(index)}`);
  // A signed asinh scale keeps small Ridge bars visible beside large OLS bars.
  const scale = (value) => Math.asinh(value / 0.01);
  const ticks = [-10000, -100, -1, 0, 1, 100, 10000];
  return Plotly.react(target, [
    { x: labels, y: coefficients.ols.map(scale), customdata: coefficients.ols, type: "bar", name: "OLS", marker: { color: colors.ols, line: { color: colors.surface, width: 1 } }, hovertemplate: "%{x}: %{customdata:+.4f}<extra>OLS</extra>" },
    { x: labels, y: coefficients.ridge.map(scale), customdata: coefficients.ridge, type: "bar", name: "Ridge", marker: { color: colors.ridge, line: { color: colors.surface, width: 1 } }, hovertemplate: "%{x}: %{customdata:+.4f}<extra>Ridge</extra>" },
  ], baseLayout({
    margin: { l: 70, r: 12, t: 36, b: 64 },
    barmode: "group",
    bargap: 0.22,
    bargroupgap: 0.06,
    showlegend: true,
    legend: { orientation: "h", x: 0, y: 1.14, font: { size: 13 } },
    xaxis: axis("Training-standardized basis", { tickfont: { size: 13, color: colors.inkSoft }, showgrid: false }),
    yaxis: axis("Signed value, nonlinear scale", { zeroline: true, zerolinecolor: colors.ink, zerolinewidth: 2, tickvals: ticks.map(scale), ticktext: ticks.map((value) => value > 0 ? `+${value.toLocaleString("en-US")}` : value.toLocaleString("en-US")) }),
    uirevision: "seeded-coefficients",
  }), plotConfig);
}

function subscript(value) {
  return String(value).replace(/\d/g, (digit) => "₀₁₂₃₄₅₆₇₈₉"[Number(digit)]);
}
