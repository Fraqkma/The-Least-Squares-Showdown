export function renderCoefficientChart(target, coefficients) {
  const labels = coefficients.ols.map((_, index) => index === 0 ? "Intercept" : `w${subscript(index)}`);
  // A signed asinh scale keeps small Ridge bars visible beside large OLS bars.
  const scale = (value) => Math.asinh(value / 0.01);
  const ticks = [-10000, -100, -1, 0, 1, 100, 10000];
  return Plotly.react(target, [
    { x: labels, y: coefficients.ols.map(scale), customdata: coefficients.ols, type: "bar", name: "OLS", marker: { color: "#61c9b2" }, hovertemplate: "%{x}: %{customdata:+.4f}<extra>OLS</extra>" },
    { x: labels, y: coefficients.ridge.map(scale), customdata: coefficients.ridge, type: "bar", name: "Ridge", marker: { color: "#ef9a73" }, hovertemplate: "%{x}: %{customdata:+.4f}<extra>Ridge</extra>" },
  ], {
    autosize: true,
    height: 300,
    margin: { l: 66, r: 12, t: 30, b: 68 },
    paper_bgcolor: "transparent",
    plot_bgcolor: "transparent",
    font: { family: "Inter, system-ui, sans-serif", size: 11, color: "#eff5f1" },
    barmode: "group",
    bargap: 0.24,
    showlegend: true,
    legend: { orientation: "h", x: 0, y: 1.16, font: { size: 11 } },
    xaxis: { title: { text: "Training-standardized basis", standoff: 4 }, tickfont: { size: 10, color: "#c2d2ca" }, linecolor: "#4f6060", automargin: true },
    yaxis: { title: { text: "Signed value · nonlinear scale", standoff: 6 }, zeroline: true, zerolinecolor: "#eff5f1", zerolinewidth: 2, gridcolor: "#39484a", automargin: true, tickvals: ticks.map(scale), ticktext: ticks.map((value) => value > 0 ? `+${value}` : String(value)) },
    uirevision: "seeded-coefficients",
  }, { displayModeBar: false, responsive: true, scrollZoom: false });
}

function subscript(value) {
  return String(value).replace(/\d/g, (digit) => "₀₁₂₃₄₅₆₇₈₉"[Number(digit)]);
}
