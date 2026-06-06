/* ============================================================
   scenes.js — Three.js stage + four didactic scenes
     · LatticeScene      n = p×q dot grid / trial-division tiling
     · ClockScene        modular-exponentiation ring (cycles)
     · QubitScene        quantum register & superposition
     · InterferenceScene QFT period-finding interference
   Author: Jullyano Lino
   ============================================================ */
(function (global) {
  "use strict";
  const T = global.THREE;

  const COL = {
    paper: 0xF6F4EE,
    dot:   0x9b988d,
    ink:   0x2a2925,
    accent:0x4f56c9,
    accentL:0x868be6,
    green: 0x2f9e57,
    red:   0xc2452f,
    gold:  0xc69022,
  };

  // ---------- shared textures ----------
  let _disc, _glow;
  function discTexture() {
    if (_disc) return _disc;
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const g = c.getContext("2d");
    g.beginPath(); g.arc(32, 32, 28, 0, 7); g.fillStyle = "#fff"; g.fill();
    _disc = new T.CanvasTexture(c); return _disc;
  }
  function glowTexture() {
    if (_glow) return _glow;
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const g = c.getContext("2d");
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, "rgba(255,255,255,1)");
    gr.addColorStop(0.25, "rgba(255,255,255,0.7)");
    gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    _glow = new T.CanvasTexture(c); return _glow;
  }
  function makeGlow(color, size) {
    const m = new T.SpriteMaterial({ map: glowTexture(), color, transparent: true,
      blending: T.AdditiveBlending, depthWrite: false, opacity: 0.9 });
    const s = new T.Sprite(m); s.scale.set(size, size, 1); return s;
  }
  function makeLabel(text, opts) {
    opts = opts || {};
    const fs = opts.fs || 52, pad = 16;
    const c = document.createElement("canvas");
    const g = c.getContext("2d");
    g.font = `${opts.weight || 600} ${fs}px "IBM Plex Mono", monospace`;
    const w = Math.ceil(g.measureText(text).width) + pad * 2;
    c.width = w; c.height = fs + pad * 2;
    g.font = `${opts.weight || 600} ${fs}px "IBM Plex Mono", monospace`;
    g.textBaseline = "middle"; g.textAlign = "center";
    g.fillStyle = opts.color || "#2a2925";
    g.fillText(text, w / 2, c.height / 2);
    const tex = new T.CanvasTexture(c); tex.minFilter = T.LinearFilter;
    const mat = new T.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
    const sp = new T.Sprite(mat);
    const sc = (opts.scale || 1) * 0.0016;
    sp.scale.set(c.width * sc, c.height * sc, 1);
    sp.userData.aspect = c.width / c.height;
    return sp;
  }

  // ========================================================
  //  Scene base
  // ========================================================
  class BaseScene {
    constructor(ctx) { this.ctx = ctx; this.root = new T.Group(); this.t = 0; this.playing = false; this.autorotate = true; this.camPos = [0, 0, 26]; this.camLook = [0, 0, 0]; }
    play() { this.t = 0; this.playing = true; }
    pause() { this.playing = false; }
    reset() { this.t = 0; }
    update() {}
    dispose() {
      this.root.traverse(o => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (m.map) m.map.dispose && m.map.dispose(); m.dispose(); }); }
      });
    }
    say(html) { this.ctx.readout(html); }
  }

  // ========================================================
  //  LatticeScene — n dots; arrange into `cols` columns
  // ========================================================
  class LatticeScene extends BaseScene {
    constructor(ctx, p) {
      super(ctx);
      this.p = +p.p; this.q = +p.q; this.n = this.p * this.q;
      this.mode = p.mode || "reveal";   // reveal | factor
      this.camPos = [0, 0, this.n > 1500 ? 34 : 24];
      this.autorotate = false;
      this._build();
      if (this.mode === "factor") this.cols = 2; else this.cols = this.p;
      this._applyColumns(this.cols, false);
    }
    _build() {
      const n = this.n;
      this.pos = new Float32Array(n * 3);
      this.cur = new Float32Array(n * 3);
      this.tgt = new Float32Array(n * 3);
      this.colArr = new Float32Array(n * 3);
      // scattered start
      for (let i = 0; i < n; i++) {
        const r = 14 + Math.random() * 8, a = Math.random() * 7, b = (Math.random() - 0.5) * 6;
        this.cur[i * 3] = Math.cos(a) * r;
        this.cur[i * 3 + 1] = Math.sin(a) * r * 0.6;
        this.cur[i * 3 + 2] = b;
      }
      this.geo = new T.BufferGeometry();
      this.geo.setAttribute("position", new T.BufferAttribute(this.cur, 3));
      this.geo.setAttribute("color", new T.BufferAttribute(this.colArr, 3));
      const sz = n > 1500 ? 0.34 : (n > 400 ? 0.5 : 0.78);
      this.mat = new T.PointsMaterial({ size: sz, map: discTexture(), vertexColors: true,
        transparent: true, alphaTest: 0.35, sizeAttenuation: true, depthWrite: false });
      this.points = new T.Points(this.geo, this.mat);
      this.root.add(this.points);

      this.labels = new T.Group(); this.root.add(this.labels);
    }
    _spacing(cols) {
      const rows = Math.ceil(this.n / cols);
      const maxW = 26, maxH = 17;
      return Math.min(maxW / Math.max(cols, 1), maxH / Math.max(rows, 1), 0.95);
    }
    _applyColumns(cols, leftoverHighlight) {
      const n = this.n, rows = Math.ceil(n / cols);
      const s = this._spacing(cols);
      const offx = (cols - 1) / 2, offy = (rows - 1) / 2;
      const rem = n % cols;
      const perfect = rem === 0;
      for (let i = 0; i < n; i++) {
        const c = i % cols, r = Math.floor(i / cols);
        this.tgt[i * 3] = (c - offx) * s;
        this.tgt[i * 3 + 1] = (offy - r) * s;
        this.tgt[i * 3 + 2] = 0;
        // colour
        const isLeftover = !perfect && i >= cols * (rows - 1);
        let cc;
        if (perfect) cc = this.mode === "factor" ? COL.green : COL.accent;
        else if (isLeftover) cc = COL.red;
        else cc = COL.dot;
        this._setColor(i, cc);
      }
      this.geo.attributes.color.needsUpdate = true;
      this.curCols = cols; this.curRows = rows; this.curRem = rem; this.curPerfect = perfect;
      this._labels(cols, rows, perfect, s, offx, offy);
    }
    _setColor(i, hex) {
      const c = new T.Color(hex);
      this.colArr[i * 3] = c.r; this.colArr[i * 3 + 1] = c.g; this.colArr[i * 3 + 2] = c.b;
    }
    _labels(cols, rows, perfect, s, offx, offy) {
      this.labels.clear();
      if (this.mode === "reveal" && perfect) {
        const lp = makeLabel("p = " + cols, { color: "#4f56c9", scale: 1.5 });
        lp.position.set(0, -offy * s - 1.8, 0); this.labels.add(lp);
        const lq = makeLabel("q = " + rows, { color: "#4f56c9", scale: 1.5 });
        lq.position.set(-offx * s - 2.4, 0, 0); this.labels.add(lq);
      }
    }
    setColumns(cols, animate) { this._applyColumns(cols, true); }
    play() {
      super.play();
      if (this.mode === "factor") { this.cols = 1; this._stepClock = 0; this._done = false; }
      else { this.cols = this.p; this._applyColumns(this.cols); }
    }
    update(dt) {
      this.t += dt;
      // assemble lerp
      const pos = this.geo.attributes.position.array;
      let k = 0.10;
      for (let i = 0; i < pos.length; i++) pos[i] += (this.tgt[i] - pos[i]) * k;
      this.geo.attributes.position.needsUpdate = true;
      // gentle breathing on z
      // factor animation
      if (this.mode === "factor" && this.playing && !this._done) {
        this._stepClock += dt;
        if (this._stepClock > 0.55) {
          this._stepClock = 0;
          this.cols++;
          if (this.cols > Math.floor(Math.sqrt(this.n))) { this.cols = 2; }
          this._applyColumns(this.cols);
          if (this.curPerfect && this.cols > 1) {
            this._done = true; this.playing = false;
          }
        }
        const div = this.curPerfect ? `<span style="color:#2f9e57">divides evenly ✓</span>` : `remainder ${this.curRem}`;
        this.say(`<div class="big">n = ${this.n}</div><div class="sub">try ${this.cols} columns &nbsp;·&nbsp; ${div}</div>`);
      } else if (this.mode === "factor" && this._done) {
        this.say(`<div class="big" style="color:#2f9e57">${this.n} = ${this.curCols} × ${this.curRows}</div><div class="sub">smallest divisor found — n is factored</div>`);
      } else {
        this.say(`<div class="big">n = ${this.p} × ${this.q} = ${this.n}</div><div class="sub">${this.n} units form a clean ${this.p} × ${this.q} grid</div>`);
      }
      this.root.rotation.y = Math.sin(this.t * 0.2) * 0.06;
    }
  }

  // ========================================================
  //  ClockScene — modular exponentiation ring / cycles
  // ========================================================
  class ClockScene extends BaseScene {
    constructor(ctx, p) {
      super(ctx);
      this.N = +p.N;
      this.values = p.values || [];      // sequence of integers mod N
      this.label = p.label || "";
      this.stepDur = p.stepDur || 0.7;
      this.loopCycle = !!p.loopCycle;
      this.R = 10;
      this.camPos = [0, 1, 26];
      this.autorotate = false;
      this._build();
      this._idx = 0; this._frac = 0;
    }
    _angle(v) { return Math.PI / 2 - (v / this.N) * Math.PI * 2; }
    _pt(v, r) { r = r || this.R; const a = this._angle(v); return new T.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0); }
    _build() {
      // ring
      const ring = new T.Mesh(new T.TorusGeometry(this.R, 0.06, 12, 160),
        new T.MeshBasicMaterial({ color: 0xC9C6BC }));
      this.root.add(ring);
      // ticks
      const tickN = this.N <= 48 ? this.N : 24;
      for (let i = 0; i < tickN; i++) {
        const v = this.N <= 48 ? i : Math.round(i * this.N / tickN);
        const p = this._pt(v, this.R);
        const dot = new T.Mesh(new T.SphereGeometry(this.N <= 48 ? 0.16 : 0.1, 10, 10),
          new T.MeshBasicMaterial({ color: 0xB7B4AA }));
        dot.position.copy(p); this.root.add(dot);
        if (this.N <= 24) {
          const lb = makeLabel(String(v), { color: "#8C8A80", fs: 40, scale: 0.85 });
          const po = this._pt(v, this.R + 1.2); lb.position.copy(po); this.root.add(lb);
        }
      }
      // trail line
      this.trailGeo = new T.BufferGeometry();
      this.trailPos = new Float32Array(3 * (this.values.length + 2));
      this.trailGeo.setAttribute("position", new T.BufferAttribute(this.trailPos, 3));
      this.trailLine = new T.Line(this.trailGeo, new T.LineBasicMaterial({ color: COL.accentL, transparent: true, opacity: 0.55 }));
      this.root.add(this.trailLine);
      this._trailCount = 0;
      // marker
      this.marker = new T.Mesh(new T.SphereGeometry(0.5, 20, 20),
        new T.MeshStandardMaterial({ color: COL.accent, emissive: COL.accent, emissiveIntensity: 0.6, roughness: 0.4 }));
      this.markerGlow = makeGlow(COL.accentL, 3.4);
      this.marker.add(this.markerGlow);
      this.root.add(this.marker);
      if (this.values.length) this.marker.position.copy(this._pt(this.values[0]));
      // center label
      this.center = makeLabel("mod " + this.N, { color: "#8C8A80", fs: 40, scale: 1.0 });
      this.center.position.set(0, 0, 0); this.root.add(this.center);
    }
    _pushTrail(v) {
      const i = this._trailCount;
      const p = this._pt(v);
      this.trailPos[i * 3] = p.x; this.trailPos[i * 3 + 1] = p.y; this.trailPos[i * 3 + 2] = p.z;
      this._trailCount++;
      this.trailGeo.setDrawRange(0, this._trailCount);
      this.trailGeo.attributes.position.needsUpdate = true;
    }
    play() {
      super.play(); this._idx = 0; this._frac = 0; this._trailCount = 0;
      this.trailGeo.setDrawRange(0, 0);
      if (this.values.length) { this._pushTrail(this.values[0]); this.marker.position.copy(this._pt(this.values[0])); }
    }
    update(dt) {
      this.t += dt;
      this.markerGlow.material.opacity = 0.6 + Math.sin(this.t * 4) * 0.2;
      if (this.playing && this.values.length > 1) {
        this._frac += dt / this.stepDur;
        while (this._frac >= 1 && this._idx < this.values.length - 1) {
          this._frac -= 1; this._idx++; this._pushTrail(this.values[this._idx]);
        }
        if (this._idx >= this.values.length - 1) {
          this._frac = 0; this.playing = false;
        }
        const a = this.values[this._idx];
        const b = this.values[Math.min(this._idx + 1, this.values.length - 1)];
        const pa = this._pt(a), pb = this._pt(b);
        this.marker.position.lerpVectors(pa, pb, this._frac);
        this.say(`<div class="big">${a}</div><div class="sub">${this.label} &nbsp;·&nbsp; step ${this._idx} of ${this.values.length - 1}</div>`);
      } else if (this.values.length) {
        const v = this.values[Math.min(this._idx, this.values.length - 1)];
        this.marker.position.copy(this._pt(v));
        const last = this._idx >= this.values.length - 1;
        this.say(`<div class="big">${v}</div><div class="sub">${this.label}${last ? " &nbsp;·&nbsp; arrived" : ""}</div>`);
      }
      this.root.rotation.y = Math.sin(this.t * 0.15) * 0.05;
    }
  }

  // ========================================================
  //  QubitScene — register + superposition
  // ========================================================
  class QubitScene extends BaseScene {
    constructor(ctx, p) {
      super(ctx);
      this.nq = p.nQubits || 4;
      this.camPos = [2, 1.5, 24];
      this.autorotate = false;
      this._build();
    }
    _build() {
      this.qubits = [];
      const gap = 3.0, y0 = (this.nq - 1) * gap / 2;
      const xL = -9, xR = 9;
      for (let i = 0; i < this.nq; i++) {
        const y = y0 - i * gap;
        // wire
        const wire = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, xR - xL, 6),
          new T.MeshBasicMaterial({ color: 0xCBC8BE }));
        wire.rotation.z = Math.PI / 2; wire.position.set((xL + xR) / 2, y, 0);
        this.root.add(wire);
        // H gate box
        const gate = new T.Mesh(new T.BoxGeometry(1.1, 1.1, 1.1),
          new T.MeshStandardMaterial({ color: 0xffffff, emissive: COL.accent, emissiveIntensity: 0.0, roughness: 0.5 }));
        gate.position.set(-4.5, y, 0); this.root.add(gate);
        const glab = makeLabel("H", { color: "#4f56c9", fs: 46, scale: 0.9 }); glab.position.set(-4.5, y, 0.75); this.root.add(glab);
        // qubit sphere
        const sph = new T.Mesh(new T.SphereGeometry(0.62, 24, 24),
          new T.MeshStandardMaterial({ color: COL.accent, emissive: COL.accent, emissiveIntensity: 0.25, roughness: 0.35 }));
        sph.position.set(xL, y, 0); this.root.add(sph);
        const glow = makeGlow(COL.accentL, 2.2); sph.add(glow);
        // state arrow
        const arrow = new T.Mesh(new T.ConeGeometry(0.18, 0.9, 12),
          new T.MeshStandardMaterial({ color: COL.gold, emissive: COL.gold, emissiveIntensity: 0.4 }));
        arrow.position.set(xL, y + 0.95, 0); this.root.add(arrow);
        // pulse
        const pulse = makeGlow(COL.accentL, 1.4); pulse.position.set(xL, y, 0.2); pulse.visible = false; this.root.add(pulse);
        this.qubits.push({ y, sph, glow, arrow, gate, glab, pulse, phase: Math.random() * 6 });
      }
      // U_f oracle box (work register)
      this.oracle = new T.Mesh(new T.BoxGeometry(3.2, this.nq * gap + 1.2, 2),
        new T.MeshStandardMaterial({ color: 0xffffff, emissive: COL.accent, emissiveIntensity: 0.06, roughness: 0.6, transparent: true, opacity: 0.9 }));
      this.oracle.position.set(5.5, 0, 0); this.root.add(this.oracle);
      const olab = makeLabel("Uf", { color: "#4f56c9", fs: 50, scale: 1.2 }); olab.position.set(5.5, 0, 1.1); this.root.add(olab);
    }
    play() { super.play(); }
    update(dt) {
      this.t += dt;
      const prog = this.playing ? Math.min(this.t / 2.4, 1) : 1;
      this.qubits.forEach((q, i) => {
        const local = Math.max(0, Math.min(1, (prog * this.nq - i)));
        // gate lights up
        q.gate.material.emissiveIntensity = 0.1 + local * 0.7;
        // arrow tilts from up (|0>) to equator and spins (superposition)
        const tilt = local * Math.PI / 2;
        const spin = this.t * 3 + q.phase;
        const r = 0.95;
        q.arrow.position.set(q.sph.position.x + Math.cos(spin) * Math.sin(tilt) * r,
          q.y + Math.cos(tilt) * r,
          Math.sin(spin) * Math.sin(tilt) * r);
        q.arrow.lookAt(q.sph.position.x, q.y, 0);
        q.glow.material.opacity = 0.5 + local * 0.4 + Math.sin(this.t * 4 + q.phase) * 0.1;
        // pulse travels along wire
        if (this.playing && local > 0 && local < 1) {
          q.pulse.visible = true;
          q.pulse.position.x = q.sph.position.x + local * 14;
        } else q.pulse.visible = false;
      });
      this.oracle.material.emissiveIntensity = 0.06 + (this.playing ? Math.abs(Math.sin(this.t * 2)) * 0.25 : 0.18);
      const states = Math.pow(2, this.nq);
      this.say(`<div class="big">2<sup>${this.nq}</sup> = ${states}</div><div class="sub">${this.nq} qubits explore all ${states} inputs in one superposition</div>`);
      this.root.rotation.y = -0.18 + Math.sin(this.t * 0.2) * 0.05;
      this.root.rotation.x = 0.04;
    }
  }

  // ========================================================
  //  InterferenceScene — QFT period finding
  // ========================================================
  class InterferenceScene extends BaseScene {
    constructor(ctx, p) {
      super(ctx);
      this.Q = p.Q || 16;
      this.r = p.r || 4;
      this.camPos = [0, 3, 27];
      this.autorotate = false;
      this._amps = this._computeAmps();
      this._build();
      this._sweep = 0;
    }
    _computeAmps() {
      // DFT magnitude of a period-r comb over Q points
      const Q = this.Q, r = this.r, amps = [];
      let max = 0;
      for (let k = 0; k < Q; k++) {
        let re = 0, im = 0, cnt = 0;
        for (let x = 0; x < Q; x += r) { re += Math.cos(-2 * Math.PI * x * k / Q); im += Math.sin(-2 * Math.PI * x * k / Q); cnt++; }
        const m = Math.sqrt(re * re + im * im) / cnt;
        amps.push(m); if (m > max) max = m;
      }
      return amps.map(a => a / max);
    }
    _build() {
      this.bars = [];
      const Q = this.Q, span = 24, bw = span / Q * 0.62, x0 = -span / 2;
      for (let k = 0; k < Q; k++) {
        const x = x0 + (k + 0.5) * (span / Q);
        const isPeak = this._amps[k] > 0.6;
        const geo = new T.BoxGeometry(bw, 1, bw);
        geo.translate(0, 0.5, 0);
        const mat = new T.MeshStandardMaterial({ color: isPeak ? COL.accent : 0xBFBCB2,
          emissive: isPeak ? COL.accent : 0x000000, emissiveIntensity: 0, roughness: 0.5 });
        const bar = new T.Mesh(geo, mat);
        bar.position.set(x, -6, 0); bar.scale.y = 0.001;
        this.root.add(bar);
        if (k % (Q > 16 ? 4 : 2) === 0) {
          const lb = makeLabel(String(k), { color: "#8C8A80", fs: 36, scale: 0.8 });
          lb.position.set(x, -6.7, 0); this.root.add(lb);
        }
        this.bars.push({ bar, mat, x, amp: this._amps[k], isPeak });
      }
      // baseline
      const base = new T.Mesh(new T.BoxGeometry(span + 1, 0.08, bw + 0.4),
        new T.MeshBasicMaterial({ color: 0xD8D5CB }));
      base.position.set(0, -6, 0); this.root.add(base);
      // phasor cluster (above)
      this.phasors = new T.Group(); this.phasors.position.set(0, 5.5, 0); this.root.add(this.phasors);
      this.arrowMats = [];
      const m = Math.max(2, Math.round(this.Q / this.r));
      for (let j = 0; j < m; j++) {
        const mat = new T.MeshStandardMaterial({ color: COL.gold, emissive: COL.gold, emissiveIntensity: 0.3 });
        const arr = new T.Mesh(new T.CylinderGeometry(0.04, 0.04, 2, 6), mat);
        arr.geometry.translate(0, 1, 0);
        this.phasors.add(arr); this.arrowMats.push(arr);
      }
      this.sumMat = new T.MeshStandardMaterial({ color: COL.accent, emissive: COL.accent, emissiveIntensity: 0.5 });
      this.sumArrow = new T.Mesh(new T.CylinderGeometry(0.08, 0.08, 2, 8), this.sumMat);
      this.sumArrow.geometry.translate(0, 1, 0); this.phasors.add(this.sumArrow);
      this.cursor = new T.Mesh(new T.BoxGeometry(span / Q * 0.62 + 0.2, 0.12, bw + 0.4),
        new T.MeshBasicMaterial({ color: COL.gold }));
      this.cursor.position.set(0, -6.1, 0); this.root.add(this.cursor);
    }
    play() { super.play(); this._sweep = 0; this.bars.forEach(b => b.bar.scale.y = 0.001); }
    update(dt) {
      this.t += dt;
      // bars rise (staggered)
      const grow = this.playing ? Math.min(this.t / 1.6, 1) : 1;
      this.bars.forEach((b, k) => {
        const target = Math.max(0.02, b.amp * 9) * Math.min(1, Math.max(0, grow * this.Q - k));
        b.bar.scale.y += (Math.max(0.001, target) - b.bar.scale.y) * 0.18;
        if (b.isPeak) b.mat.emissiveIntensity = 0.25 + Math.sin(this.t * 3) * 0.15;
      });
      // sweep cursor across bins, phasors show interference
      this._sweep += dt * 2.2;
      const k = Math.floor(this._sweep) % this.Q;
      const bx = this.bars[k].x;
      this.cursor.position.x += (bx - this.cursor.position.x) * 0.25;
      // phasors for bin k
      let sx = 0, sy = 0;
      const m = this.arrowMats.length;
      this.arrowMats.forEach((arr, j) => {
        const ang = -2 * Math.PI * (j * this.r) * k / this.Q + Math.PI / 2;
        arr.rotation.z = ang - Math.PI / 2;
        sx += Math.cos(ang); sy += Math.sin(ang);
        arr.position.set(-7, 0, 0);
      });
      const sumLen = Math.sqrt(sx * sx + sy * sy) / m;
      this.sumArrow.rotation.z = Math.atan2(sy, sx) - Math.PI / 2;
      this.sumArrow.scale.y = 0.3 + sumLen * 2.2;
      this.sumArrow.position.set(3.5, 0, 0);
      this.sumMat.emissiveIntensity = 0.2 + sumLen * 0.8;
      const peakK = this.Q / this.r;
      this.say(`<div class="big">peaks every ${peakK} bins</div><div class="sub">spacing Q/r = ${this.Q}/${this.r} → period r = ${this.r}</div>`);
      this.root.rotation.y = Math.sin(this.t * 0.18) * 0.05;
    }
  }

  const REGISTRY = { lattice: LatticeScene, clock: ClockScene, qubits: QubitScene, interference: InterferenceScene };

  // ========================================================
  //  SceneManager
  // ========================================================
  const Manager = {
    init(canvas, overlayEl) {
      this.canvas = canvas;
      this.readoutEl = overlayEl;
      this.renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.scene = new T.Scene();
      this.camera = new T.PerspectiveCamera(45, 1, 0.1, 200);
      this.camera.position.set(0, 0, 26);
      this.pivot = new T.Group(); this.scene.add(this.pivot);
      // lights
      this.scene.add(new T.AmbientLight(0xffffff, 0.85));
      const d1 = new T.DirectionalLight(0xffffff, 0.7); d1.position.set(6, 10, 12); this.scene.add(d1);
      const d2 = new T.DirectionalLight(0xcfd2ff, 0.3); d2.position.set(-8, -4, 6); this.scene.add(d2);
      this.current = null;
      this.camTarget = new T.Vector3(0, 0, 26);
      this.lookTarget = new T.Vector3(0, 0, 0);
      this.lookCur = new T.Vector3(0, 0, 0);
      this._drag = false; this._px = 0; this._py = 0; this._rx = 0; this._ry = 0; this._auto = 0;
      this._bindDrag();
      this._resize();
      window.addEventListener("resize", () => this._resize());
      this._clock = new T.Clock();
      this._loop();
    },
    _bindDrag() {
      const c = this.canvas;
      const down = e => { this._drag = true; this._px = (e.touches ? e.touches[0].clientX : e.clientX); this._py = (e.touches ? e.touches[0].clientY : e.clientY); };
      const move = e => {
        if (!this._drag) return;
        const x = (e.touches ? e.touches[0].clientX : e.clientX), y = (e.touches ? e.touches[0].clientY : e.clientY);
        this._ry += (x - this._px) * 0.006; this._rx += (y - this._py) * 0.006;
        this._rx = Math.max(-0.7, Math.min(0.7, this._rx));
        this._px = x; this._py = y; this._auto = 0;
      };
      const up = () => { this._drag = false; };
      c.addEventListener("mousedown", down); window.addEventListener("mousemove", move); window.addEventListener("mouseup", up);
      c.addEventListener("touchstart", down, { passive: true }); window.addEventListener("touchmove", move, { passive: true }); window.addEventListener("touchend", up);
    },
    readout(html) { if (this.readoutEl) this.readoutEl.innerHTML = html; },
    show(key, params) {
      if (this.current) { this.pivot.remove(this.current.root); this.current.dispose(); }
      const Cls = REGISTRY[key];
      const ctx = { readout: (h) => this.readout(h) };
      this.current = new Cls(ctx, params || {});
      this.pivot.add(this.current.root);
      this._rx = 0; this._ry = 0;
      this.camTarget.set(...this.current.camPos);
      this.lookTarget.set(...this.current.camLook);
      // fade in
      this.current.root.scale.setScalar(0.92);
      this.current.update(0.001);
      this.play();
      return this.current;
    },
    play() { if (this.current) this.current.play(); },
    pause() { if (this.current) this.current.pause(); },
    reset() { if (this.current) { this.current.play(); } },
    _resize() {
      const w = this.canvas.clientWidth || this.canvas.parentElement.clientWidth;
      const h = this.canvas.clientHeight || this.canvas.parentElement.clientHeight;
      this.renderer.setSize(w, h, false);
      this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    },
    _loop() {
      requestAnimationFrame(() => this._loop());
      const dt = Math.min(this._clock.getDelta(), 0.05);
      this._auto += dt;
      if (this.current) {
        this.current.update(dt);
        const s = this.current.root.scale.x + (1 - this.current.root.scale.x) * 0.12;
        this.current.root.scale.setScalar(s);
      }
      // camera ease
      this.camera.position.lerp(this.camTarget, 0.06);
      this.lookCur.lerp(this.lookTarget, 0.08);
      this.camera.lookAt(this.lookCur);
      // pivot rotation (drag + idle auto)
      const autoY = this._drag ? 0 : Math.sin(this._auto * 0.12) * 0.0;
      this.pivot.rotation.y += ((this._ry) - this.pivot.rotation.y) * 0.1;
      this.pivot.rotation.x += ((this._rx) - this.pivot.rotation.x) * 0.1;
      this.renderer.render(this.scene, this.camera);
    }
  };

  global.SceneManager = Manager;
})(window);
