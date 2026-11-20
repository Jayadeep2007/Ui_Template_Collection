<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>AI Content Generator</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; padding: 40px 16px;
    background: #0f0c1d; color: #eee;
    font-family: system-ui, Arial, sans-serif;
  }
  .card {
    max-width: 720px; margin: 0 auto; padding: 28px;
    background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12);
    border-radius: 16px; backdrop-filter: blur(10px);
  }
  h1 { margin-top: 0; }
  label { display: block; margin: 14px 0 6px; font-size: 14px; color: #c4b5fd; }
  input, select {
    width: 100%; padding: 12px; border-radius: 10px; font-size: 16px;
    border: 1px solid #4c3f8f; background: #1a1535; color: #fff;
  }
  .row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
  .buttons { display: flex; gap: 10px; margin-top: 20px; flex-wrap: wrap; }
  button {
    padding: 12px 20px; border: 0; border-radius: 10px; cursor: pointer;
    font-size: 15px; color: #fff; background: #7c3aed;
  }
  button.secondary { background: #3b3366; }
  #output {
    margin-top: 24px; padding: 18px; min-height: 120px;
    background: #1a1535; border-radius: 12px; line-height: 1.6;
    white-space: pre-wrap; border: 1px solid #4c3f8f;
  }
  @media (max-width: 600px) { .row { grid-template-columns: 1fr; } }

  @keyframes floatOrb {
    0%,100% { transform: translate(0,0) scale(1); }
    50% { transform: translate(60px,-70px) scale(1.15); }
  }
  @keyframes contentAppear {
    from { opacity: 0; transform: translateY(15px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animated-orb {
    position: fixed; border-radius: 50%; filter: blur(65px); opacity: .32;
    pointer-events: none; z-index: -1; animation: floatOrb 12s ease-in-out infinite;
  }
  .custom-cursor {
    position: fixed; width: 22px; height: 22px; border: 2px solid #a78bfa;
    border-radius: 50%; pointer-events: none; z-index: 99999;
    transform: translate(-50%,-50%); transition: width .2s, height .2s;
    box-shadow: 0 0 20px #a78bfa88;
  }
  .cursor-dot {
    position: fixed; width: 6px; height: 6px; background: #c4b5fd;
    border-radius: 50%; pointer-events: none; z-index: 100000;
    transform: translate(-50%,-50%);
  }
  @media (pointer: coarse) { .custom-cursor, .cursor-dot { display: none; } }
  @media (prefers-reduced-motion: reduce) { .animated-orb { animation: none; } }
</style>
</head>
<body>

<div class="card">
  <h1>AI Content Generator</h1>

  <label for="topic">Topic</label>
  <input id="topic" placeholder="e.g. AI in education">

  <div class="row">
    <div>
      <label for="type">Type</label>
      <select id="type">
        <option value="blog">Blog</option>
        <option value="email">Email</option>
        <option value="caption">Caption</option>
      </select>
    </div>
    <div>
      <label for="tone">Tone</label>
      <select id="tone">
        <option value="friendly">Friendly</option>
        <option value="formal">Formal</option>
        <option value="playful">Playful</option>
      </select>
    </div>
    <div>
      <label for="length">Length</label>
      <select id="length">
        <option value="short">Short</option>
        <option value="medium" selected>Medium</option>
        <option value="long">Long</option>
      </select>
    </div>
  </div>

  <div class="buttons">
    <button id="generateBtn">Generate</button>
    <button id="copyBtn" class="secondary">Copy</button>
    <button id="downloadBtn" class="secondary">Download</button>
  </div>

  <div id="output">Your generated content will appear here.</div>
</div>

<script>
const TONES = {
  formal:   { open: "Introducing", cta: "We invite you to explore this further.", sign: "Best regards," },
  friendly: { open: "Let's talk about", cta: "Give it a try and let us know what you think!", sign: "Cheers," },
  playful:  { open: "Guess what? It's time for", cta: "Ready to make something awesome? Let's go!", sign: "Stay awesome," }
};

const pick = arr => arr[Math.floor(Math.random() * arr.length)];

const shuffle = arr => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const titleCase = s => s.replace(/(^|\s)(\S)/g, (_, sp, c) => sp + c.toUpperCase());

function cleanTopic(raw) {
  let s = String(raw || "").trim().replace(/[.!?]+$/, "");
  s = s.replace(/^(please\s+)?(can you\s+)?(write|create|draft|make|compose|generate|give me|announce|introduce)\s+(me\s+)?(a|an|the|our|my)?\s*/i, "");
  s = s.replace(/^(blog\s*post|blog|article|e-?mail|social media caption|caption|post)\s+(about|on|for|regarding|announcing)\s+/i, "");
  return s.trim() || String(raw || "").trim();
}

function normalize(value, allowed, fallback) {
  const v = String(value || "").toLowerCase().trim();
  return allowed.find(a => v === a || v.includes(a)) || fallback;
}

function buildDraft({ type, topic, tone, length }) {
  type   = normalize(type, ["blog", "email", "caption"], "blog");
  tone   = normalize(tone, Object.keys(TONES), "friendly");
  length = normalize(length, ["short", "medium", "long"], "medium");

  const t = TONES[tone];
  const extra = { short: 0, medium: 1, long: 3 }[length];

  const sub = cleanTopic(topic);
  const Sub = sub.charAt(0).toUpperCase() + sub.slice(1);

  const pointPool = {
    formal: [
      `${Sub} addresses an important need and provides practical opportunities.`,
      `A structured approach helps improve efficiency and productivity.`,
      `Understanding the key principles makes implementation easier.`,
      `Consistent effort can lead to meaningful long-term results.`,
      `The goal is to create measurable and sustainable improvements.`
    ],
    friendly: [
      `${Sub} can make everyday experiences easier and more enjoyable.`,
      `Getting started does not have to be complicated.`,
      `Small improvements can make a surprisingly big difference.`,
      `The best way to learn is to explore and experiment.`,
      `With a little practice, anyone can make progress.`
    ],
    playful: [
      `${Sub}? Now that sounds exciting!`,
      `Say goodbye to boring routines and hello to fresh ideas!`,
      `Getting started is easier than you think.`,
      `A little creativity can turn ordinary moments into something special.`,
      `Ready to level things up? The fun starts here!`
    ]
  };

  const points = shuffle(pointPool[tone]);
  const more = n => points.slice(0, Math.min(points.length, 1 + n)).join(" ");

  const blogOpeners = [
    `${t.open} ${sub}. Let's explore what makes this topic interesting and useful.`,
    `${Sub} is an important topic worth understanding. Here is a practical guide.`,
    `Want to learn more about ${sub}? You are in the right place.`,
    `Today we are exploring ${sub} and how to get started.`
  ];
  const blogMiddles = [
    `One effective way to approach ${sub} is to start small, learn the basics, and improve gradually.`,
    `Understanding ${sub} begins with asking the right questions and exploring practical examples.`,
    `Success often comes from consistency, curiosity, and a willingness to learn.`
  ];
  const blogLong = [
    `For better results, create a clear plan, set realistic goals, and track your progress.`,
    `Remember that improvement takes time. Focus on steady progress rather than perfection.`
  ];
  const blogTitles = [
    titleCase(sub),
    `Getting Started With ${titleCase(sub)}`,
    `Why ${titleCase(sub)} Matters`,
    `A Complete Guide to ${titleCase(sub)}`
  ];
  const emailSubjects = [
    `Subject: ${titleCase(sub)}`,
    `Subject: Important Update About ${sub}`,
    `Subject: Introducing ${titleCase(sub)}`,
    `Subject: Let's Talk About ${titleCase(sub)}`
  ];
  const emailGreetings = {
    formal: ["Dear Sir/Madam,", "Dear Team,"],
    friendly: ["Hi there,", "Hello everyone,"],
    playful: ["Hey there!", "Hello, amazing people!"]
  };
  const captionHooks = [
    `${Sub}!`, `Big news: ${sub}!`,
    `Something exciting is happening with ${sub}!`, `Let's talk about ${sub}!`
  ];

  const tagWords = sub.split(/\s+/).filter(w => w.length > 3).slice(0, 2)
    .map(w => w.replace(/[^\p{L}\p{N}]/gu, "")).filter(Boolean);
  const tagA = tagWords.length ? "#" + tagWords.join("") : "#Update";
  const tagB = pick(["#Trending", "#ExploreMore", "#NewIdeas", "#StayInspired"]);

  if (type === "blog") {
    const paras = [pick(blogOpeners), `Here is what you should know: ${more(extra)}`];
    if (extra >= 1) paras.push(pick(blogMiddles));
    if (extra >= 3) paras.push(...blogLong);
    paras.push(t.cta);
    return { title: pick(blogTitles), paras };
  }

  if (type === "email") {
    const paras = [pick(emailGreetings[tone]), `I am writing to share some information about ${sub}.`];
    if (extra >= 1) paras.push(more(extra));
    if (extra >= 3) paras.push(pick(blogMiddles));
    paras.push(t.cta, `${t.sign}\nThe Team`);
    return { title: pick(emailSubjects), paras };
  }

  return {
    title: "Social Media Caption",
    paras: [`${pick(captionHooks)} ${more(Math.min(extra, 3))} ${t.cta}`, `${tagA} ${tagB}`]
  };
}

/* ===== WIRING ===== */
const $ = id => document.getElementById(id);
const topicInput = $("topic"), typeInput = $("type"), toneInput = $("tone"),
      lengthInput = $("length"), output = $("output");
let generatedText = "";

function generateContent() {
  const topic = topicInput.value.trim();
  if (!topic) { alert("Please enter a topic first."); topicInput.focus(); return; }

  const draft = buildDraft({
    type: typeInput.value, topic, tone: toneInput.value, length: lengthInput.value
  });

  generatedText = [draft.title, ...draft.paras].join("\n\n");
  output.textContent = generatedText;
  output.style.animation = "none";
  void output.offsetWidth;
  output.style.animation = "contentAppear 0.5s ease";
}

$("generateBtn").addEventListener("click", generateContent);
topicInput.addEventListener("keydown", e => { if (e.key === "Enter") generateContent(); });

$("copyBtn").addEventListener("click", async () => {
  if (!generatedText) return alert("Generate content first.");
  try {
    await navigator.clipboard.writeText(generatedText);
    const b = $("copyBtn"), old = b.textContent;
    b.textContent = "Copied!";
    setTimeout(() => (b.textContent = old), 1500);
  } catch { alert("Unable to copy automatically."); }
});

$("downloadBtn").addEventListener("click", () => {
  if (!generatedText) return alert("Generate content first.");
  const url = URL.createObjectURL(new Blob([generatedText], { type: "text/plain;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = "generated-content.txt";
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
});

/* ===== BACKGROUND ORBS ===== */
["rgba(168,85,247,0.45)", "rgba(236,72,153,0.35)", "rgba(99,102,241,0.35)"].forEach((color, i) => {
  const orb = document.createElement("div");
  orb.className = "animated-orb";
  orb.style.width = orb.style.height = `${250 + i * 90}px`;
  orb.style.background = color;
  orb.style.top = `${i * 28}%`;
  orb.style.left = `${i * 30}%`;
  orb.style.animationDelay = `${i * -4}s`;
  document.body.appendChild(orb);
});

/* ===== GLOWING CURSOR ===== */
if (window.matchMedia("(pointer: fine)").matches) {
  const cursor = document.createElement("div"); cursor.className = "custom-cursor";
  const dot = document.createElement("div"); dot.className = "cursor-dot";
  document.body.append(cursor, dot);

  let mx = -100, my = -100, cx = -100, cy = -100;
  document.addEventListener("mousemove", e => {
    mx = e.clientX; my = e.clientY;
    dot.style.left = mx + "px"; dot.style.top = my + "px";
  });
  (function loop() {
    cx += (mx - cx) * 0.14; cy += (my - cy) * 0.14;
    cursor.style.left = cx + "px"; cursor.style.top = cy + "px";
    requestAnimationFrame(loop);
  })();

  const sel = "button, a, input, select, textarea";
  document.addEventListener("mouseover", e => {
    if (e.target.closest(sel)) cursor.style.width = cursor.style.height = "42px";
  });
  document.addEventListener("mouseout", e => {
    if (e.target.closest(sel)) cursor.style.width = cursor.style.height = "22px";
  });
}
</script>
</body>
</html>
