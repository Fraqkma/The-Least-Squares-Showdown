// Presentation shell: one chapter at a time, plus a docked control panel for the current chapter.
const chapters = [...document.querySelectorAll("main > .section-anchor")];
const links = [...document.querySelectorAll(".chapter-nav a")];
const panel = document.querySelector("#lab-panel");
const toggle = document.querySelector("#panel-toggle");
const tools = document.querySelector("#panel-tools");
const note = document.querySelector("#panel-note");
const panelTitle = document.querySelector("#panel-title");
const fitControls = document.querySelector("#fit-controls");
const surfaceControls = document.querySelector(".surface-control");
const compact = window.matchMedia("(max-width: 1099px)");
const moved = [];
let active = chapters[0];
let opener = null;

const chapterName = (index) => links[index]?.querySelector(".chapter-name")?.firstChild?.textContent.trim() ?? "";

const notes = {
  overview: "Refit both curves on the same 24 training points. The degree and λ stay in place when you close this panel or change chapters.",
  "least-squares": "Change the slope penalty on the two-parameter loss surface. It is separate from the overview fit’s λ.",
  overfitting: "Move Degree to refit the explorer chart. The three comparison cards keep degrees 1, 3 and 12.",
  "results-bike": "Switch data sets, or weight the development metrics to explore an ordering. Measured values never change.",
  "results-synthetic": "The synthetic study compares fixed noise levels across ten seeds. Run All recomputes it live.",
  "battle-b": "Choose a benchmark case and weight runtime against coefficient accuracy.",
};

// Move the live inputs so values, focus order and listeners stay the same in both places.
function moveToPanel(node) {
  if (!node) return;
  const anchor = document.createComment("control moved to the panel");
  node.before(anchor);
  moved.push({ node, anchor });
  tools.append(node);
}

function restoreTools() {
  for (const { node, anchor } of moved.splice(0)) anchor.replaceWith(node);
}

function fillPanel() {
  restoreTools();
  const index = chapters.indexOf(active);
  document.querySelector("#panel-chapter").textContent = `Chapter ${index + 1}: ${chapterName(index)}`;
  let key = active.id;
  if (["overview", "overfitting"].includes(key)) moveToPanel(fitControls);
  if (key === "least-squares") moveToPanel(surfaceControls);
  if (key === "results") {
    const bike = !document.querySelector("#bike-view").hidden;
    key = bike ? "results-bike" : "results-synthetic";
    moveToPanel(active.querySelector(".view-tabs"));
    if (bike) moveToPanel(active.querySelector("#bike-view .bike-ranking"));
  }
  if (key === "battle-b") {
    moveToPanel(active.querySelector(".case-picker"));
    moveToPanel(active.querySelector(".solver-ranking"));
  }
  note.textContent = notes[key];
}

function revealChart() {
  // Keep the chapter's main chart in view while settings change. On narrow screens the
  // panel is a bottom sheet, so the chart moves to the top of the screen above it.
  const chart = document.getElementById(active.dataset.chart ?? "");
  if (!chart) return;
  if (compact.matches) {
    chart.scrollIntoView({ block: "start", behavior: "instant" });
    return;
  }
  const box = chart.getBoundingClientRect();
  if (box.top < 0 || box.bottom > window.innerHeight) chart.scrollIntoView({ block: "nearest", behavior: "instant" });
}

export function openPanel(focusTarget = null) {
  opener = document.activeElement instanceof HTMLElement ? document.activeElement : toggle;
  fillPanel();
  panel.hidden = false;
  document.body.classList.add("panel-open");
  toggle.setAttribute("aria-expanded", "true");
  revealChart();
  const target = focusTarget ? document.getElementById(focusTarget) : null;
  (target && panel.contains(target) ? target : panelTitle).focus({ preventScroll: true });
}

export function closePanel() {
  if (panel.hidden) return;
  const hadFocus = panel.contains(document.activeElement);
  panel.hidden = true;
  restoreTools();
  document.body.classList.remove("panel-open");
  toggle.setAttribute("aria-expanded", "false");
  if (hadFocus) (opener && document.contains(opener) && !opener.closest("[hidden]") ? opener : toggle).focus({ preventScroll: true });
}

toggle.addEventListener("click", () => (panel.hidden ? openPanel() : closePanel()));
panel.querySelector(".panel-close").addEventListener("click", closePanel);
document.querySelectorAll("[data-open-panel]").forEach((button) => {
  button.addEventListener("click", () => openPanel(button.dataset.openPanel));
});
document.addEventListener("battleviewchange", () => { if (!panel.hidden) fillPanel(); });

function setPagerLink(id, index, direction) {
  const anchor = document.getElementById(id);
  const link = links[index];
  anchor.hidden = !link;
  if (!link) return;
  anchor.href = link.hash;
  anchor.textContent = direction === "next" ? `Next: ${chapterName(index)}` : `Previous: ${chapterName(index)}`;
}

function showChapter(moveFocus = false) {
  const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
  const next = target?.id === "main" ? active : target?.closest("main > section") ?? chapters[0];
  const changed = next !== active;
  active = next;
  const index = chapters.indexOf(active);
  chapters.forEach((section) => { section.hidden = section !== active; });
  links.forEach((link, position) => {
    if (position === index) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  document.querySelector("#chapter-position").textContent = `Chapter ${index + 1} of ${chapters.length}`;
  document.querySelectorAll(".camp-trail i").forEach((dot, position) => {
    dot.dataset.state = position < index ? "past" : position === index ? "current" : "next";
  });
  document.title = index === 0 ? "The Least Squares Showdown" : `${chapterName(index)} · The Least Squares Showdown`;
  setPagerLink("previous-chapter", index - 1, "previous");
  setPagerLink("next-chapter", index + 1, "next");
  // An open panel follows the presenter to the new chapter; its settings stay as they were.
  if (!panel.hidden && changed) fillPanel();
  if (target?.id === "main") {
    target.focus();
  } else if (target && target !== active) {
    for (let parent = target.parentElement; parent; parent = parent.parentElement) {
      if (parent.tagName === "DETAILS") parent.open = true;
    }
    target.scrollIntoView({ block: "center" });
  } else if (moveFocus) {
    const heading = active.querySelector("h1, h2");
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  document.dispatchEvent(new CustomEvent("chapterchange", { detail: { id: active.id } }));
}

function goToChapter(step) {
  const index = chapters.indexOf(active) + step;
  if (index < 0 || index >= chapters.length) return;
  location.hash = links[index].hash;
}

// Left and right arrows move between chapters unless a control is using them.
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !panel.hidden) {
    event.preventDefault();
    closePanel();
    return;
  }
  if (!["ArrowLeft", "ArrowRight"].includes(event.key) || event.defaultPrevented) return;
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  const target = event.target;
  if (target instanceof Element && target.closest("input, select, textarea, [contenteditable], [role='tab'], .walk-controls, .js-plotly-plot")) return;
  event.preventDefault();
  goToChapter(event.key === "ArrowRight" ? 1 : -1);
});

// Hidden charts get their real width when their chapter (or data tab) opens.
const sizes = new ResizeObserver((entries) => {
  for (const { target, contentRect } of entries) {
    if (contentRect.width && target.data) window.Plotly.Plots.resize(target).catch(() => {});
  }
});
document.querySelectorAll(".fit-chart, .small-fit-plot, .study-plot, .surface-plot, .battle-plot, .mse-chart, .explore-chart")
  .forEach((plot) => sizes.observe(plot));
window.addEventListener("hashchange", () => showChapter(true));
showChapter();
// A chapter link opens at the top of the page, with the chapter bar in view, instead of
// letting the browser scroll the section under the masthead.
if ("scrollRestoration" in history) history.scrollRestoration = "manual";
window.addEventListener("load", () => {
  const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
  if (!target || chapters.includes(target)) window.scrollTo({ top: 0, behavior: "instant" });
}, { once: true });
