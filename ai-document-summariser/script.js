const $ = id => document.getElementById(id);
const doc = $('doc'), view = $('view');
let n = 4;          // how many sentences to keep
let tab = 'summary';
let result = null;

const STOP = new Set('the a an and or but of to in on for with is are was were be been it its this that these those as at by from not have has had will would can could should may more most also than then there their they we you our your he she his her which who what when where how into about over after before such'.split(' '));

const SAMPLE = `AI interfaces are changing how people use software. Instead of clicking through menus, users now describe what they want in plain language. This shift makes software easier to learn, because the interface adapts to the person instead of the other way around. However, good AI interfaces still need clear design. Users must understand what the system can do, and they need to trust the results it produces. Designers are therefore building prompt suggestions, response cards and visible sources into their products. Search is one area that changed quickly, with summaries now appearing above the usual list of links. Document tools follow the same idea by turning long reports into short summaries and key points. Teams that adopt these tools save time, but they should always review important details themselves.`;

// ---------- Helpers ----------
const words = t => t.toLowerCase().match(/[a-z']{3,}/g) || [];
const countWords = t => (t.trim().match(/\S+/g) || []).length;
const sentences = t => t.replace(/\s+/g, ' ').trim().match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [];

function el(tag, text, cls) {
  const e = document.createElement(tag);
  if (text) e.textContent = text;
  if (cls) e.className = cls;
  return e;
}

// ---------- The "AI": simple extractive summarizer ----------
function analyze(text, k) {
  // 1. count how often each meaningful word appears
  const freq = {};
  words(text).filter(w => !STOP.has(w)).forEach(w => (freq[w] = (freq[w] || 0) + 1));

  // 2. score every sentence by the words it contains
  const list = sentences(text).map((s, i) => {
    const w = words(s).filter(x => !STOP.has(x));
    const score = w.reduce((sum, x) => sum + freq[x], 0) / Math.sqrt(w.length || 1);
    return { s: s.trim(), i, score };
  });

  // 3. keep the best k sentences, back in their original order
  const best = [...list].sort((a, b) => b.score - a.score).slice(0, k);
  const ordered = [...best].sort((a, b) => a.i - b.i);
  const keywords = Object.keys(freq).sort((a, b) => freq[b] - freq[a]).slice(0, 5);

  return {
    summary: ordered.map(o => o.s).join(' '),
    points: best.slice(0, 4).map(o => o.s.length > 130 ? o.s.slice(0, 127) + '…' : o.s),
    keywords,
    recs: [
      `Read the parts about "${keywords[0]}" first, since they carry the most weight.`,
      `Check how "${keywords[1] || keywords[0]}" and "${keywords[2] || keywords[0]}" connect before acting on this.`,
      'Share the summary with others and keep the full document for details.'
    ]
  };
}

// ---------- Show the result ----------
function render() {
  view.replaceChildren();
  if (!result) return view.append(el('p', 'Your summary will appear here.', 'empty'));

  if (tab === 'summary') view.append(el('p', result.summary));

  if (tab === 'points') {
    const chips = el('div', '', 'chips');
    result.keywords.forEach(k => chips.append(el('span', k)));
    const ul = el('ul');
    result.points.forEach(p => ul.append(el('li', p)));
    view.append(chips, ul);
  }

  if (tab === 'recs') {
    const ol = el('ol');
    result.recs.forEach(r => ol.append(el('li', r)));
    view.append(ol);
  }
}

function summarize() {
  const text = doc.value.trim();
  if (countWords(text) < 30) {
    result = null;
    view.replaceChildren(el('p', 'Please add at least 30 words so there is something to summarize.', 'empty'));
    return;
  }

  // Loading skeleton makes it feel like the AI is thinking
  view.replaceChildren(...[95, 100, 80, 90, 60].map(w => { const d = el('div', '', 'sk'); d.style.width = w + '%'; return d; }));

  setTimeout(() => {
    result = analyze(text, n);
    const a = countWords(text), b = countWords(result.summary);
    $('s1').textContent = a;
    $('s2').textContent = b;
    $('s3').textContent = Math.max(0, Math.round((1 - b / a) * 100)) + '%';
    render();
  }, 800);
}

// ---------- Events ----------
doc.addEventListener('input', () => ($('count').textContent = countWords(doc.value) + ' words'));
$('go').addEventListener('click', summarize);

$('sample').addEventListener('click', () => { doc.value = SAMPLE; doc.dispatchEvent(new Event('input')); });
$('clear').addEventListener('click', () => {
  doc.value = ''; result = null;
  ['s1', 's2'].forEach(id => ($(id).textContent = '0')); $('s3').textContent = '0%';
  doc.dispatchEvent(new Event('input')); render();
});

$('file').addEventListener('change', e => {
  const f = e.target.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = () => { doc.value = r.result; doc.dispatchEvent(new Event('input')); };
  r.readAsText(f);
});

// Length buttons and result tabs
function pick(group, attr, fn) {
  $(group).querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
    $(group).querySelectorAll('button').forEach(x => x.classList.remove('on'));
    b.classList.add('on');
    fn(b.dataset[attr]);
  }));
}
pick('length', 'n', v => { n = +v; if (result) summarize(); });
pick('tabs', 'tab', v => { tab = v; render(); });

$('copy').addEventListener('click', () => {
  if (!result) return;
  const text = tab === 'summary' ? result.summary : tab === 'points' ? result.points.join('\n') : result.recs.join('\n');
  navigator.clipboard.writeText(text);
  $('copy').textContent = 'Copied ✓';
  setTimeout(() => ($('copy').textContent = 'Copy'), 1200);
});