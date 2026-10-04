/* AI Assistant — static frontend. Set API_URL to your deployed serverless endpoint (see README). */
const API_URL = "https://damp-mode-98ee.2605659thiru.workers.dev";
const $ = id => document.getElementById(id);
const KEY = "uitc-ai-convs", VKEY = "uitc-ai-voice";
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
let convs = [], cur = null, voiceOn = localStorage.getItem(VKEY) !== "off", state = "idle", busy = false;
try { convs = JSON.parse(localStorage.getItem(KEY)) || []; } catch { convs = []; }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(convs)); } catch { toast("Storage is full or blocked."); } };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
function toast(t) { const e = $("toast"); e.textContent = t; e.classList.add("show"); setTimeout(() => e.classList.remove("show"), 3000); }

/* ---------- Robot state ---------- */
const LABEL = { idle: "Idle", listening: "Listening...", thinking: "Thinking...", speaking: "Speaking...", error: "Something went wrong" };
function setState(s) { state = s; $("status").textContent = LABEL[s]; $("status").dataset.s = s; }

/* ---------- 3D robot (procedural Three.js, no model file needed) ---------- */
const R = {};
function initRobot() {
  const cv = $("robot");
  if (!window.THREE) { $("status").textContent = "3D unavailable (CDN blocked)"; return; }
  const T = THREE, r = new T.WebGLRenderer({ canvas: cv, alpha: true, antialias: true });
  r.setPixelRatio(Math.min(devicePixelRatio, 2));
  const sc = new T.Scene(), cam = new T.PerspectiveCamera(35, 1, .1, 50); cam.position.set(0, -.35, 7.6);
  sc.add(new T.HemisphereLight(0xffffff, 0x9bbcff, .9));
  const key = new T.DirectionalLight(0xffffff, .8); key.position.set(3, 4, 5); sc.add(key);
  const rim = new T.PointLight(0xff9fc6, 1.2, 12); rim.position.set(-3, 1, 3); sc.add(rim);
  const white = new T.MeshStandardMaterial({ color: 0xe9eff6, roughness: .22, metalness: .45 });
  const black = new T.MeshStandardMaterial({ color: 0x07101f, roughness: .15, metalness: .4 });
  const glow = c => new T.MeshBasicMaterial({ color: c });
  const g = new T.Group(); sc.add(g);
  const body = new T.Mesh(new T.SphereGeometry(1, 40, 32), white); body.scale.set(.8, .95, .68); body.position.y = -1.0; g.add(body);
  const tail = new T.Mesh(new T.SphereGeometry(1, 32, 24), white); tail.scale.set(.42, .7, .36); tail.position.y = -1.95; g.add(tail);
  const head = new T.Group(); head.position.y = .55; g.add(head);
  const skull = new T.Mesh(new T.SphereGeometry(1, 48, 32), white); skull.scale.set(1.25, 1, 1); head.add(skull);
  const face = new T.Mesh(new T.SphereGeometry(1, 40, 32), black); face.scale.set(1.0, .72, .5); face.position.set(0, -.02, .62); head.add(face);
  const eyeM = glow(0x35e6ff), eyes = [];
  [-.42, .42].forEach(x => { const e = new T.Mesh(new T.SphereGeometry(.17, 20, 16), eyeM); e.scale.set(1, 1.3, .4); e.position.set(x, .06, 1.08); head.add(e); eyes.push(e); });
  const mouth = new T.Mesh(new T.BoxGeometry(.34, .06, .05), glow(0x35e6ff)); mouth.position.set(0, -.3, 1.08); head.add(mouth);
  const fin = new T.Mesh(new T.ConeGeometry(.2, .95, 20), white); fin.rotation.z = .55; fin.position.set(-1.25, .62, 0); head.add(fin);
  const ear = new T.Mesh(new T.CylinderGeometry(.24, .24, .16, 24), glow(0x35e6ff)); ear.rotation.z = Math.PI / 2; ear.position.set(1.28, 0, 0); head.add(ear);
  const core = new T.Mesh(new T.SphereGeometry(.22, 24, 16), glow(0x35e6ff)); core.position.set(0, -.85, .72); g.add(core);
  const arms = [-1, 1].map(s => { const a = new T.Mesh(new T.SphereGeometry(.28, 20, 16), white); a.scale.set(.7, 1.5, .7); a.position.set(s * 1.1, -1.0, .1); g.add(a); return a; });
  R.uy = 0; R.up = 0; R.t0 = 0; R.drag = false; Object.assign(R, { r, sc, cam, g, head, eyes, mouth, core, eyeM, arms, T, lvl: 0 });
  const size = () => { const w = cv.clientWidth, h = cv.clientHeight; r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
  addEventListener("resize", size); size();
  let px = 0, py = 0;
  cv.addEventListener("pointerdown", e => { R.drag = true; px = e.clientX; py = e.clientY; cv.setPointerCapture(e.pointerId); cv.style.cursor = "grabbing"; });
  cv.addEventListener("pointermove", e => { if (!R.drag) return; R.uy += (e.clientX - px) * .012; R.up = Math.max(-.5, Math.min(.5, R.up + (e.clientY - py) * .008)); px = e.clientX; py = e.clientY; R.t0 = performance.now(); });
  const up = () => { R.drag = false; R.t0 = performance.now(); cv.style.cursor = "grab"; };
  cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
  cv.addEventListener("wheel", e => { e.preventDefault(); cam.position.z = Math.max(4.5, Math.min(10, cam.position.z + e.deltaY * .005)); }, { passive: false });
  const clock = new T.Clock(); let blink = 0;
  (function loop() {
    requestAnimationFrame(loop);
    if (!R.drag && performance.now() - R.t0 > 4000) { R.uy *= .94; R.up *= .94; }
    const t = clock.getElapsedTime(), k = reduce ? .2 : 1;
    const sp = state === "speaking", th = state === "thinking", li = state === "listening", er = state === "error";
    g.position.y = Math.sin(t * 1.5) * .08 * k + (sp ? Math.abs(Math.sin(t * 9)) * .05 * k : 0);
    g.rotation.y = R.uy + (li ? Math.sin(t * 1.2) * .25 : th ? Math.sin(t * 2) * .3 : er ? Math.sin(t * 25) * .05 : Math.sin(t * .5) * .12) * k;
    g.rotation.x = R.up; head.rotation.z = (sp ? Math.sin(t * 6) * .06 : li ? .12 : 0) * k;
    head.rotation.x = (th ? -.12 + Math.sin(t * 3) * .05 : sp ? Math.sin(t * 7) * .04 : 0) * k;
    const pulse = 1 + (sp ? .5 + Math.sin(t * 12) * .4 : li ? .3 + Math.sin(t * 5) * .3 : th ? .25 + Math.sin(t * 8) * .25 : Math.sin(t * 2) * .08);
    core.scale.setScalar(pulse); eyeM.color.set(er ? 0xff5560 : li ? 0x7dffb0 : th ? 0xa58cff : 0x35e6ff);
    core.material.color.copy(eyeM.color);
    if (t > blink) { blink = t + 2 + Math.random() * 3; R.bl = t + .12; }
    const closed = R.bl && t < R.bl; const es = th ? 1 + Math.sin(t * 10) * .35 : li ? 1.35 : 1;
    eyes.forEach(e => { e.scale.y = closed ? .08 : 1.3 * es; });
    mouth.scale.y = sp ? 1 + Math.abs(Math.sin(t * 14) * Math.sin(t * 5.3)) * 6 : 1;
    mouth.scale.x = sp ? 1 + Math.sin(t * 9) * .3 : 1;
    arms[0].rotation.z = (sp ? .3 + Math.sin(t * 6) * .35 : .1 + Math.sin(t * 1.5) * .05) * k;
    arms[1].rotation.z = -(sp ? .3 + Math.cos(t * 6) * .35 : .1 + Math.sin(t * 1.5 + 1) * .05) * k;
    r.render(sc, cam);
  })();
}

/* ---------- Safe markdown-lite renderer (DOM only, never innerHTML with AI text) ---------- */
function inline(parent, text) {
  text.split(/(`[^`]+`|\*\*[^*]+\*\*)/).forEach(p => {
    if (!p) return;
    let el;
    if (p.startsWith("`") && p.endsWith("`") && p.length > 2) { el = document.createElement("code"); el.textContent = p.slice(1, -1); }
    else if (p.startsWith("**") && p.endsWith("**") && p.length > 4) { el = document.createElement("strong"); el.textContent = p.slice(2, -2); }
    else el = document.createTextNode(p);
    parent.appendChild(el);
  });
}
function render(el, text) {
  el.textContent = "";
  const lines = text.split("\n"); let i = 0, list = null;
  while (i < lines.length) {
    const L = lines[i];
    if (L.trim().startsWith("```")) {
      const buf = []; i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) buf.push(lines[i++]);
      i++; const pre = document.createElement("pre"), c = document.createElement("code"); c.textContent = buf.join("\n");
      const b = document.createElement("button"); b.textContent = "Copy Code"; b.onclick = () => copy(c.textContent);
      pre.append(b, c); el.appendChild(pre); list = null; continue;
    }
    let m;
    if ((m = L.match(/^(#{1,4})\s+(.*)/))) { const h = document.createElement(m[1].length < 3 ? "h3" : "h4"); inline(h, m[2]); el.appendChild(h); list = null; }
    else if ((m = L.match(/^\s*([-*]|\d+\.)\s+(.*)/))) {
      const tag = /\d/.test(m[1]) ? "ol" : "ul";
      if (!list || list.tagName.toLowerCase() !== tag) { list = document.createElement(tag); el.appendChild(list); }
      const li = document.createElement("li"); inline(li, m[2]); list.appendChild(li);
    } else if (L.trim()) { const p = document.createElement("p"); inline(p, L); el.appendChild(p); list = null; }
    i++;
  }
}
async function copy(t) { try { await navigator.clipboard.writeText(t); toast("Copied"); } catch { toast("Copy is blocked by this browser."); } }

/* ---------- Conversations ---------- */
const getConv = () => convs.find(c => c.id === cur);
function newChat() { const c = { id: uid(), title: "New chat", createdAt: Date.now(), updatedAt: Date.now(), messages: [] }; convs.unshift(c); cur = c.id; save(); drawAll(); $("input").focus(); return c; }
function openConv(id, msgId) {
  cur = id; drawAll(); $("side").classList.remove("open"); $("results").hidden = true;
  if (msgId) { const e = document.querySelector(`[data-id="${msgId}"]`); if (e) { e.scrollIntoView({ block: "center" }); e.classList.add("hl"); setTimeout(() => e.classList.remove("hl"), 2500); } }
}
function delConv(id) { if (!confirm("Delete this chat?")) return; convs = convs.filter(c => c.id !== id); if (cur === id) cur = convs[0]?.id || null; if (!cur) newChat(); save(); drawAll(); }
function drawList() {
  const box = $("list"), f = $("filter").value.toLowerCase(); box.textContent = "";
  const now = new Date(), d0 = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const groups = { Today: [], Yesterday: [], Older: [] };
  convs.filter(c => c.title.toLowerCase().includes(f)).sort((a, b) => b.updatedAt - a.updatedAt)
    .forEach(c => groups[c.updatedAt >= d0 ? "Today" : c.updatedAt >= d0 - 864e5 ? "Yesterday" : "Older"].push(c));
  for (const [n, arr] of Object.entries(groups)) {
    if (!arr.length) continue; const h = document.createElement("div"); h.className = "grp"; h.textContent = n; box.appendChild(h);
    arr.forEach(c => {
      const it = document.createElement("div"); it.className = "item" + (c.id === cur ? " on" : ""); it.tabIndex = 0;
      const s = document.createElement("span"); s.textContent = c.title;
      const x = document.createElement("button"); x.textContent = "🗑"; x.title = "Delete chat"; x.onclick = e => { e.stopPropagation(); delConv(c.id); };
      it.append(s, x); it.onclick = () => openConv(c.id); it.onkeydown = e => e.key === "Enter" && openConv(c.id); box.appendChild(it);
    });
  }
}
function msgEl(m) {
  const d = document.createElement("div"); d.className = "m " + m.role + (m.error ? " err" : ""); d.dataset.id = m.id;
  if (m.role === "user") d.textContent = m.content; else {
    const b = document.createElement("div"); render(b, m.content); d.appendChild(b);
    const a = document.createElement("div"); a.className = "acts";
    [["Copy", () => copy(m.content)], ["Speak", () => speak(m.content)], ["Regenerate", () => regen(m.id)]].forEach(([n, f]) => { const x = document.createElement("button"); x.textContent = n; x.onclick = f; a.appendChild(x); });
    d.appendChild(a);
  }
  return d;
}
function drawMsgs() {
  const c = getConv(), box = $("msgs"); box.textContent = ""; $("convTitle").textContent = c ? c.title : "New chat";
  if (!c || !c.messages.length) { const p = document.createElement("div"); p.className = "m assistant"; p.textContent = "Hi! Ask me anything, type, or tap the microphone."; box.appendChild(p); }
  else c.messages.forEach(m => box.appendChild(msgEl(m)));
  box.scrollTop = box.scrollHeight;
}
const drawAll = () => { drawList(); drawMsgs(); };

/* ---------- AI request ---------- */
async function ask(c) {
  busy = true; setState("thinking");
  const ctrl = new AbortController(), to = setTimeout(() => ctrl.abort(), 30000);
  let reply, error = false;
  try {
    const r = await fetch(API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, signal: ctrl.signal,
      body: JSON.stringify((() => { const ok = c.messages.filter(m => !m.error), last = ok[ok.length - 1];
        return { message: last ? last.content : "", history: ok.slice(0, -1).slice(-8).map(m => ({ role: m.role, content: m.content })) }; })()) });
    if (!r.ok) throw new Error("HTTP " + r.status);
    reply = (await r.json()).reply; if (!reply) throw new Error("empty");
  } catch (e) {
    error = true; reply = e.name === "AbortError" ? "The AI service took too long to respond. Try again." : "AI service is temporarily unavailable. Check your connection or the API setup, then use Regenerate.";
  }
  clearTimeout(to);
  const m = { id: uid(), role: "assistant", content: reply, timestamp: new Date().toISOString(), error };
  c.messages.push(m); c.updatedAt = Date.now(); save(); busy = false;
  if (c.id === cur) { drawAll(); }
  if (error) { setState("error"); setTimeout(() => state === "error" && setState("idle"), 2500); }
  else if (voiceOn) speak(reply); else setState("idle");
}
function sendText(t) {
  t = (t || "").trim(); if (!t) return toast("Type a message first."); if (busy) return toast("Please wait for the current answer.");
  stopSpeak(); const c = getConv() || newChat();
  c.messages.push({ id: uid(), role: "user", content: t, timestamp: new Date().toISOString() });
  if (c.title === "New chat") c.title = t.slice(0, 40); c.updatedAt = Date.now(); save(); drawAll(); $("input").value = ""; autosize(); ask(c);
}
function regen(id) {
  if (busy) return; const c = getConv(), i = c.messages.findIndex(m => m.id === id); if (i < 0) return;
  c.messages = c.messages.slice(0, i); save(); drawAll(); ask(c);
}

/* ---------- Speech output ---------- */
const synth = window.speechSynthesis; let speaking = false;
function plain(t) { return t.replace(/```[\s\S]*?```/g, " code block omitted. ").replace(/[`*#]/g, ""); }
function speak(t) {
  if (!synth) return toast("Speech output is not supported in this browser.");
  if (speaking) { stopSpeak(); return; }
  const u = new SpeechSynthesisUtterance(plain(t).slice(0, 3000));
  u.onstart = () => { speaking = true; setState("speaking"); $("spkBtn").textContent = "⏹"; };
  const end = () => { speaking = false; $("spkBtn").textContent = "🔊"; if (state === "speaking") setState("idle"); };
  u.onend = end; u.onerror = end; synth.cancel(); synth.speak(u);
}
function stopSpeak() { if (synth) synth.cancel(); speaking = false; $("spkBtn").textContent = "🔊"; if (state === "speaking") setState("idle"); }

/* ---------- Speech input ---------- */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition; let rec = null, listening = false;
function mic() {
  if (!SR) return toast("Voice input is not supported in this browser.");
  if (listening) { rec.stop(); return; }
  stopSpeak(); rec = new SR(); rec.lang = navigator.language || "en-US"; rec.interimResults = true; let final = "";
  rec.onstart = () => { listening = true; $("micBtn").classList.add("on-air"); setState("listening"); $("input").placeholder = "Listening..."; };
  rec.onresult = e => { let t = ""; for (const r of e.results) t += r[0].transcript; final = t; $("input").value = t; autosize(); };
  rec.onerror = e => toast(e.error === "not-allowed" || e.error === "service-not-allowed" ? "Microphone permission is required for voice input." : "Voice input error: " + e.error);
  rec.onend = () => { listening = false; $("micBtn").classList.remove("on-air"); $("input").placeholder = "Ask anything..."; if (state === "listening") setState("idle"); if (final.trim()) sendText(final); };
  try { rec.start(); } catch { toast("Could not start the microphone."); }
}

/* ---------- Search ---------- */
function openSearch() { $("chatMode").hidden = true; $("searchMode").hidden = false; $("q").focus(); }
function closeSearch() { $("searchMode").hidden = true; $("chatMode").hidden = false; $("results").hidden = true; $("q").value = ""; }
function search() {
  const q = $("q").value.trim().toLowerCase(), box = $("results"); box.textContent = ""; box.hidden = false;
  const hits = []; if (q) convs.forEach(c => c.messages.forEach(m => { const i = m.content.toLowerCase().indexOf(q); if (i >= 0) hits.push({ c, m, i }); }));
  if (!hits.length) { const d = document.createElement("div"); d.className = "res"; d.textContent = q ? "No messages match “" + $("q").value + "”." : "Type something to search."; box.appendChild(d); return; }
  hits.slice(0, 50).forEach(({ c, m, i }) => {
    const d = document.createElement("div"); d.className = "res"; const s = document.createElement("small"); s.textContent = c.title + " · " + (m.role === "user" ? "You" : "AI");
    const p = document.createElement("div"), a = Math.max(0, i - 30), t = m.content;
    p.append(document.createTextNode((a ? "…" : "") + t.slice(a, i)));
    const mk = document.createElement("mark"); mk.textContent = t.slice(i, i + q.length); p.append(mk, document.createTextNode(t.slice(i + q.length, i + q.length + 60)));
    d.append(s, p); d.onclick = () => openConv(c.id, m.id); box.appendChild(d);
  });
}

/* ---------- Wiring ---------- */
function autosize() { const t = $("input"); t.style.height = "auto"; t.style.height = Math.min(t.scrollHeight, 120) + "px"; }
$("send").onclick = () => sendText($("input").value);
$("input").addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendText($("input").value); } });
$("input").addEventListener("input", autosize);
$("newChat").onclick = () => { stopSpeak(); newChat(); $("side").classList.remove("open"); };
$("filter").oninput = drawList; $("menu").onclick = () => $("side").classList.toggle("open");
$("searchBtn").onclick = openSearch; $("closeSearch").onclick = closeSearch; $("doSearch").onclick = search; $("q").oninput = search;
$("q").addEventListener("keydown", e => e.key === "Enter" && search());
$("micBtn").onclick = mic;
$("spkBtn").onclick = () => { if (speaking) return stopSpeak(); const last = [...(getConv()?.messages || [])].reverse().find(m => m.role === "assistant" && !m.error); last ? speak(last.content) : toast("No answer to read yet."); };
function paintVoice() { $("voiceToggle").textContent = voiceOn ? "Voice ON" : "Voice OFF"; $("voiceToggle").classList.toggle("off", !voiceOn); }
$("voiceToggle").onclick = () => { voiceOn = !voiceOn; localStorage.setItem(VKEY, voiceOn ? "on" : "off"); if (!voiceOn) stopSpeak(); paintVoice(); };
$("quick").addEventListener("click", e => { if (e.target.tagName === "BUTTON") sendText(e.target.textContent); });
addEventListener("keydown", e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); openSearch(); }
  if (e.key === "Escape" && !$("searchMode").hidden) closeSearch();
});
paintVoice(); if (!convs.length) newChat(); else cur = convs.sort((a, b) => b.updatedAt - a.updatedAt)[0].id;
drawAll(); initRobot(); setState("idle");

/* Theme: dark default, light option (saved) */
(function(){const k="uitc-ai-theme";let t="dark";try{t=localStorage.getItem(k)||"dark"}catch{}
const ap=()=>document.documentElement.dataset.theme=t;ap();
$("themeBtn").onclick=()=>{t=t==="dark"?"light":"dark";ap();try{localStorage.setItem(k,t)}catch{}};})();
