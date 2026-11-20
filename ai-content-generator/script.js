
"use strict";

/* =========================================
   AI CONTENT GENERATOR
   Compatible with existing index.html
========================================= */

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

const pick = arr =>
  arr[Math.floor(Math.random() * arr.length)];

const shuffle = arr => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const titleCase = text =>
  text.replace(/\b\w/g, letter => letter.toUpperCase());

const TONES = {
  formal: {
    intro: "We are pleased to share information about",
    closing: "We appreciate your interest and welcome further discussion.",
    greeting: "Dear Team,",
    sign: "Best regards,"
  },
  friendly: {
    intro: "Let's talk about",
    closing: "We hope you find this helpful. We'd love to hear your thoughts!",
    greeting: "Hi there,",
    sign: "Cheers,"
  },
  playful: {
    intro: "Get ready for",
    closing: "Sounds exciting, right? Let's make it happen!",
    greeting: "Hey everyone!",
    sign: "Stay awesome,"
  }
};

/* =========================================
   CLEAN AND UNDERSTAND PROMPT
========================================= */

function cleanTopic(raw) {
  let text = String(raw || "").trim();

  text = text.replace(/[.!?]+$/, "");

  text = text.replace(
    /^(please\s+)?(write|create|draft|make|compose|generate|give me)\s+(me\s+)?/i,
    ""
  );

  text = text.replace(
    /^(a|an|the)\s+(blog post|blog|email|caption|post|article|announcement)\s+(about|on|for|regarding|to)?\s*/i,
    ""
  );

  return text.trim() || String(raw || "").trim();
}

function detectIntent(prompt) {
  const text = prompt.toLowerCase();

  if (/\b(apolog|sorry|regret)\b/.test(text)) {
    return "apology";
  }

  if (/\b(leave|absence|day off|sick)\b/.test(text)) {
    return "leave";
  }

  if (/\b(invite|invitation|workshop|seminar|event)\b/.test(text)) {
    return "event";
  }

  if (/\b(launch|introduce|product|app|opening)\b/.test(text)) {
    return "launch";
  }

  if (/\b(thank|gratitude|appreciat)\b/.test(text)) {
    return "thanks";
  }

  if (/\b(guide|how to|steps|tutorial)\b/.test(text)) {
    return "guide";
  }

  return "general";
}

function getTopicData(prompt) {
  const subject = cleanTopic(prompt);
  const intent = detectIntent(prompt);

  const words = subject.split(/\s+/).filter(Boolean);
  const title = titleCase(subject);

  return {
    subject,
    title,
    intent,
    words
  };
}

/* =========================================
   GENERATE BLOG CONTENT
========================================= */

function createBlog(topic, tone, length) {
  const t = TONES[tone];
  const { subject, title, intent } = getTopicData(topic);

  const opening = {
    formal:
      `${title} is a subject worth exploring carefully. Understanding its purpose, practical applications, and possible challenges can help readers make informed decisions.`,
    friendly:
      `Have you ever wondered about ${subject}? Whether you're just getting started or looking for fresh ideas, this guide will help you explore the topic in a simple way.`,
    playful:
      `Ready to discover something interesting? Today we're diving into ${subject}, exploring useful ideas, and finding ways to make the most of it!`
  };

  const sections = {
    general: [
      {
        heading: "Understanding the Topic",
        body:
          `Start by identifying what ${subject} means in your particular situation. Consider who it affects, why it matters, and what you want to achieve. A clear understanding of the goal helps you avoid unnecessary complexity.`
      },
      {
        heading: "Key Considerations",
        body:
          `When exploring ${subject}, focus on relevance, accessibility, and practical value. Look for reliable information, compare different approaches, and consider which ideas are most suitable for your needs.`
      },
      {
        heading: "Getting Started",
        body:
          `Begin with a specific goal. Break the process into manageable steps, choose a realistic starting point, and review your progress regularly. Use feedback to improve your approach.`
      },
      {
        heading: "Common Challenges",
        body:
          `A lack of planning, unclear expectations, or insufficient information can slow progress. Address these challenges by setting priorities, seeking feedback, and making adjustments when needed.`
      }
    ],
    guide: [
      {
        heading: "Step 1: Define Your Goal",
        body:
          `Decide what you want to accomplish with ${subject}. Write down a clear outcome so that your efforts stay focused.`
      },
      {
        heading: "Step 2: Prepare the Essentials",
        body:
          `Gather the information, tools, and resources you need. Check that your approach is practical for your available time and budget.`
      },
      {
        heading: "Step 3: Take Action",
        body:
          `Work through the process in small stages. Test each step, identify issues early, and make improvements as you learn.`
      },
      {
        heading: "Step 4: Review Results",
        body:
          `Compare your results with your original goal. Record what worked, identify what needs improvement, and plan your next steps.`
      }
    ],
    launch: [
      {
        heading: "Introducing the Idea",
        body:
          `${title} creates an opportunity to introduce something new. A successful introduction begins by explaining the purpose clearly and showing the audience why it may be relevant to them.`
      },
      {
        heading: "What Makes It Interesting",
        body:
          `Focus on the main idea behind ${subject}. Explain the intended experience, the problem being addressed, and what people can expect, without making unsupported promises.`
      },
      {
        heading: "Connecting With Your Audience",
        body:
          `Use clear messaging, relevant examples, and an inviting tone. Encourage questions and provide a straightforward way for interested people to learn more.`
      },
      {
        heading: "Planning the Next Steps",
        body:
          `Prepare your announcement, review the details, and establish how you will collect feedback. Use what you learn to guide future improvements.`
      }
    ]
  };

  const chosen = sections[intent] || sections.general;

  const count = {
    short: 1,
    medium: 2,
    long: 4
  }[length] || 2;

  const paragraphs = [
    opening[tone] || opening.friendly
  ];

  chosen.slice(0, count).forEach(section => {
    paragraphs.push(
      `${section.heading}\n${section.body}`
    );
  });

  if (length === "long") {
    paragraphs.push(
      `Practical Takeaways\nFor ${subject}, start with a realistic objective, communicate clearly, and use measurable feedback to decide what to improve. Small, consistent actions are often easier to sustain than overly ambitious plans.`
    );
  }

  paragraphs.push(
    `Final Thoughts\n${t.closing}`
  );

  return {
    title: `A Guide to ${title}`,
    paras: paragraphs
  };
}

/* =========================================
   GENERATE EMAIL CONTENT
========================================= */

function createEmail(topic, tone, length) {
  const t = TONES[tone];
  const { subject, intent } = getTopicData(topic);

  let emailSubject = titleCase(subject);
  let paragraphs = [];

  if (intent === "leave") {
    emailSubject = "Request for Leave";

    paragraphs = [
      t.greeting,
      "I am writing to request leave from my responsibilities for a period that I will confirm with you.",
      "Please let me know if the requested dates can be approved. I will coordinate any pending work and ensure that important responsibilities are addressed before my absence."
    ];

    if (length === "long") {
      paragraphs.push(
        "I am happy to discuss a suitable handover plan and provide any additional information required."
      );
    }

    paragraphs.push(
      "Thank you for considering my request."
    );
  }

  else if (intent === "apology") {
    emailSubject = "Apology and Follow-Up";

    paragraphs = [
      t.greeting,
      `I would like to sincerely apologize regarding ${subject}.`,
      "I understand that the situation may have caused inconvenience, and I appreciate your patience.",
      "I will take the necessary steps to address the issue and communicate any relevant updates."
    ];

    if (length === "long") {
      paragraphs.push(
        "Please let me know if there is anything further I can do to help resolve the matter."
      );
    }
  }

  else if (intent === "event") {
    emailSubject = `Invitation: ${titleCase(subject)}`;

    paragraphs = [
      t.greeting,
      `We are excited to invite you to ${subject}.`,
      "This event is intended to bring people together to learn, exchange ideas, and participate in meaningful discussions.",
      "We would be delighted to have you join us."
    ];

    if (length === "long") {
      paragraphs.push(
        "Additional details, including the schedule, venue, and registration information, will be shared when confirmed."
      );
    }

    paragraphs.push(
      "We look forward to your participation."
    );
  }

  else if (intent === "launch") {
    emailSubject = `Introducing ${titleCase(subject)}`;

    paragraphs = [
      t.greeting,
      `We are excited to share an announcement about ${subject}.`,
      "Our aim is to introduce an experience that is useful, accessible, and thoughtfully designed.",
      "We invite you to learn more and share your feedback."
    ];

    if (length === "long") {
      paragraphs.push(
        "We will share further details about availability, features, and next steps as they are confirmed."
      );
    }
  }

  else if (intent === "thanks") {
    emailSubject = "Thank You";

    paragraphs = [
      t.greeting,
      `I wanted to express my appreciation regarding ${subject}.`,
      "Your time, effort, and support are greatly valued.",
      "Thank you once again for your contribution."
    ];
  }

  else {
    emailSubject = titleCase(subject);

    paragraphs = [
      t.greeting,
      `I am writing to discuss ${subject}.`,
      "I would appreciate the opportunity to share some thoughts and explore the next steps.",
      "Please let me know your feedback or availability for further discussion."
    ];

    if (length === "long") {
      paragraphs.push(
        "I would be happy to provide additional context and coordinate a suitable plan based on your suggestions."
      );
    }
  }

  if (length === "short") {
    paragraphs = paragraphs.slice(0, 3);
  }

  paragraphs.push(`${t.sign}\n[Your Name]`);

  return {
    title: `Subject: ${emailSubject}`,
    paras: paragraphs
  };
}

/* =========================================
   GENERATE SOCIAL CAPTIONS
========================================= */

function createCaption(topic, tone, length) {
  const { subject, title, intent, words } = getTopicData(topic);

  const hooks = {
    formal: [
      `Introducing ${subject}.`,
      `An important update: ${subject}.`,
      `Discover more about ${subject}.`
    ],
    friendly: [
      `We've got something to share! ${title} ✨`,
      `Let's talk about ${subject}! 💚`,
      `Something exciting is happening!`
    ],
    playful: [
      `Big news alert! 🚀 ${title}!`,
      `Guess what's happening? 👀 ${title}!`,
      `New vibes unlocked! ✨ ${title}!`
    ]
  };

  const details = {
    event:
      "Join us for an opportunity to connect, learn, and share ideas.",
    launch:
      "We're excited to introduce something new and hear what you think.",
    guide:
      "Explore useful tips and discover practical ways to get started.",
    general:
      "A fresh perspective, new ideas, and something worth exploring."
  };

  const body = details[intent] || details.general;

  const hashtags = words
    .map(w => w.replace(/[^a-zA-Z0-9]/g, ""))
    .filter(w => w.length > 2)
    .slice(0, 3)
    .map(w => `#${titleCase(w)}`)
    .join(" ");

  const paragraphs = [
    pick(hooks[tone] || hooks.friendly)
  ];

  if (length !== "short") {
    paragraphs.push(body);
  }

  if (length === "long") {
    paragraphs.push(
      `Whether you're discovering ${subject} for the first time or already interested, we'd love to hear your thoughts.`
    );
  }

  paragraphs.push(
    tone === "formal"
      ? "Learn more and join the conversation."
      : tone === "playful"
        ? "Who's excited? Tell us below! 🔥"
        : "What do you think? Let us know! 💬"
  );

  paragraphs.push(
    `${hashtags} #StayInspired #ExploreMore`
  );

  return {
    title: "Social Media Caption",
    paras: paragraphs
  };
}

/* ===== CONTENT VARIATIONS FOR REGENERATION ===== */

const REGEN_VARIATIONS = {
  blog: {
    formal: [
      "This topic deserves careful consideration because its practical implications can influence important decisions.",
      "A structured examination of this subject can reveal useful insights and opportunities for improvement.",
      "Evaluating different perspectives is essential for developing a balanced understanding."
    ],
    friendly: [
      "The great thing about this topic is that you can start exploring it at your own pace.",
      "There is always something new to discover, especially when you approach it with curiosity.",
      "Sometimes the simplest ideas are the ones that make the biggest difference."
    ],
    playful: [
      "Here's where things get interesting — a little creativity can go a long way!",
      "Who says learning something new has to be boring? Let's make it exciting!",
      "Think of this as your chance to try something fresh and unexpected!"
    ]
  },
  email: {
    formal: [
      "I would appreciate your consideration and look forward to your response.",
      "Please let me know if any additional information would be helpful.",
      "Thank you for taking the time to review this message."
    ],
    friendly: [
      "I'd love to hear your thoughts whenever you have a moment.",
      "Feel free to reach out if you'd like to discuss this further.",
      "Looking forward to hearing from you soon!"
    ],
    playful: [
      "Exciting things are ahead, and we'd love for you to be part of them!",
      "We can't wait to hear what you think!",
      "Let's keep the conversation going!"
    ]
  },
  caption: {
    formal: [
      "Discover new perspectives and meaningful opportunities.",
      "Explore ideas that inspire positive change.",
      "Stay informed, stay curious, and keep exploring."
    ],
    friendly: [
      "Good things happen when we share ideas and support each other! ✨",
      "Here's to fresh starts and exciting possibilities! 💚",
      "A little inspiration can make your whole day brighter! 🌟"
    ],
    playful: [
      "Big energy, bold ideas, and endless possibilities! 🚀",
      "New adventures are calling — who's coming along? 🔥",
      "Let's turn ordinary moments into something unforgettable! ✨"
    ]
  }
};

let previousVariation = -1;

function getFreshVariation(type, tone) {
  const options =
    REGEN_VARIATIONS[type]?.[tone] ||
    REGEN_VARIATIONS.blog.friendly;

  let index;

  do {
    index = Math.floor(Math.random() * options.length);
  } while (index === previousVariation && options.length > 1);

  previousVariation = index;

  return options[index];
}

function createRegeneratedDraft(settings) {
  const draft = buildDraft(settings);

  const variation = getFreshVariation(
    settings.type,
    settings.tone
  );

  const paragraphs = [...draft.paras];

  if (settings.type === "email") {
    // Insert before the email sign-off.
    paragraphs.splice(
      Math.max(1, paragraphs.length - 1),
      0,
      variation
    );
  } else if (settings.type === "caption") {
    // Insert before the hashtags.
    paragraphs.splice(
      Math.max(1, paragraphs.length - 1),
      0,
      variation
    );
  } else {
    // Add an extra paragraph before the conclusion.
    paragraphs.splice(
      Math.max(1, paragraphs.length - 1),
      0,
      variation
    );
  }

  return {
    title: draft.title,
    paras: paragraphs
  };
}

/* =========================================
   MAIN DRAFT BUILDER
========================================= */

function buildDraft({
  type = "blog",
  topic = "",
  tone = "friendly",
  length = "medium"
}) {
  if (!topic.trim()) {
    return {
      title: "No topic entered",
      paras: ["Please enter a prompt to continue."]
    };
  }

  if (type === "email") {
    return createEmail(topic, tone, length);
  }

  if (type === "caption") {
    return createCaption(topic, tone, length);
  }

  return createBlog(topic, tone, length);
}

/* =========================================
   INITIALIZE WEBSITE
========================================= */

document.addEventListener("DOMContentLoaded", () => {

  const form = $("#gen-form");
  const promptInput = $("#prompt");
  const draftArea = $("#draft");
  const meta = $("#out-meta");
  const generateBtn = $("#generate-btn");
  const copyBtn = $("#copy-btn");
  const regenBtn = $("#regen-btn");
  const refineArea = $("#refine");
  const historyList = $("#history-list");
  const toast = $("#toast");

  if (!form || !promptInput || !draftArea) {
    console.error(
      "Required HTML elements are missing.",
      { form, promptInput, draftArea }
    );
    return;
  }

  let currentDraft = null;
  let currentSettings = null;
  let currentLength = "medium";
  let history = [];
  let toastTimer;

  /* ===== TOAST ===== */

  function showToast(message) {
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
      toast.classList.remove("show");
    }, 2400);
  }

  /* ===== READ SETTINGS ===== */

  function getSettings() {
    return {
      topic: promptInput.value.trim(),
      type:
        $('input[name="type"]:checked')?.value || "blog",
      tone:
        $('input[name="tone"]:checked')?.value || "friendly",
      length: currentLength
    };
  }

  /* ===== RENDER CONTENT ===== */

  function renderDraft(draft) {
    draftArea.innerHTML = "";

    const heading = document.createElement("h3");
    heading.textContent = draft.title;

    draftArea.appendChild(heading);

    draft.paras.forEach(paragraph => {
      const p = document.createElement("p");
      p.textContent = paragraph;
      draftArea.appendChild(p);
    });

    copyBtn.disabled = false;
    regenBtn.disabled = false;
    refineArea.hidden = false;

    const settings = currentSettings;

    meta.textContent =
      `${titleCase(settings.type)} · ` +
      `${titleCase(settings.tone)} · ` +
      `${titleCase(settings.length)}`;
  }

  /* ===== GET PLAIN TEXT ===== */

  function getDraftText() {
    if (!currentDraft) return "";

    return [
      currentDraft.title,
      ...currentDraft.paras
    ].join("\n\n");
  }

  /* ===== HISTORY ===== */

  function saveHistory() {
    try {
      localStorage.setItem(
        "ai-content-history",
        JSON.stringify(history)
      );
    } catch (error) {
      console.warn("History could not be saved.", error);
    }
  }

  function loadHistory() {
    try {
      const stored = JSON.parse(
        localStorage.getItem("ai-content-history") || "[]"
      );

      history = Array.isArray(stored)
        ? stored.filter(item =>
            item &&
            item.settings &&
            item.draft &&
            Array.isArray(item.draft.paras)
          ).slice(0, 8)
        : [];
    } catch {
      history = [];
    }

    renderHistory();
  }

  function addHistory(settings, draft) {
    history.unshift({
      id: Date.now() + Math.random(),
      settings: { ...settings },
      draft: {
        title: draft.title,
        paras: [...draft.paras]
      },
      date: new Date().toLocaleString()
    });

    history = history.slice(0, 8);

    saveHistory();
    renderHistory();
  }

  function renderHistory() {
    historyList.innerHTML = "";

    if (history.length === 0) {
      const li = document.createElement("li");
      li.className = "empty";
      li.textContent = "Your drafts will appear here.";
      historyList.appendChild(li);
      return;
    }

    history.forEach(item => {
      const li = document.createElement("li");
      const button = document.createElement("button");
      const label = document.createElement("span");
      const small = document.createElement("small");

      label.textContent =
        item.draft.title.length > 42
          ? item.draft.title.slice(0, 42) + "..."
          : item.draft.title;

      small.textContent =
        `${titleCase(item.settings.type)} · ${item.date}`;

      button.appendChild(label);
      button.appendChild(small);

      button.addEventListener("click", () => {
        currentSettings = { ...item.settings };
        currentDraft = {
          title: item.draft.title,
          paras: [...item.draft.paras]
        };

        promptInput.value = currentSettings.topic;
        currentLength = currentSettings.length;

        const typeRadio = $(
          `input[name="type"][value="${currentSettings.type}"]`
        );

        const toneRadio = $(
          `input[name="tone"][value="${currentSettings.tone}"]`
        );

        if (typeRadio) typeRadio.checked = true;
        if (toneRadio) toneRadio.checked = true;

        renderDraft(currentDraft);
        showToast("Draft restored");
      });

      li.appendChild(button);
      historyList.appendChild(li);
    });
  }

  /* ===== GENERATE ===== */

  function generateContent() {
    const settings = getSettings();

    if (!settings.topic) {
      showToast("Please enter a prompt");
      promptInput.focus();
      return;
    }

    currentSettings = settings;

    try {
      currentDraft = buildDraft(settings);

      renderDraft(currentDraft);
      addHistory(settings, currentDraft);

      showToast("Draft generated successfully!");
    } catch (error) {
      console.error("Generation error:", error);
      showToast("Could not generate the draft");
    }
  }

  form.addEventListener("submit", event => {
    event.preventDefault();
    generateContent();
  });

  /* ===== SUGGESTED PROMPTS ===== */

  $$("[data-prompt]").forEach(button => {
    button.addEventListener("click", () => {
      promptInput.value = button.dataset.prompt;
      promptInput.focus();
      showToast("Prompt added");
    });
  });

  /* ===== COPY ===== */

  copyBtn.addEventListener("click", async () => {
    const text = getDraftText();

    if (!text) {
      showToast("Generate content first");
      return;
    }

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";

        document.body.appendChild(textarea);
        textarea.select();

        const copied = document.execCommand("copy");
        textarea.remove();

        if (!copied) {
          throw new Error("Copy not supported");
        }
      }

      showToast("Copied to clipboard!");
    } catch (error) {
      console.error(error);
      showToast("Copy failed. Please copy manually.");
    }
  });


/* ===== FIXED REGENERATE BUTTON ===== */

regenBtn.addEventListener("click", () => {
  if (!currentSettings) {
    showToast("Generate a draft first");
    return;
  }

  try {
    // Create a fresh draft with different wording.
    currentDraft = createRegeneratedDraft(currentSettings);

    // Update the existing output panel.
    renderDraft(currentDraft);

    // Save the new version in recent drafts.
    addHistory(currentSettings, currentDraft);

    // Display success message.
    showToast("New draft generated successfully!");

  } catch (error) {
    console.error("Regeneration error:", error);
    showToast("Unable to regenerate draft");
  }
});

   /* ===== REFINE ===== */

  $$("[data-refine]").forEach(button => {
    button.addEventListener("click", () => {
      if (!currentSettings) return;

      const action = button.dataset.refine;

      if (action === "shorter") {
        currentLength = "short";
      }

      if (action === "longer") {
        currentLength = "long";
      }

      if (action === "formal") {
        const radio =
          $('input[name="tone"][value="formal"]');

        if (radio) radio.checked = true;
      }

      if (action === "friendly") {
        const radio =
          $('input[name="tone"][value="friendly"]');

        if (radio) radio.checked = true;
      }

      currentSettings = getSettings();
      currentDraft = buildDraft(currentSettings);

      renderDraft(currentDraft);
      addHistory(currentSettings, currentDraft);

      showToast("Draft refined!");
    });
  });

  /* ===== MOBILE MENU ===== */

  const burger = $("#burger");
  const links = $("#links");

  burger?.addEventListener("click", () => {
    burger.classList.toggle("open");
    links?.classList.toggle("open");
    burger.setAttribute(
      "aria-expanded",
      String(burger.classList.contains("open"))
    );
  });

  $$("#links a").forEach(link => {
    link.addEventListener("click", () => {
      burger?.classList.remove("open");
      links?.classList.remove("open");
    });
  });

  /* ===== NAVBAR SCROLL ===== */

  const nav = $("#nav");

  function updateNav() {
    nav?.classList.toggle(
      "scrolled",
      window.scrollY > 30
    );
  }

  window.addEventListener("scroll", updateNav, {
    passive: true
  });

  updateNav();

  /* ===== BACK TO TOP ===== */

  $("#toTop")?.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  });

  /* =========================================
     MOVING 3D-STYLE CANVAS BACKGROUND
  ========================================= */

  const canvas = $("#bg3d");
  const ctx = canvas?.getContext("2d");
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  if (canvas && ctx) {
    let width = 0;
    let height = 0;
    let particles = [];

    const mouse = {
      x: -1000,
      y: -1000
    };

    function resizeCanvas() {
      const ratio = Math.min(
        window.devicePixelRatio || 1,
        2
      );

      width = window.innerWidth;
      height = window.innerHeight;

      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);

      ctx.setTransform(
        ratio, 0, 0, ratio, 0, 0
      );

      createParticles();
    }

    function createParticles() {
      const count = Math.min(
        85,
        Math.max(25, Math.floor(width / 18))
      );

      particles = Array.from(
        { length: count },
        () => ({
          x: Math.random() * width,
          y: Math.random() * height,
          radius: Math.random() * 1.6 + 0.5,
          speedX: (Math.random() - 0.5) * 0.5,
          speedY: (Math.random() - 0.5) * 0.5,
          opacity: Math.random() * 0.4 + 0.15
        })
      );
    }

    function drawBackground() {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        ctx.beginPath();
        ctx.arc(
          p.x,
          p.y,
          p.radius,
          0,
          Math.PI * 2
        );

        ctx.fillStyle =
          `rgba(92,255,200,${p.opacity})`;

        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const other = particles[j];

          const dx = p.x - other.x;
          const dy = p.y - other.y;
          const distance = Math.hypot(dx, dy);

          if (distance < 130) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(other.x, other.y);

            ctx.strokeStyle =
              `rgba(122,240,224,${(1 - distance / 130) * 0.12})`;

            ctx.lineWidth = 0.7;
            ctx.stroke();
          }
        }

        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const distance = Math.hypot(dx, dy);

        if (distance < 150 && distance > 0) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouse.x, mouse.y);

          ctx.strokeStyle =
            `rgba(92,255,200,${(1 - distance / 150) * 0.2})`;

          ctx.stroke();
        }

        if (!reduceMotion) {
          p.x += p.speedX;
          p.y += p.speedY;

          if (p.x < 0 || p.x > width) {
            p.speedX *= -1;
          }

          if (p.y < 0 || p.y > height) {
            p.speedY *= -1;
          }
        }
      }

      if (!reduceMotion) {
        requestAnimationFrame(drawBackground);
      }
    }

    window.addEventListener("pointermove", event => {
      mouse.x = event.clientX;
      mouse.y = event.clientY;
    }, { passive: true });

    window.addEventListener("resize", resizeCanvas);

    resizeCanvas();
    drawBackground();
  }

  /* =========================================
     MOVING GLOWING CURSOR
  ========================================= */

  if (
    window.matchMedia("(pointer: fine)").matches &&
    !reduceMotion
  ) {
    const dot = document.createElement("div");
    const ring = document.createElement("div");
    const glow = document.createElement("div");

    dot.className = "cur";
    ring.className = "ring";
    glow.className = "glow";

    document.body.appendChild(glow);
    document.body.appendChild(ring);
    document.body.appendChild(dot);

    let mouseX = -100;
    let mouseY = -100;

    let ringX = -100;
    let ringY = -100;

    let glowX = -100;
    let glowY = -100;

    document.addEventListener("mousemove", event => {
      mouseX = event.clientX;
      mouseY = event.clientY;

      dot.style.transform =
        `translate3d(${mouseX}px,${mouseY}px,0)`;
    });

    function animateCursor() {
      ringX += (mouseX - ringX) * 0.17;
      ringY += (mouseY - ringY) * 0.17;

      glowX += (mouseX - glowX) * 0.055;
      glowY += (mouseY - glowY) * 0.055;

      ring.style.transform =
        `translate3d(${ringX}px,${ringY}px,0)`;

      glow.style.transform =
        `translate3d(${glowX}px,${glowY}px,0)`;

      requestAnimationFrame(animateCursor);
    }

    animateCursor();

    document.addEventListener("mouseover", event => {
      if (
        event.target.closest(
          "button, a, input, label"
        )
      ) {
        ring.classList.add("hov");
      } else {
        ring.classList.remove("hov");
      }
    });
  }

  /* ===== STARTUP ===== */

  loadHistory();

  console.log(
    "AI Content Generator initialized successfully."
  );
});
