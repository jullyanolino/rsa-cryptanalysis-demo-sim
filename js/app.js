/* ============================================================
   app.js — controller: navigation, lesson panel, live controls
   Author: Jullyano Lino
   ============================================================ */
(function () {
  "use strict";
  const { buildChapters, CHAPTERS_META, PRIMES } = window.Content;
  const SM = window.SceneManager;

  const DEFAULTS = {
    ci: 0, si: 0,
    pi: 16, qi: 14,        // 61, 53
    M: 65,
    fpi: 3, fqi: 4,        // 11, 13
    shor: "15",
    mathOpen: false,
  };
  const LS_KEY = "rsa_shor_lab_v1";

  let state = load();
  let chapters = [];
  let lastViz = "";

  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(LS_KEY));
      if (s && typeof s === "object") return Object.assign({}, DEFAULTS, s);
    } catch (e) {}
    return Object.assign({}, DEFAULTS);
  }
  function save() { try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) {} }

  // ---- DOM refs ----
  const $ = (s, r) => (r || document).querySelector(s);
  const railEl = $("#rail-chapters");
  const panelEl = $("#panel");
  const legendEl = $("#stage-legend");

  // ---------- rail ----------
  function buildRail() {
    railEl.innerHTML = "";
    CHAPTERS_META.forEach((c, i) => {
      const b = document.createElement("button");
      b.className = "chapter" + (i === state.ci ? " active" : (i < state.ci ? " done" : ""));
      b.innerHTML = `<span class="num">${i + 1}</span>
        <span class="meta"><span class="t">${c.t}</span><span class="s">${c.s}</span></span>`;
      b.addEventListener("click", () => { state.ci = i; state.si = 0; render(true); });
      railEl.appendChild(b);
    });
  }

  // ---------- navigation helpers ----------
  function chapter() { return chapters[state.ci]; }
  function step() { return chapter().steps[state.si]; }
  function totalSteps() { return chapters.reduce((a, c) => a + c.steps.length, 0); }
  function globalIndex() {
    let g = 0;
    for (let i = 0; i < state.ci; i++) g += chapters[i].steps.length;
    return g + state.si;
  }
  function go(dir) {
    let { ci, si } = state;
    si += dir;
    if (si < 0) { ci--; if (ci < 0) { ci = 0; si = 0; } else si = chapters[ci].steps.length - 1; }
    else if (si >= chapters[ci].steps.length) { ci++; if (ci >= chapters.length) { ci = chapters.length - 1; si = chapters[ci].steps.length - 1; } else si = 0; }
    state.ci = ci; state.si = si; render(true);
  }

  // ---------- controls ----------
  function controlsHTML(ctrls) {
    if (!ctrls || !ctrls.length) return "";
    let h = `<div class="controls">`;
    ctrls.forEach(c => {
      if (c.type === "primes") {
        h += sliderHTML("pi", "Prime p", 0, PRIMES.length - 1, 1, PRIMES[state.pi]);
        h += sliderHTML("qi", "Prime q", 0, PRIMES.length - 1, 1, PRIMES[state.qi]);
      } else if (c.type === "factor-primes") {
        h += sliderHTML("fpi", "Factor p", 0, PRIMES.length - 1, 1, PRIMES[state.fpi]);
        h += sliderHTML("fqi", "Factor q", 0, PRIMES.length - 1, 1, PRIMES[state.fqi]);
      } else if (c.type === "message") {
        h += sliderHTML("M", "Message M", 2, c.max, 1, state.M);
      } else if (c.type === "shor-case") {
        h += `<div class="control"><div class="lab"><span class="name">Target number N</span></div>
          <div class="seg" data-seg="shor">
            <button data-v="15" class="${state.shor === "15" ? "on" : ""}">N = 15  (a=7)</button>
            <button data-v="21" class="${state.shor === "21" ? "on" : ""}">N = 21  (a=2)</button>
          </div></div>`;
      }
    });
    h += `</div>`;
    return h;
  }
  function sliderHTML(key, name, min, max, stepv, shown) {
    return `<div class="control">
      <div class="lab"><span class="name">${name}</span><span class="v" data-vfor="${key}">${shown}</span></div>
      <input type="range" data-key="${key}" min="${min}" max="${max}" step="${stepv}" value="${state[key]}">
    </div>`;
  }
  function primeOf(key) { return PRIMES[state[key]]; }

  function wireControls(scope) {
    scope.querySelectorAll('input[type=range]').forEach(inp => {
      const key = inp.dataset.key;
      inp.addEventListener("input", () => {
        state[key] = parseInt(inp.value, 10);
        const vEl = scope.querySelector(`[data-vfor="${key}"]`);
        if (vEl) vEl.textContent = (key === "M") ? state[key] : PRIMES[state[key]];
      });
      inp.addEventListener("change", () => { save(); render(false); });
    });
    scope.querySelectorAll('[data-seg="shor"] button').forEach(btn => {
      btn.addEventListener("click", () => { state.shor = btn.dataset.v; save(); render(true); });
    });
  }

  // ---------- panel render ----------
  function renderPanel() {
    const ch = chapter(), st = step();
    const g = globalIndex() + 1, tot = totalSteps();
    const pct = (g / tot) * 100;

    const mathRows = (st.math || []).map(m =>
      `<div class="math-row${m.hl ? " hl" : ""}"><span class="lab">${m.lab}</span><span class="val">${m.val}</span></div>`
    ).join("");

    const bodyParas = (st.body || []).map(p => `<p class="para">${p}</p>`).join("");
    const callout = st.callout ? `<div class="callout ${st.callout.type || ""}">
        <div class="h">${st.callout.h}</div>${st.callout.text}</div>` : "";

    const dots = ch.steps.map((_, i) =>
      `<span class="d ${i === state.si ? "on" : (i < state.si ? "seen" : "")}" data-dot="${i}"></span>`
    ).join("");

    panelEl.innerHTML = `
      <div class="panel-head">
        <div class="step-meta"><span>Chapter ${state.ci + 1} · ${ch.title}</span><span>${state.si + 1} / ${ch.steps.length}</span></div>
        <div class="progress"><i style="width:${pct}%"></i></div>
        ${st.tag ? `<div class="step-kicker">${st.tag}</div>` : ""}
        <h2>${st.title}</h2>
      </div>
      <div class="panel-body">
        <div class="fade-swap" id="swap">
          <p class="lead">${st.lead}</p>
          ${bodyParas}
          ${callout}
          ${controlsHTML(st.controls)}
          ${mathRows ? `<div class="math-toggle ${state.mathOpen ? "open" : ""}" id="math-toggle">
              <span class="chev">▸</span> ${state.mathOpen ? "Hide" : "Show"} the math</div>
            <div class="math-box ${state.mathOpen ? "open" : ""}" id="math-box">${mathRows}</div>` : ""}
        </div>
      </div>
      <div class="panel-foot">
        <div class="dots">${dots}</div>
        <button class="btn" id="btn-back" ${g === 1 ? "disabled" : ""}>← Back</button>
        <button class="btn primary" id="btn-next" ${g === tot ? "disabled" : ""}>Next →</button>
      </div>`;

    // wire
    $("#btn-back").addEventListener("click", () => go(-1));
    $("#btn-next").addEventListener("click", () => go(1));
    panelEl.querySelectorAll(".dots .d").forEach(d =>
      d.addEventListener("click", () => { state.si = parseInt(d.dataset.dot, 10); render(true); }));
    const mt = $("#math-toggle");
    if (mt) mt.addEventListener("click", () => {
      state.mathOpen = !state.mathOpen; save();
      $("#math-box").classList.toggle("open", state.mathOpen);
      mt.classList.toggle("open", state.mathOpen);
      mt.querySelector(".chev").nextSibling; // no-op
      mt.lastChild.textContent = ` ${state.mathOpen ? "Hide" : "Show"} the math`;
    });
    wireControls(panelEl);
  }

  // ---------- scene sync ----------
  function syncScene() {
    const st = step();
    const key = st.viz.key;
    const sig = key + ":" + JSON.stringify(st.viz.params);
    if (sig === lastViz) return;
    lastViz = sig;
    SM.show(key, st.viz.params);
    updateLegend(key);
  }
  function updateLegend(key) {
    let items = [];
    if (key === "lattice") items = [["#9b988d", "unit of n"], ["#4f56c9", "clean grid (p×q)"], ["#c2452f", "leftover (no fit)"]];
    else if (key === "clock") items = [["#4f56c9", "current value"], ["#868be6", "path so far"]];
    else if (key === "qubits") items = [["#4f56c9", "qubit"], ["#c69022", "state vector"]];
    else if (key === "interference") items = [["#4f56c9", "probability peak"], ["#c69022", "phasor sum"]];
    legendEl.innerHTML = items.map(i => `<span class="item"><span class="sw" style="background:${i[0]}"></span>${i[1]}</span>`).join("");
  }

  // ---------- master render ----------
  function render(rebuildViz) {
    chapters = buildChapters(state);
    // clamp indices
    state.ci = Math.max(0, Math.min(chapters.length - 1, state.ci));
    state.si = Math.max(0, Math.min(chapters[state.ci].steps.length - 1, state.si));
    buildRail();
    renderPanel();
    if (rebuildViz) lastViz = ""; // force
    syncScene();
    save();
  }

  // ---------- scene playback controls ----------
  function wireStageControls() {
    let playing = true;
    $("#sc-replay").addEventListener("click", () => { SM.reset(); playing = true; setPlayLabel(playing); });
    $("#sc-play").addEventListener("click", () => {
      playing = !playing;
      if (playing) { if (SM.current && !SM.current.playing) SM.play(); SM.current && (SM.current.playing = true); }
      else { SM.pause(); }
      setPlayLabel(playing);
    });
    function setPlayLabel(p) { $("#sc-play").innerHTML = p ? "⏸ Pause" : "▶ Play"; }
  }

  // ---------- boot ----------
  function boot() {
    if (!window.THREE) { document.body.innerHTML = '<p style="padding:40px;font:20px sans-serif">3D engine failed to load. Please retry.</p>'; return; }
    SM.init($("#scene-canvas"), $("#scene-readout"));
    wireStageControls();
    render(true);
    // keyboard nav
    window.addEventListener("keydown", e => {
      if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
