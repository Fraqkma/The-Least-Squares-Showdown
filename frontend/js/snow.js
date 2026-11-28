// Gentle falling snow scoped strictly to .hero and .chapter-head banners.
// Ignores pointer events, pauses when the tab is hidden, and disables completely with prefers-reduced-motion.
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const targets = [...document.querySelectorAll(".hero, .chapter-head")];
const instances = [];
let rafId = 0;

function createFlakes(width, height, count) {
  const flakes = [];
  for (let i = 0; i < count; i += 1) {
    flakes.push({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 1.4 + Math.random() * 2.4,
      vy: 14 + Math.random() * 20,
      vx: -6 + Math.random() * 12,
      phase: Math.random() * Math.PI * 2,
      alpha: 0.45 + Math.random() * 0.42,
    });
  }
  return flakes;
}

function setup() {
  for (const host of targets) {
    const canvas = document.createElement("canvas");
    canvas.className = "snow-canvas";
    canvas.setAttribute("aria-hidden", "true");
    host.append(canvas);
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    const state = { host, canvas, ctx, width: 0, height: 0, flakes: [] };
    instances.push(state);
    resizeInstance(state);
  }
  const ro = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const state = instances.find((item) => item.host === entry.target);
      if (state) resizeInstance(state);
    }
  });
  for (const state of instances) ro.observe(state.host);
}

function resizeInstance(state) {
  const rect = state.host.getBoundingClientRect();
  const width = Math.max(0, Math.round(rect.width));
  const height = Math.max(0, Math.round(rect.height));
  if (!width || !height) {
    state.width = 0;
    state.height = 0;
    return;
  }
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  state.width = width;
  state.height = height;
  state.canvas.width = Math.round(width * dpr);
  state.canvas.height = Math.round(height * dpr);
  state.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const density = state.host.classList.contains("hero") ? 38 : 22;
  state.flakes = createFlakes(width, height, density);
}

function clearAll() {
  for (const state of instances) {
    state.ctx.clearRect(0, 0, state.width, state.height);
  }
}

let lastTime = 0;
function tick(now) {
  if (reducedMotion.matches || document.hidden) {
    rafId = 0;
    return;
  }
  const dt = Math.min((now - (lastTime || now)) / 1000, 0.05);
  lastTime = now;
  for (const state of instances) {
    if (!state.width || !state.height || state.host.closest("[hidden]")) continue;
    const { ctx, width, height, flakes } = state;
    ctx.clearRect(0, 0, width, height);
    for (const flake of flakes) {
      flake.y += flake.vy * dt;
      flake.phase += dt * 0.9;
      flake.x += (flake.vx + Math.sin(flake.phase) * 7) * dt;
      if (flake.y > height + 4) {
        flake.y = -4;
        flake.x = Math.random() * width;
      }
      if (flake.x < -6) flake.x = width + 6;
      if (flake.x > width + 6) flake.x = -6;
      ctx.beginPath();
      ctx.arc(flake.x, flake.y, flake.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${flake.alpha.toFixed(2)})`;
      ctx.fill();
    }
  }
  rafId = requestAnimationFrame(tick);
}

function syncMotion() {
  if (reducedMotion.matches) {
    cancelAnimationFrame(rafId);
    rafId = 0;
    clearAll();
    return;
  }
  if (document.hidden) {
    cancelAnimationFrame(rafId);
    rafId = 0;
    return;
  }
  if (!rafId) {
    lastTime = 0;
    rafId = requestAnimationFrame(tick);
  }
}

if (targets.length) {
  setup();
  document.addEventListener("visibilitychange", syncMotion);
  document.addEventListener("chapterchange", () => {
    for (const state of instances) {
      if (!state.host.closest("[hidden]")) resizeInstance(state);
    }
    syncMotion();
  });
  reducedMotion.addEventListener("change", syncMotion);
  syncMotion();
}
