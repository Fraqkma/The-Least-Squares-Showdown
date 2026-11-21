const byId = (id) => document.getElementById(id);
let solverResults = [];
let surfaceRequest = 0;

function setView(view) {
  for (const name of ["bike", "synthetic"]) {
    byId(`${name}-view`).hidden = name !== view;
    byId(`view-${name}`).setAttribute("aria-selected", String(name === view));
  }
  if (view === "synthetic") Plotly.Plots.resize(byId("synthetic-plot"));
}
byId("view-bike").addEventListener("click", () => setView("bike"));
byId("view-synthetic").addEventListener("click", () => setView("synthetic"));

async function getJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.json();
}

async function loadOfficial() {
  try {
    const data = await getJson("/api/bike/official");
    const names = new Set(data.results.map((row) => row.method));
    if (data.scope !== "official holdout" || names.size !== 3) throw new Error("invalid approved artifact");
    byId("bike-official-rows").innerHTML = data.results.map((row) => {
      const setting = row.method === "Ridge" ? "λ = 0" : row.method === "Lasso" ? "α = 0.001" : "None";
      return `<tr><th scope="row">${row.method}</th><td>${setting}</td><td>${row.rmse.toFixed(3)}</td><td>${row.mae.toFixed(3)}</td><td>${row.r2.toFixed(5)}</td></tr>`;
    }).join("");
    byId("bike-official-status").textContent = "Approved one-time holdout artifact · 3,464 future-date rows · settings frozen before scoring.";
    const ols = data.results.find((row) => row.method === "OLS");
    const ridge = data.results.find((row) => row.method === "Ridge");
    const lasso = data.results.find((row) => row.method === "Lasso");
    byId("bike-result-summary").textContent = Math.abs(ols.rmse - ridge.rmse) < 1e-9
      ? `OLS and Ridge tie at λ = 0 (${ols.rmse.toFixed(3)} RMSE). Lasso is close at ${lasso.rmse.toFixed(3)} on the official future-date test.`
      : `Official future-date RMSE: OLS ${ols.rmse.toFixed(3)}, Ridge ${ridge.rmse.toFixed(3)}, Lasso ${lasso.rmse.toFixed(3)} rentals/hour.`;
  } catch (error) {
    byId("bike-official-status").textContent = `Official result unavailable: ${error.message}`;
  }
}

async function renderSurface() {
  const request = ++surfaceRequest;
  const lam = Number(byId("surface-penalty").value);
  byId("surface-penalty-value").textContent = String(lam);
  const data = await getJson(`/api/study/surface?lam=${lam}`);
  if (request !== surfaceRequest) return;
  const markers = ["ols", "ridge"].map((name) => {
    const [intercept, slope] = data[name];
    return {type: "scatter3d", mode: "markers", name: name === "ols" ? "OLS solution" : "Ridge minimum", x: [intercept], y: [slope], z: [data.marker_objective[name]], marker: {size: name === "ols" ? 8 : 10, opacity: 1, color: name === "ols" ? "#61c9b2" : "#ef9a73"}};
  });
  await Plotly.react("loss-surface", [{type: "surface", x: data.x, y: data.y, z: data.z, opacity: 0.58, showscale: false}, ...markers], {
    margin: {l: 0, r: 0, t: 34, b: 0},
    paper_bgcolor: "#1b2527", font: {color: "#eff5f1", size: 12},
    scene: {xaxis: {title: {text: "Intercept"}}, yaxis: {title: {text: "Slope"}}, zaxis: {title: {text: lam === 0 ? "Objective: SSE" : "Objective: SSE + λ × slope²"}}, camera: {eye: {x: 1.55, y: 1.5, z: 1.15}}},
    legend: {orientation: "h", y: 1.12},
  }, {responsive: true});
  if (request !== surfaceRequest) return;
  byId("surface-status").textContent = lam === 0
    ? "Height = SSE. OLS and Ridge solutions coincide when λ = 0; their markers overlap."
    : `Height = SSE + ${lam} × slope². Both markers sit on this surface; OLS is the unpenalized solution, Ridge is this surface's minimum.`;
}
byId("surface-penalty").addEventListener("input", () => renderSurface().catch((error) => { byId("surface-status").textContent = error.message; }));

function renderSolvers() {
  if (!solverResults.length) return;
  const [n, condition] = byId("solver-case").value.split("-").map(Number);
  const rows = solverResults.filter((row) => row.n === n && row.condition === condition);
  if (!rows.length) {
    byId("solver-caption").textContent = "No saved rows for this benchmark case";
    byId("solver-rows").innerHTML = '<tr><td colspan="7">No measurements are available for this case.</td></tr>';
    byId("solver-summary").textContent = "This benchmark case has no saved measurements.";
    byId("solver-rank").textContent = "No completed solves to order.";
    return;
  }
  byId("solver-caption").textContent = `${n} × ${rows[0].p} matrix · condition ${condition === 10 ? "10" : "10⁶"} · identical inputs`;
  byId("solver-rows").innerHTML = rows.map((row) => {
    const success = row.status === "completed";
    const status = success ? "Completed" : row.status === "iteration_limit" ? "Iteration limit (not converged)" : `Failed: ${row.status}`;
    return `<tr><th scope="row">${row.method}</th><td>${status}</td><td>${row.seconds === undefined ? "—" : `${row.seconds.toFixed(5)} s`}</td><td>${row.coefficient_relative_error?.toExponential(2) ?? "—"}</td><td>${row.residual?.toExponential(2) ?? "—"}</td><td>${row.input_bytes ? `${(row.input_bytes / 1024).toFixed(1)} KiB` : "—"}</td><td>${row.method === "Batch Gradient Descent" ? row.iterations ?? "—" : "Direct"}</td></tr>`;
  }).join("");
  const weight = Number(byId("solver-weight").value);
  byId("solver-weight-value").textContent = weight.toFixed(1);
  const completed = rows.filter((row) => row.status === "completed");
  if (completed.length) {
    const fastest = completed.reduce((best, row) => row.seconds < best.seconds ? row : best);
    const accurate = completed.reduce((best, row) => row.coefficient_relative_error < best.coefficient_relative_error ? row : best);
    const limited = rows.filter((row) => row.status !== "completed").map((row) => row.status === "iteration_limit"
      ? `${row.method} reached its 10,000-step iteration limit without converging.`
      : `${row.method} failed: ${row.status}.`).join(" ");
    byId("solver-summary").textContent = `For this case, ${fastest.method} has the shortest measured runtime; ${accurate.method} has the smallest measured coefficient error. ${limited || "All four methods completed."}`;
  } else byId("solver-summary").textContent = "No completed solve is available for this case.";
  const maxTime = Math.max(1e-30, ...completed.map((row) => row.seconds));
  const maxError = Math.max(1e-30, ...completed.map((row) => row.coefficient_relative_error));
  const order = completed.map((row) => ({name: row.method, score: weight * row.seconds / maxTime + (1 - weight) * row.coefficient_relative_error / maxError})).sort((a, b) => a.score - b.score);
  byId("solver-rank").textContent = `Exploratory order among completed solves: ${order.map((row) => row.name).join(" → ")}. Values above do not change.`;
}
byId("solver-case").addEventListener("change", renderSolvers);
byId("solver-weight").addEventListener("input", renderSolvers);

function renderSynthetic(data) {
  const levels = [0.1, 0.2, 0.4];
  byId("synthetic-rows").innerHTML = levels.map((noise) => {
    const values = ["OLS", "Ridge", "Lasso"].map((method) => {
      const rows = data.rows.filter((row) => row.noise === noise && row.method === method);
      return (rows.reduce((total, row) => total + row.validation_mse, 0) / rows.length).toFixed(5);
    });
    return `<tr><th scope="row">${noise}</th>${values.map((value) => `<td>${value}</td>`).join("")}<td>${data.failures.filter((row) => row.noise === noise).length}</td></tr>`;
  }).join("");
  byId("synthetic-summary").textContent = `${data.rows.length / 3} seeded noise/split runs · ${data.failures.length} Lasso convergence failures · validation MSE only`;
  const winners = levels.map((noise) => {
    const means = ["OLS", "Ridge", "Lasso"].map((method) => {
      const rows = data.rows.filter((row) => row.noise === noise && row.method === method);
      return {method, mse: rows.reduce((sum, row) => sum + row.validation_mse, 0) / rows.length};
    });
    return means.reduce((best, current) => current.mse < best.mse ? current : best).method;
  });
  byId("synthetic-result-summary").textContent = winners.every((name) => name === winners[0])
    ? `${winners[0]} has the lowest mean selected validation MSE at every shown noise level. ${data.failures.length === 0 ? "All Lasso fits completed." : `${data.failures.length} Lasso fits failed to converge.`}`
    : `Lowest mean selected validation MSE by noise level: ${levels.map((noise, i) => `${noise}: ${winners[i]}`).join("; ")}.`;
  const traces = ["OLS", "Ridge", "Lasso"].map((method) => ({
    name: method, type: "scatter", mode: "lines+markers", x: Array.from({length: 15}, (_, i) => i + 1),
    y: Array.from({length: 15}, (_, i) => {
      const rows = data.candidates.filter((row) => row.seed === 42 && row.noise === 0.2 && row.method === method && row.degree === i + 1);
      return Math.min(...rows.map((row) => row.validation_mse));
    }),
  }));
  Plotly.react("synthetic-plot", traces, {title: "Seed 42 · noise SD 0.2 · best validation MSE by degree", paper_bgcolor: "#1b2527", plot_bgcolor: "#1b2527", font: {color: "#eff5f1"}, xaxis: {title: "Polynomial degree", dtick: 2}, yaxis: {title: "Validation MSE", type: "log", tickvals: [0.01, 0.1, 1, 10], ticktext: ["0.01", "0.1", "1", "10"]}, margin: {t: 52, b: 60, l: 78, r: 16}}, {responsive: true});
  byId("synthetic-details").textContent = `All ${data.candidates.filter((row) => row.method === "Lasso").length} Lasso candidates converged. Selected degrees and penalties remain in results/synthetic.json.`;
}

byId("run-all").addEventListener("click", async () => {
  const button = byId("run-all"); button.disabled = true;
  const progress = byId("run-progress");
  const tasks = [
    ["Bike development", "/api/bike/development", () => {}],
    ["Battle B solvers", "/api/study/solvers", (data) => {solverResults = data.rows; renderSolvers();}],
    ["Synthetic ten-seed study", "/api/study/synthetic", renderSynthetic],
  ];
  const problems = [];
  for (const [label, path, render] of tasks) {
    progress.textContent = `Running ${label}…`;
    try { render(await getJson(path)); }
    catch (error) { problems.push(`${label}: ${error.message}`); }
  }
  progress.textContent = problems.length ? `Finished with failures: ${problems.join("; ")}` : "All comparisons finished · official Bike Sharing scores are from the recorded artifact.";
  button.disabled = false;
});
loadOfficial();
Promise.all([
  getJson("/api/study/saved/solvers").then((data) => { solverResults = data.rows; renderSolvers(); }),
  getJson("/api/study/saved/synthetic").then(renderSynthetic),
]).then(() => {
  byId("run-progress").textContent = "Showing saved development studies. Run All to recompute them live.";
}).catch((error) => {
  byId("run-progress").textContent = `Saved study unavailable: ${error.message}. Run All to recompute.`;
});
renderSurface().catch((error) => { byId("surface-status").textContent = error.message; });
