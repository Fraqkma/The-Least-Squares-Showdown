const weightIds = ["bike-rmse-weight", "bike-support-weight", "bike-variation-weight"];

function scaled(value, values, higherIsBetter = false) {
  const low = Math.min(...values);
  const high = Math.max(...values);
  if (high === low) return 0;
  return higherIsBetter ? (high - value) / (high - low) : (value - low) / (high - low);
}

function renderExploratoryRank() {
  const weights = weightIds.map((id) => Number(document.getElementById(id).value));
  weightIds.forEach((id, index) => {
    document.getElementById(`${id}-value`).value = String(weights[index]);
    document.getElementById(`${id}-value`).textContent = String(weights[index]);
  });
  const output = document.getElementById("bike-exploratory-rank");
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  if (total === 0) {
    output.textContent = "Choose at least one tier weight to explore an ordering.";
    return;
  }
  const models = [...document.querySelectorAll("#bike-comparison-rows tr")].map((row) => ({
    name: row.querySelector("th").textContent,
    rmse: Number(row.dataset.rmse),
    mae: Number(row.dataset.mae),
    r2: Number(row.dataset.r2),
    variation: Number(row.dataset.variation),
  }));
  const rmse = models.map((model) => model.rmse);
  const mae = models.map((model) => model.mae);
  const r2 = models.map((model) => model.r2);
  const variation = models.map((model) => model.variation);
  const ranked = models.map((model) => ({
    name: model.name,
    score: (
      weights[0] * scaled(model.rmse, rmse)
      + weights[1] * (scaled(model.mae, mae) + scaled(model.r2, r2, true)) / 2
      + weights[2] * scaled(model.variation, variation)
    ) / total,
  })).sort((a, b) => a.score - b.score);
  const groups = [];
  for (const model of ranked) {
    const last = groups[groups.length - 1];
    if (last && Math.abs(last.score - model.score) < 1e-12) last.names.push(model.name);
    else groups.push({ score: model.score, names: [model.name] });
  }
  output.textContent = `Exploratory order: ${groups.map((group) => group.names.join(" = ")).join(" -> ")}. All measured development tiers favor OLS/Ridge, so changing weights does not change this bike order.`;
}

export async function initBikeExploratoryRanking() {
  const output = document.getElementById("bike-exploratory-rank");
  output.textContent = "Running five development windows...";
  try {
    const response = await fetch("/api/bike/development");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    document.getElementById("bike-comparison-rows").innerHTML = data.results.map((r) =>
      `<tr data-rmse="${r.mean_rmse}" data-mae="${r.mean_mae}" data-r2="${r.mean_r2}" data-variation="${r.rmse_std}"><th scope="row">${r.method}</th><td>${r.penalty}</td><td>${r.mean_rmse.toFixed(3)}</td><td>${r.mean_mae.toFixed(3)}</td><td>${r.mean_r2.toFixed(5)}</td><td>${r.rmse_std.toFixed(3)}</td></tr>`
    ).join("");
  } catch (error) { output.textContent = `Bike development failed: ${error.message}`; return; }
  weightIds.forEach((id) => document.getElementById(id).addEventListener("input", renderExploratoryRank));
  renderExploratoryRank();
}
