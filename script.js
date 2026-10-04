const fine = matchMedia('(pointer:fine)').matches;
const calm = matchMedia('(prefers-reduced-motion:reduce)').matches;

// 1. Nav effect on scroll
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => nav.classList.toggle('scrolled', window.scrollY > 40));

// 2. Mobile menu
const burger = document.getElementById('burger');
const links = document.getElementById('links');
burger.addEventListener('click', () => {
  burger.classList.toggle('open');
  links.classList.toggle('open');
});
links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
  burger.classList.remove('open');
  links.classList.remove('open');
}));

// 3. Reveal on scroll
const io = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  });
}, { threshold: 0.15 });
document.querySelectorAll('.rv').forEach(el => io.observe(el));

// 4. Smooth scroll buttons
document.getElementById('startBtn').addEventListener('click', () =>
  document.getElementById('interfaces').scrollIntoView({ behavior: 'smooth' }));
document.getElementById('toTop').addEventListener('click', () =>
  window.scrollTo({ top: 0, behavior: 'smooth' }));

// 5. Cursor and 3D effects (mouse devices only)
if (fine && !calm) {
  const hero = document.querySelector('.hero');
  const glow = Object.assign(document.createElement('div'), { className: 'glow' });
  const ring = Object.assign(document.createElement('div'), { className: 'ring' });
  const cur  = Object.assign(document.createElement('div'), { className: 'cur' });
  document.body.append(glow, ring, cur);

  let mx = innerWidth / 2, my = innerHeight / 2;
  let rx = mx, ry = my, gx = mx, gy = my;

  addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    cur.style.transform = `translate3d(${mx}px,${my}px,0)`;
    ring.classList.toggle('hov', !!e.target.closest('a,button,.shot,.chip,.step'));
    hero.style.setProperty('--ax', (mx / innerWidth - 0.5) * 2);
    hero.style.setProperty('--ay', (my / innerHeight - 0.5) * 2);
  });

  // Ring and glow trail behind the cursor
  (function loop() {
    rx += (mx - rx) * 0.15; ry += (my - ry) * 0.15;
    gx += (mx - gx) * 0.06; gy += (my - gy) * 0.06;
    ring.style.transform = `translate3d(${rx}px,${ry}px,0)`;
    glow.style.transform = `translate3d(${gx}px,${gy}px,0)`;
    requestAnimationFrame(loop);
  })();

  // Hero stage tilts in 3D toward the cursor
  const stage = document.querySelector('.stage');
  stage.addEventListener('mousemove', e => {
    const r = stage.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    stage.style.setProperty('--ry', (x - 0.5) * 14 + 'deg');
    stage.style.setProperty('--rx', (0.5 - y) * 10 + 'deg');
    stage.style.setProperty('--mx', x * 100 + '%');
    stage.style.setProperty('--my', y * 100 + '%');
  });
  stage.addEventListener('mouseleave', () => {
    stage.style.setProperty('--rx', '0deg');
    stage.style.setProperty('--ry', '0deg');
  });

  // Project previews and process cards: 3D tilt plus moving glare
  document.querySelectorAll('.shot, .step').forEach(el => {
    el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      el.style.transform = `perspective(1000px) rotateY(${(x - 0.5) * 14}deg) rotateX(${(0.5 - y) * 14}deg) scale(1.03)`;
      el.style.setProperty('--gx', x * 100 + '%');
      el.style.setProperty('--gy', y * 100 + '%');
    });
    el.addEventListener('mouseleave', () => (el.style.transform = ''));
  });

  // Magnetic buttons pull toward the cursor
  document.querySelectorAll('.btn, .pill, footer button').forEach(b => {
    b.addEventListener('mousemove', e => {
      const r = b.getBoundingClientRect();
      b.style.translate = `${(e.clientX - r.left - r.width / 2) * 0.3}px ${(e.clientY - r.top - r.height / 2) * 0.4}px`;
    });
    b.addEventListener('mouseleave', () => (b.style.translate = ''));
  });
}
// 6. 3D background: point cloud + wireframe cube, driven by cursor and scroll
(() => {
  const cv = document.getElementById('bg3d');
  const g = cv.getContext('2d');
  const colors = ['255,126,182', '255,210,122', '122,240,224', '248,238,230'];
  const N = innerWidth < 700 ? 70 : 140;
  const FOV = 800, CAM = 1500;
  let W, H, tx = 0, ty = 0, ax = 0, ay = 0;

  const pts = Array.from({ length: N }, () => ({
    x: (Math.random() - 0.5) * 1400,
    y: (Math.random() - 0.5) * 1400,
    z: (Math.random() - 0.5) * 1400,
    c: colors[Math.floor(Math.random() * colors.length)],
    s: 1.5 + Math.random() * 2
  }));

  


  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  addEventListener('resize', resize);
  resize();

  addEventListener('mousemove', e => {
    ty = (e.clientX / W - 0.5) * 1.2;
    tx = (e.clientY / H - 0.5) * 0.8;
  });

  // Rotate a point around Y then X, then project it with perspective
  function project(x, y, z, a, b, ox = 0) {
    let x1 = x * Math.cos(a) + z * Math.sin(a);
    let z1 = -x * Math.sin(a) + z * Math.cos(a);
    let y1 = y * Math.cos(b) - z1 * Math.sin(b);
    let z2 = y * Math.sin(b) + z1 * Math.cos(b);
    const k = FOV / (z2 + CAM);
    return { x: W / 2 + (x1 + ox) * k, y: H / 2 + y1 * k, k };
  }

  let t = 0;
  function frame() {
    t += 0.0035;
    ay += (ty + t - ay) * 0.04;
    ax += (tx + scrollY * 0.0007 - ax) * 0.04;
    g.clearRect(0, 0, W, H);

    const p = pts.map(o => project(o.x, o.y, o.z, ay, ax));
    g.lineWidth = 1;
    for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
      const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y, dz = pts[i].z - pts[j].z;
      const d = Math.hypot(dx, dy, dz);
      if (d < 230) {
        g.strokeStyle = `rgba(255,244,224,${(1 - d / 230) * 0.28})`;
        g.beginPath(); g.moveTo(p[i].x, p[i].y); g.lineTo(p[j].x, p[j].y); g.stroke();
      }
    }
    pts.forEach((o, i) => {
      const a = Math.min(1, p[i].k * 0.8);
      g.fillStyle = `rgba(${o.c},${a})`;
      g.beginPath(); g.arc(p[i].x, p[i].y, o.s * p[i].k, 0, 7); g.fill();
    });

    

    if (!matchMedia('(prefers-reduced-motion:reduce)').matches) requestAnimationFrame(frame);
  }
  frame();
})();