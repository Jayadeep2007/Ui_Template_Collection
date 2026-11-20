
"use strict";

/* ==========================================
   AI CONTENT GENERATOR - COMPLETE SCRIPT
   Compatible with your existing HTML + CSS
========================================== */

document.addEventListener("DOMContentLoaded", () => {

  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];

  const form = $("#gen-form");
  const promptInput = $("#prompt");
  const draftArea = $("#draft");
  const meta = $("#out-meta");
  const copyBtn = $("#copy-btn");
  const regenBtn = $("#regen-btn");
  const refineArea = $("#refine");
  const historyList = $("#history-list");
  const toast = $("#toast");

  if (!form || !promptInput || !draftArea) {
    console.error("Generator HTML elements not found.");
    return;
  }

  let currentDraft = null;
  let currentSettings = null;
  let currentLength = "medium";
  let history = [];
  let version = 0;
  let toastTimer = null;

  const STORAGE_KEY = "deep-lagoon-drafts-v2";

  /* ==========================================
     HELPERS
  ========================================== */

  function titleCase(value) {
    return String(value).replace(
      /\b[a-z]/g,
      char => char.toUpperCase()
    );
  }

  function cleanTopic(value) {
    let text = String(value || "").trim();

    text = text.replace(/[.!?]+$/, "");

    text = text.replace(
      /^(please\s+)?(write|create|draft|make|compose|generate|give me)\s+(me\s+)?/i,
      ""
    );

    text = text.replace(
      /^(a|an|the|my|our)\s+(blog post|blog|email|caption|social media post|instagram post|article|post)\s+(about|on|for|regarding|to)?\s*/i,
      ""
    );

    return text.trim() || String(value).trim();
  }

  function detectIntent(value) {
    const text = value.toLowerCase();

    if (/\b(apologize|apology|sorry|regret)\b/.test(text)) {
      return "apology";
    }

    if (/\b(leave|absence|day off|sick)\b/.test(text)) {
      return "leave";
    }

    if (/\b(workshop|seminar|webinar|event|invite|invitation)\b/.test(text)) {
      return "event";
    }

    if (/\b(launch|introduce|new app|new product|opening)\b/.test(text)) {
      return "launch";
    }

    if (/\b(thank|gratitude|appreciation)\b/.test(text)) {
      return "thanks";
    }

    if (/\b(guide|how to|steps|tutorial)\b/.test(text)) {
      return "guide";
    }

    return "general";
  }

  function showToast(message) {
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
      toast.classList.remove("show");
    }, 2200);
  }

  function getSettings() {
    return {
      topic: promptInput.value.trim(),
      type: $('input[name="type"]:checked')?.value || "blog",
      tone: $('input[name="tone"]:checked')?.value || "friendly",
      length: currentLength
    };
  }

  /* ==========================================
     CONTENT VARIATIONS
     Each version rotates through different
     structures and wording.
  ========================================== */

  const blogStyles = [
    {
      label: "Practical Guide",
      intro: topic =>
        `Understanding ${topic} starts with a clear goal and a practical approach. Rather than trying to do everything at once, it helps to identify the most important steps and work through them carefully.`,
      sections: [
        {
          heading: "Why It Matters",
          body: topic =>
            `${titleCase(topic)} can be explored by considering its purpose, its audience, and the results people hope to achieve. These factors help determine which ideas deserve attention.`
        },
        {
          heading: "Getting Started",
          body: topic =>
            `Begin by defining what you want to accomplish with ${topic}. Gather relevant information, identify available resources, and create a simple action plan.`
        },
        {
          heading: "Practical Strategies",
          body: topic =>
            `Break ${topic} into manageable tasks. Prioritize useful actions, monitor progress, and make improvements based on feedback.`
        },
        {
          heading: "Measuring Progress",
          body: topic =>
            `Review the results of your work on ${topic}. Compare them with your original goals and decide what needs to change.`
        }
      ],
      ending:
        "The most effective starting point is a clear objective followed by consistent, manageable action."
    },
    {
      label: "Creative Perspective",
      intro: topic =>
        `What if we explored ${topic} from a completely different angle? Fresh perspectives can reveal possibilities that are easy to overlook when we follow the same routine.`,
      sections: [
        {
          heading: "A Fresh Way to Think",
          body: topic =>
            `Instead of focusing only on familiar approaches to ${topic}, ask what could be simplified, redesigned, or improved. New questions often lead to useful ideas.`
        },
        {
          heading: "Exploring Possibilities",
          body: topic =>
            `Consider several approaches to ${topic}. Compare their strengths, identify possible limitations, and look for opportunities to combine useful ideas.`
        },
        {
          heading: "Turning Ideas Into Action",
          body: topic =>
            `Choose one promising idea related to ${topic} and test it on a small scale. Learn from the result before investing additional time or resources.`
        },
        {
          heading: "Keeping the Momentum",
          body: topic =>
            `Continue exploring ${topic} by collecting feedback, documenting discoveries, and experimenting with thoughtful improvements.`
        }
      ],
      ending:
        "Creativity becomes more valuable when imaginative thinking is combined with thoughtful execution."
    },
    {
      label: "Professional Analysis",
      intro: topic =>
        `${titleCase(topic)} can be examined through its objectives, operational considerations, and potential outcomes. A structured analysis helps establish priorities and support informed decisions.`,
      sections: [
        {
          heading: "Overview",
          body: topic =>
            `A useful assessment of ${topic} begins by defining its scope. Identify the relevant participants, expectations, and factors that may influence the outcome.`
        },
        {
          heading: "Key Considerations",
          body: topic =>
            `Evaluate the resources, constraints, and opportunities associated with ${topic}. Clear criteria make it easier to compare possible approaches.`
        },
        {
          heading: "Implementation",
          body: topic =>
            `Develop a realistic plan for ${topic}, assign responsibilities where appropriate, and establish milestones for reviewing progress.`
        },
        {
          heading: "Evaluation",
          body: topic =>
            `Assess ${topic} using relevant evidence and measurable outcomes. Use the findings to refine the strategy and address emerging challenges.`
        }
      ],
      ending:
        "Clear planning, effective communication, and regular evaluation provide a strong foundation for improvement."
    },
    {
      label: "Engaging Discussion",
      intro: topic =>
        `Why is everyone interested in ${topic}? The answer depends on what people want to learn, solve, or experience. Exploring these questions can make the subject more meaningful.`,
      sections: [
        {
          heading: "The Big Question",
          body: topic =>
            `Think about what makes ${topic} relevant to your audience. Which challenges, interests, or goals are most closely connected to it?`
        },
        {
          heading: "Looking at Different Views",
          body: topic =>
            `People may approach ${topic} with different expectations. Understanding those perspectives can help you communicate ideas more clearly.`
        },
        {
          heading: "Making It Relevant",
          body: topic =>
            `Connect ${topic} to realistic situations. Use clear examples, invite questions, and encourage your audience to consider practical applications.`
        },
        {
          heading: "Continuing the Conversation",
          body: topic =>
            `Encourage feedback about ${topic}. Thoughtful discussion can reveal new questions and help identify useful next steps.`
        }
      ],
      ending:
        "The best conversations begin with curiosity and continue through thoughtful questions and shared ideas."
    }
  ];

  const emailVariations = {
    general: [
      [
        "I wanted to reach out regarding {topic}.",
        "I would appreciate the opportunity to discuss this further and explore suitable next steps.",
        "Please share your thoughts whenever convenient."
      ],
      [
        "I am contacting you to share an update about {topic}.",
        "I believe a brief discussion would help clarify expectations and identify the most appropriate approach.",
        "I look forward to hearing your feedback."
      ],
      [
        "I hope you are doing well. I would like to bring {topic} to your attention.",
        "Your input would be valuable as we consider the available options.",
        "Please let me know how you would prefer to proceed."
      ],
      [
        "I would like to start a conversation about {topic}.",
        "It would be helpful to review the relevant details and agree on a practical way forward.",
        "Thank you for taking the time to consider this."
      ]
    ],
    leave: [
      [
        "I am writing to request leave for dates that I will confirm with you.",
        "I will make arrangements to address any pending responsibilities before my absence.",
        "Please let me know whether my request can be approved."
      ],
      [
        "I would like to seek your approval for a period of leave.",
        "I will coordinate a suitable handover and ensure important work is communicated in advance.",
        "Thank you for considering my request."
      ],
      [
        "I am requesting time away from my regular responsibilities.",
        "I would be happy to discuss the dates and any arrangements needed to minimize disruption.",
        "I appreciate your understanding."
      ],
      [
        "I would like to discuss an upcoming leave request.",
        "Please advise me on the approval process and any information you require.",
        "I will ensure that necessary preparations are completed beforehand."
      ]
    ],
    event: [
      [
        "We are delighted to invite you to {topic}.",
        "This event offers an opportunity to connect, exchange ideas, and learn together.",
        "We hope you will be able to join us."
      ],
      [
        "We are pleased to announce {topic}.",
        "Participants can look forward to a welcoming environment for learning and discussion.",
        "We would be happy to have you take part."
      ],
      [
        "You are warmly invited to {topic}.",
        "The event is designed to encourage participation, conversation, and the sharing of useful insights.",
        "We look forward to seeing you there."
      ],
      [
        "We would love for you to join us for {topic}.",
        "It is an opportunity to meet others, explore new ideas, and take part in meaningful activities.",
        "Further details will be shared when confirmed."
      ]
    ],
    launch: [
      [
        "We are excited to introduce {topic}.",
        "Our goal is to create an experience that is useful, approachable, and thoughtfully designed.",
        "We invite you to explore the announcement and share your thoughts."
      ],
      [
        "We have something new to share: {topic}.",
        "This introduction marks an opportunity to connect with our audience and learn from their feedback.",
        "We look forward to sharing further updates."
      ],
      [
        "We are pleased to announce {topic}.",
        "We are preparing additional information to help people understand the idea and what to expect.",
        "Thank you for your interest and support."
      ],
      [
        "The next chapter begins with {topic}.",
        "We are looking forward to introducing the concept and hearing what matters most to our community.",
        "Stay tuned for more details."
      ]
    ],
    apology: [
      [
        "I would like to sincerely apologize regarding {topic}.",
        "I understand that the situation may have caused inconvenience.",
        "I appreciate your patience and will work toward an appropriate resolution."
      ],
      [
        "Please accept my apologies concerning {topic}.",
        "I recognize the importance of addressing this matter carefully.",
        "I will communicate any relevant updates as they become available."
      ],
      [
        "I am sorry about the situation involving {topic}.",
        "I understand your concerns and appreciate the opportunity to address them.",
        "Thank you for your understanding."
      ],
      [
        "I would like to express my regret regarding {topic}.",
        "I take the matter seriously and will review the next steps.",
        "Please let me know if further discussion would be helpful."
      ]
    ],
    thanks: [
      [
        "Thank you for your contribution regarding {topic}.",
        "Your time and effort are genuinely appreciated.",
        "I look forward to continuing our positive collaboration."
      ],
      [
        "I wanted to express my gratitude regarding {topic}.",
        "Your support has been valuable and meaningful.",
        "Thank you once again."
      ],
      [
        "Please accept my sincere thanks concerning {topic}.",
        "I appreciate the thought and effort involved.",
        "Your contribution means a great deal."
      ],
      [
        "I am grateful for your help regarding {topic}.",
        "Your willingness to contribute is sincerely appreciated.",
        "I hope we can continue working together."
      ]
    ]
  };

  const captionHooks = {
    formal: [
      "A new perspective on {topic}.",
      "Discover what makes {topic} worth exploring.",
      "Introducing a conversation about {topic}.",
      "Explore fresh possibilities with {topic}."
    ],
    friendly: [
      "Something exciting is happening with {topic}! ✨",
      "Let's talk about {topic}! 💚",
      "Here's a little inspiration for your day: {topic}! 🌟",
      "We have something to share about {topic}! 💫"
    ],
    playful: [
      "Big energy! 🚀 It's time for {topic}!",
      "Guess what's on our minds? 👀 {topic}!",
      "New vibes unlocked! 🔥 {topic}!",
      "Ready for something awesome? ✨ {topic}!"
    ]
  };

  const captionBodies = [
    "We're excited to explore new ideas, share useful insights, and hear what you think.",
    "Every new idea starts with curiosity. Here's to learning, creating, and trying something different.",
    "There's always another perspective to discover. Let's keep the conversation going.",
    "Fresh possibilities are worth exploring, especially when we share the journey with others."
  ];

  const captionClosings = [
    "What do you think? Tell us below! 💬",
    "Share your favorite idea in the comments! ✨",
    "Who's ready to explore? 🙌",
    "Let's hear your thoughts! 💚"
  ];

  function replaceTopic(text, topic) {
    return text.replace(/\{topic\}/g, topic);
  }

  /* ==========================================
     GENERATE BLOG
  ========================================== */

  function createBlog(settings, index) {
    const topic = cleanTopic(settings.topic);
    const style = blogStyles[index % blogStyles.length];

    const titles = [
      `A Practical Guide to ${titleCase(topic)}`,
      `Exploring ${titleCase(topic)} From a Fresh Perspective`,
      `Understanding ${titleCase(topic)}: Key Considerations`,
      `${titleCase(topic)}: Ideas Worth Discussing`
    ];

    const count = {
      short: 1,
      medium: 2,
      long: 4
    }[settings.length] || 2;

    const paragraphs = [style.intro(topic)];

    style.sections.slice(0, count).forEach(section => {
      paragraphs.push(
        `${section.heading}\n${section.body(topic)}`
      );
    });

    paragraphs.push(
      `Final Thoughts\n${style.ending}`
    );

    return {
      title: titles[index % titles.length],
      paras: paragraphs
    };
  }

  /* ==========================================
     GENERATE EMAIL
  ========================================== */

  function createEmail(settings, index) {
    const topic = cleanTopic(settings.topic);
    const intent = detectIntent(settings.topic);

    const options =
      emailVariations[intent] ||
      emailVariations.general;

    const selected = options[index % options.length];

    const greetings = {
      formal: "Dear Team,",
      friendly: "Hi there,",
      playful: "Hey everyone!"
    };

    const signatures = {
      formal: "Best regards,",
      friendly: "Cheers,",
      playful: "Stay awesome,"
    };

    const subjects = {
      leave: "Request for Leave",
      apology: "Apology and Follow-Up",
      thanks: "Thank You",
      event: `Invitation: ${titleCase(topic)}`,
      launch: `Introducing ${titleCase(topic)}`,
      general: titleCase(topic)
    };

    const paragraphs = [
      greetings[settings.tone] || greetings.friendly
    ];

    const bodyCount = {
      short: 2,
      medium: 3,
      long: 3
    }[settings.length] || 3;

    selected.slice(0, bodyCount).forEach(line => {
      paragraphs.push(replaceTopic(line, topic));
    });

    if (settings.length === "long") {
      paragraphs.push(
        "Please let me know if you would like to discuss this further or if any additional information would be helpful."
      );
    }

    paragraphs.push(
      `${signatures[settings.tone] || signatures.friendly}\n[Your Name]`
    );

    return {
      title: `Subject: ${subjects[intent] || subjects.general}`,
      paras: paragraphs
    };
  }

  /* ==========================================
     GENERATE CAPTION
  ========================================== */

  function createCaption(settings, index) {
    const topic = cleanTopic(settings.topic);

    const hooks =
      captionHooks[settings.tone] ||
      captionHooks.friendly;

    const hook = hooks[index % hooks.length];
    const body = captionBodies[index % captionBodies.length];
    const closing =
      captionClosings[index % captionClosings.length];

    const hashtags = topic
      .split(/\s+/)
      .map(word => word.replace(/[^a-zA-Z0-9]/g, ""))
      .filter(word => word.length > 2)
      .slice(0, 3)
      .map(word => "#" + titleCase(word))
      .join(" ");

    const paragraphs = [
      replaceTopic(hook, topic)
    ];

    if (settings.length !== "short") {
      paragraphs.push(body);
    }

    if (settings.length === "long") {
      paragraphs.push(
        `Whether you're discovering ${topic} for the first time or already interested, we'd love to hear your perspective.`
      );
    }

    paragraphs.push(closing);
    paragraphs.push(
      `${hashtags} #CreativeContent #ExploreMore`
    );

    return {
      title: "Social Media Caption",
      paras: paragraphs
    };
  }

  /* ==========================================
     MAIN DRAFT GENERATOR
  ========================================== */

  function buildDraft(settings, index = 0) {
    if (settings.type === "email") {
      return createEmail(settings, index);
    }

    if (settings.type === "caption") {
      return createCaption(settings, index);
    }

    return createBlog(settings, index);
  }

  /* ==========================================
     RENDER DRAFT IN EXISTING OUTPUT PANEL
  ========================================== */

  function renderDraft(draft) {
    draftArea.replaceChildren();

    const heading = document.createElement("h3");
    heading.textContent = draft.title;
    draftArea.appendChild(heading);

    draft.paras.forEach(text => {
      const paragraph = document.createElement("p");
      paragraph.textContent = text;
      draftArea.appendChild(paragraph);
    });

    draftArea.classList.remove("writing");

    if (copyBtn) copyBtn.disabled = false;
    if (regenBtn) regenBtn.disabled = false;
    if (refineArea) refineArea.hidden = false;

    if (meta && currentSettings) {
      meta.textContent =
        `${titleCase(currentSettings.type)} · ` +
        `${titleCase(currentSettings.tone)} · ` +
        `${titleCase(currentSettings.length)} · ` +
        `Version ${version + 1}`;
    }
  }

  function getDraftText() {
    if (!currentDraft) return "";

    return [
      currentDraft.title,
      ...currentDraft.paras
    ].join("\n\n");
  }

  /* ==========================================
     RECENT DRAFTS
  ========================================== */

  function saveHistory() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(history)
      );
    } catch (error) {
      console.warn("Unable to save history:", error);
    }
  }

  function renderHistory() {
    if (!historyList) return;

    historyList.replaceChildren();

    if (history.length === 0) {
      const empty = document.createElement("li");
      empty.className = "empty";
      empty.textContent = "Your drafts will appear here.";
      historyList.appendChild(empty);
      return;
    }

    history.forEach(item => {
      const li = document.createElement("li");
      const button = document.createElement("button");
      const title = document.createElement("span");
      const small = document.createElement("small");

      title.textContent =
        item.draft.title.length > 42
          ? item.draft.title.slice(0, 42) + "..."
          : item.draft.title;

      small.textContent =
        `${titleCase(item.settings.type)} · ${item.date}`;

      button.appendChild(title);
      button.appendChild(small);

      button.addEventListener("click", () => {
        currentSettings = { ...item.settings };
        currentDraft = {
          title: item.draft.title,
          paras: [...item.draft.paras]
        };

        version = Number(item.version) || 0;
        currentLength = currentSettings.length;

        promptInput.value = currentSettings.topic;

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

  function addHistory() {
    if (!currentDraft || !currentSettings) return;

    history.unshift({
      id: Date.now() + Math.random(),
      version,
      settings: { ...currentSettings },
      draft: {
        title: currentDraft.title,
        paras: [...currentDraft.paras]
      },
      date: new Date().toLocaleString()
    });

    history = history.slice(0, 8);
    saveHistory();
    renderHistory();
  }

  function loadHistory() {
    try {
      const stored = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || "[]"
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

  /* ==========================================
     GENERATE BUTTON
  ========================================== */

  form.addEventListener("submit", event => {
    event.preventDefault();

    const settings = getSettings();

    if (!settings.topic) {
      showToast("Please enter a prompt");
      promptInput.focus();
      return;
    }

    try {
      currentSettings = settings;
      version = 0;

      currentDraft = buildDraft(currentSettings, version);

      renderDraft(currentDraft);
      addHistory();

      showToast("Draft generated successfully!");
    } catch (error) {
      console.error("Generation error:", error);
      showToast("Unable to generate draft");
    }
  });

  /* ==========================================
     REGENERATE BUTTON - FIXED
     Changes actual draft content
  ========================================== */

  regenBtn?.addEventListener("click", () => {
    if (!currentSettings) {
      showToast("Generate a draft first");
      return;
    }

    try {
      const previousText = getDraftText();

      // Move to the next variation.
      version++;

      let nextDraft = buildDraft(currentSettings, version);

      // Verify that content actually changes.
      let attempts = 0;

      while (
        [
          nextDraft.title,
          ...nextDraft.paras
        ].join("\n\n") === previousText &&
        attempts < 8
      ) {
        version++;
        nextDraft = buildDraft(currentSettings, version);
        attempts++;
      }

      const nextText = [
        nextDraft.title,
        ...nextDraft.paras
      ].join("\n\n");

      if (nextText === previousText) {
        showToast("No additional variation available");
        return;
      }

      currentDraft = nextDraft;

      // Replace the existing content in #draft.
      renderDraft(currentDraft);

      // Save the new version to Recent Drafts.
      addHistory();

      showToast(
        `Draft regenerated - Version ${version + 1}`
      );

    } catch (error) {
      console.error("Regeneration error:", error);
      showToast("Unable to regenerate draft");
    }
  });

  /* ==========================================
     REFINE BUTTONS
  ========================================== */

  $$("[data-refine]").forEach(button => {
    button.addEventListener("click", () => {
      if (!currentSettings) {
        showToast("Generate a draft first");
        return;
      }

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

      version++;
      currentDraft = buildDraft(currentSettings, version);

      renderDraft(currentDraft);
      addHistory();

      showToast("Draft refined successfully!");
    });
  });

  /* ==========================================
     SUGGESTED PROMPTS
  ========================================== */

  $$("[data-prompt]").forEach(button => {
    button.addEventListener("click", () => {
      promptInput.value = button.dataset.prompt || "";
      promptInput.focus();
      showToast("Prompt added");
    });
  });

  /* ==========================================
     COPY BUTTON
  ========================================== */

  copyBtn?.addEventListener("click", async () => {
    const text = getDraftText();

    if (!text) {
      showToast("Generate a draft first");
      return;
    }

    try {
      if (
        navigator.clipboard &&
        window.isSecureContext
      ) {
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
          throw new Error("Copy failed");
        }
      }

      showToast("Content copied successfully!");
    } catch (error) {
      console.error("Copy error:", error);
      showToast("Copy failed. Please copy manually.");
    }
  });

  /* ==========================================
     NAVIGATION + MOBILE MENU
  ========================================== */

  const nav = $("#nav");
  const burger = $("#burger");
  const links = $("#links");

  function updateNavbar() {
    nav?.classList.toggle(
      "scrolled",
      window.scrollY > 30
    );
  }

  window.addEventListener("scroll", updateNavbar, {
    passive: true
  });

  updateNavbar();

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

  $("#toTop")?.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  });

  /* ==========================================
     MOVING CANVAS BACKGROUND
  ========================================== */

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
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          opacity: Math.random() * 0.4 + 0.15
        })
      );
    }

    function resizeCanvas() {
      const ratio = Math.min(
        window.devicePixelRatio || 1,
        2
      );

      width = window.innerWidth;
      height = window.innerHeight;

      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);

      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

      createParticles();
    }

    function drawBackground() {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(92,255,200,${p.opacity})`;
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const other = particles[j];

          const distance = Math.hypot(
            p.x - other.x,
            p.y - other.y
          );

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

        const distanceToMouse = Math.hypot(
          p.x - mouse.x,
          p.y - mouse.y
        );

        if (distanceToMouse < 150) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouse.x, mouse.y);

          ctx.strokeStyle =
            `rgba(92,255,200,${(1 - distanceToMouse / 150) * 0.2})`;

          ctx.stroke();
        }

        if (!reduceMotion) {
          p.x += p.vx;
          p.y += p.vy;

          if (p.x < 0 || p.x > width) p.vx *= -1;
          if (p.y < 0 || p.y > height) p.vy *= -1;
        }
      }

      if (!reduceMotion) {
        requestAnimationFrame(drawBackground);
      }
    }

    window.addEventListener(
      "pointermove",
      event => {
        mouse.x = event.clientX;
        mouse.y = event.clientY;
      },
      { passive: true }
    );

    window.addEventListener("resize", resizeCanvas);

    resizeCanvas();
    drawBackground();
  }

  /* ==========================================
     MOVING GLOWING CURSOR
  ========================================== */

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
      ring.classList.toggle(
        "hov",
        Boolean(
          event.target.closest("button, a, input, label")
        )
      );
    });
  }

  /* ==========================================
     STARTUP
  ========================================== */

  loadHistory();

  console.log(
    "AI Content Generator loaded successfully."
  );

});
