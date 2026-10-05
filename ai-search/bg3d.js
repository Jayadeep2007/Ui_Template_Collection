/* ================= 3D animated background =================
   Pure canvas + a tiny perspective engine. No libraries needed.
   - Rotating wireframe structures (icosahedron, torus, octahedron, cube, DNA helix, dotted globe)
   - Floating 3D particle network that links nearby points
   - Perspective grid floor that glides toward you
   - Mouse parallax, scroll-driven rotation, and a speed boost when results change
*/
(() => {
  const canvas = document.getElementById("bg3d");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const A = [139, 155, 255]; // accent
  const B = [196, 166, 255]; // accent-2
  const mixColor = t => A.map((c, i) => Math.round(c + (B[i] - c) * t));
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a.toFixed(3)})`;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  let W = 0, H = 0, DPR = 1, FOCAL = 700, small = false;

  /* ---------- Shape generators (unit size) ---------- */
  function edgesByDistance(verts, target, tol = 0.02) {
    const edges = [];
    for (let i = 0; i < verts.length; i++)
      for (let j = i + 1; j < verts.length; j++) {
        const d = Math.hypot(verts[i][0] - verts[j][0], verts[i][1] - verts[j][1], verts[i][2] - verts[j][2]);
        if (Math.abs(d - target) < tol) edges.push([i, j]);
      }
    return edges;
  }

  function icosahedron() {
    const p = (1 + Math.sqrt(5)) / 2, v = [];
    for (const a of [-1, 1]) for (const b of [-p, p]) {
      v.push([0, a, b], [a, b, 0], [b, 0, a]);
    }
    return { verts: v, edges: edgesByDistance(v, 2) };
  }

  function octahedron() {
    const v = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
    return { verts: v, edges: edgesByDistance(v, Math.SQRT2) };
  }

  function cube() {
    const v = [];
    for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) v.push([x, y, z]);
    return { verts: v, edges: edgesByDistance(v, 2) };
  }

  function torus(U = 22, V = 9, R = 1, r = 0.38) {
    const v = [], e = [];
    for (let u = 0; u < U; u++) for (let t = 0; t < V; t++) {
      const a = (u / U) * Math.PI * 2, b = (t / V) * Math.PI * 2;
      v.push([(R + r * Math.cos(b)) * Math.cos(a), r * Math.sin(b), (R + r * Math.cos(b)) * Math.sin(a)]);
    }
    for (let u = 0; u < U; u++) for (let t = 0; t < V; t++) {
      const i = u * V + t;
      e.push([i, u * V + ((t + 1) % V)], [i, ((u + 1) % U) * V + t]);
    }
    return { verts: v, edges: e };
  }

  function helix(turns = 3, steps = 36) {
    const v = [], e = [];
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * turns * Math.PI * 2, y = (i / steps) * 2 - 1;
      v.push([Math.cos(a) * 0.45, y, Math.sin(a) * 0.45]);                 // strand 1
      v.push([Math.cos(a + Math.PI) * 0.45, y, Math.sin(a + Math.PI) * 0.45]); // strand 2
    }
    for (let i = 0; i < steps; i++) {
      e.push([i * 2, i * 2 + 1]); // rung
      if (i < steps - 1) e.push([i * 2, (i + 1) * 2], [i * 2 + 1, (i + 1) * 2 + 1]);
    }
    return { verts: v, edges: e };
  }

  function globe(n = 150) {
    const v = [], g = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < n; i++) {
      const y = 1 - (i / (n - 1)) * 2, r = Math.sqrt(1 - y * y), t = g * i;
      v.push([Math.cos(t) * r, y, Math.sin(t) * r]);
    }
    return { verts: v, edges: [] };
  }

  /* ---------- Scene objects ---------- */
  // fx / fy: position as a fraction of half-width / half-height. size: fraction of min(W, H).
  const defs = [
    { geo: icosahedron(), fx: -0.74, fy: -0.30, z: 100, size: 0.15, spin: [0.20, 0.30, 0.05], dots: true,  hue: 0.1 },
    { geo: torus(),       fx:  0.76, fy:  0.02, z:   0, size: 0.15, spin: [0.30, 0.18, 0.12], dots: false, hue: 0.8 },
    { geo: octahedron(),  fx: -0.68, fy:  0.52, z: 200, size: 0.09, spin: [0.40, 0.50, 0.10], dots: true,  hue: 0.4 },
    { geo: cube(),        fx: -0.38, fy: -0.78, z: 300, size: 0.055, spin: [0.35, 0.45, 0.20], dots: true, hue: 0.6 },
    { geo: globe(),       fx:  0.66, fy: -0.55, z: 150, size: 0.11, spin: [0.05, 0.25, 0.00], dots: true,  hue: 0.2 },
    { geo: helix(),       fx:  0.90, fy:  0.60, z: 100, size: 0.17, spin: [0.00, 0.40, 0.00], dots: true,  hue: 0.7 }
  ].map(d => ({ ...d, ang: [Math.random() * 6, Math.random() * 6, Math.random() * 6], pts: d.geo.verts.map(() => [0, 0, 0, 0]) }));

  /* ---------- Particle network ---------- */
  let particles = [];
  function makeParticles() {
    const n = small ? 45 : 110;
    particles = Array.from({ length: n }, () => ({
      x: (Math.random() - 0.5) * W * 1.5,
      y: (Math.random() - 0.5) * H * 1.5,
      z: Math.random() * 1100 - 250,
      vx: (Math.random() - 0.5) * 14,
      vy: (Math.random() - 0.5) * 14,
      vz: (Math.random() - 0.5) * 14,
      t: Math.random()
    }));
  }

  /* ---------- Interaction ---------- */
  let mx = 0, my = 0, tmx = 0, tmy = 0;     // smoothed / target mouse (-1..1)
  let boost = 0;                             // temporary speed-up after a search
  window.addEventListener("pointermove", e => {
    tmx = (e.clientX / innerWidth) * 2 - 1;
    tmy = (e.clientY / innerHeight) * 2 - 1;
  }, { passive: true });

  const outEl = document.getElementById("output");
  if (outEl) new MutationObserver(() => { boost = 1; }).observe(outEl, { childList: true });

  /* ---------- Sizing ---------- */
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    small = W < 700;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    FOCAL = Math.max(520, Math.min(W, H) * 0.95);
    makeParticles();
  }
  window.addEventListener("resize", resize);

  /* ---------- Projection ---------- */
  const proj = (x, y, z) => {
    const s = FOCAL / (FOCAL + z);
    return [W / 2 + x * s, H / 2 + y * s, s];
  };

  function rotate(x, y, z, ax, ay, az) {
    let c = Math.cos(ax), s = Math.sin(ax), t;
    t = y * c - z * s; z = y * s + z * c; y = t;
    c = Math.cos(ay); s = Math.sin(ay);
    t = x * c + z * s; z = -x * s + z * c; x = t;
    c = Math.cos(az); s = Math.sin(az);
    t = x * c - y * s; y = x * s + y * c; x = t;
    return [x, y, z];
  }

  /* ---------- Drawing ---------- */
  const dimmer = () => (small ? 0.6 : 1);

  function drawFloor(time) {
    const spacing = 130, floorY = H * 0.5, depth = 1500;
    const offset = (time * 40) % spacing;
    ctx.lineWidth = 1;
    // lines running into the distance
    for (let gx = -14; gx <= 14; gx++) {
      const x = gx * spacing * 1.2;
      const p1 = proj(x, floorY, -250), p2 = proj(x, floorY, depth);
      const g = ctx.createLinearGradient(p1[0], p1[1], p2[0], p2[1]);
      g.addColorStop(0, rgba(A, 0.16 * dimmer()));
      g.addColorStop(1, rgba(A, 0));
      ctx.strokeStyle = g;
      ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.stroke();
    }
    // lines sliding toward the viewer
    for (let z = -250 - offset; z < depth; z += spacing) {
      if (z < -250) continue;
      const a = proj(-spacing * 17, floorY, z), b = proj(spacing * 17, floorY, z);
      const fade = clamp(1 - z / depth, 0, 1);
      ctx.strokeStyle = rgba(B, 0.14 * fade * dimmer());
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    }
  }

  function drawParticles(dt, yaw, pitch) {
    const speed = 1 + boost * 4;
    const cx = 0, cy = 0, cz = 300;
    const proj2 = [];
    const lx = W * 0.75, ly = H * 0.75;
    for (const p of particles) {
      p.x += p.vx * dt * speed; p.y += p.vy * dt * speed; p.z += p.vz * dt * speed;
      if (p.x > lx) p.x = -lx; else if (p.x < -lx) p.x = lx;
      if (p.y > ly) p.y = -ly; else if (p.y < -ly) p.y = ly;
      if (p.z > 850) p.z = -250; else if (p.z < -250) p.z = 850;
      const r = rotate(p.x - cx, p.y - cy, p.z - cz, pitch, yaw, 0);
      const q = proj(r[0], r[1], r[2] + cz);
      proj2.push({ x: q[0], y: q[1], s: q[2], wx: r[0], wy: r[1], wz: r[2], t: p.t });
    }
    const maxD = small ? 150 : 170;
    ctx.lineWidth = 1;
    for (let i = 0; i < proj2.length; i++) {
      const a = proj2[i];
      for (let j = i + 1; j < proj2.length; j++) {
        const b = proj2[j];
        const d = Math.hypot(a.wx - b.wx, a.wy - b.wy, a.wz - b.wz);
        if (d < maxD) {
          const al = (1 - d / maxD) * 0.28 * Math.min(a.s, b.s) * dimmer();
          ctx.strokeStyle = rgba(mixColor((a.t + b.t) / 2), al);
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
    }
    for (const a of proj2) {
      ctx.fillStyle = rgba(mixColor(a.t), clamp(a.s * 0.6, 0.1, 0.8) * dimmer());
      ctx.beginPath(); ctx.arc(a.x, a.y, Math.max(0.8, 2 * a.s), 0, 7); ctx.fill();
    }
  }

  function drawObjects(dt, time, yaw, pitch) {
    const base = Math.min(W, H);
    const speed = 1 + boost * 3.5;
    // sort far -> near so near shapes draw on top
    const list = [...defs].sort((a, b) => b.z - a.z);
    for (const o of list) {
      for (let k = 0; k < 3; k++) o.ang[k] += o.spin[k] * dt * speed;
      const size = base * o.size * (small ? 0.8 : 1);
      // gentle bobbing + mouse parallax (nearer shapes move more)
      const par = 1 - o.z / 700;
      const ox = o.fx * (W / 2) + mx * 30 * par;
      const oy = o.fy * (H / 2) + my * 22 * par + Math.sin(time * 0.6 + o.fx * 5) * 10;
      const sc = o.geo.edges.length ? 1 : 1;
      o.geo.verts.forEach((v, i) => {
        let [x, y, z] = rotate(v[0] * size * sc, v[1] * size * sc, v[2] * size * sc, o.ang[0], o.ang[1], o.ang[2]);
        [x, z] = [x + ox, z + o.z];
        [x, y, z] = rotate(x, y + oy, z - 300, pitch * 0.5, yaw * 0.5, 0);
        const q = proj(x, y, z + 300);
        const p = o.pts[i]; p[0] = q[0]; p[1] = q[1]; p[2] = q[2]; p[3] = z;
      });
      const col = mixColor(o.hue);
      ctx.lineWidth = 1.2;
      for (const [i, j] of o.geo.edges) {
        const a = o.pts[i], b = o.pts[j];
        const depthA = clamp(0.25 + ((a[3] + b[3]) / 2 / -(size * 2)) * 0.25 + 0.25, 0.18, 0.7);
        ctx.strokeStyle = rgba(col, depthA * dimmer());
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      }
      if (o.dots) {
        for (const p of o.pts) {
          const al = clamp(0.35 + (-p[3] / (size * 2)) * 0.25, 0.15, 0.9);
          ctx.fillStyle = rgba(col, al * dimmer());
          ctx.beginPath(); ctx.arc(p[0], p[1], Math.max(1, (o.geo.edges.length ? 2.4 : 1.7) * p[2]), 0, 7); ctx.fill();
        }
      }
    }
  }

  /* ---------- Main loop ---------- */
  let last = performance.now(), time = 0, scrollYaw = 0;
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now; time += dt;
    mx += (tmx - mx) * 0.06; my += (tmy - my) * 0.06;
    boost = Math.max(0, boost - dt * 0.6);
    scrollYaw = (window.scrollY || 0) * 0.0006;

    const yaw = mx * 0.25 + time * 0.03 + scrollYaw;
    const pitch = my * 0.15;

    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter"; // additive = soft glow
    drawFloor(time);
    drawParticles(dt, yaw, pitch);
    drawObjects(dt, time, yaw, pitch);
    ctx.globalCompositeOperation = "source-over";

    if (!reduceMotion) requestAnimationFrame(frame);
  }

  resize();
  if (reduceMotion) frame(performance.now());       // one static frame
  else requestAnimationFrame(frame);
})();
