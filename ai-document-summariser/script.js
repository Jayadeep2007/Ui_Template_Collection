/* ---------- mouse-follow glow (same idea as the homepage) ---------- */
const glow = document.getElementById('glow');
let tx = innerWidth / 2, ty = innerHeight / 2, x = tx, y = ty;

addEventListener('mousemove', e => {
  tx = e.clientX; ty = e.clientY;
  glow.classList.add('on');
});
document.addEventListener('mouseleave', () => glow.classList.remove('on'));

(function follow() {
  x += (tx - x) * 0.12;   // smooth easing
  y += (ty - y) * 0.12;
  glow.style.left = x + 'px';
  glow.style.top = y + 'px';
  requestAnimationFrame(follow);
})();

/* ---------- summarizer UI ---------- */
const input = document.getElementById('input');
const fileEl = document.getElementById('file');
const len = document.getElementById('len');
const lenOut = document.getElementById('lenOut');
const go = document.getElementById('go');
const result = document.getElementById('result');
const summaryEl = document.getElementById('summary');
const stats = document.getElementById('stats');
const copy = document.getElementById('copy');

len.addEventListener('input', () => {
  lenOut.textContent = len.value + (len.value === '1' ? ' sentence' : ' sentences');
});

fileEl.addEventListener('change', () => {
  const f = fileEl.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = () => { input.value = r.result; };
  r.readAsText(f);
});

/* Simple extractive summarizer: scores sentences by word frequency.
   Replace summarize() with a real AI API call later if needed. */
function summarize(text, count) {
  const sentences = text.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || [];
  if (sentences.length <= count) return sentences.map(s => s.trim()).join(' ');

  const stop = new Set('the a an and or but of to in on for with is are was were be it this that as at by from not have has had'.split(' '));
  const freq = {};
  text.toLowerCase().match(/[a-z']+/g)?.forEach(w => {
    if (!stop.has(w) && w.length > 2) freq[w] = (freq[w] || 0) + 1;
  });

  const scored = sentences.map((s, i) => {
    const words = s.toLowerCase().match(/[a-z']+/g) || [];
    const score = words.reduce((n, w) => n + (freq[w] || 0), 0) / (words.length || 1);
    return { s: s.trim(), i, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .sort((a, b) => a.i - b.i)          // keep original order
    .map(o => o.s)
    .join(' ');
}

go.addEventListener('click', () => {
  const text = input.value.trim();
  if (text.length < 40) {
    result.hidden = false;
    stats.textContent = '';
    summaryEl.textContent = 'Add at least a few sentences of text, then select Summarize.';
    return;
  }
  const out = summarize(text, +len.value);
  const w1 = text.split(/\s+/).length, w2 = out.split(/\s+/).length;
  stats.textContent = `${w1} words reduced to ${w2} (${Math.round((1 - w2 / w1) * 100)}% shorter)`;
  summaryEl.textContent = out;
  result.hidden = false;
  result.classList.remove('show'); void result.offsetWidth; result.classList.add('show');
});

copy.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(summaryEl.textContent);
    copy.textContent = 'Copied';
    setTimeout(() => (copy.textContent = 'Copy summary'), 1500);
  } catch { copy.textContent = 'Copy failed'; }
});
