/* AI Content Generator - AI Content Generator template
   Generation is simulated in the browser (no API key needed).
   To use a real model, replace buildDraft() with a call to your backend. */

const $ = (id) => document.getElementById(id);
const form = $("gen-form"), draftEl = $("draft"), metaEl = $("out-meta");
const copyBtn = $("copy-btn"), regenBtn = $("regen-btn"), genBtn = $("generate-btn");
const refineBar = $("refine"), historyList = $("history-list"), toast = $("toast");

const TYPE_LABEL = { blog: "Blog", email: "Email", caption: "Caption" };
const state = { settings: null, text: "", timer: null, history: [] };

/* ---------- Tone vocabulary ---------- */
const TONES = {
  formal:   { open: "This overview covers", cta: "We recommend reviewing the details and acting soon.", sign: "Kind regards," },
  friendly: { open: "Let's talk about", cta: "Give it a try and tell us what you think.", sign: "Warmly," },
  playful:  { open: "Buckle up, because we're diving into", cta: "Go on, take it for a spin!", sign: "Cheers," }
};

/* ---------- Draft builders ---------- */
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (arr) => arr.map((v) => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);

function cleanTopic(raw) {
  let s = raw.trim().replace(/[.!?]+$/, "");
  // strip leading instructions like "write a", "create an", "announce", "introduce"
  s = s.replace(/^(please\s+)?(write|create|draft|make|compose|generate|give me|announce|introduce)\s+(me\s+)?(a|an|the|our|my)?\s*/i, "");
  return s || raw.trim();
}

function buildDraft({ type, topic, tone, length }) {
  const t = TONES[tone];
  const extra = { short: 0, medium: 1, long: 3 }[length];
  const subject = cleanTopic(topic);
  const sub = subject.toLowerCase();
  const Sub = subject.charAt(0).toUpperCase() + subject.slice(1);

  const pointPool = {
    formal: [
      `${Sub} addresses a clear need and is designed with reliability in mind.`,
      `It reduces unnecessary effort and allows time to be used more productively.`,
      `The approach is straightforward and can be adopted without specialist knowledge.`,
      `Results improve steadily with continued and consistent use.`,
      `It has been built to be dependable, transparent and easy to evaluate.`
    ],
    friendly: [
      `${Sub} is built to make your day a little easier.`,
      `It cuts out the boring steps so you can get to the good part.`,
      `You can get started in a few minutes, no experience needed.`,
      `The more you use it, the more it feels like it was made for you.`,
      `We made it with real people in mind, and we think you will notice.`
    ],
    playful: [
      `${Sub}? Yes, it is as fun as it sounds.`,
      `Say goodbye to boring busywork. We threw it out the window.`,
      `Setup takes about as long as making a cup of tea.`,
      `Use it once and you will wonder how you ever managed without it.`,
      `Plot twist: it actually works, and works well.`
    ]
  };
  const points = shuffle(pointPool[tone]);
  const more = (n) => points.slice(0, 1 + n).join(" ");

  const blogOpeners = [
    `${t.open} ${sub}. Whether you are new to the idea or already familiar, a clear starting point makes everything easier.`,
    `Everyone has an opinion on ${sub}, but few explain where to begin. Let's fix that.`,
    `If ${sub} has been on your mind lately, you are not alone. Here is a simple way to think about it.`,
    `${Sub} is more than a passing idea. Here is why it deserves your attention.`
  ];
  const blogMiddles = [
    `Consider where most people get stuck. Usually it is not the idea itself but the first step. Break it into small pieces and progress becomes visible quickly.`,
    `A good way to approach ${sub} is to start small, test it, and improve as you learn what works.`,
    `The best results with ${sub} come from curiosity: ask questions, try things, and keep notes on what changes.`
  ];
  const blogLong = [
    `Real results come from consistency. Set a small weekly goal, review what worked, and adjust. Over a few weeks the gains compound.`,
    `Do not worry about getting ${sub} perfect on day one. Momentum matters more than perfection, and every small win builds confidence.`
  ];
  const blogTitles = [
    titleCase(sub),
    `Getting Started With ${titleCase(sub)}`,
    `Why ${titleCase(sub)} Matters`,
    `A Simple Guide to ${titleCase(sub)}`
  ];

  const emailSubjects = [
    `Subject: ${titleCase(sub)}`,
    `Subject: Quick update on ${sub}`,
    `Subject: Something new: ${sub}`,
    `Subject: About ${sub}`
  ];
  const emailGreetings = { formal: ["Dear reader,", "Dear colleague,"], friendly: ["Hi there,", "Hello,"], playful: ["Hey you,", "Hi friend,"] };
  const emailIntros = [
    `${t.open} ${sub}, and I wanted you to hear it from us first.`,
    `I am writing to share some news about ${sub}.`,
    `We have been working on ${sub}, and today is the day to share it.`
  ];

  const capHooks = [
    `${Sub}.`,
    `Big news: ${sub}.`,
    `Here it is: ${sub}.`,
    `Meet ${sub}.`
  ];
  const tagWords = subject.split(/\s+/).filter((w) => w.length > 3).slice(0, 2).map((w) => w.replace(/\W/g, ""));
  const tagA = tagWords.length ? "#" + tagWords.join("") : "#Update";
  const tagB = pick(["#NewDrop", "#JustLaunched", "#CheckItOut", "#ComingSoon"]);

  if (type === "blog") {
    const paras = [pick(blogOpeners), `Here is what matters: ${more(extra)}`];
    if (extra >= 1) paras.push(pick(blogMiddles));
    if (extra >= 3) paras.push(pick(blogLong));
    paras.push(t.cta);
    return { title: pick(blogTitles), paras };
  }
  if (type === "email") {
    const paras = [pick(emailGreetings[tone]), pick(emailIntros)];
    if (extra >= 1) paras.push(more(extra));
    paras.push(t.cta, `${t.sign}\nThe Team`);
    return { title: pick(emailSubjects), paras };
  }
  if (type === "caption") {
    const paras = [`${pick(capHooks)} ${more(Math.min(extra, 1))} ${t.cta}`, `${tagA} ${tagB}`];
    return { title: "Caption", paras };
  }
  return { title: "", paras: [subject] };
}
const titleCase = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());

/* ---------- Rendering with typing effect ---------- */
function stream({ title, paras }) {
  clearInterval(state.timer);
  draftEl.innerHTML = "";
  const h = document.createElement("h3"); if (!title) h.hidden = true;
  draftEl.appendChild(h);
  const nodes = [h, ...paras.map(() => draftEl.appendChild(document.createElement("p")))];
  const chunks = [title, ...paras];
  state.text = [title, ...paras].join("\n\n");
  draftEl.classList.add("writing");
  genBtn.disabled = true; copyBtn.disabled = regenBtn.disabled = true;

  let block = 0, word = 0;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const step = () => {
    const words = chunks[block].split(" ");
    const take = reduced ? words.length : 2;
    word = Math.min(word + take, words.length);
    nodes[block].textContent = words.slice(0, word).join(" ");
    if (word >= words.length) { block++; word = 0; }
    if (block >= chunks.length) return finish();
    state.timer = setTimeout(step, reduced ? 0 : 40);
  };
  step();
}

function finish() {
  draftEl.classList.remove("writing");
  genBtn.disabled = false; copyBtn.disabled = regenBtn.disabled = false;
  refineBar.hidden = false;
  const words = state.text.split(/\s+/).filter(Boolean).length;
  const s = state.settings;
  metaEl.textContent = `${TYPE_LABEL[s.type]} · ${s.tone} · ${words} words`;
  addHistory(s, state.text);
}

/* ---------- History ---------- */
function addHistory(settings, text) {
  state.history.unshift({ settings: { ...settings }, text });
  state.history = state.history.slice(0, 5);
  historyList.innerHTML = "";
  state.history.forEach((item, i) => {
    const li = document.createElement("li");
    const b = document.createElement("button");
    b.type = "button";
    b.innerHTML = `<span></span><small></small>`;
    b.firstChild.textContent = item.settings.topic.slice(0, 40);
    b.lastChild.textContent = `${TYPE_LABEL[item.settings.type]} · ${item.settings.tone}`;
    b.addEventListener("click", () => restore(i));
    li.appendChild(b);
    historyList.appendChild(li);
  });
}
function restore(i) {
  const { settings, text } = state.history[i];
  clearInterval(state.timer);
  state.settings = { ...settings }; state.text = text;
  const [title, ...paras] = text.split("\n\n");
  draftEl.classList.remove("writing");
  draftEl.innerHTML = `<h3></h3>` + paras.map(() => "<p></p>").join("");
  draftEl.children[0].textContent = title;
  paras.forEach((p, n) => (draftEl.children[n + 1].textContent = p));
  genBtn.disabled = false; copyBtn.disabled = regenBtn.disabled = false; refineBar.hidden = false;
  metaEl.textContent = `${TYPE_LABEL[settings.type]} · ${settings.tone} · restored`;
}

/* ---------- Events ---------- */
function run(settings) {
  state.settings = settings;
  metaEl.textContent = "Writing...";
  stream(buildDraft(settings));
}
function readForm() {
  return {
    type: form.elements.type.value, topic: $("prompt").value,
    tone: form.elements.tone.value, length: "medium"
  };
}
form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!$("prompt").value.trim()) return showToast("Add a topic first.");
  run(readForm());
});
regenBtn.addEventListener("click", () => run({ ...state.settings }));

copyBtn.addEventListener("click", async () => {
  try { await navigator.clipboard.writeText(state.text); showToast("Draft copied."); }
  catch { showToast("Copy failed. Select the text and copy manually."); }
});

document.querySelectorAll("[data-prompt]").forEach((b) =>
  b.addEventListener("click", () => { $("prompt").value = b.dataset.prompt; $("prompt").focus(); }));

refineBar.addEventListener("click", (e) => {
  const action = e.target.dataset.refine;
  if (!action || !state.settings) return;
  const s = { ...state.settings };
  if (action === "shorter") s.length = s.length === "long" ? "medium" : "short";
  else if (action === "longer") s.length = s.length === "short" ? "medium" : "long";
  else s.tone = action;
  form.elements.tone.value = s.tone;
  run(s);
});

let toastTimer;
function showToast(msg) {
  toast.textContent = msg; toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
}

/* ---------- Page chrome (same behaviour as home page) ---------- */
const navEl = $("nav"), burger = $("burger"), linksEl = $("links");
addEventListener("scroll", () => navEl.classList.toggle("scrolled", scrollY > 40));
burger.addEventListener("click", () => { burger.classList.toggle("open"); linksEl.classList.toggle("open"); });
$("toTop").addEventListener("click", () => scrollTo({ top: 0, behavior: "smooth" }));

/* ---------- Cursor: dot, ring and trailing glow (mouse devices only) ---------- */
const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
let mouseX = innerWidth / 2, mouseY = innerHeight / 2;
addEventListener("mousemove", (e) => { mouseX = e.clientX; mouseY = e.clientY; });

if (matchMedia("(pointer:fine)").matches && !calm) {
  const mk = (c) => Object.assign(document.createElement("div"), { className: c });
  const glow = mk("glow"), ring = mk("ring"), cur = mk("cur");
  document.body.append(glow, ring, cur);
  let rx = mouseX, ry = mouseY, gx = mouseX, gy = mouseY;
  addEventListener("mousemove", (e) => {
    cur.style.transform = `translate3d(${e.clientX}px,${e.clientY}px,0)`;
    ring.classList.toggle("hov", !!e.target.closest("a,button,label,input"));
  });
  (function loop() {
    rx += (mouseX - rx) * 0.15; ry += (mouseY - ry) * 0.15;
    gx += (mouseX - gx) * 0.06; gy += (mouseY - gy) * 0.06;
    ring.style.transform = `translate3d(${rx}px,${ry}px,0)`;
    glow.style.transform = `translate3d(${gx}px,${gy}px,0)`;
    requestAnimationFrame(loop);
  })();
}

/* ---------- 3D background: words, quotes and carets drifting in depth (writing theme) ---------- */
(() => {
  const cv = $("bg3d"), g = cv.getContext("2d");
  const words = ["Blog", "Email", "Caption", "Draft", "Idea", "Headline", "Story", "Hook", "Tone", "Write",
    "Launch", "Formal", "Friendly", "Playful", "Summary", "Title", "Post", "Copy", "Intro", "Outline", "\u201C", "\u201D", "\u00B6", "|"];
  const colors = ["92,255,200", "122,215,255", "200,255,138", "233,255,248"];
  const N = innerWidth < 700 ? 22 : 46, FOV = 700, DEPTH = 1600;
  let W, H, camX = 0, camY = 0, tcx = 0, tcy = 0;

  const make = () => ({
    x: (Math.random() - 0.5) * 2400, y: (Math.random() - 0.5) * 1800, z: 200 + Math.random() * DEPTH,
    vy: 0.15 + Math.random() * 0.35, text: words[Math.floor(Math.random() * words.length)],
    c: colors[Math.floor(Math.random() * colors.length)], size: 34 + Math.random() * 40,
    sway: Math.random() * 6.28
  });
  const items = Array.from({ length: N }, make);

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  addEventListener("resize", resize); resize();
  addEventListener("mousemove", (e) => { tcx = (e.clientX / W - 0.5) * 500; tcy = (e.clientY / H - 0.5) * 350; });

  let t = 0;
  function frame() {
    t += 0.01;
    camX += (tcx - camX) * 0.05; camY += (tcy - camY) * 0.05;
    g.clearRect(0, 0, W, H);
    items.sort((a, b) => b.z - a.z); // far first
    for (const o of items) {
      if (!calm) { o.y -= o.vy; o.x += Math.sin(t + o.sway) * 0.25; }
      if (o.y < -1000) { Object.assign(o, make(), { y: 1000 }); }
      const k = FOV / o.z, sx = W / 2 + (o.x - camX) * k, sy = H / 2 + (o.y - camY - scrollY * 0.25) * k;
      const depth = 1 - o.z / (DEPTH + 200);
      g.font = `500 ${o.size * k}px "Inter Tight", system-ui, sans-serif`;
      g.fillStyle = `rgba(${o.c},${0.08 + depth * 0.42})`;
      g.fillText(o.text, sx, sy);
    }
    if (!calm) requestAnimationFrame(frame);
  }
  frame();
})();
