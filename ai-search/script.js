/* ================= 1. Knowledge base (edit / add your own) ================= */
const KB = [
  {
    query: "how do neural networks learn",
    keywords: ["neural", "network", "networks", "learn", "backpropagation", "deep"],
    summary: "Neural networks learn by making a prediction, measuring the error with a loss function, and adjusting their weights to reduce it [1]. Backpropagation works out how much each weight contributed to the error [2], and gradient descent then nudges every weight a small step downhill [3]. Repeating this over many examples makes predictions steadily better.",
    sources: [
      { title: "Neural Networks: A Beginner's Guide", url: "learn.ai/neural-networks", snippet: "Layers, weights and activation functions explained with simple diagrams." },
      { title: "Backpropagation Step by Step", url: "ml-notes.dev/backprop", snippet: "How the error flows backward through the network to update each weight." },
      { title: "Gradient Descent Visualised", url: "visualml.io/gradient-descent", snippet: "Watch a model walk downhill toward lower loss." }
    ]
  },
  {
    query: "what is machine learning",
    keywords: ["machine", "learning", "ml", "model", "training", "data"],
    summary: "Machine learning builds software that improves from data instead of hand-written rules [1]. A model is trained on examples, finds patterns, and uses them to predict on new data [2]. The main types are supervised, unsupervised and reinforcement learning.",
    sources: [
      { title: "Machine Learning in Plain English", url: "learn.ai/ml-basics", snippet: "Supervised, unsupervised and reinforcement learning compared." },
      { title: "Training vs Testing Data", url: "ml-notes.dev/data-split", snippet: "Why you hold back data to check that a model generalises." }
    ]
  },
  {
    query: "what are html css and javascript",
    keywords: ["html", "css", "javascript", "js", "web", "frontend"],
    summary: "HTML defines the structure of a page [1], CSS controls how it looks, and JavaScript makes it interactive [2]. Together they form the front end of almost every website.",
    sources: [
      { title: "HTML, CSS and JS: How They Fit Together", url: "webdev.guide/basics", snippet: "What each language is responsible for." },
      { title: "Build Your First Interactive Page", url: "webdev.guide/first-page", snippet: "A hands-on walkthrough with a search box and live results." }
    ]
  },
  {
    query: "how does a search engine work",
    keywords: ["search", "engine", "google", "index", "crawl", "ranking"],
    summary: "A search engine crawls web pages, stores them in a large index, and ranks the matches when you search [1]. AI search adds one more step: it reads the top results and writes a short answer with citations [2].",
    sources: [
      { title: "Crawling, Indexing and Ranking", url: "seo-basics.org/how-search-works", snippet: "The three stages behind every search result." },
      { title: "What Makes AI Search Different", url: "learn.ai/ai-search", snippet: "How language models summarise results into one answer." }
    ]
  },
  {
    query: "how to plan a study week",
    keywords: ["study", "plan", "schedule", "week", "exam", "timetable"],
    summary: "List your deadlines first, then split each subject into focused blocks of 45 to 60 minutes with short breaks [1]. Put the hardest subject in your most alert hours and keep one light slot for revision [2].",
    sources: [
      { title: "Build a Weekly Study Timetable", url: "studytips.edu/timetable", snippet: "A simple template for focus blocks, breaks and revision." },
      { title: "The Pomodoro Technique", url: "studytips.edu/pomodoro", snippet: "Work in short bursts to stay focused for longer." }
    ]
  }
];

/* ================= 2. Elements & state ================= */
const form = document.getElementById("searchForm");
const input = document.getElementById("q");
const sugList = document.getElementById("suggestions");
const chipsEl = document.getElementById("chips");
const out = document.getElementById("output");

let activeIdx = -1;
let runId = 0; // cancels an older search if a new one starts

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const wait = ms => new Promise(r => setTimeout(r, reduceMotion ? 0 : ms));
const esc = s => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ================= 3. Chips (recent searches, else examples) ================= */
function getRecent() {
  try { return JSON.parse(localStorage.getItem("ai-search-recent")) || []; } catch { return []; }
}
function saveRecent(q) {
  try {
    const list = [q, ...getRecent().filter(x => x !== q)].slice(0, 4);
    localStorage.setItem("ai-search-recent", JSON.stringify(list));
  } catch { /* storage unavailable, ignore */ }
}
function renderChips() {
  const items = getRecent().length ? getRecent() : KB.slice(0, 4).map(k => k.query);
  chipsEl.innerHTML = "";
  items.forEach(text => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "chip"; b.textContent = text;
    b.addEventListener("click", () => runSearch(text));
    chipsEl.appendChild(b);
  });
}

/* ================= 4. Autocomplete ================= */
function showSuggestions() {
  const v = input.value.trim().toLowerCase();
  activeIdx = -1;
  const matches = v ? KB.filter(k => k.query.includes(v) || k.keywords.some(w => w.startsWith(v))).slice(0, 5) : [];
  if (!matches.length) { sugList.hidden = true; return; }

  sugList.innerHTML = matches.map(m => {
    const i = m.query.indexOf(v);
    const label = i >= 0
      ? esc(m.query.slice(0, i)) + "<mark>" + esc(m.query.slice(i, i + v.length)) + "</mark>" + esc(m.query.slice(i + v.length))
      : esc(m.query);
    return `<li role="option" data-q="${esc(m.query)}">${label}</li>`;
  }).join("");
  sugList.hidden = false;
}

input.addEventListener("input", showSuggestions);

input.addEventListener("keydown", e => {
  const items = [...sugList.querySelectorAll("li")];
  if (e.key === "Escape") { sugList.hidden = true; return; }
  if (!items.length || sugList.hidden) return;
  if (e.key === "ArrowDown") activeIdx = (activeIdx + 1) % items.length;
  else if (e.key === "ArrowUp") activeIdx = (activeIdx - 1 + items.length) % items.length;
  else return;
  e.preventDefault();
  items.forEach((li, i) => li.classList.toggle("active", i === activeIdx));
});

sugList.addEventListener("mousedown", e => {
  const li = e.target.closest("li");
  if (li) { e.preventDefault(); runSearch(li.dataset.q); }
});

document.addEventListener("click", e => { if (!e.target.closest(".search")) sugList.hidden = true; });

// Press "/" anywhere to jump to the search box
document.addEventListener("keydown", e => {
  if (e.key === "/" && document.activeElement !== input) { e.preventDefault(); input.focus(); }
});

form.addEventListener("submit", e => {
  e.preventDefault();
  const items = sugList.querySelectorAll("li");
  runSearch(activeIdx >= 0 && items[activeIdx] ? items[activeIdx].dataset.q : input.value);
});

/* ================= 5. Search flow ================= */
function findBest(query) {
  const q = query.toLowerCase();
  const words = q.split(/\W+/).filter(Boolean);
  let best = null, top = 0;
  KB.forEach(item => {
    let score = item.query === q ? 100 : 0;
    words.forEach(w => {
      if (item.keywords.includes(w)) score += 2;
      else if (item.query.includes(w)) score += 1;
    });
    if (score > top) { top = score; best = item; }
  });
  return top >= 2 ? best : null;
}

async function runSearch(raw) {
  const query = (raw || "").trim();
  sugList.hidden = true;
  if (!query) { out.innerHTML = '<p class="empty">Type a question to start searching.</p>'; return; }
  input.value = query;
  const id = ++runId;

  // Step 1: show progress
  const steps = ["Understanding your question", "Searching sources", "Writing the answer"];
  out.innerHTML = `<div class="status">${steps.map(s => `<div><span class="dot"></span>${s}</div>`).join("")}</div>`;
  const rows = [...out.querySelectorAll(".status div")];
  for (let i = 0; i < rows.length; i++) {
    rows[i].classList.add("on");
    await wait(420);
    if (id !== runId) return;
    rows[i].classList.replace("on", "done");
  }

  const hit = findBest(query);
  if (!hit) {
    out.innerHTML = `<p class="empty">No answer found for &ldquo;${esc(query)}&rdquo;. Try one of the example questions above.</p>`;
    return;
  }
  saveRecent(hit.query);
  renderChips();

  // Step 2: answer card, streamed word by word
  out.innerHTML = `
    <article class="answer">
      <div class="answer-head">
        <h2>Answer</h2>
        <button class="copy" type="button">Copy</button>
      </div>
      <p id="answerText" class="caret"></p>
    </article>`;
  const textEl = document.getElementById("answerText");
  const words = hit.summary.split(" ");
  for (let i = 1; i <= words.length; i++) {
    if (id !== runId) return;
    textEl.innerHTML = esc(words.slice(0, i).join(" ")).replace(/\[(\d)\]/g, "<sup>$1</sup>");
    await wait(32);
  }
  textEl.classList.remove("caret");

  out.querySelector(".copy").addEventListener("click", async e => {
    try { await navigator.clipboard.writeText(hit.summary.replace(/\s?\[\d\]/g, "")); e.target.textContent = "Copied"; }
    catch { e.target.textContent = "Copy failed"; }
    setTimeout(() => (e.target.textContent = "Copy"), 1500);
  });

  // Step 3: sources
  out.insertAdjacentHTML("beforeend", `
    <h2 class="sources-title">Sources</h2>
    <div class="sources">
      ${hit.sources.map((s, i) => `
        <div class="source" style="animation-delay:${i * 90}ms">
          <span class="n">${i + 1}</span>
          <div>
            <h3>${esc(s.title)}</h3>
            <div class="url">${esc(s.url)}</div>
            <p>${esc(s.snippet)}</p>
          </div>
        </div>`).join("")}
    </div>`);
}

renderChips();
