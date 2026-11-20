/* ===== AI CONTENT GENERATOR ===== */

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

/* ===== CONTENT GENERATOR ===== */

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

/* ===== CONNECT TO YOUR HTML ===== */

function initGenerator() {
  const find = (...selectors) => {
    for (const s of selectors) {
      const el = document.querySelector(s);
      if (el) return el;
    }
    return null;
  };

  const findButton = word =>
    [...document.querySelectorAll("button, input[type='button'], input[type='submit'], a")]
      .find(b => (b.textContent || b.value || "").toLowerCase().includes(word));

  const selects = [...document.querySelectorAll("select")];

  const topicInput = find("#topic", "#topicInput", "[name='topic']", "input[type='text']", "textarea", "input:not([type])");
  const typeInput  = find("#type", "#contentType", "[name='type']") || selects[0] || null;
  const toneInput  = find("#tone", "[name='tone']") || selects[1] || null;
  const lengthInput = find("#length", "[name='length']") || selects[2] || null;
  const output = find("#output", "#result", "#generatedContent", ".output-content", ".output", ".result");
  const generateBtn = find("#generateBtn", "#generate", "[data-action='generate']") || findButton("generate");
  const copyBtn = find("#copyBtn", "#copy", "[data-action='copy']") || findButton("copy");
  const downloadBtn = find("#downloadBtn", "#download", "[data-action='download']") || findButton("download");

  const missing = Object.entries({ topicInput, output, generateBtn })
    .filter(([, el]) => !el).map(([name]) => name);
  if (missing.length) {
    console.error("Generator could not find these elements in your HTML:", missing,
      "-> give them ids: topic, output, generateBtn");
  }

  if (output) output.style.whiteSpace = "pre-wrap";

  let generatedText = "";

  function renderOutput(text) {
    if (!output) return;
    if (output.tagName === "TEXTAREA" || output.tagName === "INPUT") output.value = text;
    else output.textContent = text;
  }

  function generateContent(e) {
    if (e && e.preventDefault) e.preventDefault();

    const topic = (topicInput?.value || "").trim();
    if (!topic) {
      alert("Please enter a topic first.");
      topicInput?.focus();
      return;
    }

    const draft = buildDraft({
      type: typeInput?.value || "blog",
      topic,
      tone: toneInput?.value || "friendly",
      length: lengthInput?.value || "medium"
    });

    generatedText = [draft.title, ...draft.paras].join("\n\n");
    renderOutput(generatedText);

    if (output) {
      output.style.animation = "none";
      void output.offsetWidth;
      output.style.animation = "contentAppear 0.5s ease";
    }
  }

  generateBtn?.addEventListener("click", generateContent);
  topicInput?.addEventListener("keydown", e => {
    if (e.key === "Enter" && topicInput.tagName === "INPUT") generateContent(e);
  });

  copyBtn?.addEventListener("click", async e => {
    e.preventDefault();
    if (!generatedText) return alert("Generate content first.");
    try {
      await navigator.clipboard.writeText(generatedText);
      const old = copyBtn.textContent;
      copyBtn.textContent = "Copied!";
      setTimeout(() => (copyBtn.textContent = old), 1500);
    } catch {
      alert("Unable to copy automatically.");
    }
  });

  downloadBtn?.addEventListener("click", e => {
    e.preventDefault();
    if (!generatedText) return alert("Generate content first.");
    const url = URL.createObjectURL(new Blob([generatedText], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "generated-content.txt";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  /* ===== ANIMATED BACKGROUND ===== */

  const style = document.createElement("style");
  style.textContent = `
    @keyframes floatOrb {
      0%, 100% { transform: translate(0, 0) scale(1); }
      50% { transform: translate(60px, -70px) scale(1.15); }
    }
    @keyframes contentAppear {
      from { opacity: 0; transform: translateY(15px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animated-orb {
      position: fixed; border-radius: 50%; filter: blur(65px);
      opacity: 0.32; pointer-events: none; z-index: -1;
      animation: floatOrb 12s ease-in-out infinite;
    }
    .custom-cursor {
      position: fixed; width: 22px; height: 22px;
      border: 2px solid #a78bfa; border-radius: 50%;
      pointer-events: none; z-index: 99999;
      transform: translate(-50%, -50%);
      transition: width 0.2s, height 0.2s;
      box-shadow: 0 0 20px #a78bfa88;
    }
    .cursor-dot {
      position: fixed; width: 6px; height: 6px; background: #c4b5fd;
      border-radius: 50%; pointer-events: none; z-index: 100000;
      transform: translate(-50%, -50%);
    }
    @media (pointer: coarse) { .custom-cursor, .cursor-dot { display: none; } }
    @media (prefers-reduced-motion: reduce) { .animated-orb { animation: none; } }
  `;
  document.head.appendChild(style);

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

  /* ===== GLOWING FOLLOW CURSOR ===== */

  if (window.matchMedia("(pointer: fine)").matches) {
    const cursor = document.createElement("div");
    cursor.className = "custom-cursor";
    const dot = document.createElement("div");
    dot.className = "cursor-dot";
    document.body.append(cursor, dot);

    let mouseX = -100, mouseY = -100, cursorX = -100, cursorY = -100;

    document.addEventListener("mousemove", e => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      dot.style.left = mouseX + "px";
      dot.style.top = mouseY + "px";
    });

    (function animateCursor() {
      cursorX += (mouseX - cursorX) * 0.14;
      cursorY += (mouseY - cursorY) * 0.14;
      cursor.style.left = cursorX + "px";
      cursor.style.top = cursorY + "px";
      requestAnimationFrame(animateCursor);
    })();

    const interactive = "button, a, input, select, textarea";
    document.addEventListener("mouseover", e => {
      if (e.target.closest(interactive)) cursor.style.width = cursor.style.height = "42px";
    });
    document.addEventListener("mouseout", e => {
      if (e.target.closest(interactive)) cursor.style.width = cursor.style.height = "22px";
    });
  }
}

// Works whether the script loads before or after the page is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initGenerator);
} else {
  initGenerator();
}
