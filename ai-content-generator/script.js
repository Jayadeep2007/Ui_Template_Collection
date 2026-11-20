
/* ========== AI CONTENT GENERATOR ========== */

const TONES = {
  formal: {
    open: "Let's explore",
    cta: "We encourage you to explore this opportunity further.",
    sign: "Best regards,"
  },
  friendly: {
    open: "Let's talk about",
    cta: "Give it a try and share your thoughts!",
    sign: "Cheers,"
  },
  playful: {
    open: "Get ready for",
    cta: "Let's make something amazing!",
    sign: "Stay awesome,"
  }
};

const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const titleCase = s => s.replace(/\b\w/g, c => c.toUpperCase());

function cleanTopic(raw) {
  return String(raw || "")
    .trim()
    .replace(/[.!?]+$/, "")
    .replace(
      /^(please\s+)?(write|create|draft|make|compose|generate|give me)\s+(me\s+)?(a|an|the|our|my)?\s*/i,
      ""
    )
    .trim();
}

function buildDraft({ type, topic, tone, length }) {
  const t = TONES[tone] || TONES.friendly;
  const subject = cleanTopic(topic);
  const title = titleCase(subject);
  const count = { short: 1, medium: 2, long: 4 }[length] || 2;

  const ideas = [
    `${title} is an interesting subject that offers many opportunities.`,
    `Understanding ${subject} begins with learning its key concepts.`,
    `A practical approach can help you achieve better results.`,
    `Start with small steps and build your knowledge gradually.`,
    `Consistency and creativity are important for long-term success.`
  ];

  const details = ideas.slice(0, count);

  if (type === "blog") {
    return {
      title: `A Complete Guide to ${title}`,
      paras: [
        `${t.open} ${subject}.`,
        ...details,
        "By applying these ideas, you can make meaningful progress.",
        t.cta
      ]
    };
  }

  if (type === "email") {
    return {
      title: `Subject: ${title}`,
      paras: [
        "Hello,",
        `I am writing to share an update about ${subject}.`,
        ...details,
        t.cta,
        `${t.sign}\nThe Team`
      ]
    };
  }

  if (type === "caption") {
    const hashtags = subject
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 3)
      .map(w => "#" + w.replace(/[^a-zA-Z0-9]/g, ""))
      .join(" ");

    return {
      title: "Social Media Caption",
      paras: [
        `✨ ${title}!`,
        ...details.slice(0, Math.min(count, 2)),
        `${t.cta} 🚀`,
        `${hashtags} #CreativeContent #Trending`
      ]
    };
  }

  if (type === "prompt") {
    return {
      title: `AI Prompt: ${title}`,
      paras: [
        `Act as an expert content creator specializing in ${subject}.`,
        `Create a ${length} response using a ${tone} tone.`,
        `Topic: ${subject}`,
        "Include a compelling introduction, useful information, practical examples, and a clear conclusion.",
        "Make the content original, well-structured, and easy to understand."
      ]
    };
  }

  return {
    title,
    paras: details
  };
}

/* ========== CONNECT TO HTML ========== */

document.addEventListener("DOMContentLoaded", () => {

  function find(...selectors) {
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el) return el;
    }
    return null;
  }

  const topicInput = find(
    "#topic",
    "#topicInput",
    "#prompt",
    "#promptInput",
    "textarea[name='topic']",
    "input[name='topic']",
    "textarea[name='prompt']"
  );

  const typeInput = find(
    "#type",
    "#contentType",
    "[name='type']",
    "[name='contentType']"
  );

  const toneInput = find(
    "#tone",
    "[name='tone']"
  );

  const lengthInput = find(
    "#length",
    "[name='length']"
  );

  const output = find(
    "#output",
    "#result",
    "#generatedContent",
    "#outputText",
    ".output-content",
    ".generated-content"
  );

  const generateBtn = find(
    "#generateBtn",
    "#generate",
    "#generateButton",
    "[data-action='generate']"
  );

  const copyBtn = find(
    "#copyBtn",
    "#copy",
    "[data-action='copy']"
  );

  const downloadBtn = find(
    "#downloadBtn",
    "#download",
    "[data-action='download']"
  );

  let generatedText = "";

  function getValue(el, fallback) {
    if (!el) return fallback;

    if (el.matches("input, select, textarea")) {
      return el.value || fallback;
    }

    return el.dataset.value || fallback;
  }

function showOutput(text) {
  let resultArea =
    document.querySelector("#output") ||
    document.querySelector("#result") ||
    document.querySelector("#generatedContent") ||
    document.querySelector("#outputText") ||
    document.querySelector("#resultText") ||
    document.querySelector("#preview") ||
    document.querySelector(".output-content") ||
    document.querySelector(".generated-content") ||
    document.querySelector(".result-content") ||
    document.querySelector("[data-output]");

  // Create an output area if none exists
  if (!resultArea) {
    resultArea = document.createElement("div");
    resultArea.id = "generatedContent";

    resultArea.style.cssText = `
      margin: 24px auto;
      padding: 25px;
      max-width: 900px;
      background: rgba(30, 25, 50, 0.92);
      color: #ffffff;
      border: 1px solid rgba(168, 85, 247, 0.5);
      border-radius: 16px;
      font-size: 16px;
      line-height: 1.8;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      box-shadow: 0 10px 35px rgba(0, 0, 0, 0.2);
    `;

    const generateButton =
      document.querySelector("#generateBtn") ||
      document.querySelector("#generate") ||
      document.querySelector("#generateButton") ||
      document.querySelector("[data-action='generate']");

    if (generateButton) {
      generateButton.insertAdjacentElement(
        "afterend",
        resultArea
      );
    } else {
      document.body.appendChild(resultArea);
    }
  }

  // Display generated content
  if (
    resultArea.tagName === "TEXTAREA" ||
    resultArea.tagName === "INPUT"
  ) {
    resultArea.value = text;
  } else {
    resultArea.textContent = text;
    resultArea.style.whiteSpace = "pre-wrap";
  }

  resultArea.scrollIntoView({
    behavior: "smooth",
    block: "nearest"
  });

  console.log("Content generated successfully!");
}

  function generateContent(event) {
    if (event) event.preventDefault();

    const topic = getValue(topicInput, "").trim();

    if (!topic) {
      alert("Please enter a topic or prompt.");
      topicInput?.focus();
      return;
    }

    const type = getValue(typeInput, "blog").toLowerCase();
    const tone = getValue(toneInput, "friendly").toLowerCase();
    const length = getValue(lengthInput, "medium").toLowerCase();

    const draft = buildDraft({
      type,
      topic,
      tone,
      length
    });

    generatedText = [
      draft.title,
      "",
      ...draft.paras
    ].join("\n\n");

    showOutput(generatedText);
  }

  /* Generate button */
  if (generateBtn) {
    generateBtn.addEventListener("click", generateContent);
  } else {
    console.warn("Generate button not found.");
  }

  /* Support form submission */
  const form = topicInput?.closest("form");

  if (form && (!generateBtn || !form.contains(generateBtn))) {
    form.addEventListener("submit", generateContent);
  }

  /* Copy content */
  copyBtn?.addEventListener("click", async () => {
    if (!generatedText) {
      alert("Generate content first.");
      return;
    }

    try {
      await navigator.clipboard.writeText(generatedText);
      alert("Content copied successfully!");
    } catch {
      alert("Copy failed. Please select and copy the text.");
    }
  });

  /* Download content */
  downloadBtn?.addEventListener("click", () => {
    if (!generatedText) {
      alert("Generate content first.");
      return;
    }

    const blob = new Blob([generatedText], {
      type: "text/plain;charset=utf-8"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "generated-content.txt";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  });

  /* ========== MOVING BACKGROUND ========== */

  const style = document.createElement("style");

  style.textContent = `
    @keyframes floatingBackground {
      0%, 100% {
        transform: translate(0, 0) scale(1);
      }
      50% {
        transform: translate(45px, -55px) scale(1.12);
      }
    }

    .ai-orb {
      position: fixed;
      border-radius: 50%;
      filter: blur(75px);
      opacity: 0.25;
      pointer-events: none;
      z-index: -1;
      animation: floatingBackground 14s ease-in-out infinite;
    }

    .ai-cursor {
      position: fixed;
      width: 24px;
      height: 24px;
      border: 2px solid #a78bfa;
      border-radius: 50%;
      pointer-events: none;
      z-index: 99999;
      transform: translate(-50%, -50%);
      box-shadow: 0 0 18px #a78bfa88;
    }

    .ai-cursor-dot {
      position: fixed;
      width: 6px;
      height: 6px;
      background: #c4b5fd;
      border-radius: 50%;
      pointer-events: none;
      z-index: 100000;
      transform: translate(-50%, -50%);
    }

    @media (pointer: coarse) {
      .ai-cursor, .ai-cursor-dot {
        display: none;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .ai-orb {
        animation: none;
      }
    }
  `;

  document.head.appendChild(style);

  const colors = [
    "rgba(168,85,247,0.5)",
    "rgba(236,72,153,0.4)",
    "rgba(99,102,241,0.4)"
  ];

  colors.forEach((color, i) => {
    const orb = document.createElement("div");
    orb.className = "ai-orb";

    orb.style.width = `${250 + i * 80}px`;
    orb.style.height = `${250 + i * 80}px`;
    orb.style.background = color;
    orb.style.top = `${i * 30}%`;
    orb.style.left = `${i * 28}%`;
    orb.style.animationDelay = `${-i * 4}s`;

    document.body.appendChild(orb);
  });

  /* ========== GLOWING CURSOR ========== */

  if (window.matchMedia("(pointer: fine)").matches) {
    const cursor = document.createElement("div");
    const dot = document.createElement("div");

    cursor.className = "ai-cursor";
    dot.className = "ai-cursor-dot";

    document.body.appendChild(cursor);
    document.body.appendChild(dot);

    let mouseX = -100;
    let mouseY = -100;
    let cursorX = -100;
    let cursorY = -100;

    document.addEventListener("mousemove", e => {
      mouseX = e.clientX;
      mouseY = e.clientY;

      dot.style.left = `${mouseX}px`;
      dot.style.top = `${mouseY}px`;
    });

    function animateCursor() {
      cursorX += (mouseX - cursorX) * 0.15;
      cursorY += (mouseY - cursorY) * 0.15;

      cursor.style.left = `${cursorX}px`;
      cursor.style.top = `${cursorY}px`;

      requestAnimationFrame(animateCursor);
    }

    animateCursor();
  }

  console.log("AI Content Generator JavaScript loaded.");
});
