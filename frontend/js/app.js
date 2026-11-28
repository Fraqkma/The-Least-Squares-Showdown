import { fetchDemo } from "./api.js";
import { initBikeExploratoryRanking } from "./bike-rank.js";
import { renderFitChart } from "./charts/fits.js";
import { getDemoState } from "./state.js";

const degreeInput = document.querySelector("#degree");
const lambdaInput = document.querySelector("#lambda");
const zeroInput = document.querySelector("#no-regularization");
const degreeValue = document.querySelector("#degree-value");
const lambdaValue = document.querySelector("#lambda-value");
const chartState = document.querySelector("#chart-state");
const chartError = document.querySelector("#plot-error");
const connectionState = document.querySelector("#connection-state");
const degreeChip = document.querySelector("#degree-chip");
const lambdaChip = document.querySelector("#lambda-chip");
let requestSequence = 0;
let activeController = null;
let debounce;
let currentDemo;
const pointSet = document.querySelector("#point-set");
const pointIndex = document.querySelector("#point-index");

function pointOptions(data) {
  const xs = data[pointSet.value].x;
  pointIndex.replaceChildren(...xs.map((x, index) => new Option(`${index + 1} · x = ${x.toFixed(4)}`, index)));
  pointIndex.selectedIndex = xs.reduce((best, x, i) => Math.abs(x - 0.5) < Math.abs(xs[best] - 0.5) ? i : best, 0);
}

function renderPoint(data) {
  const set = pointSet.value;
  const index = Number(pointIndex.value);
  const y = data[set].y[index];
  document.querySelector("#point-observed").textContent = `Input x = ${data[set].x[index].toFixed(5)}, observed y = ${y.toFixed(5)}. The dotted gap on the chart is this point’s Ridge residual.`;
  document.querySelector("#point-rows").innerHTML = ["ols", "ridge"].map((method) => {
    const prediction = data.predictions[set][method][index];
    const difference = y - prediction;
    return `<tr><th scope="row">${method === "ols" ? "OLS" : "Ridge"}</th><td class="num">${prediction.toFixed(5)}</td><td class="num">${difference.toFixed(5)}</td><td class="num">${(difference ** 2).toFixed(5)}</td></tr>`;
  }).join("");
  return renderFitChart(document.querySelector("#fit-chart"), data, { set, index });
}

pointSet.addEventListener("change", () => {
  if (!currentDemo) return;
  pointOptions(currentDemo);
  renderPoint(currentDemo);
});
pointIndex.addEventListener("change", () => { if (currentDemo) renderPoint(currentDemo); });

function displayLambda(value) {
  if (value === 0) return "0";
  return new Intl.NumberFormat("en-US", { maximumSignificantDigits: 3 }).format(value);
}

function updateControlLabels() {
  degreeValue.value = degreeInput.value;
  degreeValue.textContent = degreeInput.value;
  const degree = Number(degreeInput.value);
  const sub = (n) => String(n).replace(/\d/g, (i) => "₀₁₂₃₄₅₆₇₈₉"[i]);
  const power = (n) => String(n).replace(/\d/g, (i) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[i]);
  const terms = ["β₀", "β₁x"];
  if (degree >= 2) terms.push("β₂x²");
  if (degree > 3) terms.push("…");
  if (degree >= 3) terms.push(`β${sub(degree)}x${power(degree)}`);
  document.querySelector("#basis-form").textContent = `ŷ = ${terms.join(" + ")}`;
  degreeChip.textContent = String(degree);
  lambdaInput.disabled = zeroInput.checked;
  const lambda = getDemoState().lambda;
  lambdaValue.value = displayLambda(lambda);
  lambdaValue.textContent = displayLambda(lambda);
  lambdaChip.textContent = displayLambda(lambda);
}

function formatMetric(value) {
  return new Intl.NumberFormat("en-US", { maximumSignificantDigits: 4 }).format(value);
}

function setMetric(id, value) {
  document.getElementById(id).textContent = formatMetric(value);
}

async function refresh() {
  const sequence = ++requestSequence;
  activeController?.abort();
  const controller = new AbortController();
  activeController = controller;
  const controls = getDemoState();
  chartError.hidden = true;
  chartState.classList.remove("is-hidden");
  chartState.textContent = sequence === 1 ? "Loading the seeded example…" : "Updating the fits…";
  connectionState.dataset.state = "loading";
  connectionState.textContent = "Updating the example";

  try {
    const data = await fetchDemo(controls, { signal: controller.signal });
    if (sequence !== requestSequence) return;
    if (!currentDemo) pointOptions(data);
    currentDemo = data;
    await renderPoint(data);
    if (sequence !== requestSequence) return;
    setMetric("ols-train-mse", data.metrics.ols.train_mse);
    setMetric("ols-validation-mse", data.metrics.ols.validation_mse);
    setMetric("ridge-train-mse", data.metrics.ridge.train_mse);
    setMetric("ridge-validation-mse", data.metrics.ridge.validation_mse);
    document.querySelector("#fit-settings").textContent = `Degree ${data.degree} · λ = ${displayLambda(data.lambda)}`;
    document.querySelector("#overview-metrics").innerHTML = ["ols", "ridge"].map((method) =>
      `<tr><th scope="row">${method === "ols" ? "OLS" : "Ridge"}</th><td class="num">${data.metrics[method].train_mse.toFixed(5)}</td><td class="num">${data.metrics[method].validation_mse.toFixed(5)}</td></tr>`
    ).join("");
    document.querySelector("#condition-number").textContent = data.condition_number_unscaled_train_design === null
      ? "Not finite"
      : formatMetric(data.condition_number_unscaled_train_design);
    chartState.classList.add("is-hidden");
    connectionState.dataset.state = "ready";
    connectionState.textContent = `Seed ${data.seed} · illustrative`;
    document.dispatchEvent(new CustomEvent("demoupdate", { detail: data }));
  } catch (error) {
    if (error?.name === "AbortError" || sequence !== requestSequence) return;
    chartState.classList.add("is-hidden");
    chartError.hidden = false;
    connectionState.dataset.state = "error";
    connectionState.textContent = "Local API unavailable";
    document.querySelector("#fit-chart").setAttribute("aria-label", `The fit chart could not load: ${error.message}`);
    document.dispatchEvent(new CustomEvent("demoerror", { detail: { message: error.message } }));
  }
}

function scheduleRefresh() {
  updateControlLabels();
  window.clearTimeout(debounce);
  debounce = window.setTimeout(refresh, 100);
}

degreeInput.addEventListener("input", scheduleRefresh);
lambdaInput.addEventListener("input", scheduleRefresh);
zeroInput.addEventListener("change", scheduleRefresh);
document.querySelector("#retry").addEventListener("click", refresh);

updateControlLabels();
initBikeExploratoryRanking();
refresh();
