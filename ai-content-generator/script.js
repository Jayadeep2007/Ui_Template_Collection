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
