import { renderBikeWindows } from "./charts/battles.js";
import { renderRaceStrip } from "./race-strip.js";

const weightIds = ["bike-rmse-weight", "bike-support-weight", "bike-variation-weight"];
let listenersBound = false;
let lastBikeRace = [];

function scaled(value, values, higherIsBetter = false) {
  const low = Math.min(...values);
  const high = Math.max(...values);
  if (high === low) return 0;
  return higherIsBetter ? (high - value) / (high - low) : (value - low) / (high - low);
}

function formatSetting(row) {
  if (row.method === "Ridge") return `λ = ${row.penalty}`;
  if (row.method === "Lasso") return `α = ${row.penalty}`;
  return "None";
}

function bindWeightListeners() {
  if (listenersBound) return;
  weightIds.forEach((id) => document.getElementById(id).addEventListener("input", renderExploratoryRank));
  listenersBound = true;
}

export function getBikeRaceEntries() {
  return lastBikeRace;
}

export function renderExploratoryRank() {
  const weights = weightIds.map((id) => Number(document.getElementById(id).value));
  weightIds.forEach((id, index) => {
    const out = document.getElementById(`${id}-value`);
    out.value = String(weights[index]);
    out.textContent = String(weights[index]);
  });
  const output = document.getElementById("bike-exploratory-rank");
  const rows = [...document.querySelectorAll("#bike-comparison-rows tr[data-rmse]")];
  if (!rows.length) {
    output.textContent = "Development validation results are required before computing an exploratory order.";
    lastBikeRace = [];
    if (!document.getElementById("bike-view")?.hidden) {
      renderRaceStrip("battle-a-race", [], "Bike Sharing · development order");
    }
    return;
  }
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  if (total === 0) {
    output.textContent = "Choose at least one tier weight to explore an ordering.";
    return;
  }
  const models = rows.map((row) => ({
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
  output.textContent = `Exploratory order: ${groups.map((group) => group.names.join(" = ")).join(" → ")}. All measured development metrics favor OLS and Ridge equally, so changing weights keeps this order while leaving table values unchanged.`;

  const entries = [];
  let place = 1;
  for (const group of groups) {
    const tied = group.names.length > 1;
    for (const name of group.names) {
      entries.push({ name, rank: place, tied });
    }
    place += group.names.length;
  }
  lastBikeRace = entries;
  if (!document.getElementById("bike-view")?.hidden) {
    renderRaceStrip("battle-a-race", entries, "Bike Sharing · development order");
  }
}

export function renderBikeDevelopment(data) {
  if (!data || !Array.isArray(data.results) || !data.results.length) {
    throw new Error("Bike development payload has no results.");
  }
  document.getElementById("bike-comparison-rows").innerHTML = data.results.map((r) =>
    `<tr data-rmse="${r.mean_rmse}" data-mae="${r.mean_mae}" data-r2="${r.mean_r2}" data-variation="${r.rmse_std}">`
    + `<th scope="row">${r.method}</th>`
    + `<td>${formatSetting(r)}</td>`
    + `<td class="num" title="${r.mean_rmse}">${r.mean_rmse.toFixed(3)}</td>`
    + `<td class="num" title="${r.mean_mae}">${r.mean_mae.toFixed(3)}</td>`
    + `<td class="num" title="${r.mean_r2}">${r.mean_r2.toFixed(5)}</td>`
    + `<td class="num" title="${r.rmse_std}">${r.rmse_std.toFixed(3)}</td>`
    + `</tr>`
  ).join("");
  const ols = data.results.find((r) => r.method === "OLS");
  const ridge = data.results.find((r) => r.method === "Ridge");
  const lasso = data.results.find((r) => r.method === "Lasso");
  const summary = document.getElementById("bike-dev-summary");
  if (summary && ols && ridge && lasso) {
    summary.textContent = Math.abs(ols.mean_rmse - ridge.mean_rmse) < 1e-9
      ? `Development validation (five chronological windows): OLS and Ridge tie at λ = ${ridge.penalty} (mean RMSE ${ols.mean_rmse.toFixed(3)} rentals per hour). Lasso is close at ${lasso.mean_rmse.toFixed(3)} (α = ${lasso.penalty}).`
      : `Development validation mean RMSE: OLS ${ols.mean_rmse.toFixed(3)}, Ridge ${ridge.mean_rmse.toFixed(3)}, Lasso ${lasso.mean_rmse.toFixed(3)} rentals per hour.`;
  }
  bindWeightListeners();
  renderExploratoryRank();
  renderBikeWindows(data.results);
}

export function renderBikeDevelopmentError(error) {
  Plotly.purge("bike-window-plot");
  const message = error?.message ?? "Local API unavailable";
  document.getElementById("bike-comparison-rows").innerHTML =
    `<tr><td colspan="6" class="table-empty">Could not load development validation results: ${message}. Check that the local API is running, or click Run All comparisons.</td></tr>`;
  const summary = document.getElementById("bike-dev-summary");
  if (summary) summary.textContent = `Development validation unavailable: ${message}.`;
  document.getElementById("bike-exploratory-rank").textContent = "Development validation failed to load, so no exploratory order is available.";
  lastBikeRace = [];
  if (!document.getElementById("bike-view")?.hidden) {
    renderRaceStrip("battle-a-race", [], "Bike Sharing · development order");
  }
}

export async function initBikeExploratoryRanking() {
  bindWeightListeners();
  const output = document.getElementById("bike-exploratory-rank");
  output.textContent = "Running five chronological development windows…";
  try {
    const response = await fetch("/api/bike/development");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    renderBikeDevelopment(await response.json());
  } catch (error) {
    renderBikeDevelopmentError(error);
  }
}
