import { fetchDemo } from "./api.js?v=upgrade1";
import { initBikeExploratoryRanking } from "./bike-rank.js?v=upgrade1";
import { renderCoefficientChart } from "./charts/coefficients.js?v=upgrade1";
import { renderFitChart } from "./charts/fits.js?v=upgrade1";
import { getDemoState } from "./state.js";

const degreeInput = document.querySelector("#degree");
const lambdaInput = document.querySelector("#lambda");
const zeroInput = document.querySelector("#no-regularization");
const ridgeLambdaInput = document.querySelector("#ridge-lambda");
const ridgeZeroInput = document.querySelector("#ridge-zero");
const degreeValue = document.querySelector("#degree-value");
const lambdaValue = document.querySelector("#lambda-value");
const ridgeLambdaValue = document.querySelector("#ridge-lambda-value");
const presetButtons = [...document.querySelectorAll("[data-ridge-preset]")];
const chartState = document.querySelector("#chart-state");
const chartError = document.querySelector("#plot-error");
const ridgeError = document.querySelector("#ridge-error");
const ridgeSetting = document.querySelector("#ridge-current-setting");
const ridgeValidationSummary = document.querySelector("#ridge-validation-summary");
const connectionState = document.querySelector("#connection-state");
let requestSequence = 0;
let activeController = null;
let debounce;

function displayLambda(value) {
  if (value === 0) return "0";
  return new Intl.NumberFormat("en-US", { maximumSignificantDigits: 3 }).format(value);
}

function updatePresetHighlight(lambda) {
  presetButtons.forEach((button) => {
    const target = Number(button.dataset.ridgePreset);
    const active = target === 0
      ? lambda === 0
      : lambda > 0 && Math.abs(Math.log10(lambda) - Math.log10(target)) < 0.05;
    button.setAttribute("aria-pressed", String(active));
  });
}

function updateControlLabels() {
  degreeValue.value = degreeInput.value;
  degreeValue.textContent = degreeInput.value;
  lambdaInput.disabled = zeroInput.checked;
  ridgeLambdaInput.value = lambdaInput.value;
  ridgeLambdaInput.disabled = zeroInput.checked;
  ridgeZeroInput.checked = zeroInput.checked;
  const lambda = getDemoState().lambda;
  lambdaValue.value = displayLambda(lambda);
  lambdaValue.textContent = displayLambda(lambda);
  ridgeLambdaValue.value = displayLambda(lambda);
  ridgeLambdaValue.textContent = displayLambda(lambda);
  updatePresetHighlight(lambda);
}

function formatMetric(value) {
  return new Intl.NumberFormat("en-US", { maximumSignificantDigits: 4 }).format(value);
}

function setMetric(id, value) {
  document.getElementById(id).textContent = formatMetric(value);
}

function describeRidgeComparison(data) {
  const olsVal = data.metrics.ols.validation_mse;
  const ridgeVal = data.metrics.ridge.validation_mse;
  if (data.lambda === 0) {
    return "At λ = 0, OLS and Ridge produce the exact same fit.";
  }
  if (ridgeVal < olsVal - 1e-9) {
    return "Here Ridge lowers validation MSE compared with OLS.";
  }
  if (data.lambda >= 100 && ridgeVal > olsVal + 1e-9) {
    return "At this strong penalty, the flatter Ridge curve underfits and raises validation MSE.";
  }
  if (ridgeVal > olsVal + 1e-9) {
    return "Here this penalty raises validation MSE compared with OLS.";
  }
  return "Both models have nearly the same validation MSE at this setting.";
}

async function refresh() {
  const sequence = ++requestSequence;
  activeController?.abort();
  const controller = new AbortController();
  activeController = controller;
  const controls = getDemoState();
  chartError.hidden = true;
  if (ridgeError) ridgeError.hidden = true;
  chartState.classList.remove("is-hidden");
  chartState.textContent = sequence === 1 ? "Loading the seeded example…" : "Updating the fits…";
  ridgeSetting.textContent = `Updating degree ${controls.degree} · λ = ${displayLambda(controls.lambda)}…`;
  connectionState.dataset.state = "loading";
  connectionState.textContent = "Updating the example";

  try {
    const data = await fetchDemo(controls, { signal: controller.signal });
    if (sequence !== requestSequence) return;
    await Promise.all([
      renderFitChart(document.querySelector("#fit-chart"), data),
      renderFitChart(document.querySelector("#ridge-fit-chart"), data),
      renderCoefficientChart(document.querySelector("#coefficient-chart"), data.coefficients),
    ]);
    if (sequence !== requestSequence) return;
    setMetric("ols-train-mse", data.metrics.ols.train_mse);
    setMetric("ols-validation-mse", data.metrics.ols.validation_mse);
    setMetric("ridge-train-mse", data.metrics.ridge.train_mse);
    setMetric("ridge-validation-mse", data.metrics.ridge.validation_mse);
    document.querySelector("#condition-number").textContent = data.condition_number_unscaled_train_design === null
      ? "Not finite"
      : formatMetric(data.condition_number_unscaled_train_design);
    ridgeSetting.textContent = `Degree ${data.degree} · λ = ${displayLambda(data.lambda)} · same training points and scaled basis`;
    ridgeValidationSummary.textContent = `Validation MSE: OLS ${formatMetric(data.metrics.ols.validation_mse)} · Ridge ${formatMetric(data.metrics.ridge.validation_mse)}. Lower is better. ${describeRidgeComparison(data)}`;
    chartState.classList.add("is-hidden");
    connectionState.dataset.state = "ready";
    connectionState.textContent = `Seed ${data.seed} · illustrative`;
  } catch (error) {
    if (error?.name === "AbortError" || sequence !== requestSequence) return;
    chartState.classList.add("is-hidden");
    chartError.hidden = false;
    if (ridgeError) ridgeError.hidden = false;
    ridgeSetting.textContent = `Could not load degree ${controls.degree} · λ = ${displayLambda(controls.lambda)}.`;
    ridgeValidationSummary.textContent = "Validation MSE unavailable while the local API is unreachable.";
    connectionState.dataset.state = "error";
    connectionState.textContent = "Local API unavailable";
    document.querySelector("#fit-chart").setAttribute("aria-label", `The fit chart could not load: ${error.message}`);
  }
}

function scheduleRefresh() {
  updateControlLabels();
  window.clearTimeout(debounce);
  debounce = window.setTimeout(refresh, 100);
}

function applyRidgePreset(presetValue) {
  window.clearTimeout(debounce);
  if (presetValue === 0) {
    zeroInput.checked = true;
  } else {
    zeroInput.checked = false;
    lambdaInput.value = String(Math.log10(presetValue));
  }
  updateControlLabels();
  refresh();
}

degreeInput.addEventListener("input", scheduleRefresh);
lambdaInput.addEventListener("input", scheduleRefresh);
zeroInput.addEventListener("change", scheduleRefresh);
ridgeLambdaInput.addEventListener("input", () => {
  lambdaInput.value = ridgeLambdaInput.value;
  zeroInput.checked = false;
  scheduleRefresh();
});
ridgeZeroInput.addEventListener("change", () => {
  zeroInput.checked = ridgeZeroInput.checked;
  scheduleRefresh();
});
presetButtons.forEach((button) => {
  button.addEventListener("click", () => applyRidgePreset(Number(button.dataset.ridgePreset)));
});
document.querySelector("#retry").addEventListener("click", refresh);
document.querySelector("#ridge-retry")?.addEventListener("click", refresh);
document.querySelectorAll(".mobile-nav a").forEach((link) => {
  link.addEventListener("click", () => document.querySelector(".mobile-menu").removeAttribute("open"));
});

const sections = document.querySelectorAll(".section-anchor");
if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      document.querySelectorAll(".primary-nav a").forEach((link) => {
        if (link.hash === `#${entry.target.id}`) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
    }
  }, { rootMargin: "-20% 0px -70% 0px" });
  sections.forEach((section) => observer.observe(section));
}

updateControlLabels();
initBikeExploratoryRanking();
refresh();
