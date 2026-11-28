import { getBikeRaceEntries, renderBikeDevelopment, renderBikeDevelopmentError } from "./bike-rank.js";

import { renderSolverTradeoff, renderSyntheticDegrees } from "./charts/battles.js";
import { colors, fontFamily } from "./charts/theme.js";
import { renderRaceStrip } from "./race-strip.js";

const byId = (id) => document.getElementById(id);
let solverResults = [];
let syntheticRaceEntries = [];
let surfaceRequest = 0;
let surfaceController = null;
let surfaceDebounce;
let studyGeneration = 0;

function syncBattleARace(view) {
  if (view === "synthetic") {
    renderRaceStrip("battle-a-race", syntheticRaceEntries, "Synthetic · 10-seed mean validation MSE");
  } else {
    renderRaceStrip("battle-a-race", getBikeRaceEntries(), "Bike Sharing · development order");
  }
}

const tabIds = ["bike", "synthetic"];
function setView(view) {
  for (const name of tabIds) {
    byId(`${name}-view`).hidden = name !== view;
    const tab = byId(`view-${name}`);
    tab.setAttribute("aria-selected", String(name === view));
    tab.setAttribute("tabindex", name === view ? "0" : "-1");
  }
  syncBattleARace(view);
  const plot = byId(view === "synthetic" ? "synthetic-plot" : "bike-window-plot");
  if (plot && plot.data) {
    Plotly.Plots.resize(plot);
    requestAnimationFrame(() => Plotly.Plots.resize(plot));
  }
  document.dispatchEvent(new CustomEvent("battleviewchange", { detail: { view } }));
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
    byId("surface-height-label").textContent = lam === 0 ? "SSE" : "SSE + λ × slope²";
    // The mesh joins grid points with straight segments, so it sits a little above the true bowl.
    // Lift each marker by a sliver of the height range so it is not hidden inside the mesh;
    // the hover label still reports the exact objective value.
    const zValues = data.z.flat();
    const lift = 0.012 * (Math.max(...zValues) - Math.min(...zValues));
    const markers = ["ols", "ridge"].map((name) => {
      const [intercept, slope] = data[name];
      const title = name === "ols" ? "OLS solution" : "Ridge minimum";
      const objective = data.marker_objective[name];
      return {
        type: "scatter3d",
        mode: "markers",
        name: title,
        x: [intercept],
        y: [slope],
        z: [objective + lift],
        customdata: [objective],
        marker: name === "ols"
          ? { size: 18, symbol: "circle-open", color: colors.ols, line: { color: colors.ols, width: 4 } }
          : { size: 8, symbol: "circle", color: colors.ridge, line: { color: "#ffffff", width: 1 } },
        hovertemplate: `${title}<br>Intercept: %{x:.3f}<br>Slope: %{y:.3f}<br>${objectiveLabel}: %{customdata:.3f}<extra></extra>`,
      };
    });
    const surfaceTrace = {
      type: "surface",
      x: data.x,
      y: data.y,
      z: data.z,
      opacity: 0.86,
      colorscale: colors.surfaceRamp,
      showscale: false,
      contours: { z: { show: true, usecolormap: false, color: "rgba(55,84,124,0.16)", width: 1, start: 0, end: Math.max(...data.z.flat()), size: Math.max(...data.z.flat()) / 12 } },
      hovertemplate: `Intercept: %{x:.2f}<br>Slope: %{y:.2f}<br>${objectiveLabel}: %{z:.2f}<extra>Loss surface</extra>`,
    };
    const sceneAxis = (text) => ({
      title: { text, font: { family: fontFamily, size: 14, color: colors.ink } },
      tickfont: { family: fontFamily, size: 12, color: colors.inkSoft },
      gridcolor: colors.grid,
      zerolinecolor: colors.axis,
      backgroundcolor: "rgba(0,0,0,0)",
    });
    await Plotly.react("loss-surface", [surfaceTrace, ...markers], {
      margin: { l: 0, r: 0, t: 8, b: 0 },
      paper_bgcolor: "rgba(0,0,0,0)",
      font: { family: fontFamily, color: colors.ink, size: 13 },
      hoverlabel: { bgcolor: colors.surface, bordercolor: colors.axis, font: { family: fontFamily, color: colors.ink } },
      scene: {
        xaxis: sceneAxis("Intercept"),
        yaxis: sceneAxis("Slope"),
        zaxis: sceneAxis(lam === 0 ? "Objective: SSE" : "Objective: SSE + λ × slope²"),
        camera: { eye: { x: 1.16, y: -1.02, z: 1.0 }, center: { x: 0.04, y: 0, z: -0.16 } },
        aspectmode: "manual",
        aspectratio: { x: 1, y: 1, z: 0.62 },
      },
      legend: { orientation: "h", x: 0, y: 1, font: { family: fontFamily, size: 13 } },
      uirevision: "loss-surface-camera",
    }, { responsive: true, displaylogo: false, modeBarButtonsToRemove: ["toImage"] });
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

function renderSolvers(event) {
  if (!solverResults.length) {
    Plotly.purge("solver-plot");
    byId("solver-caption").textContent = "Solver measurements unavailable";
    byId("solver-rows").innerHTML = '<tr><td colspan="7" class="table-empty">No solver measurements loaded yet. Check that the local API is running, or click Run All comparisons.</td></tr>';
    byId("solver-summary").textContent = "Solver measurements are currently unavailable.";
    byId("solver-rank").textContent = "No completed solves to order.";
    renderRaceStrip("battle-b-race", [], "Solver race");
    return;
  }
  const [n, condition] = byId("solver-case").value.split("-").map(Number);
  const rows = solverResults.filter((row) => row.n === n && row.condition === condition);
  if (!rows.length) {
    Plotly.purge("solver-plot");
    byId("solver-caption").textContent = "No saved rows for this benchmark case";
    byId("solver-rows").innerHTML = '<tr><td colspan="7" class="table-empty">No measurements are available for this case.</td></tr>';
    byId("solver-summary").textContent = "This benchmark case has no saved measurements.";
    byId("solver-rank").textContent = "No completed solves to order.";
    renderRaceStrip("battle-b-race", [], "Solver race");
    return;
  }
  const caseLabel = `${n} × ${rows[0].p}, condition ${condition === 10 ? "10" : "10⁶"}`;
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
  if (event?.target?.id !== "solver-weight") renderSolverTradeoff(rows);
  byId("solver-weight-value").textContent = weight.toFixed(1);
  const completed = rows.filter((row) => row.status === "completed");
  if (!completed.length) {
    byId("solver-summary").textContent = "No completed solve is available for this case.";
    byId("solver-rank").textContent = "No completed solves to order.";
    renderRaceStrip("battle-b-race", rows.map((row) => ({ name: row.method, rank: 4, status: "incomplete" })), caseLabel);
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

  const raceEntries = order.map((item, idx) => ({ name: item.name, rank: idx + 1 }));
  for (const row of rows) {
    if (row.status !== "completed") raceEntries.push({ name: row.method, rank: order.length + 1, status: "incomplete" });
  }
  renderRaceStrip("battle-b-race", raceEntries, `${caseLabel} · runtime weight ${weight.toFixed(1)}`);
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

  // Rank the 3 models by overall mean selected validation MSE across the 3 shown noise levels.
  const overall = ["OLS", "Ridge", "Lasso"].map((method) => {
    const rows = data.rows.filter((row) => row.method === method);
    return { name: method, mean: rows.reduce((sum, row) => sum + row.validation_mse, 0) / rows.length };
  }).sort((a, b) => a.mean - b.mean);
  syntheticRaceEntries = overall.map((item, idx) => ({ name: item.name, rank: idx + 1 }));
  if (!byId("synthetic-view").hidden) syncBattleARace("synthetic");

  const traces = ["OLS", "Ridge", "Lasso"].map((method) => ({
    name: method,
    type: "scatter",
    mode: "lines+markers",
    x: Array.from({ length: 15 }, (_, i) => i + 1),
    y: Array.from({ length: 15 }, (_, i) => {
      const rows = data.candidates.filter((row) => row.seed === 42 && row.noise === 0.2 && row.method === method && row.degree === i + 1);
      return Math.min(...rows.map((row) => row.validation_mse));
    }),
    hovertemplate: `${method}<br>Degree %{x}<br>Best validation MSE: %{y:.5f}<extra></extra>`,
  }));
  renderSyntheticDegrees("synthetic-plot", traces);
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
  syntheticRaceEntries = [];
  if (!byId("synthetic-view").hidden) syncBattleARace("synthetic");
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
let surfaceShown = false;
function showSurfaceWhenVisible() {
  if (surfaceShown || byId("least-squares").hidden) return;
  surfaceShown = true;
  renderSurface();
}
document.addEventListener("chapterchange", showSurfaceWhenVisible);
showSurfaceWhenVisible();
