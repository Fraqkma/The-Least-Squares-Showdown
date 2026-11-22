import { renderBikeDevelopment, renderBikeDevelopmentError } from "./bike-rank.js?v=upgrade1";

const byId = (id) => document.getElementById(id);
let solverResults = [];
let surfaceRequest = 0;
let surfaceController = null;
let surfaceDebounce;
let studyGeneration = 0;

const tabIds = ["bike", "synthetic"];
function setView(view) {
  for (const name of tabIds) {
    byId(`${name}-view`).hidden = name !== view;
    const tab = byId(`view-${name}`);
    tab.setAttribute("aria-selected", String(name === view));
    tab.setAttribute("tabindex", name === view ? "0" : "-1");
  }
  if (view === "synthetic") {
    const plot = byId("synthetic-plot");
    if (plot && plot.data) {
      Plotly.Plots.resize(plot);
      requestAnimationFrame(() => Plotly.Plots.resize(plot));
    }
  }
}

tabIds.forEach((name, index) => {
  const tab = byId(`view-${name}`);
  tab.setAttribute("tabindex", index === 0 ? "0" : "-1");
  tab.addEventListener("click", () => setView(name));
  tab.addEventListener("keydown", (event) => {
    let targetIndex = null;
    if (event.key === "ArrowRight") targetIndex = (index + 1) % tabIds.length;
    else if (event.key === "ArrowLeft") targetIndex = (index - 1 + tabIds.length) % tabIds.length;
    else if (event.key === "Home") targetIndex = 0;
    else if (event.key === "End") targetIndex = tabIds.length - 1;
    if (targetIndex === null) return;
    event.preventDefault();
    const nextView = tabIds[targetIndex];
    setView(nextView);
    byId(`view-${nextView}`).focus();
  });
});

async function getJson(path, { signal } = {}) {
  const response = await fetch(path, { headers: { Accept: "application/json" }, signal });
  if (!response.ok) throw new Error(`${path} returned HTTP ${response.status}`);
  return response.json();
}

function appendRetry(element, message, handler) {
  element.textContent = `${message} `;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "inline-retry";
  button.textContent = "Try again";
  button.addEventListener("click", handler);
  element.append(button);
}

async function loadOfficial() {
  try {
    const data = await getJson("/api/bike/official");
    const names = new Set(data.results.map((row) => row.method));
    if (data.scope !== "official holdout" || names.size !== 3) throw new Error("invalid approved artifact");
    byId("bike-official-rows").innerHTML = data.results.map((row) => {
      const setting = row.method === "Ridge" ? "λ = 0" : row.method === "Lasso" ? "α = 0.001" : "None";
      return `<tr><th scope="row">${row.method}</th><td>${setting}</td>`
        + `<td class="num" title="${row.rmse}">${row.rmse.toFixed(3)}</td>`
        + `<td class="num" title="${row.mae}">${row.mae.toFixed(3)}</td>`
        + `<td class="num" title="${row.r2}">${row.r2.toFixed(5)}</td></tr>`;
    }).join("");
    byId("bike-official-status").textContent = "Approved one-time holdout artifact (results/bike-official.json) · 3,464 later-date rows · settings frozen before scoring.";
    const ols = data.results.find((row) => row.method === "OLS");
    const ridge = data.results.find((row) => row.method === "Ridge");
    const lasso = data.results.find((row) => row.method === "Lasso");
    byId("bike-result-summary").textContent = Math.abs(ols.rmse - ridge.rmse) < 1e-9
      ? `Official later-date test: OLS and Ridge tie at λ = 0 (${ols.rmse.toFixed(3)} RMSE rentals per hour). Lasso is close at ${lasso.rmse.toFixed(3)}.`
      : `Official later-date test RMSE: OLS ${ols.rmse.toFixed(3)}, Ridge ${ridge.rmse.toFixed(3)}, Lasso ${lasso.rmse.toFixed(3)} rentals per hour.`;
  } catch (error) {
    byId("bike-official-rows").innerHTML =
      `<tr><td colspan="5" class="table-empty">Recorded official holdout artifact could not be loaded: ${error.message}.</td></tr>`;
    byId("bike-result-summary").textContent = "Official later-date test result is currently unavailable.";
    appendRetry(byId("bike-official-status"), `Official result unavailable (${error.message}).`, loadOfficial);
  }
}

async function renderSurface() {
  const request = ++surfaceRequest;
  surfaceController?.abort();
  const controller = new AbortController();
  surfaceController = controller;
  const lam = Number(byId("surface-penalty").value);
  byId("surface-penalty-value").textContent = String(lam);
  byId("surface-status").textContent = `Updating 3D loss surface for λ = ${lam}…`;
  try {
    const data = await getJson(`/api/study/surface?lam=${lam}`, { signal: controller.signal });
    if (request !== surfaceRequest) return;
    const objectiveLabel = lam === 0 ? "SSE" : `SSE + ${lam} × slope²`;
    const markers = ["ols", "ridge"].map((name) => {
      const [intercept, slope] = data[name];
      const title = name === "ols" ? "OLS solution" : "Ridge minimum";
      return {
        type: "scatter3d",
        mode: "markers",
        name: title,
        x: [intercept],
        y: [slope],
        z: [data.marker_objective[name]],
        marker: { size: name === "ols" ? 8 : 10, opacity: 1, color: name === "ols" ? "#61c9b2" : "#ef9a73" },
        hovertemplate: `${title}<br>Intercept: %{x:.3f}<br>Slope: %{y:.3f}<br>${objectiveLabel}: %{z:.3f}<extra></extra>`,
      };
    });
    const surfaceTrace = {
      type: "surface",
      x: data.x,
      y: data.y,
      z: data.z,
      opacity: 0.62,
      showscale: false,
      hovertemplate: `Intercept: %{x:.2f}<br>Slope: %{y:.2f}<br>${objectiveLabel}: %{z:.2f}<extra>Loss surface</extra>`,
    };
    await Plotly.react("loss-surface", [surfaceTrace, ...markers], {
      margin: { l: 0, r: 0, t: 36, b: 0 },
      paper_bgcolor: "#1b2527",
      font: { color: "#eff5f1", size: 12 },
      scene: {
        xaxis: { title: { text: "Intercept" } },
        yaxis: { title: { text: "Slope" } },
        zaxis: { title: { text: lam === 0 ? "Objective: SSE" : "Objective: SSE + λ × slope²" } },
        camera: { eye: { x: 1.55, y: 1.5, z: 1.15 } },
      },
      legend: { orientation: "h", y: 1.12 },
      uirevision: "loss-surface-camera",
    }, { responsive: true });
    if (request !== surfaceRequest) return;
    const olsObj = data.marker_objective.ols.toFixed(2);
    const ridgeObj = data.marker_objective.ridge.toFixed(2);
    byId("surface-status").textContent = lam === 0
      ? `Height = SSE. OLS and Ridge coincide at intercept ${data.ols[0].toFixed(2)}, slope ${data.ols[1].toFixed(2)} (SSE ${olsObj}); markers overlap.`
      : `Height = SSE + ${lam} × slope². OLS stays at slope ${data.ols[1].toFixed(2)} (height ${olsObj}); Ridge pulls slope to ${data.ridge[1].toFixed(2)} (minimum height ${ridgeObj}).`;
  } catch (error) {
    if (error?.name === "AbortError" || request !== surfaceRequest) return;
    appendRetry(byId("surface-status"), `Could not load 3D loss surface (${error.message}).`, renderSurface);
  }
}

byId("surface-penalty").addEventListener("input", () => {
  byId("surface-penalty-value").textContent = byId("surface-penalty").value;
  window.clearTimeout(surfaceDebounce);
  surfaceDebounce = window.setTimeout(renderSurface, 80);
});

function renderSolvers() {
  if (!solverResults.length) {
    byId("solver-caption").textContent = "Solver measurements unavailable";
    byId("solver-rows").innerHTML = '<tr><td colspan="7" class="table-empty">No solver measurements loaded yet. Check that the local API is running, or click Run All comparisons.</td></tr>';
    byId("solver-summary").textContent = "Solver measurements are currently unavailable.";
    byId("solver-rank").textContent = "No completed solves to order.";
    return;
  }
  const [n, condition] = byId("solver-case").value.split("-").map(Number);
  const rows = solverResults.filter((row) => row.n === n && row.condition === condition);
  if (!rows.length) {
    byId("solver-caption").textContent = "No saved rows for this benchmark case";
    byId("solver-rows").innerHTML = '<tr><td colspan="7" class="table-empty">No measurements are available for this case.</td></tr>';
    byId("solver-summary").textContent = "This benchmark case has no saved measurements.";
    byId("solver-rank").textContent = "No completed solves to order.";
    return;
  }
  byId("solver-caption").textContent = `${n} × ${rows[0].p} matrix · condition ${condition === 10 ? "10" : "10⁶"} · identical inputs`;
  byId("solver-rows").innerHTML = rows.map((row) => {
    const success = row.status === "completed";
    const statusClass = success ? "status-ok" : row.status === "iteration_limit" ? "status-limit" : "status-error";
    const status = success ? "Completed" : row.status === "iteration_limit" ? "Iteration limit (not converged)" : `Failed: ${row.status}`;
    return `<tr><th scope="row">${row.method}</th>`
      + `<td class="${statusClass}">${status}</td>`
      + `<td class="num">${row.seconds === undefined ? "—" : `${row.seconds.toFixed(5)} s`}</td>`
      + `<td class="num">${row.coefficient_relative_error?.toExponential(2) ?? "—"}</td>`
      + `<td class="num">${row.residual?.toExponential(2) ?? "—"}</td>`
      + `<td class="num">${row.input_bytes ? `${(row.input_bytes / 1024).toFixed(1)} KiB` : "—"}</td>`
      + `<td class="num">${row.method === "Batch Gradient Descent" ? row.iterations ?? "—" : "Direct"}</td></tr>`;
  }).join("");
  const weight = Number(byId("solver-weight").value);
  byId("solver-weight-value").textContent = weight.toFixed(1);
  const completed = rows.filter((row) => row.status === "completed");
  if (!completed.length) {
    byId("solver-summary").textContent = "No completed solve is available for this case.";
    byId("solver-rank").textContent = "No completed solves to order.";
    return;
  }
  const fastest = completed.reduce((best, row) => row.seconds < best.seconds ? row : best);
  const accurate = completed.reduce((best, row) => row.coefficient_relative_error < best.coefficient_relative_error ? row : best);
  const limited = rows.filter((row) => row.status !== "completed").map((row) => row.status === "iteration_limit"
    ? `${row.method} hit its 10,000-step iteration limit without converging.`
    : `${row.method} failed: ${row.status}.`).join(" ");
  byId("solver-summary").textContent = `For this case, ${fastest.method} has the shortest measured runtime and ${accurate.method} has the smallest relative coefficient error. ${limited || "All four methods completed."}`;
  const maxTime = Math.max(1e-30, ...completed.map((row) => row.seconds));
  const maxError = Math.max(1e-30, ...completed.map((row) => row.coefficient_relative_error));
  const order = completed
    .map((row) => ({ name: row.method, score: weight * row.seconds / maxTime + (1 - weight) * row.coefficient_relative_error / maxError }))
    .sort((a, b) => a.score - b.score);
  byId("solver-rank").textContent = `Exploratory order among completed solves: ${order.map((row) => row.name).join(" → ")}. Measured table values above do not change.`;
}
byId("solver-case").addEventListener("change", renderSolvers);
byId("solver-weight").addEventListener("input", renderSolvers);

function renderSynthetic(data) {
  const levels = [0.1, 0.2, 0.4];
  byId("synthetic-rows").innerHTML = levels.map((noise) => {
    const values = ["OLS", "Ridge", "Lasso"].map((method) => {
      const rows = data.rows.filter((row) => row.noise === noise && row.method === method);
      const mean = rows.reduce((total, row) => total + row.validation_mse, 0) / rows.length;
      return `<td class="num" title="${mean}">${mean.toFixed(6)}</td>`;
    });
    const failCount = data.failures.filter((row) => row.noise === noise).length;
    return `<tr><th scope="row">${noise.toFixed(1)}</th>${values.join("")}<td class="num">${failCount}</td></tr>`;
  }).join("");
  const splitCount = data.rows.length / 3;
  byId("synthetic-summary").textContent = `10 seeds × 3 noise levels (${splitCount} validation splits) · ${data.failures.length} Lasso convergence failures · validation MSE only`;
  const winners = levels.map((noise) => {
    const means = ["OLS", "Ridge", "Lasso"].map((method) => {
      const rows = data.rows.filter((row) => row.noise === noise && row.method === method);
      return { method, mse: rows.reduce((sum, row) => sum + row.validation_mse, 0) / rows.length };
    });
    return means.reduce((best, current) => current.mse < best.mse ? current : best).method;
  });
  byId("synthetic-result-summary").textContent = winners.every((name) => name === winners[0])
    ? `${winners[0]} has the lowest mean selected validation MSE at every shown noise level. ${data.failures.length === 0 ? "All 1,800 Lasso fits converged." : `${data.failures.length} Lasso fits hit the iteration limit.`}`
    : `Lowest mean selected validation MSE by noise level: ${levels.map((noise, i) => `${noise}: ${winners[i]}`).join("; ")}.`;
  const methodColors = { OLS: "#61c9b2", Ridge: "#ef9a73", Lasso: "#eec273" };
  const traces = ["OLS", "Ridge", "Lasso"].map((method) => ({
    name: method,
    type: "scatter",
    mode: "lines+markers",
    line: { color: methodColors[method], width: 2.5 },
    marker: { color: methodColors[method], size: 6 },
    x: Array.from({ length: 15 }, (_, i) => i + 1),
    y: Array.from({ length: 15 }, (_, i) => {
      const rows = data.candidates.filter((row) => row.seed === 42 && row.noise === 0.2 && row.method === method && row.degree === i + 1);
      return Math.min(...rows.map((row) => row.validation_mse));
    }),
    hovertemplate: `${method}<br>Degree %{x}<br>Best validation MSE: %{y:.5f}<extra></extra>`,
  }));
  Plotly.react("synthetic-plot", traces, {
    title: { text: "Seed 42 · noise standard deviation (SD) 0.2 · best validation MSE by degree", font: { size: 13, color: "#eff5f1" } },
    paper_bgcolor: "#1b2527",
    plot_bgcolor: "#1b2527",
    font: { family: "Inter, system-ui, sans-serif", color: "#eff5f1", size: 11 },
    legend: { orientation: "h", x: 0, y: 1.12 },
    xaxis: { title: "Polynomial degree", dtick: 2, gridcolor: "rgba(225, 239, 233, 0.14)", tickfont: { color: "#c2d2ca" } },
    yaxis: { title: "Validation MSE (log scale)", type: "log", tickvals: [0.01, 0.1, 1, 10], ticktext: ["0.01", "0.1", "1", "10"], gridcolor: "rgba(225, 239, 233, 0.14)", tickfont: { color: "#c2d2ca" } },
    margin: { t: 68, b: 56, l: 78, r: 16 },
  }, { displayModeBar: false, responsive: true });
  const lassoConverged = data.candidates.filter((row) => row.method === "Lasso").length;
  byId("synthetic-details").textContent = data.failures.length === 0
    ? `All ${lassoConverged} Lasso candidates converged (0 failures). Selected degrees and penalties are saved in results/synthetic.json.`
    : `${lassoConverged} Lasso candidates converged; ${data.failures.length} reached the iteration limit and were excluded from selection.`;
}

function renderSyntheticError(error) {
  const message = error?.message ?? "Local API unavailable";
  byId("synthetic-result-summary").textContent = `Synthetic ten-seed results unavailable: ${message}.`;
  byId("synthetic-summary").textContent = "Could not load saved synthetic study. Click Run All comparisons to recompute when the local API is running.";
  byId("synthetic-rows").innerHTML = `<tr><td colspan="5" class="table-empty">Could not load synthetic results: ${message}.</td></tr>`;
}

byId("run-all").addEventListener("click", async () => {
  const button = byId("run-all");
  if (button.disabled) return;
  const runId = ++studyGeneration;
  button.disabled = true;
  button.setAttribute("aria-busy", "true");
  const progress = byId("run-progress");
  const tasks = [
    ["Bike Sharing development (5 windows)", "/api/bike/development", renderBikeDevelopment, renderBikeDevelopmentError],
    ["Battle B numerical solvers", "/api/study/solvers", (data) => { solverResults = data.rows; renderSolvers(); }, () => { solverResults = []; renderSolvers(); }],
    ["Synthetic ten-seed sweep", "/api/study/synthetic", renderSynthetic, renderSyntheticError],
  ];
  const problems = [];
  for (let i = 0; i < tasks.length; i += 1) {
    const [label, path, onSuccess, onFailure] = tasks[i];
    progress.textContent = `Running ${i + 1} of ${tasks.length}: ${label}…`;
    try {
      const payload = await getJson(path);
      if (runId !== studyGeneration) return;
      onSuccess(payload);
    } catch (error) {
      if (runId !== studyGeneration) return;
      problems.push(`${label} (${error.message})`);
      onFailure(error);
    }
  }
  progress.textContent = problems.length
    ? `Completed with errors: ${problems.join("; ")}. Saved official Bike Sharing scores remain separate.`
    : "Live development comparisons finished · official Bike Sharing holdout scores remain loaded from the approved artifact.";
  button.disabled = false;
  button.removeAttribute("aria-busy");
});

async function loadSavedStudies() {
  const loadId = ++studyGeneration;
  const results = await Promise.allSettled([
    getJson("/api/study/saved/solvers"),
    getJson("/api/study/saved/synthetic"),
  ]);
  if (loadId !== studyGeneration) return;
  const failures = [];
  if (results[0].status === "fulfilled") {
    solverResults = results[0].value.rows;
    renderSolvers();
  } else {
    solverResults = [];
    renderSolvers();
    failures.push(`solvers (${results[0].reason?.message ?? "failed"})`);
  }
  if (results[1].status === "fulfilled") {
    renderSynthetic(results[1].value);
  } else {
    renderSyntheticError(results[1].reason);
    failures.push(`synthetic (${results[1].reason?.message ?? "failed"})`);
  }
  byId("run-progress").textContent = failures.length
    ? `Saved studies partially unavailable: ${failures.join("; ")}. Click Run All comparisons to recompute.`
    : "Showing saved development studies. Click Run All comparisons to recompute live.";
}

loadOfficial();
loadSavedStudies();
renderSurface();
