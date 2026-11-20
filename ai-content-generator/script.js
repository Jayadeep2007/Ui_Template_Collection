/* ===== AI CONTENT GENERATOR ===== */

const TONES = {
  formal: {
    open: "Introducing",
    cta: "We invite you to explore this further.",
    sign: "Best regards,"
  },
  friendly: {
    open: "Let's talk about",
    cta: "Give it a try and let us know what you think!",
    sign: "Cheers,"
  },
  playful: {
    open: "Guess what? It's time for",
    cta: "Ready to make something awesome? Let's go!",
    sign: "Stay awesome,"
  }
};

const pick = arr => arr[Math.floor(Math.random() * arr.length)];

// Fisher-Yates (unbiased)
const shuffle = arr => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Capitalizes the first letter of each word without breaking "don't"
const titleCase = s => s.replace(/(^|\s)(\S)/g, (_, sp, c) => sp + c.toUpperCase());

function cleanTopic(raw) {
  let s = String(raw || "").trim().replace(/[.!?]+$/, "");

  s = s.replace(
    /^(please\s+)?(can you\s+)?(write|create|draft|make|compose|generate|give me|announce|introduce)\s+(me\s+)?(a|an|the|our|my)?\s*/i,
    ""
  );

  s = s.replace(
    /^(blog\s*post|blog|article|e-?mail|social media caption|caption|post)\s+(about|on|for|regarding|announcing)\s+/i,
    ""
  );

  return s.trim() || String(raw || "").trim();
}

// Match "Blog Post" -> "blog", "Short" -> "short", etc.
function normalize(value, allowed, fallback) {
  const v = String(value || "").toLowerCase().trim();
  return allowed.find(a => v === a || v.includes(a)) || fallback;
}

/* ===== CONTENT GENERATOR ===== */

function buildDraft({ type, topic, tone, length }) {
  type = normalize(type, ["blog", "email", "caption"], "blog");
  tone = normalize(tone, Object.keys(TONES), "friendly");
  length = normalize(length, ["short", "medium", "long"], "medium");

  const t = TONES[tone];
  const extra = { short: 0, medium: 1, long: 3 }[length];

  const subject = cleanTopic(topic);
  const sub = subject; // keep the user's casing (AI, Python, etc.)
  const Sub = subject.charAt(0).toUpperCase() + subject.slice(1);

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
    `${Sub}!`,
    `Big news: ${sub}!`,
    `Something exciting is happening with ${sub}!`,
    `Let's talk about ${sub}!`
  ];

  const tagWords = subject
    .split(/\s+/)
    .filter(w => w.length > 3)
    .slice(0, 2)
    .map(w => w.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter(Boolean);

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
    const paras = [
      pick(emailGreetings[tone]),
      `I am writing to share some information about ${sub}.`
    ];
    if (extra >= 1) paras.push(more(extra));
    if (extra >= 3) paras.push(pick(blogMiddles));
    paras.push(t.cta, `${t.sign}\nThe Team`);
    return { title: pick(emailSubjects), paras };
  }

  // caption
  return {
    title: "Social Media Caption",
    paras: [`${pick(captionHooks)} ${more(Math.min(extra, 3))} ${t.cta}`, `${tagA} ${tagB}`]
  };
}

/* ===== CONNECT GENERATOR TO HTML ===== */

document.addEventListener("DOMContentLoaded", () => {
  const find = (...selectors) => {
    for (const s of selectors) {
      const el = document.querySelector(s);
      if (el) return el;
    }
    return null;
  };

  const topicInput  = find("#topic", "#topicInput", "[name='topic']");
  const typeInput   = find("#type", "#contentType", "[name='type']");
  const toneInput   = find("#tone",
                           
