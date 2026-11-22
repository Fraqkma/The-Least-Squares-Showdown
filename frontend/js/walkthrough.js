// One source of truth for the worked observations and every derived display.
const points = Object.freeze([{ x: 0, y: 1 }, { x: 1, y: 2 }, { x: 2, y: 2 }]);
const design = points.map(({ x }) => [1, x]);
const observed = points.map(({ y }) => y);
const starting = { b: 1, m: 1 };
const fitted = { b: 7 / 6, m: 1 / 2 };
const predict = ({ b, m }) => points.map(({ x }) => b + m * x);
const residuals = (model) => observed.map((y, i) => y - predict(model)[i]);
const sse = (model) => residuals(model).reduce((sum, r) => sum + r * r, 0);
const plot = document.querySelector("#walk-plot");
const content = document.querySelector("#walk-content");
const indicator = document.querySelector("#walk-step-indicator");
const back = document.querySelector("#walk-back");
const next = document.querySelector("#walk-next");
const reset = document.querySelector("#walk-reset");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let step = 0;
let generation = 0;
let timers = [];
let frame = 0;

const px = (x) => 72 + x * 144;
const py = (y) => 250 - y * 74;
const rowName = (i) => `P${i + 1}`;
const cancelAnimation = () => {
  generation += 1;
  timers.forEach(clearTimeout);
  timers = [];
  cancelAnimationFrame(frame);
};
const later = (callback, delay, token) => {
  if (reducedMotion.matches) { callback(); return; }
  timers.push(setTimeout(() => { if (token === generation) callback(); }, delay));
};
const line = (model, className) => `<line class="${className}" x1="${px(0)}" y1="${py(model.b)}" x2="${px(2)}" y2="${py(model.b + model.m * 2)}" />`;

function drawGraph(model = null, showResiduals = false) {
  const grid = [0, 1, 2, 3].map((v) => `<line class="walk-gridline" x1="72" x2="390" y1="${py(v)}" y2="${py(v)}"/><text class="walk-tick" x="49" y="${py(v) + 5}">${v}</text>`).join("");
  const ticks = points.map(({ x }) => `<text class="walk-tick" x="${px(x) - 4}" y="277">${x}</text>`).join("");
  const segments = showResiduals ? points.map((point, i) => {
    const residual = residuals(model)[i];
    if (Math.abs(residual) < 1e-10) return "";
    const label = step === 3 ? ["minus one sixth", "one third", "minus one sixth"][i] : "minus one";
    return `<line class="walk-residual" x1="${px(point.x)}" x2="${px(point.x)}" y1="${py(predict(model)[i])}" y2="${py(point.y)}" aria-label="${rowName(i)} residual ${label}"/>`;
  }).join("") : "";
  plot.innerHTML = `<title>Three observed points and the least-squares line</title><desc>${points.map((p, i) => `${rowName(i)} is (${p.x}, ${p.y})`).join("; ")}. Residual is observed y minus predicted y.</desc>${grid}<line class="walk-axis" x1="72" y1="250" x2="390" y2="250"/><line class="walk-axis" x1="72" y1="250" x2="72" y2="18"/>${ticks}<text class="walk-axis-label" x="379" y="281">Input x</text><text class="walk-axis-label" x="74" y="12">Observed y</text>${model ? line(model, step === 3 ? "walk-fit-line" : "walk-start-line") : ""}${segments}${points.map((p, i) => `<g class="walk-point" data-point="${i}"><circle cx="${px(p.x)}" cy="${py(p.y)}" r="7"/><text x="${px(p.x) + 11}" y="${py(p.y) - 10}">${rowName(i)} (${p.x}, ${p.y})</text></g>`).join("")}`;
}

function inputTable() {
  return `<table class="walk-table"><caption>Observed inputs</caption><thead><tr><th>Point</th><th>x</th><th>observed y</th></tr></thead><tbody>${points.map((p, i) => `<tr><th scope="row">${rowName(i)}</th><td>${p.x}</td><td>${p.y}</td></tr>`).join("")}</tbody></table>`;
}

function matrixRows() {
  return points.map((p, i) => `<tr class="walk-map-row" data-row="${i}" hidden><th scope="row">${rowName(i)} (${p.x}, ${p.y})</th><td>[${design[i].join(", ")}]</td><td>${observed[i]}</td></tr>`).join("");
}

function revealMapping(token) {
  points.forEach((_, i) => later(() => {
    document.querySelectorAll(".walk-map-row").forEach((row) => row.classList.remove("is-active"));
    plot.querySelectorAll(".walk-point").forEach((point) => point.classList.remove("is-active"));
    const row = content.querySelector(`[data-row="${i}"]`);
    row.hidden = false;
    row.classList.add("is-active");
    plot.querySelector(`[data-point="${i}"]`).classList.add("is-active");
  }, (i + 1) * 360, token));
}

function render() {
  cancelAnimation();
  const token = generation;
  indicator.textContent = `Step ${step + 1} of 4`;
  back.disabled = step === 0;
  next.disabled = step === 3;
  if (step === 0) {
    drawGraph();
    content.innerHTML = `<h4>1. Plot the data</h4><p>Each labeled point pairs an input x with its observed y.</p>${inputTable()}`;
  } else if (step === 1) {
    drawGraph();
    content.innerHTML = `<h4>2. Build the design matrix</h4><p>The first column of X is all ones, so every prediction includes the intercept b.</p><table class="walk-table"><caption>Point to row mapping</caption><thead><tr><th>Point</th><th>row in X</th><th>entry in y</th></tr></thead><tbody>${matrixRows()}</tbody></table>`;
    revealMapping(token);
  } else if (step === 2) {
    drawGraph(starting);
    content.innerHTML = `<h4>3. Predict and measure error</h4><p class="walk-math">&beta; = [b, m]<sup>T</sup>, &nbsp; &#375; = X&beta;</p><p>The intercept b sets the height at x = 0; slope m sets the change per x. Start with &#375; = b + mx = 1 + x.</p><p id="walk-predictions" hidden>Predictions: [${predict(starting).join(", ")}].</p><p id="walk-residual-note" hidden>Residual e<sub>i</sub> = observed y<sub>i</sub> &minus; predicted &#375;<sub>i</sub>. For P3: 2 &minus; 3 = &minus;1. Sum of squared errors (SSE) = &Sigma;(y<sub>i</sub> &minus; &#375;<sub>i</sub>)<sup>2</sup> = 0<sup>2</sup> + 0<sup>2</sup> + (&minus;1)<sup>2</sup> = ${sse(starting)}.</p>`;
    later(() => { content.querySelector("#walk-predictions").hidden = false; }, 350, token);
    later(() => { drawGraph(starting, true); content.querySelector("#walk-residual-note").hidden = false; }, 750, token);
  } else {
    drawGraph(starting);
    content.innerHTML = `<h4>4. Fit the least-squares line</h4><p class="walk-math">&#375; = 7/6 + x/2</p><p class="walk-sse">The fit cuts total squared error from ${sse(starting)} to <strong>1/6</strong>.</p><p>Fitted predictions: [7/6, 5/3, 13/6].<br>Residuals (observed &minus; predicted): [&minus;1/6, 1/3, &minus;1/6].</p><p>SSE = (&minus;1/6)<sup>2</sup> + (1/3)<sup>2</sup> + (&minus;1/6)<sup>2</sup> = 1/6.</p><details class="walk-derivation"><summary>Show normal equations</summary><p>X<sup>T</sup>X&beta; = X<sup>T</sup>y</p><p>3b + 3m = 5<br>3b + 5m = 6</p><p>Solution: b = 7/6, m = 1/2.</p></details>`;
    if (reducedMotion.matches) { drawGraph(fitted, true); return; }
    const start = performance.now();
    const animate = (now) => {
      if (token !== generation) return;
      const t = Math.min((now - start) / 650, 1);
      const ease = t * t * (3 - 2 * t);
      const model = { b: starting.b + (fitted.b - starting.b) * ease, m: starting.m + (fitted.m - starting.m) * ease };
      drawGraph(model, t === 1);
      if (t < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
  }
}

back.addEventListener("click", () => { if (step > 0) { step -= 1; render(); } });
next.addEventListener("click", () => { if (step < 3) { step += 1; render(); } });
reset.addEventListener("click", () => { step = 0; render(); });
document.querySelector(".walk-controls")?.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft" && step > 0) {
    event.preventDefault();
    step -= 1;
    render();
  } else if (event.key === "ArrowRight" && step < 3) {
    event.preventDefault();
    step += 1;
    render();
  }
});
reducedMotion.addEventListener("change", render);
render();
