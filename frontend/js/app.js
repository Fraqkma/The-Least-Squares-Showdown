import { fetchDemo } from "./api.js";
import { initBikeExploratoryRanking } from "./bike-rank.js?v=readability1";
import { renderCoefficientChart } from "./charts/coefficients.js?v=readability3";
import { renderFitChart } from "./charts/fits.js?v=readability1";
import { getDemoState } from "./state.js";

const degreeInput = document.querySelector("#degree");
const lambdaInput = document.querySelector("#lambda");
const zeroInput = document.querySelector("#no-regularization");
const ridgeLambdaInput = document.querySelector("#ridge-lambda");
const ridgeZeroInput = document.querySelector("#ridge-zero");
const degreeValue = document.querySelector("#degree-value");
const lambdaValue = document.querySelector("#lambda-value");
const ridgeLambdaValue = document.querySelector("#ridge-lambda-value");
const chartState = document.querySelector("#chart-state");
const chartError = document.querySelector("#plot-error");
const connectionState = document.querySelector("#connection-state");
let requestSequence = 0;
let debounce;

function displayLambda(value) {
  if (value === 0) return "0";
  return new Intl.NumberFormat("en-US", { maximumSignificantDigits: 3 }).format(value);
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
}

function formatMetric(value) {
  return new Intl.NumberFormat("en-US", { maximumSignificantDigits: 4 }).format(value);
}

function setMetric(id, value) {
  document.getElementById(id).textContent = formatMetric(value);
}

async function refresh() {
  const sequence = ++requestSequence;
  const controls = getDemoState();
  chartError.hidden = true;
  chartState.classList.remove("is-hidden");
  chartState.textContent = sequence === 1 ? "Loading the seeded example" : "Updating the fits";
  connectionState.dataset.state = "loading";
  connectionState.textContent = "Updating the example";

  try {
    const data = await fetchDemo(controls);
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
    document.querySelector("#ridge-current-setting").textContent = `Degree ${data.degree} · λ = ${displayLambda(data.lambda)} · same training points and scaled basis`;
    const ridgeNote = data.lambda === 0 ? "The fits agree at zero penalty."
      : data.lambda >= 100 && data.metrics.ridge.validation_mse > data.metrics.ols.validation_mse
        ? "Here the flatter Ridge curve has higher validation error."
        : "Compare the two curves above.";
    document.querySelector("#ridge-validation-summary").textContent = `Validation MSE: OLS ${formatMetric(data.metrics.ols.validation_mse)} · Ridge ${formatMetric(data.metrics.ridge.validation_mse)}. Lower is better. ${ridgeNote}`;
    chartState.classList.add("is-hidden");
    connectionState.dataset.state = "ready";
    connectionState.textContent = `Seed ${data.seed} · illustrative`;
  } catch (error) {
    if (sequence !== requestSequence) return;
    chartState.classList.add("is-hidden");
    chartError.hidden = false;
    connectionState.dataset.state = "error";
    connectionState.textContent = "Local API unavailable";
    document.querySelector("#fit-chart").setAttribute("aria-label", `The fit chart could not load: ${error.message}`);
  }
}

function scheduleRefresh() {
  updateControlLabels();
  window.clearTimeout(debounce);
  debounce = window.setTimeout(refresh, 120);
}

degreeInput.addEventListener("input", scheduleRefresh);
lambdaInput.addEventListener("input", scheduleRefresh);
zeroInput.addEventListener("change", scheduleRefresh);
ridgeLambdaInput.addEventListener("input", () => { lambdaInput.value = ridgeLambdaInput.value; zeroInput.checked = false; scheduleRefresh(); });
ridgeZeroInput.addEventListener("change", () => { zeroInput.checked = ridgeZeroInput.checked; scheduleRefresh(); });
document.querySelector("#retry").addEventListener("click", refresh);
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
