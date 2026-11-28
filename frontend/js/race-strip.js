// Painted slope race strip: places one coloured flag per method in the exact order shown by the ranking.
// Never invents numbers or replaces the charts/tables.
const METHOD_COLORS = {
  OLS: "#3a6aaf",
  Ridge: "#b5503b",
  Lasso: "#18978a",
  "Normal Equations": "#3a6aaf",
  "QR factorization": "#b5503b",
  QR: "#b5503b",
  SVD: "#18978a",
  "Batch Gradient Descent": "#d49a1e",
};

const ORDINALS = ["1st", "2nd", "3rd", "4th"];

function ordinal(rank) {
  return ORDINALS[rank - 1] ?? `${rank}th`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

/**
 * Render ranked climber flags onto a container element.
 * @param {string} elementId - Target container id.
 * @param {Array<{name: string, rank: number, tied?: boolean, status?: string}>} entries - Ordered entries (best first).
 * @param {string} subtitle - Short context label for the strip header.
 */
export function renderRaceStrip(elementId, entries, subtitle = "") {
  const host = document.getElementById(elementId);
  if (!host) return;
  if (!entries.length) {
    host.innerHTML = `<div class="race-strip-head"><h4>Summit race</h4>${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ""}</div><p class="race-empty">Waiting for ranking data.</p>`;
    return;
  }

  // Group entries by rank (or "incomplete" status) so ties sit at the same elevation on the slope.
  const completed = entries.filter((entry) => entry.status !== "incomplete");
  const incomplete = entries.filter((entry) => entry.status === "incomplete");

  const slots = completed.length + (incomplete.length ? 1 : 0);
  const flagItems = entries.map((entry) => {
    const color = METHOD_COLORS[entry.name] ?? "#37547c";
    const isIncomplete = entry.status === "incomplete";
    const placeLabel = isIncomplete
      ? "Not converged"
      : entry.tied
        ? `Tied ${ordinal(entry.rank)}`
        : ordinal(entry.rank);
    // Position along the rising slope: 1st place highest (top-right), lower places toward bottom-left.
    const tierIndex = isIncomplete ? Math.max(slots - 1, 1) : Math.max(0, entry.rank - 1);
    const maxTier = Math.max(slots - 1, 1);
    const progress = 1 - tierIndex / maxTier; // 1 = top, 0 = bottom
    return `<li class="race-flag${isIncomplete ? " is-incomplete" : ""}" style="--flag-color:${color};--elev:${progress.toFixed(3)}">`
      + `<span class="race-pole" aria-hidden="true"><span class="race-pennant"></span></span>`
      + `<span class="race-label"><strong class="race-name">${escapeHtml(entry.name)}</strong><span class="race-place">${escapeHtml(placeLabel)}</span></span>`
      + `</li>`;
  }).join("");

  host.innerHTML = `<div class="race-strip-head"><h4>Summit race</h4>${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ""}</div>`
    + `<div class="race-slope">`
    + `<svg class="race-slope-art" viewBox="0 0 360 150" preserveAspectRatio="none" aria-hidden="true">`
    + `<defs><linearGradient id="slope-sky-${escapeHtml(elementId)}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ccbac9" stop-opacity="0.32"/><stop offset="100%" stop-color="#f4f2f8" stop-opacity="0.95"/></linearGradient></defs>`
    + `<rect width="360" height="150" fill="url(#slope-sky-${escapeHtml(elementId)})"/>`
    + `<path d="M0 132 Q90 112 185 80 T360 22 L360 150 L0 150 Z" fill="#ffffff"/>`
    + `<path d="M0 132 Q90 112 185 80 T360 22" fill="none" stroke="#9192b0" stroke-width="2" stroke-dasharray="5 5"/>`
    + `<path d="M0 142 Q115 124 215 95 T360 44 L360 150 L0 150 Z" fill="#f4f2f8" opacity="0.85"/>`
    + `</svg>`
    + `<ol class="race-flags" aria-label="Ranked methods on the mountain slope">${flagItems}</ol>`
    + `</div>`;
}
