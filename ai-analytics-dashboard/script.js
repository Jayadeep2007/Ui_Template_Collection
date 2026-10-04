/* NOVA ANALYTICS — local analysis engine. No data leaves the browser. */
// Future AI backend: only column names/types are ever sent. Never put a real secret here.
const AI_CONFIG = { endpoint: "/api/gemini", apiKey: "" };

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const rx = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let DS = { cols: [], meta: {}, rows: [], miss: 0 }, page = 0, ctx = null, last = null, hist = [];
try { hist = JSON.parse(localStorage.getItem('nova_hist') || '[]'); } catch (e) { hist = []; }

/* ---------- sample data (example only) ---------- */
function sample() {
  let s = 7; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const N = "Aarav Priya Rahul Sneha Karthik Divya Arjun Meera Vikram Anita Rohan Kavya Imran Sara Nikhil Pooja Suresh Lakshmi Aditya Neha".split(' ');
  const L = "Kumar Sharma Iyer Reddy Nair Singh Patel Das Khan Menon".split(' ');
  const D = { IT: [70, 130], Finance: [60, 105], HR: [45, 80], Sales: [50, 95], Marketing: [48, 90] };
  const C = ["Chennai", "Mumbai", "Delhi", "Bengaluru", "Hyderabad"], K = Object.keys(D), rows = [];
  for (let i = 0; i < 60; i++) {
    const d = K[Math.floor(r() * 5)], [a, b] = D[d];
    rows.push({ Employee: N[i % 20] + ' ' + L[Math.floor(r() * 10)], Department: d, City: C[Math.floor(r() * 5)],
      Salary: Math.round((a + r() * (b - a)) * 1000), Experience: Math.floor(r() * 15) + 1, Remote: r() < .55 ? 'Yes' : 'No',
      JoinDate: `${2016 + Math.floor(r() * 9)}-${String(1 + Math.floor(r() * 12)).padStart(2, '0')}-15` });
  }
  rows[3].Salary = ''; return rows;
}

/* ---------- parsing & profiling ---------- */
function parseCSV(t) {
  const out = []; let row = [], f = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c == '"') { if (t[i + 1] == '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c == '"') q = true;
    else if (c == ',') { row.push(f); f = ''; }
    else if (c == '\n' || c == '\r') { if (c == '\r' && t[i + 1] == '\n') i++; row.push(f); out.push(row); row = []; f = ''; }
    else f += c;
  }
  if (f || row.length) { row.push(f); out.push(row); }
  if (out.length < 2) throw Error('Invalid CSV: needs a header row and at least one data row.');
  const h = out.shift().map(s => s.trim());
  return out.filter(r => r.some(x => x.trim())).map(r => Object.fromEntries(h.map((k, i) => [k, (r[i] ?? '').trim()])));
}
function profile(rows) {
  const cols = Object.keys(rows[0] || {}), meta = {}; let miss = 0;
  cols.forEach(c => {
    const v = rows.map(r => r[c]), ne = v.filter(x => x !== '' && x != null); miss += v.length - ne.length;
    const S = ne.map(String);
    const bool = S.length && S.every(x => /^(yes|no|true|false)$/i.test(x));
    const num = S.length && S.every(x => x.trim() !== '' && !isNaN(+x.replace(/,/g, '')));
    const date = !num && S.length && S.every(x => /\d[-\/]\d/.test(x) && !isNaN(Date.parse(x)));
    const u = [...new Set(S)];
    meta[c] = { type: bool ? 'boolean' : num ? 'numeric' : date ? 'date' : 'categorical', uniq: u.length, vals: u, miss: v.length - ne.length };
  });
  return { cols, meta, miss };
}

/* ---------- dataset intelligence ---------- */

function medianData(values) {
  const n = values
    .filter(v => typeof v === 'number' && isFinite(v))
    .sort((a, b) => a - b);

  if (!n.length) return null;

  const mid = Math.floor(n.length / 2);

  return n.length % 2
    ? n[mid]
    : (n[mid - 1] + n[mid]) / 2;
}


// ============================================================
// NOVA DATASET INTELLIGENCE
// ============================================================

function buildDatasetIntelligence() {
    const { rows, cols, meta } = DS;

    if (!rows.length || !cols.length) {
        return null;
    }

    const intelligence = {
        overview: {
            rows: rows.length,
            columns: cols.length,
            missingValues: DS.miss
        },

        columns: {},
        numeric: {},
        categorical: {},
        boolean: {},
        dates: {},
        quality: {},
        relationships: {}
    };

    // --------------------------------------------------------
    // COLUMN ANALYSIS
    // --------------------------------------------------------

    cols.forEach(column => {

        const type = meta[column].type;

        const values = rows
            .map(row => row[column])
            .filter(value =>
                value !== null &&
                value !== undefined &&
                value !== ""
            );

        const missing = rows.length - values.length;

        intelligence.columns[column] = {
            type: type,
            uniqueValues: new Set(values.map(String)).size,
            missingValues: missing,
            completeness: Number(
                ((values.length / rows.length) * 100).toFixed(2)
            )
        };

        // ----------------------------------------------------
        // NUMERIC COLUMN
        // ----------------------------------------------------

        if (type === "numeric") {

            const nums = values
                .map(Number)
                .filter(value => Number.isFinite(value));

            if (nums.length > 0) {

                const sum = nums.reduce(
                    (total, value) => total + value,
                    0
                );

                const sorted = [...nums].sort((a, b) => a - b);

                const middle = Math.floor(sorted.length / 2);

                const median =
                    sorted.length % 2 === 0
                        ? (sorted[middle - 1] + sorted[middle]) / 2
                        : sorted[middle];

                const minimum = Math.min(...nums);
                const maximum = Math.max(...nums);

                intelligence.numeric[column] = {

                    count: nums.length,

                    minimum: minimum,

                    maximum: maximum,

                    average: Number(
                        (sum / nums.length).toFixed(2)
                    ),

                    median: Number(
                        median.toFixed(2)
                    ),

                    range: maximum - minimum,

                    missingValues: missing,

                    completeness: Number(
                        ((nums.length / rows.length) * 100).toFixed(2)
                    )
                };
            }
        }

        // ----------------------------------------------------
        // CATEGORICAL COLUMN
        // ----------------------------------------------------

        if (type === "categorical") {

            const frequency = {};

            values.forEach(value => {

                const key = String(value);

                frequency[key] =
                    (frequency[key] || 0) + 1;

            });

            const sorted = Object.entries(frequency)
                .sort((a, b) => b[1] - a[1]);

            intelligence.categorical[column] = {

                uniqueValues: sorted.length,

                mostCommon: sorted.length
                    ? {
                        value: sorted[0][0],
                        count: sorted[0][1],
                        percentage: Number(
                            (
                                (sorted[0][1] / rows.length) * 100
                            ).toFixed(2)
                        )
                    }
                    : null,

                distribution: sorted.map(
                    ([value, count]) => ({
                        value: value,
                        count: count,
                        percentage: Number(
                            ((count / rows.length) * 100).toFixed(2)
                        )
                    })
                ),

                missingValues: missing
            };
        }

        // ----------------------------------------------------
        // BOOLEAN COLUMN
        // ----------------------------------------------------

        if (type === "boolean") {

            const yes = values.filter(
                value => value === true
            ).length;

            const no = values.filter(
                value => value === false
            ).length;

            const total = yes + no;

            intelligence.boolean[column] = {

                yes: yes,

                no: no,

                yesPercentage: total
                    ? Number(((yes / total) * 100).toFixed(2))
                    : 0,

                noPercentage: total
                    ? Number(((no / total) * 100).toFixed(2))
                    : 0,

                missingValues: missing
            };
        }

        // ----------------------------------------------------
        // DATE COLUMN
        // ----------------------------------------------------

        if (type === "date") {

            const dates = values
                .map(value => new Date(value))
                .filter(date => !Number.isNaN(date.getTime()))
                .sort((a, b) => a - b);

            if (dates.length > 0) {

                const earliest = dates[0];

                const latest = dates[dates.length - 1];

                const spanDays = Math.round(
                    (latest - earliest) /
                    (1000 * 60 * 60 * 24)
                );

                intelligence.dates[column] = {

                    earliest:
                        earliest.toISOString().slice(0, 10),

                    latest:
                        latest.toISOString().slice(0, 10),

                    spanDays: spanDays,

                    count: dates.length,

                    missingValues: missing
                };
            }
        }
    });

    // --------------------------------------------------------
    // DUPLICATE ROW ANALYSIS
    // --------------------------------------------------------

    const duplicateMap = new Map();

    rows.forEach(row => {

        const key = cols
            .map(column => String(row[column] ?? ""))
            .join("|");

        duplicateMap.set(
            key,
            (duplicateMap.get(key) || 0) + 1
        );
    });

    const duplicateGroups =
        [...duplicateMap.values()]
            .filter(count => count > 1);

    const duplicateRows =
        duplicateGroups.reduce(
            (total, count) => total + count - 1,
            0
        );

    intelligence.quality = {

        missingValues: DS.miss,

        missingPercentage: Number(
            (
                (DS.miss / (rows.length * cols.length)) * 100
            ).toFixed(2)
        ),

        duplicateRows: duplicateRows,

        duplicateGroups: duplicateGroups.length
    };

    // --------------------------------------------------------
    // NUMERIC RELATIONSHIPS / CORRELATION
    // --------------------------------------------------------

    const numericColumns = cols.filter(
        column => meta[column].type === "numeric"
    );

    numericColumns.forEach((columnA, i) => {

        for (let j = i + 1; j < numericColumns.length; j++) {

            const columnB = numericColumns[j];

            const pairs = rows.filter(row =>

                typeof row[columnA] === "number" &&
                typeof row[columnB] === "number" &&

                Number.isFinite(row[columnA]) &&
                Number.isFinite(row[columnB])

            );

            if (pairs.length < 5) {
                continue;
            }

            const x = pairs.map(row => row[columnA]);

            const y = pairs.map(row => row[columnB]);

            const meanX =
                x.reduce((sum, value) => sum + value, 0)
                / x.length;

            const meanY =
                y.reduce((sum, value) => sum + value, 0)
                / y.length;

            let numerator = 0;
            let denominatorX = 0;
            let denominatorY = 0;

            for (let k = 0; k < pairs.length; k++) {

                const dx = x[k] - meanX;

                const dy = y[k] - meanY;

                numerator += dx * dy;

                denominatorX += dx * dx;

                denominatorY += dy * dy;
            }

            const correlation =
                denominatorX && denominatorY
                    ? numerator /
                      Math.sqrt(
                          denominatorX * denominatorY
                      )
                    : 0;

            const absoluteCorrelation =
                Math.abs(correlation);

            intelligence.relationships[
                `${columnA}__${columnB}`
            ] = {

                columnA: columnA,

                columnB: columnB,

                correlation: Number(
                    correlation.toFixed(4)
                ),

                strength:
                    absoluteCorrelation >= 0.7
                        ? "strong"
                        : absoluteCorrelation >= 0.4
                            ? "moderate"
                            : "weak",

                direction:
                    correlation > 0
                        ? "positive"
                        : correlation < 0
                            ? "negative"
                            : "none",

                sampleSize: pairs.length
            };
        }
    });

    // --------------------------------------------------------
    // COLUMN TYPE SUMMARY
    // --------------------------------------------------------

    const numericColumnsList =
        cols.filter(column =>
            meta[column].type === "numeric"
        );

    const categoricalColumnsList =
        cols.filter(column =>
            meta[column].type === "categorical"
        );

    const booleanColumnsList =
        cols.filter(column =>
            meta[column].type === "boolean"
        );

    const dateColumnsList =
        cols.filter(column =>
            meta[column].type === "date"
        );

    intelligence.description = {

        numericColumns: numericColumnsList,

        categoricalColumns: categoricalColumnsList,

        booleanColumns: booleanColumnsList,

        dateColumns: dateColumnsList,

        numericCount: numericColumnsList.length,

        categoricalCount: categoricalColumnsList.length,

        booleanCount: booleanColumnsList.length,

        dateCount: dateColumnsList.length
    };

    return intelligence;
}


// ============================================================
// AI-READY DATASET SUMMARY
// ============================================================

function getDatasetIntelligenceSummary() {

    const intelligence = DS.intelligence;

    if (!intelligence) {
        return null;
    }

    return {

        dataset: {

            rows: intelligence.overview.rows,

            columns: intelligence.overview.columns,

            missingValues:
                intelligence.overview.missingValues
        },

        columnTypes: {

            numeric:
                intelligence.description.numericColumns,

            categorical:
                intelligence.description.categoricalColumns,

            boolean:
                intelligence.description.booleanColumns,

            date:
                intelligence.description.dateColumns
        },

        numericStatistics:
            intelligence.numeric,

        categoricalStatistics:
            intelligence.categorical,

        booleanStatistics:
            intelligence.boolean,

        dateStatistics:
            intelligence.dates,

        dataQuality:
            intelligence.quality,

        relationships:
            intelligence.relationships
    };
}

function setData(raw) {
  if (!Array.isArray(raw) && raw && typeof raw == 'object') raw = Object.values(raw).find(Array.isArray) || [raw];
  if (!Array.isArray(raw) || !raw.length || typeof raw[0] != 'object' || !Object.keys(raw[0]).length) throw Error('Dataset is empty or invalid.');
  const pr = profile(raw);
  const rows = raw.map(r => { const o = {}; pr.cols.forEach(c => {
    const v = r[c], t = pr.meta[c].type;
    o[c] = v === '' || v == null ? null : t == 'numeric' ? +String(v).replace(/,/g, '') : t == 'boolean' ? /^(yes|true)$/i.test(String(v)) : String(v);
  }); return o; });
  DS = { ...pr, rows };

  /* Build complete dataset intelligence */
  DS.intelligence = buildDatasetIntelligence();

  console.log(
    'NOVA DATASET INTELLIGENCE:',
    DS.intelligence
  );

  console.log(
    "NOVA AI DATA SUMMARY:",
    getDatasetIntelligenceSummary()
  );

  ctx = null;
  last = null;
  page = 0;

  renderData();
}
const labelCol = () => DS.cols.find(c => DS.meta[c].type == 'categorical' && DS.meta[c].uniq > DS.rows.length * .7) || null;
const money = c => /salar|pay|income|wage|price|revenue|cost|amount/i.test(c);
const fmt = (c, v) => v == null || (typeof v == 'number' && isNaN(v)) ? '—' : typeof v == 'boolean' ? (v ? 'Yes' : 'No') : typeof v != 'number' ? String(v) :
  money(c) ? '₹' + Math.round(v).toLocaleString('en-IN') : (+v.toFixed(2)).toLocaleString('en-IN');

/* ---------- analysis engine ---------- */
const nums = (r, c) => r.map(x => x[c]).filter(v => typeof v == 'number' && isFinite(v));
const filterData = (r, f) => r.filter(x => f.every(y => { const v = x[y.c]; if (v == null) return false;
  if (y.op == '=') return String(v).toLowerCase() == String(y.v).toLowerCase();
  if (y.op == 'in') return y.v.some(z => String(z).toLowerCase() == String(v).toLowerCase());
  return y.op == '>' ? v > y.v : v < y.v; }));
const sortData = (r, c, d = -1) => r.filter(x => x[c] != null).sort((a, b) => d * (a[c] - b[c]));
const groupData = (r, c) => { const m = new Map(); r.forEach(x => { const k = x[c]; if (k == null) return; (m.get(k) || m.set(k, []).get(k)).push(x); }); return m; };
const countData = r => r.length;
const sumData = (r, c) => nums(r, c).reduce((a, b) => a + b, 0);
const averageData = (r, c) => { const n = nums(r, c); return n.length ? n.reduce((a, b) => a + b, 0) / n.length : null; };
const minData = (r, c) => { const n = nums(r, c); return n.length ? Math.min(...n) : null; };
const maxData = (r, c) => { const n = nums(r, c); return n.length ? Math.max(...n) : null; };
const percentageData = (part, total) => total ? part / total * 100 : 0;
const compareData = (r, g, c, fn) => [...groupData(r, g)].map(([k, v]) => ({ k, v: fn(v, c), rows: v }));
const topN = (r, c, n) => sortData(r, c, -1).slice(0, n);
const bottomN = (r, c, n) => sortData(r, c, 1).slice(0, n);
const FN = { count: countData, sum: sumData, average: averageData, min: minData, max: maxData };
const WORD = { count: 'count', sum: 'total', average: 'average', min: 'minimum', max: 'maximum' };
function corr(a, b) {
  const p = DS.rows.filter(r => r[a] != null && r[b] != null), n = p.length; if (n < 5) return 0;
  const x = p.map(r => r[a]), y = p.map(r => r[b]), mx = x.reduce((s, v) => s + v, 0) / n, my = y.reduce((s, v) => s + v, 0) / n;
  let sxy = 0, sx = 0, sy = 0; for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sx += (x[i] - mx) ** 2; sy += (y[i] - my) ** 2; }
  return sx && sy ? sxy / Math.sqrt(sx * sy) : 0;
}

/* ---------- question understanding ---------- */
function analyzeQuestion(q, ds) {
  const s = q.toLowerCase().replace(/[?!]|\.$/g, '').trim(), { cols, meta } = ds, L = labelCol(), has = r => r.test(s);
  const N = cols.filter(c => meta[c].type == 'numeric'), cats = cols.filter(c => c != L && meta[c].type == 'categorical'), bools = cols.filter(c => meta[c].type == 'boolean');
  const men = c => s.includes(c.toLowerCase().replace(/[_-]/g, ' '));
  const pay = N.find(c => /salar|salary|pay|income|wage|compens|package|ctc|earnings|remuneration/i.test(c));
  const p = {
    filters: [],
    intent: null,
    agg: null,
    groupBy: null,
    sup: null,
    limit: null,
    column: N.find(men) || (pay && has(/salar|pay|paid|earn|income|wage|package|ctc|compens|earnings|remuneration/) ? pay : null)
  };
  const byW = w => { w = w.replace(/ies$/, 'y').replace(/s$/, ''); return w.length > 2 ? cats.find(c => { const n = c.toLowerCase(); return n.startsWith(w) || w.startsWith(n); }) : null; };
  for (const m of s.matchAll(/(?:by|per|each|every|across|between|among|which)\s+(?:the\s+)?([a-z_-]+)/g)) { const c = byW(m[1]); if (c) { p.groupBy = c; break; } }
  const f = {};
  cats.forEach(c => meta[c].vals.forEach(v => { if (new RegExp('\\b' + rx(String(v).toLowerCase()) + '\\b').test(s)) (f[c] = f[c] || []).push(v); }));
  Object.entries(f).forEach(([c, v]) => p.filters.push(v.length > 1 ? { c, op: 'in', v } : { c, op: '=', v: v[0] }));
  bools.forEach(c => { const r = c.toLowerCase(); if (s.includes(r.slice(0, Math.max(4, r.length - 2)))) p.filters.push({ c, op: '=', v: !has(/\bnot\b|non-?|n't|on-?site|office/) }); });
  const NF = /(more than|greater than|above|over|higher than|exceeding|at least|>)\s*₹?\s*([\d,]*\.?\d+)\s*(k|lakhs?|l\b)?/, LF = /(less than|below|under|lower than|fewer than|at most|<)\s*₹?\s*([\d,]*\.?\d+)\s*(k|lakhs?|l\b)?/;
  const nv = m => { let v = +m[2].replace(/,/g, ''); if (m[3] == 'k') v *= 1e3; else if (m[3]) v *= 1e5; return v; };
  const fc = p.column || pay || N[0], a = s.match(NF), b = s.match(LF);
  if (a && fc) p.filters.push({ c: fc, op: '>', v: nv(a) });
  if (b && fc) p.filters.push({ c: fc, op: '<', v: nv(b) });
  const lm = s.match(/(?:top|bottom|highest|lowest|best|worst|first|last)\s+(\d+)|(\d+)\s+(?:highest|lowest|top|bottom|best|worst)/); if (lm) p.limit = +(lm[1] || lm[2]);
  const hi = has(/highest|maximum|\bmax\b|largest|\bmost\b|\btop\b|best|biggest|greatest/), lo = has(/lowest|minimum|\bmin\b|smallest|\bleast\b|bottom|fewest|worst/);
  p.sup = lo && !hi ? 'lo' : hi ? 'hi' : null;
  p.agg = has(/how many|\bcount\b|number of|total number|headcount/) ? 'count' : has(/average|\bmean\b|typical|\bavg\b/) ? 'average' : has(/\btotal\b|\bsum\b|combined/) ? 'sum' : null;
  const I = [[/insight|summari[sz]e|key (finding|point)|need to know|overview|important info/, 'insights'], [/explain|how did you|calculation/, 'explain'],
    [/data behind|show.*(rows|underlying|evidence)|which rows/, 'evidence'], [/only the answer|just the answer|short answer|briefly/, 'concise'],
    [/statistic|describe the data/, 'stats'], [/trend|over time|growth|by (year|month)/, 'trend'], [/percent|%|proportion|\bshare of\b|\bratio\b/, 'percentage']];
  for (const [r, i] of I) if (has(r)) { p.intent = i; break; }
  const cmp = has(/compare|comparison|versus|\bvs\b/);
  if (cmp && !p.groupBy) { const m = p.filters.find(x => x.op == 'in'); if (m) p.groupBy = m.c; }
  if (!p.intent) {
    if (p.limit && !p.groupBy && !p.agg) p.intent = 'topn';
    else if (p.agg || p.groupBy || cmp) p.intent = 'agg';
    else if (p.sup && (p.column || has(/\bwho\b|which/))) p.intent = 'extreme';
    else if (p.filters.length && has(/show|list|which|who|find|give|display|employees|rows|records/)) p.intent = 'list';
  }
  if (!p.intent && ctx && (p.filters.length || p.groupBy || p.column)) {
    const o = ctx.plan, keep = o.filters.filter(x => !p.filters.some(y => y.c == x.c));
    return { ...o, filters: [...keep, ...p.filters], column: p.column || o.column, groupBy: p.groupBy || (p.filters.some(y => y.c == o.groupBy) ? null : o.groupBy) };
  }
  return p;
}

/* ---------- execution ---------- */
const fdesc = f => { const s = f.map(x => x.op == '=' ? `${x.c}: ${fmt(x.c, x.v)}` : x.op == 'in' ? `${x.c}: ${x.v.join('/')}` : `${x.c} ${x.op} ${fmt(x.c, x.v)}`).join(', '); return s ? ` (${s})` : ''; };
const tbl = (head, rows) => ({ head, rows });
function execute(p) {
  const R = DS.rows, L = labelCol(), noun = L ? L.toLowerCase() + 's' : 'rows', N = DS.cols.filter(c => DS.meta[c].type == 'numeric');
  const F = filterData(R, p.filters), fd = fdesc(p.filters), pay = N.find(c => /salar|pay|income|wage/i.test(c));
  const need = () => p.column || (N.length == 1 ? N[0] : null);
  const clarify = () => ({ text: `Which value should I use — ${N.join(', ') || 'a numeric column'}${p.groupBy ? ' or ' + noun + ' count' : ''}?`, noCtx: true });
  const rowsTbl = (rs, cs) => tbl(cs, rs.slice(0, 15).map(r => cs.map(c => fmt(c, r[c]))));
  switch (p.intent) {
    case 'insights': return { text: 'KEY INSIGHTS', bullets: insights(), calc: 'Computed from column statistics, group averages and correlations.' };
    case 'stats': { if (!N.length) return { text: 'There are no numeric columns to summarize.' };
      return { text: 'Summary statistics for numeric columns.', table: tbl(['Column', 'Min', 'Average', 'Max', 'Count'], N.map(c => [c, fmt(c, minData(R, c)), fmt(c, averageData(R, c)), fmt(c, maxData(R, c)), nums(R, c).length])) }; }
    case 'trend': {
      const dc = DS.cols.find(c => DS.meta[c].type == 'date'); if (!dc) return { text: "I can't show a trend because the dataset has no date column." };
      const ys = R.filter(r => r[dc]).map(r => new Date(r[dc]).getFullYear()), span = Math.max(...ys) - Math.min(...ys), len = span >= 2 ? 4 : 7;
      const col = p.column, g = new Map(); F.forEach(r => { if (!r[dc]) return; const d = new Date(r[dc]); const k = len == 4 ? String(d.getFullYear()) : d.toISOString().slice(0, 7); (g.get(k) || g.set(k, []).get(k)).push(r); });
      const pts = [...g].sort((a, b) => a[0] < b[0] ? -1 : 1).map(([k, v]) => [k, col ? averageData(v, col) : v.length]).filter(x => x[1] != null);
      if (pts.length < 2) return { text: 'Not enough dated records to show a trend.' };
      const a = pts[0][1], z = pts.at(-1)[1], ch = a ? (z / a - 1) * 100 : 0, lbl = col ? `average ${col.toLowerCase()}` : `${noun} by ${dc}`;
      return { text: `The ${lbl} went from ${fmt(col, a)} (${pts[0][0]}) to ${fmt(col, z)} (${pts.at(-1)[0]}), ${ch >= 0 ? 'up' : 'down'} ${Math.abs(ch).toFixed(0)}%.`,
        chart: { type: 'line', labels: pts.map(x => x[0]), values: pts.map(x => x[1]) }, table: tbl([dc, col ? 'Average ' + col : 'Count'], pts.map(x => [x[0], fmt(col, x[1])])), calc: `Grouped by ${len == 4 ? 'year' : 'month'} of ${dc}.`, used: F }; }
    case 'percentage': {
      if (!p.filters.length && p.groupBy) { const g = compareData(F, p.groupBy, null, countData).sort((a, b) => b.v - a.v);
        return { text: `${g[0].k} is the largest ${p.groupBy.toLowerCase()} at ${percentageData(g[0].v, F.length).toFixed(1)}% of ${noun}.`, chart: { type: 'donut', labels: g.map(x => x.k), values: g.map(x => x.v) }, calc: `Count per ${p.groupBy} ÷ ${F.length} × 100.`, used: F }; }
      if (!p.filters.length) return { text: `Percentage of what? For example: "What percentage of ${noun} are in ${DS.meta[DS.cols.find(c => c != L && DS.meta[c].type == 'categorical')]?.vals[0] || 'a category'}?"`, noCtx: true };
      const lastF = p.filters.at(-1), rest = p.filters.slice(0, -1), base = filterData(R, rest), part = filterData(base, [lastF]), pc = percentageData(part.length, base.length);
      return { text: `${pc.toFixed(1)}% of ${noun}${fdesc(rest)} match${fdesc([lastF])} — ${part.length} of ${base.length}.`, chart: { type: 'donut', labels: ['Match', 'Other'], values: [part.length, base.length - part.length] }, calc: `${part.length} ÷ ${base.length} × 100 = ${pc.toFixed(1)}%`, used: part }; }
    case 'topn': { const col = need() || pay || N[0]; if (!col) return clarify();
      const n = p.limit || 5, lo = p.sup == 'lo', r = (lo ? bottomN : topN)(F, col, n), extra = DS.cols.find(c => c != L && DS.meta[c].type == 'categorical');
      if (!r.length) return { text: `No ${noun} match${fd}.` };
      return { text: `${lo ? 'Bottom' : 'Top'} ${r.length} by ${col}: ${r.map(x => `${L ? x[L] : '#'} (${fmt(col, x[col])})`).join(', ')}.`,
        table: rowsTbl(r, [L, extra, col].filter(Boolean)), chart: { type: 'hbar', labels: r.map((x, i) => L ? x[L] : '#' + (i + 1)), values: r.map(x => x[col]), money: money(col) }, calc: `Sorted ${col} ${lo ? 'ascending' : 'descending'}, kept ${r.length}.`, used: r }; }
    case 'extreme': { const col = need(); if (!col) return clarify();
      const s = sortData(F, col, p.sup == 'lo' ? 1 : -1); if (!s.length) return { text: `No ${noun} match${fd}.` };
      const t = s[0], ties = s.filter(r => r[col] === t[col]);
      return { text: `${L ? t[L] : 'The row'} has the ${p.sup == 'lo' ? 'lowest' : 'highest'} ${col.toLowerCase()} at ${fmt(col, t[col])}${fd}${ties.length > 1 ? ` (tied with ${ties.length - 1} other${ties.length > 2 ? 's' : ''})` : ''}.`,
        calc: `Scanned ${s.length} values of ${col} for the ${p.sup == 'lo' ? 'minimum' : 'maximum'}.`, used: ties }; }
    case 'list': { if (!F.length) return { text: `No ${noun} match${fd}.` };
      const col = p.column, r = col ? sortData(F, col, -1) : F, cs = [...new Set([L, col, ...p.filters.map(x => x.c)].filter(Boolean))];
      return { text: `${F.length} ${noun} match${fd}. Showing the first ${Math.min(F.length, 10)}.`, table: rowsTbl(r.slice(0, 10), cs), calc: `Filtered ${R.length} rows${fd}.`, used: F }; }
    case 'agg': {
      const a = p.agg || (p.groupBy ? (p.column || (N.length == 1 && /compare/.test(p.raw || '') ) ? 'average' : 'count') : 'count'), col = a == 'count' ? null : need();
      if (a != 'count' && !col) return clarify();
      if (!F.length) return { text: `No ${noun} match${fd}.` };
      if (!p.groupBy) {
        if (a == 'count') return { text: `There ${F.length == 1 ? 'is' : 'are'} ${F.length} ${noun}${fd}.`, calc: `Counted ${F.length} of ${R.length} rows${fd}.`, used: F };
        const v = FN[a](F, col), n = nums(F, col).length;
        return { text: `The ${WORD[a]} ${col.toLowerCase()} is ${fmt(col, v)}${fd}.`, calc: a == 'average' ? `${fmt(col, sumData(F, col))} ÷ ${n} values = ${fmt(col, v)}` : `${WORD[a]} of ${n} values in ${col}.`, used: F }; }
      const g = compareData(F, p.groupBy, col, FN[a]).filter(x => x.v != null).sort((x, y) => p.sup == 'lo' ? x.v - y.v : y.v - x.v);
      if (!g.length) return { text: 'No valid values to compare.' };
      const lab = a == 'count' ? 'Count' : `${WORD[a][0].toUpperCase() + WORD[a].slice(1)} ${col}`, nm = a == 'count' ? `${noun} count` : `${WORD[a]} ${col.toLowerCase()}`, V = x => a == 'count' ? x : fmt(col, x);
      const text = p.sup ? `${g[0].k} has the ${p.sup == 'lo' ? 'lowest' : 'highest'} ${nm} at ${V(g[0].v)}${g[1] ? `, followed by ${g[1].k} at ${V(g[1].v)}` : ''}.`
        : `${g[0].k} leads on ${nm} at ${V(g[0].v)}; ${g.at(-1).k} is lowest at ${V(g.at(-1).v)}.`;
      return { text, table: tbl([p.groupBy, lab], g.map(x => [x.k, V(x.v)])), chart: { type: g.length > 6 ? 'hbar' : 'bar', labels: g.map(x => x.k), values: g.map(x => x.v), money: col && money(col) },
        calc: `Grouped by ${p.groupBy}, computed ${nm} for each group.`, used: p.sup ? g[0].rows : F }; }
  }
  return { text: "I can't answer that from the current dataset because there is no column containing that information.", noCtx: true };
}
function insights() {
  const R = DS.rows, { cols, meta } = DS, L = labelCol(), b = [], N = cols.filter(c => meta[c].type == 'numeric'), C = cols.filter(c => c != L && meta[c].type == 'categorical' && meta[c].uniq <= 20);
  N.forEach(c => { const t = sortData(R, c, -1)[0]; if (t) b.push(`Highest ${c}: ${fmt(c, t[c])}${L ? ` (${t[L]})` : ''}. Average ${fmt(c, averageData(R, c))}, lowest ${fmt(c, minData(R, c))}.`); });
  C.forEach(c => {
    const g = compareData(R, c, null, countData).sort((x, y) => y.v - x.v);
    b.push(`${g[0].k} is the largest ${c.toLowerCase()} (${g[0].v} rows, ${percentageData(g[0].v, R.length).toFixed(0)}%); smallest is ${g.at(-1).k} (${g.at(-1).v}).`);
    const m = N[0]; if (m) { const a = compareData(R, c, m, averageData).filter(x => x.v != null).sort((x, y) => y.v - x.v);
      if (a.length > 1 && a[0].v > a.at(-1).v * 1.1) b.push(`${a[0].k} has the highest average ${m} (${fmt(m, a[0].v)}), ${((a[0].v / a.at(-1).v - 1) * 100).toFixed(0)}% above ${a.at(-1).k}.`); }
  });
  cols.filter(c => meta[c].type == 'boolean').forEach(c => b.push(`${percentageData(R.filter(r => r[c] === true).length, R.length).toFixed(0)}% have ${c} = Yes.`));
  for (let i = 0; i < N.length; i++) for (let j = i + 1; j < N.length; j++) { const r = corr(N[i], N[j]); if (Math.abs(r) > .5) b.push(`${N[i]} and ${N[j]} are ${r > 0 ? 'positively' : 'negatively'} correlated (r = ${r.toFixed(2)}).`); }
  if (DS.miss) b.push(`${DS.miss} missing values found.`);
  return b.slice(0, 9);
}

/* ---------- charts ---------- */
function chartSVG(c) {
  const P = ['#6ee7ff', '#a78bfa', '#f472b6', '#fbbf24', '#34d399', '#fb7185', '#60a5fa', '#f97316'], V = c.values, n = V.length, mx = Math.max(...V, 1), mn = Math.min(...V);
  const sh = (s, k = 11) => esc(String(s).length > k ? String(s).slice(0, k - 1) + '…' : s), T = (x, y, t, a = 'start', col = '#9fb0d8', fs = 11) => `<text x="${x}" y="${y}" text-anchor="${a}" fill="${col}" font-size="${fs}">${t}</text>`;
  const f = v => c.money ? '₹' + Math.round(v / 1000) + 'k' : +(+v).toFixed(1);
  if (c.type == 'donut') { const t = V.reduce((a, b) => a + b, 0) || 1, C = 2 * Math.PI * 60; let o = 0;
    return `<svg viewBox="0 0 420 170"><g transform="translate(90 85) rotate(-90)">${V.map((v, i) => { const l = v / t * C, e = `<circle r="60" fill="none" stroke="${P[i % 8]}" stroke-width="22" stroke-dasharray="${l} ${C - l}" stroke-dashoffset="${-o}"/>`; o += l; return e; }).join('')}</g>${T(90, 92, (V[0] / t * 100).toFixed(0) + '%', 'middle', '#fff', 22)}${c.labels.slice(0, 7).map((l, i) => T(190, 30 + i * 22, `● ${sh(l, 18)}: ${V[i]}`, 'start', P[i % 8], 13)).join('')}</svg>`; }
  if (c.type == 'hbar') return `<svg viewBox="0 0 420 ${n * 26 + 8}">${V.map((v, i) => `${T(0, i * 26 + 18, sh(c.labels[i], 14))}<rect x="105" y="${i * 26 + 5}" width="${Math.max(2, v / mx * 235)}" height="18" rx="4" fill="${P[i % 8]}" opacity=".85"/>${T(110 + v / mx * 235, i * 26 + 18, f(v), 'start', '#fff')}`).join('')}</svg>`;
  if (c.type == 'bar') { const w = 400 / n; return `<svg viewBox="0 0 420 200">${V.map((v, i) => { const h = v / mx * 140; return `<rect x="${10 + i * w + w * .15}" y="${160 - h}" width="${w * .7}" height="${h}" rx="5" fill="${P[i % 8]}" opacity=".85"/>${T(10 + i * w + w / 2, 154 - h, f(v), 'middle', '#fff')}${T(10 + i * w + w / 2, 178, sh(c.labels[i], 9), 'middle')}`; }).join('')}</svg>`; }
  const sp = mx - mn || 1, pt = V.map((v, i) => [30 + i / (n - 1) * 370, 150 - (v - mn) / sp * 120]);
  return `<svg viewBox="0 0 420 190"><polyline points="${pt.map(p => p.join(',')).join(' ')}" fill="none" stroke="#6ee7ff" stroke-width="2.5"/>${pt.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="4" fill="#a78bfa"/>${n < 14 || i % 2 == 0 ? T(p[0], 175, sh(c.labels[i], 7), 'middle') : ''}`).join('')}${T(pt[0][0], pt[0][1] - 9, f(V[0]), 'middle', '#fff')}${T(pt.at(-1)[0], pt.at(-1)[1] - 9, f(V.at(-1)), 'middle', '#fff')}</svg>`;
}

/* ---------- UI ---------- */
const tableHTML = t => `<div class="tw"><table><tr>${t.head.map(h => `<th>${esc(h)}</th>`).join('')}</tr>${t.rows.slice(0, 15).map(r => `<tr>${r.map(x => `<td>${esc(x)}</td>`).join('')}</tr>`).join('')}</table></div>`;
function addMsg(who, res) {
  const d = document.createElement('div'); d.className = 'm ' + (who == 'user' ? 'u' : 'a');
  if (who == 'user') d.textContent = res;
  else { let h = `<p class="ans">${esc(res.text)}</p>`;
    if (res.bullets) h += `<ul>${res.bullets.map(b => `<li>${esc(b)}</li>`).join('')}</ul>`;
    if (res.table) h += tableHTML(res.table);
    if (res.chart) h += chartSVG(res.chart);
    if (res.calc || res.used) h += `<div class="acts"><button data-q="Explain how you got this">Explain</button><button data-q="Show the data behind this answer">Show data</button></div>`;
    d.innerHTML = h; }
  $('#msgs').append(d); $('#msgs').scrollTop = 1e9;
}
async function think() {
  $('#orbw').classList.add('busy'); $('#state').textContent = 'ANALYZING DATA';
  for (const s of ['Understanding question...', 'Selecting relevant fields...', 'Calculating results...', 'Generating answer...']) { $('#steps').textContent = s; await sleep(230); }
  $('#orbw').classList.remove('busy'); $('#state').textContent = 'ANALYSIS COMPLETE'; $('#steps').textContent = 'Ready for your next question';
}
function remember(q) {
  hist = [q, ...hist.filter(x => x != q)].slice(0, 8);
  try { localStorage.setItem('nova_hist', JSON.stringify(hist)); } catch (e) {}
  renderHist();
}
const renderHist = () => $('#hist').innerHTML = hist.map(h => `<button class="chip" data-q="${esc(h)}">${esc(h)}</button>`).join('') || '<span>None yet</span>';
async function ask(q) {
  q = (q || '').trim(); if (!q) return;
  const N = DS.cols.filter(c => DS.meta[c].type == 'numeric'), C = DS.cols.filter(c => c != labelCol() && DS.meta[c].type == 'categorical');
  if (q == '@compare') q = N[0] && C[0] ? `Compare average ${N[0]} by ${C[0]}` : 'Show statistics';
  if (q == '@trend') q = 'What is the trend over time';
  addMsg('user', q); $('#q').value = '';
  if (!DS.rows.length) return addMsg('ai', { text: 'Upload a CSV or JSON dataset first, then I can analyze it.' });
  await think(); remember(q);
  let res, p;
  try {
    p = analyzeQuestion(q, DS); p.raw = q.toLowerCase();
    if (AI_CONFIG.endpoint) { try { // optional: only schema (names/types) is sent, never rows
      const r = await fetch(AI_CONFIG.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(AI_CONFIG.apiKey ? { Authorization: 'Bearer ' + AI_CONFIG.apiKey } : {}) },
        body: JSON.stringify({ question: q, schema: DS.cols.map(c => ({ name: c, type: DS.meta[c].type })) }) });
      const j = await r.json(); if (j && j.intent) Object.assign(p, j); } catch (e) { /* local engine continues */ } }
    if (p.intent == 'explain') res = last ? { text: last.calc || 'This answer was read directly from the data.' } : { text: 'Ask a question first, then I can explain it.' };
    else if (p.intent == 'evidence') res = last && last.used && last.used.length ? { text: `Showing ${Math.min(15, last.used.length)} of ${last.used.length} rows used for the answer.`, table: tbl(DS.cols, last.used.slice(0, 15).map(r => DS.cols.map(c => fmt(c, r[c])))) } : { text: 'There are no underlying rows to show yet.' };
    else if (p.intent == 'concise') res = last ? { text: last.text } : { text: 'Ask a question first.' };
    else if (!p.intent) res = { text: "I can't answer that from the current dataset because there is no column containing that information. Try rephrasing, or ask about: " + DS.cols.join(', ') + '.' };
    else { res = execute(p); if (!res.noCtx) { ctx = { plan: p }; last = res; } }
  } catch (e) { console.error(e); res = { text: 'Something went wrong with that calculation. Try rephrasing the question.' }; }
  addMsg('ai', res);
}
function renderData() {
  const { cols, meta, rows, miss } = DS, cnt = t => cols.filter(c => meta[c].type == t).length;
  $('#stats').innerHTML = [['ROWS', rows.length], ['COLUMNS', cols.length], ['NUMERIC FIELDS', cnt('numeric')], ['MISSING VALUES', miss]].map(([k, v]) => `<div class="sc"><small>${k}</small><div>${v.toLocaleString('en-IN')}</div></div>`).join('');
  $('#mini').innerHTML = `<b>DATASET</b><br>${rows.length} rows<br>${cols.length} columns<br>${cnt('numeric')} numeric<br>${cnt('categorical')} categorical<br>${cnt('date')} date<br>${cnt('boolean')} boolean`;
  $('#prof').innerHTML = cols.map(c => `<div class="c"><span>${esc(c)}</span><span class="tag">${meta[c].type}</span></div>`).join('');
  const N = cols.find(c => meta[c].type == 'numeric'), C = cols.find(c => c != labelCol() && meta[c].type == 'categorical'), B = cols.find(c => meta[c].type == 'boolean'), nn = labelCol() ? labelCol().toLowerCase() + 's' : 'rows';
  const ch = []; if (N) ch.push(`Average ${N}`, `Highest ${N}`); if (C) ch.push(`How many ${nn} by ${C}`); if (N && C) ch.push(`Compare average ${N} by ${C}`);
  if (B) ch.push(`What percentage of ${nn} are ${B}`); if (N) ch.push(`Top 5 by ${N}`); ch.push('Generate insights');
  $('#chips').innerHTML = ch.map(x => `<button class="chip" data-q="${esc(x)}">${esc(x)}</button>`).join('');
  $('#ready').textContent = '● DATA READY'; renderPrev();
}
function renderPrev() {
  const { cols, rows } = DS, per = 10, max = Math.max(0, Math.ceil(rows.length / per) - 1); page = Math.min(page, max);
  $('#prev').innerHTML = `<table><tr>${cols.map(c => `<th>${esc(c)}</th>`).join('')}</tr>${rows.slice(page * per, page * per + per).map(r => `<tr>${cols.map(c => `<td>${esc(fmt(c, r[c]))}</td>`).join('')}</tr>`).join('')}</table>`;
  $('#pgInfo').textContent = `Showing ${Math.min(rows.length, page * per + 1)}–${Math.min(rows.length, (page + 1) * per)} of ${rows.length} rows`;
  $('#prevB').disabled = page == 0; $('#nextB').disabled = page >= max;
}
function showErr(m) { const e = $('#err'); e.textContent = m; e.hidden = !m; if (m) setTimeout(() => e.hidden = true, 6000); }
function download(name, text, type) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 500); }
function exportRes(kind) {
  if (!last) return showErr('Ask a question first. Only the analysis result is exported.');
  const t = last.table, rows = t ? t.rows.map(r => Object.fromEntries(t.head.map((h, i) => [h, r[i]]))) : (last.bullets || [last.text]).map(x => ({ result: x }));
  if (kind == 'json') return download('nova-result.json', JSON.stringify({ answer: last.text, rows }, null, 2), 'application/json');
  const keys = Object.keys(rows[0] || { answer: 1 }), q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  download('nova-result.csv', [keys.map(q).join(','), ...rows.map(r => keys.map(k => q(r[k])).join(','))].join('\n'), 'text/csv');
}
function upload(accept) { const f = $('#file'); f.accept = accept; f.value = ''; f.click(); }

document.addEventListener('click', e => {
  const b = e.target.closest('[data-q],[data-go]'); if (!b) return;
  if (b.dataset.q) ask(b.dataset.q); else document.getElementById(b.dataset.go).scrollIntoView({ behavior: 'smooth' });
});
$('#send').onclick = () => ask($('#q').value);
$('#q').onkeydown = e => { if (e.key == 'Enter') ask($('#q').value); };
$('#upCsv').onclick = () => upload('.csv'); $('#upJson').onclick = () => upload('.json');
$('#file').onchange = e => {
  const f = e.target.files[0]; if (!f) return; const rd = new FileReader();
  rd.onload = () => { try { setData(/\.json$/i.test(f.name) ? JSON.parse(rd.result) : parseCSV(rd.result)); $('#msgs').innerHTML = ''; showErr(''); addMsg('ai', { text: `Loaded ${f.name}: ${DS.rows.length} rows, ${DS.cols.length} columns.` }); }
    catch (err) { showErr('Could not load file: ' + err.message); } };
  rd.onerror = () => showErr('Could not read the file.'); rd.readAsText(f);
};
$('#prevB').onclick = () => { page--; renderPrev(); }; $('#nextB').onclick = () => { page++; renderPrev(); };
$('#exCsv').onclick = () => exportRes('csv'); $('#exJson').onclick = () => exportRes('json');
$('#clr').onclick = () => { hist = []; try { localStorage.removeItem('nova_hist'); } catch (e) {} renderHist(); };
$('#smp').onclick = () => { setData(sample()); $('#msgs').innerHTML = ''; addMsg('ai', { text: 'Sample employee dataset loaded.' }); };
setData(sample()); renderHist();
addMsg('ai', { text: 'Sample employee data is loaded. Ask a question or upload your own CSV/JSON.' });

/* ============================================================
   NOVA UNIVERSAL AI INTELLIGENCE LAYER
   Phases 2 - 14
   ============================================================ */

const NOVA_AI_VERSION = "2.0";


// ============================================================
// DATASET DESCRIPTION
// ============================================================

function novaDatasetDescription() {

    if (!DS || !DS.rows || !DS.rows.length) {
        return "No dataset is currently loaded.";
    }

    const numeric = DS.cols.filter(
        c => DS.meta[c].type === "numeric"
    );

    const categorical = DS.cols.filter(
        c => DS.meta[c].type === "categorical"
    );

    const boolean = DS.cols.filter(
        c => DS.meta[c].type === "boolean"
    );

    const dates = DS.cols.filter(
        c => DS.meta[c].type === "date"
    );

    const text = [];

    text.push(
        `The dataset contains ${DS.rows.length} rows and ${DS.cols.length} columns.`
    );

    if (numeric.length) {
        text.push(
            `Numeric fields: ${numeric.join(", ")}.`
        );
    }

    if (categorical.length) {
        text.push(
            `Categorical fields: ${categorical.join(", ")}.`
        );
    }

    if (boolean.length) {
        text.push(
            `Boolean fields: ${boolean.join(", ")}.`
        );
    }

    if (dates.length) {
        text.push(
            `Date fields: ${dates.join(", ")}.`
        );
    }

    if (DS.miss) {
        text.push(
            `The dataset contains ${DS.miss} missing values.`
        );
    } else {
        text.push(
            "There are no missing values detected."
        );
    }

    return text.join(" ");
}


// ============================================================
// DATASET UNDERSTANDING
// ============================================================

function novaDatasetOverview() {

    const numeric = DS.cols.filter(
        c => DS.meta[c].type === "numeric"
    );

    const categorical = DS.cols.filter(
        c => DS.meta[c].type === "categorical"
    );

    const boolean = DS.cols.filter(
        c => DS.meta[c].type === "boolean"
    );

    const dates = DS.cols.filter(
        c => DS.meta[c].type === "date"
    );

    const bullets = [];

    bullets.push(
        `Dataset size: ${DS.rows.length} rows × ${DS.cols.length} columns`
    );

    bullets.push(
        `Numeric fields: ${numeric.length}`
    );

    bullets.push(
        `Categorical fields: ${categorical.length}`
    );

    bullets.push(
        `Boolean fields: ${boolean.length}`
    );

    bullets.push(
        `Date fields: ${dates.length}`
    );

    bullets.push(
        `Missing values: ${DS.miss}`
    );

    if (DS.intelligence?.quality) {

        bullets.push(
            `Duplicate rows: ${DS.intelligence.quality.duplicateRows}`
        );
    }

    return {
        text: novaDatasetDescription(),
        bullets: bullets
    };
}


// ============================================================
// IMPORTANT DATASET COLUMNS
// ============================================================

function novaImportantColumns() {

    const numeric = DS.cols.filter(
        c => DS.meta[c].type === "numeric"
    );

    const categorical = DS.cols.filter(
        c => DS.meta[c].type === "categorical"
    );

    const boolean = DS.cols.filter(
        c => DS.meta[c].type === "boolean"
    );

    const dates = DS.cols.filter(
        c => DS.meta[c].type === "date"
    );

    const rows = [];

    numeric.forEach(c => {

        const stat =
            DS.intelligence?.numeric?.[c];

        rows.push([
            c,
            "Numeric",
            stat
                ? `Average ${fmt(c, stat.average)}, range ${fmt(c, stat.minimum)} - ${fmt(c, stat.maximum)}`
                : "Numeric field"
        ]);
    });

    categorical.forEach(c => {

        const stat =
            DS.intelligence?.categorical?.[c];

        rows.push([
            c,
            "Categorical",
            stat?.mostCommon
                ? `Most common: ${stat.mostCommon.value}`
                : "Categorical field"
        ]);
    });

    boolean.forEach(c => {

        rows.push([
            c,
            "Boolean",
            "True / False field"
        ]);
    });

    dates.forEach(c => {

        const stat =
            DS.intelligence?.dates?.[c];

        rows.push([
            c,
            "Date",
            stat
                ? `${stat.earliest} → ${stat.latest}`
                : "Date field"
        ]);
    });

    return {
        text: "These are the main fields available in the dataset.",
        table: tbl(
            ["Column", "Type", "Information"],
            rows
        )
    };
}


// ============================================================
// DATA QUALITY
// ============================================================

function novaDataQuality() {

    const quality =
        DS.intelligence?.quality;

    if (!quality) {
        return {
            text: "Dataset quality information is not available yet."
        };
    }

    return {

        text:
            `The dataset contains ${quality.missingValues} missing values ` +
            `and ${quality.duplicateRows} duplicate rows.`,

        bullets: [

            `Missing values: ${quality.missingValues}`,

            `Missing percentage: ${quality.missingPercentage}%`,

            `Duplicate rows: ${quality.duplicateRows}`,

            `Duplicate groups: ${quality.duplicateGroups}`

        ]
    };
}


// ============================================================
// AUTOMATIC INSIGHTS
// ============================================================

function novaAutomaticInsights() {

    const bullets = [];

    const numeric =
        DS.cols.filter(
            c => DS.meta[c].type === "numeric"
        );

    const categorical =
        DS.cols.filter(
            c => DS.meta[c].type === "categorical"
        );

    // Numeric insights

    numeric.forEach(column => {

        const stat =
            DS.intelligence?.numeric?.[column];

        if (!stat) return;

        bullets.push(
            `${column}: average ${fmt(column, stat.average)}, ` +
            `minimum ${fmt(column, stat.minimum)}, ` +
            `maximum ${fmt(column, stat.maximum)}.`
        );
    });


    // Category insights

    categorical.forEach(column => {

        const stat =
            DS.intelligence?.categorical?.[column];

        if (
            stat &&
            stat.mostCommon
        ) {

            bullets.push(
                `${stat.mostCommon.value} is the most common ` +
                `${column.toLowerCase()} with ` +
                `${stat.mostCommon.count} records ` +
                `(${stat.mostCommon.percentage}%).`
            );
        }
    });


    // Correlations

    const relationships =
        DS.intelligence?.relationships || {};

    Object.values(relationships)
        .forEach(r => {

            if (
                Math.abs(r.correlation) >= 0.5
            ) {

                bullets.push(
                    `${r.columnA} and ${r.columnB} have a ` +
                    `${r.strength} ${r.direction} relationship ` +
                    `(correlation ${r.correlation}).`
                );
            }
        });


    return {
        text: "Here are the main automatically detected insights.",
        bullets: bullets.slice(0, 12)
    };
}


// ============================================================
// DATASET QUESTION DETECTOR
// ============================================================

function novaDetectQuestionType(question) {

    const q =
        question.toLowerCase().trim();


    if (
        /what is this data|what does this data|describe this data|about this data|dataset about|overview of (the )?data|describe the dataset/.test(q)
    ) {
        return "dataset_overview";
    }


    if (
        /what columns|which columns|fields|variables|important columns/.test(q)
    ) {
        return "columns";
    }


    if (
        /missing|duplicates|data quality|clean|incomplete/.test(q)
    ) {
        return "quality";
    }


    if (
        /insights|key findings|important findings|interesting|discover|tell me something/.test(q)
    ) {
        return "insights";
    }


    if (
        /correlation|relationship between|related to|relationship among/.test(q)
    ) {
        return "correlation";
    }


    if (
        /show (me )?(a )?(graph|chart)|plot|visuali[sz]e|draw|diagram/.test(q)
    ) {
        return "visual";
    }


    if (
        /how many rows|number of rows|row count|records count/.test(q)
    ) {
        return "row_count";
    }


    if (
        /how many columns|column count/.test(q)
    ) {
        return "column_count";
    }


    if (
        /help|what can you do|capabilities/.test(q)
    ) {
        return "help";
    }


    return "data_or_general";
}


// ============================================================
// CORRELATION ANSWER
// ============================================================

function novaCorrelationAnswer(question) {

    const relationships =
        DS.intelligence?.relationships || {};

    const list =
        Object.values(relationships);

    if (!list.length) {

        return {
            text:
                "There are not enough numeric fields to calculate relationships."
        };
    }


    const interesting =
        list
            .sort(
                (a, b) =>
                    Math.abs(b.correlation) -
                    Math.abs(a.correlation)
            )
            .slice(0, 10);


    return {

        text:
            "Here are the strongest relationships detected between numeric fields.",

        table: tbl(

            [
                "Column A",
                "Column B",
                "Correlation",
                "Strength",
                "Direction"
            ],

            interesting.map(r => [

                r.columnA,

                r.columnB,

                r.correlation,

                r.strength,

                r.direction

            ])

        )
    };
}


// ============================================================
// VISUALIZATION INTELLIGENCE
// ============================================================

function novaVisualAnswer(question) {

    const q =
        question.toLowerCase();

    const numeric =
        DS.cols.filter(
            c => DS.meta[c].type === "numeric"
        );

    const categorical =
        DS.cols.filter(
            c => DS.meta[c].type === "categorical"
        );

    const date =
        DS.cols.find(
            c => DS.meta[c].type === "date"
        );


    // Trend

    if (
        date &&
        /trend|over time|timeline|growth/.test(q)
    ) {

        const numericColumn =
            numeric.find(
                c =>
                    q.includes(c.toLowerCase())
            ) ||
            numeric[0];

        if (numericColumn) {

            const groups = {};

            DS.rows.forEach(row => {

                if (!row[date]) return;

                const d =
                    new Date(row[date]);

                if (Number.isNaN(d.getTime()))
                    return;

                const key =
                    d.toISOString().slice(0, 7);

                if (!groups[key])
                    groups[key] = [];

                groups[key].push(row);
            });


            const labels =
                Object.keys(groups).sort();

            const values =
                labels.map(label =>
                    averageData(
                        groups[label],
                        numericColumn
                    )
                );


            return {

                text:
                    `Trend of average ${numericColumn} over time.`,

                chart: {

                    type: "line",

                    labels: labels,

                    values: values,

                    money: money(numericColumn)

                }

            };
        }
    }


    // Category comparison

    if (
        categorical.length &&
        numeric.length
    ) {

        const category =
            categorical.find(
                c =>
                    q.includes(
                        c.toLowerCase()
                    )
            ) ||
            categorical[0];

        const value =
            numeric.find(
                c =>
                    q.includes(
                        c.toLowerCase()
                    )
            ) ||
            numeric[0];


        const groups =
            compareData(
                DS.rows,
                category,
                value,
                averageData
            )
            .filter(x => x.v != null)
            .sort((a, b) => b.v - a.v);


        return {

            text:
                `Average ${value} by ${category}.`,

            chart: {

                type:
                    groups.length > 6
                        ? "hbar"
                        : "bar",

                labels:
                    groups.map(x => x.k),

                values:
                    groups.map(x => x.v),

                money:
                    money(value)

            },

            table: tbl(

                [
                    category,
                    `Average ${value}`
                ],

                groups.map(x => [
                    x.k,
                    fmt(value, x.v)
                ])

            )

        };
    }


    return {

        text:
            "I need a numeric field or category to create a useful chart."

    };
}


// ============================================================
// HELP RESPONSE
// ============================================================

function novaHelp() {

    return {

        text:
            "I can analyze your uploaded dataset using natural language.",

        bullets: [

            "Describe the dataset",

            "Calculate averages, totals and counts",

            "Find highest and lowest values",

            "Compare categories",

            "Filter records",

            "Find percentages",

            "Analyze trends",

            "Find relationships and correlations",

            "Generate automatic insights",

            "Create charts",

            "Show supporting data",

            "Explain calculations"

        ]
    };
}


// ============================================================
// GENERAL LOCAL QUESTION HANDLER
// ============================================================

function novaLocalQuestion(question) {

    const type =
        novaDetectQuestionType(question);


    switch (type) {

        case "dataset_overview":
            return novaDatasetOverview();


        case "columns":
            return novaImportantColumns();


        case "quality":
            return novaDataQuality();


        case "insights":
            return novaAutomaticInsights();


        case "correlation":
            return novaCorrelationAnswer(question);


        case "visual":
            return novaVisualAnswer(question);


        case "row_count":
            return {
                text:
                    `The dataset contains ${DS.rows.length} rows.`
            };


        case "column_count":
            return {
                text:
                    `The dataset contains ${DS.cols.length} columns.`
            };


        case "help":
            return novaHelp();


        default:
            return null;
    }
}


// ============================================================
// CONVERSATIONAL CONTEXT
// ============================================================

let NOVA_CONVERSATION = [];

function novaRememberConversation(
    question,
    answer
) {

    NOVA_CONVERSATION.push({

        question: question,

        answer: answer?.text || ""

    });


    if (
        NOVA_CONVERSATION.length > 10
    ) {

        NOVA_CONVERSATION.shift();

    }
}


// ============================================================
// UNIVERSAL AI ASK FUNCTION
// ============================================================

async function novaUniversalAsk(question) {

    question =
        String(question || "").trim();


    if (!question)
        return;


    addMsg("user", question);

    $("#q").value = "";


    if (
        !DS ||
        !DS.rows ||
        !DS.rows.length
    ) {

        addMsg("ai", {

            text:
                "Upload a CSV or JSON dataset first, then I can analyze it."

        });

        return;

    }


    await think();


    remember(question);


    // --------------------------------------------------------
    // FIRST: LOCAL DATASET INTELLIGENCE
    // --------------------------------------------------------

    try {

        const local =
            novaLocalQuestion(question);


        if (local) {

            last = local;

            novaRememberConversation(
                question,
                local
            );

            addMsg("ai", local);

            return;

        }

    } catch (error) {

        console.error(
            "NOVA local intelligence error:",
            error
        );

    }


    // --------------------------------------------------------
    // SECOND: LOCAL EXISTING ANALYSIS ENGINE
    // --------------------------------------------------------

    try {

        let plan =
            analyzeQuestion(
                question,
                DS
            );


        plan.raw =
            question.toLowerCase();


        if (plan.intent) {

            const result =
                execute(plan);


            if (result) {

                last = result;

                ctx = {
                    plan: plan
                };

                novaRememberConversation(
                    question,
                    result
                );

                addMsg(
                    "ai",
                    result
                );

                return;

            }

        }

    } catch (error) {

        console.error(
            "NOVA local analysis error:",
            error
        );

    }


    // --------------------------------------------------------
    // THIRD: GEMINI
    // --------------------------------------------------------

    try {

        if (
            !AI_CONFIG ||
            !AI_CONFIG.endpoint
        ) {

            addMsg("ai", {

                text:
                    "I understand the dataset, but this question needs the AI reasoning layer. Connect the Gemini backend to answer it."

            });

            return;

        }


        const intelligence =
            typeof getDatasetIntelligenceSummary === "function"
                ? getDatasetIntelligenceSummary()
                : null;


        const conversation =
            NOVA_CONVERSATION.slice(-6);


        const response =
            await fetch(
                AI_CONFIG.endpoint,
                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({

                            question: question,

                            schema:
                                DS.cols.map(
                                    c => ({

                                        name: c,

                                        type:
                                            DS.meta[c].type

                                    })
                                ),

                            dataset:
                                intelligence,

                            conversation:
                                conversation

                        })

                }
            );


        if (!response.ok) {

            throw new Error(
                `AI server returned ${response.status}`
            );

        }


        const ai =
            await response.json();


        // ----------------------------------------------------
        // GENERAL AI TEXT
        // ----------------------------------------------------

        if (
            ai.answer &&
            !ai.intent
        ) {

            const result = {

                text:
                    ai.answer,

                bullets:
                    ai.bullets || null

            };


            last = result;

            novaRememberConversation(
                question,
                result
            );

            addMsg(
                "ai",
                result
            );

            return;

        }


        // ----------------------------------------------------
        // AI-GENERATED PLAN
        // ----------------------------------------------------

        if (ai.intent) {

            let plan =
                analyzeQuestion(
                    question,
                    DS
                );


            Object.assign(
                plan,
                ai
            );


            plan.raw =
                question.toLowerCase();


            try {

                const result =
                    execute(plan);


                if (result) {

                    last = result;

                    ctx = {
                        plan: plan
                    };

                    novaRememberConversation(
                        question,
                        result
                    );

                    addMsg(
                        "ai",
                        result
                    );

                    return;

                }

            } catch (error) {

                console.error(
                    "AI plan execution failed:",
                    error
                );

            }

        }


        // ----------------------------------------------------
        // AI RESPONSE FALLBACK
        // ----------------------------------------------------

        if (ai.answer) {

            const result = {

                text:
                    ai.answer,

                bullets:
                    ai.bullets || null

            };

            last = result;

            novaRememberConversation(
                question,
                result
            );

            addMsg(
                "ai",
                result
            );

            return;

        }


        throw new Error(
            "AI returned an empty response."
        );


    } catch (error) {

        console.error(
            "NOVA AI error:",
            error
        );


        // ----------------------------------------------------
        // FINAL FALLBACK
        // ----------------------------------------------------

        addMsg("ai", {

            text:
                "I couldn't confidently understand that question. Try asking about the dataset, its columns, statistics, trends, comparisons, rankings, or insights."

        });

    }

}


// ============================================================
// REPLACE ORIGINAL ASK FUNCTION
// ============================================================

ask = novaUniversalAsk;


// ============================================================
// UPDATE AI CONFIGURATION
// ============================================================

AI_CONFIG.endpoint = "/api/gemini";

AI_CONFIG.apiKey = "";


// ============================================================
// STARTUP MESSAGE
// ============================================================

console.log(
    `%cNOVA AI ${NOVA_AI_VERSION} ACTIVE`,
    "font-size:18px;font-weight:bold"
);

console.log(
    "Dataset intelligence:",
    typeof DS.intelligence !== "undefined"
);

console.log(
    "AI endpoint:",
    AI_CONFIG.endpoint
);

/* =========================================================
   NOVA SMART SPELLING & QUESTION CORRECTION
   Fixes common typing mistakes before AI analysis
   ========================================================= */

const NOVA_TYPO_MAP = {
  // Common analytics words
  "averge": "average",
  "avrage": "average",
  "avrg": "average",
  "avg": "average",

  "higest": "highest",
  "highestt": "highest",
  "hghest": "highest",
  "heighest": "highest",

  "lowestt": "lowest",
  "lowst": "lowest",
  "lowset": "lowest",

  "salry": "salary",
  "salar": "salary",
  "salery": "salary",
  "slary": "salary",

  "employe": "employee",
  "employes": "employees",
  "emplyee": "employee",
  "emplyees": "employees",
  "emploee": "employee",
  "emploees": "employees",

  "departmant": "department",
  "departement": "department",
  "deparment": "department",
  "deprtment": "department",

  "experiance": "experience",
  "experince": "experience",
  "expirience": "experience",

  "percentge": "percentage",
  "percantage": "percentage",
  "precentage": "percentage",
  "persentage": "percentage",

  "revenuee": "revenue",
  "revenu": "revenue",
  "revnue": "revenue",
  "revenuee": "revenue",

  "profit": "profit",
  "profitt": "profit",
  "profitt": "profit",

  "growthh": "growth",
  "growht": "growth",
  "groth": "growth",

  "monthh": "month",
  "mont": "month",
  "mnth": "month",

  "yearr": "year",
  "yer": "year",
  "yaer": "year",

  "dataa": "data",
  "dat": "data",

  "aboutt": "about",

  "showw": "show",
  "shwo": "show",

  "whichh": "which",
  "whcih": "which",

  "wher": "where",
  "waht": "what",
  "wat": "what",
  "whatt": "what",

  "howw": "how",

  "manyy": "many",

  "statstics": "statistics",
  "statisticss": "statistics",
  "statisitcs": "statistics",

  "insigts": "insights",
  "insghts": "insights",
  "insght": "insight",

  "comparee": "compare",
  "compar": "compare",

  "trendd": "trend",
  "trnd": "trend",

  "correlationn": "correlation",
  "corelation": "correlation",
  "correlaton": "correlation",

  "departmentt": "department",

  "highestpaid": "highest paid",
  "highest-paid": "highest paid",

  "lowstpaid": "lowest paid",
  "lowestpaid": "lowest paid",

  // Common question words
  "whos": "who",
  "whats": "what",
  "wht": "what",
  "wich": "which",
  "hw": "how",
  "doesnt": "does not",

  // Common dataset words
  "colum": "column",
  "colmn": "column",
  "cloumn": "column",
  "columns": "columns",

  "roww": "row",
  "rows": "rows",

  "numbr": "number",
  "numberr": "number",

  "totaly": "totally",
  "totl": "total",

  "countt": "count",

  // Comparison words
  "moree": "more",
  "les": "less",
  "larger": "larger",
  "smaler": "smaller",
  "smalller": "smaller",

  // Common verbs
  "calcluate": "calculate",
  "calculte": "calculate",
  "calcualte": "calculate",

  "analize": "analyze",
  "anlyze": "analyze",
  "analyse": "analyze",

  "explainn": "explain",
  "exaplin": "explain",

  "descrbe": "describe",
  "describ": "describe",

  "findd": "find",
  "fin": "find",

  "givee": "give",
  "giv": "give",

  "telll": "tell",

  "listt": "list"
};


/* ---------- Normalize individual word ---------- */

function novaNormalizeWord(word) {

  const clean = word.toLowerCase();

  if (NOVA_TYPO_MAP[clean]) {
    return NOVA_TYPO_MAP[clean];
  }

  return word;
}


/* ---------- Correct common typos ---------- */

function novaCorrectCommonTypos(question) {

  if (!question || typeof question !== "string") {
    return question;
  }

  return question
    .split(/(\s+)/)
    .map(part => {

      if (/^\s+$/.test(part)) {
        return part;
      }

      // Keep punctuation separate
      const match = part.match(/^([^a-zA-Z]*)([a-zA-Z]+)([^a-zA-Z]*)$/);

      if (!match) {
        return part;
      }

      const before = match[1];
      const word = match[2];
      const after = match[3];

      const corrected = novaNormalizeWord(word);

      return before + corrected + after;
    })
    .join("");
}


/* =========================================================
   DATASET-AWARE SPELLING CORRECTION
   If user types a slightly wrong column name,
   match it against actual dataset columns.
   ========================================================= */

function novaSimilarity(a, b) {

  a = String(a).toLowerCase();
  b = String(b).toLowerCase();

  if (a === b) return 1;

  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;

  if (!longer.length) return 1;

  // Simple edit-distance calculation
  const matrix = [];

  for (let i = 0; i <= shorter.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= longer.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= shorter.length; i++) {

    for (let j = 1; j <= longer.length; j++) {

      if (shorter[i - 1] === longer[j - 1]) {

        matrix[i][j] = matrix[i - 1][j - 1];

      } else {

        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );

      }
    }
  }

  const distance = matrix[shorter.length][longer.length];

  return 1 - distance / longer.length;
}


function novaCorrectDatasetTerms(question) {

  if (!question || !DS || !Array.isArray(DS.cols)) {
    return question;
  }

  if (!DS.cols.length) {
    return question;
  }

  let result = question;

  DS.cols.forEach(column => {

    if (!column) return;

    const columnName = String(column);
    const words = columnName.split(/\s+/);

    words.forEach(expectedWord => {

      if (expectedWord.length < 4) return;

      const pattern = /\b[a-zA-Z]+\b/g;

      result = result.replace(pattern, word => {

        const similarity = novaSimilarity(word, expectedWord);

        /*
          Only correct reasonably close words.
          This prevents unrelated words from being
          changed accidentally.
        */

        if (
          similarity >= 0.82 &&
          word.toLowerCase() !== expectedWord.toLowerCase()
        ) {
          return expectedWord;
        }

        return word;
      });

    });

  });

  return result;
}


/* =========================================================
   MAIN QUESTION CORRECTOR
   ========================================================= */

function novaCorrectQuestion(question) {

  if (!question || typeof question !== "string") {
    return question;
  }

  let corrected = question.trim();

  // Step 1 — common typo dictionary
  corrected = novaCorrectCommonTypos(corrected);

  // Step 2 — dataset column awareness
  corrected = novaCorrectDatasetTerms(corrected);

  return corrected;
}


/* =========================================================
   SHOW CORRECTED QUESTION IN CONSOLE
   Useful for testing.
   ========================================================= */

function novaLogCorrection(original, corrected) {

  if (
    original &&
    corrected &&
    original.trim().toLowerCase() !== corrected.trim().toLowerCase()
  ) {

    console.log(
      "NOVA SPELLING CORRECTION:",
      original,
      "→",
      corrected
    );

  }
}


/* =========================================================
   NOVA BRAIN v3
   One routing layer. Replaces all earlier ask() wrappers.
   Works fully offline on the loaded data.
   Gemini backend is optional (general questions only).
   ========================================================= */
(function () {
  const NB = { remoteDown: false, cacheDS: null, known: new Set(), targets: [], dsWords: new Set() };

  /* ---------- text helpers ---------- */
  const stem = w => String(w).toLowerCase().replace(/ies$/, 'y').replace(/(s|x|ch|sh)es$/, '$1').replace(/s$/, '');
  const norm = s => String(s || '').toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/'s\b/g, '').replace(/[^a-z0-9%₹<>.\-\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const toks = s => (norm(s).match(/[a-z0-9]+/g) || []);
  const plural = w => /[^aeiou]y$/i.test(w) ? w.slice(0, -1) + 'ies' : /s$/i.test(w) ? w : w + 's';
  const typeName = t => ({ numeric: 'number', categorical: 'text', boolean: 'yes/no', date: 'date' }[t] || t);
  const list = (a, n = 12) => a.length > n ? a.slice(0, n).join(', ') + `, and ${a.length - n} more` : a.join(', ');
  const R = () => DS.rows;
  const label = () => (typeof labelCol === 'function' ? labelCol() : null);
  const noun = () => { const L = label(); return L ? L.toLowerCase() + 's' : 'rows'; };

  function dist(a, b) {
    const al = a.length, bl = b.length; if (!al) return bl; if (!bl) return al;
    const d = []; for (let i = 0; i <= al; i++) d[i] = [i]; for (let j = 1; j <= bl; j++) d[0][j] = j;
    for (let i = 1; i <= al; i++) for (let j = 1; j <= bl; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] == b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] == b[j - 2] && a[i - 2] == b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
    return d[al][bl];
  }

  /* ---------- spelling correction ---------- */
  const COMMON = `a an the is are was were be been am do does did can could would should will shall may might must i me my we our you your he she it its they them their this that these those there here of in on at to for from with by about as into over under between among than then so if or and but not no yes also just only very too more most less least some any all each every both other another such same what whats which who whom whose when where why how many much few lot list tell show give get got make find see look say please hi hello hey ok okay thanks thank one two three four five six seven eight nine ten first last next top bottom best worst good bad new old big small high low long short large full whole part per out up down off again once form have has had want need like know let us name names type types kind kinds before after during since until while above below`.split(/\s+/);
  const COMMONSET = new Set(COMMON);
  const FILL = new Set([...COMMON, 'summary', 'details', 'detail', 'info', 'information', 'stats', 'statistics', 'describe', 'explain', 'about', 'insight', 'overview', 'values', 'value', 'data', 'dataset', 'column', 'field']);
  const TARGETS = `average highest lowest maximum minimum median total count number percentage percent statistics insights insight compare comparison trend trends correlation relationship describe description explain summary summarize overview dataset contain contains information columns column records record missing duplicates duplicate quality unique distinct different visualize chart graph salary salaries employee employees department departments experience revenue profit growth sales price quantity category categories region country city cities location gender student students marks score grade remote product customer customers order orders year years month months date which where about what show tell list give find who whose data rows row between across greater less higher lower above below under over equal each every per most least highest paid earning earn earns income population age status`.split(/\s+/);
  const TYPO = Object.assign({}, typeof NOVA_TYPO_MAP === 'object' ? NOVA_TYPO_MAP : {}, {
    wat: 'what', wats: 'what is', whts: 'what is', abt: 'about', ths: 'this', thsi: 'this', teh: 'the', hte: 'the', pls: 'please', plz: 'please',
    descibe: 'describe', discribe: 'describe', desribe: 'describe', descripe: 'describe', dscribe: 'describe', summery: 'summary', sumary: 'summary',
    colums: 'columns', colum: 'column', coloumn: 'column', coloumns: 'columns', datset: 'dataset', dataste: 'dataset', datasett: 'dataset', daata: 'data',
    maxium: 'maximum', maxmum: 'maximum', minmum: 'minimum', minimun: 'minimum', avrg: 'average', avarage: 'average', averege: 'average', averag: 'average',
    salry: 'salary', saleries: 'salaries', salries: 'salaries', slaary: 'salary', depratment: 'department', departmnt: 'department', dept: 'department', depts: 'departments',
    employe: 'employee', emploee: 'employee', empolyee: 'employee', emp: 'employee', emps: 'employees', exp: 'experience', yrs: 'years', yr: 'year', mnth: 'month',
    wich: 'which', whihc: 'which', hwo: 'who', hw: 'how', hou: 'how', mny: 'many', manay: 'many', nubmer: 'number', numbr: 'number', cnt: 'count',
    totl: 'total', toal: 'total', tren: 'trend', trnd: 'trend', corelation: 'correlation', corelate: 'correlate', insigts: 'insights', insihts: 'insights'
  });
  delete TYPO.fin; delete TYPO.les; delete TYPO.dat; delete TYPO.mont; delete TYPO.giv; delete TYPO.compar;
  TYPO.dat = 'data';

  function buildVocab() {
    if (NB.cacheDS === DS) return; NB.cacheDS = DS;
    const known = new Set([...COMMON, ...TARGETS]), ds = new Set(), t = new Set(TARGETS);
    const addWords = s => (String(s).toLowerCase().match(/[a-z]{3,}/g) || []).forEach(w => { ds.add(w); known.add(w); if (w.length >= 4) t.add(w); });
    DS.cols.forEach(c => { addWords(String(c).replace(/([a-z])([A-Z])/g, '$1 $2')); const m = DS.meta[c];
      if ((m.type == 'categorical' || m.type == 'boolean') && m.vals) m.vals.slice(0, 3000).forEach(addWords); });
    NB.known = known; NB.targets = [...t]; NB.dsWords = ds;
  }
  function fixWord(w) {
    const lw = w.toLowerCase();
    if (NB.dsWords.has(lw)) return w;
    if (TYPO[lw]) return TYPO[lw];
    if (lw.length < 4 || NB.known.has(lw)) return w;
    const max = lw.length <= 6 ? 1 : 2; let best = null, bd = 9, tie = false;
    for (const v of NB.targets) {
      if (Math.abs(v.length - lw.length) > max) continue;
      const d = dist(lw, v); if (d > max) continue;
      if (d == 2 && v[0] != lw[0]) continue;
      if (d < bd) { bd = d; best = v; tie = false; } else if (d == bd && v != best) tie = true;
    }
    return best && !tie ? best : w;
  }
  function correct(q) { buildVocab(); return String(q).replace(/[A-Za-z]+/g, fixWord); }

  /* ---------- column matching ---------- */
  const GENERIC = new Set(['name', 'date', 'number', 'type', 'code', 'id', 'no', 'count', 'total', 'status', 'year', 'month', 'value', 'of', 'the', 'in', 'per', 'and']);
  function colWords(c) {
    const base = String(c).replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).map(stem), n = String(c).toLowerCase(), syn = [];
    if (/salar|pay|income|wage|ctc|compens|earning/.test(n)) syn.push('pay', 'paid', 'earn', 'earning', 'income', 'wage', 'ctc', 'package', 'compensation', 'salary');
    if (/exp|senior/.test(n)) syn.push('experience', 'seniority');
    if (/dept|department/.test(n)) syn.push('dept', 'team');
    if (/city|location|place/.test(n)) syn.push('city', 'location', 'place');
    if (/remote|wfh/.test(n)) syn.push('wfh', 'remote');
    if (/join|hire|start/.test(n) && /date|time/.test(n)) syn.push('joined', 'joining', 'hired');
    return { base, syn: syn.map(stem) };
  }
  function matchCols(text) {
    const tk = toks(text).map(stem), set = new Set(tk), hit = new Map();
    DS.cols.forEach(c => { const { base, syn } = colWords(c); let pos = -1;
      if (base.length && base.every(w => set.has(w))) pos = Math.min(...base.map(w => tk.indexOf(w)));
      else { const s = syn.find(w => set.has(w)); if (s) pos = tk.indexOf(s); }
      if (pos >= 0) hit.set(c, pos); });
    DS.cols.forEach(c => { if (hit.has(c)) return; const sig = colWords(c).base.filter(w => !GENERIC.has(w) && w.length >= 4);
      const w = sig.find(x => set.has(x)); if (w) hit.set(c, tk.indexOf(w) + 0.5); });
    return [...hit].sort((a, b) => a[1] - b[1]).map(x => x[0]);
  }
  const typeOf = c => DS.meta[c].type;

  /* ---------- result builders ---------- */
  const numStats = c => { const v = nums(R(), c).sort((a, b) => a - b); if (!v.length) return null; const n = v.length, mean = v.reduce((a, b) => a + b, 0) / n;
    const sd = n > 1 ? Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1)) : 0; return { n, min: v[0], max: v[n - 1], mean, median: medianData(v), sd, sum: v.reduce((a, b) => a + b, 0) }; };
  const freq = c => { const m = new Map(); R().forEach(r => { const k = r[c]; if (k == null) return; m.set(k, (m.get(k) || 0) + 1); }); return [...m].sort((a, b) => b[1] - a[1]); };

  function colSummary(c) {
    const t = typeOf(c);
    if (t == 'numeric') { const s = numStats(c); if (!s) return { text: `${c} has no valid numbers.` };
      return { text: `${c}: min ${fmt(c, s.min)}, average ${fmt(c, s.mean)}, median ${fmt(c, s.median)}, max ${fmt(c, s.max)} (${s.n} values).` }; }
    if (t == 'boolean') { const f = freq(c), tot = f.reduce((a, b) => a + b[1], 0); return { text: `${c}: ${f.map(([k, v]) => `${fmt(c, k)} ${(v / tot * 100).toFixed(0)}% (${v})`).join(', ')}.` }; }
    if (t == 'date') { const d = R().map(r => r[c]).filter(Boolean).map(x => new Date(x)).filter(x => !isNaN(x)).sort((a, b) => a - b);
      return d.length ? { text: `${c} runs from ${d[0].toISOString().slice(0, 10)} to ${d.at(-1).toISOString().slice(0, 10)}.` } : { text: `${c} has no valid dates.` }; }
    const f = freq(c); if (c == label()) return { text: `${c} has ${f.length} distinct values across ${R().length} rows.` };
    return { text: `${c} has ${f.length} values. Most common: ${f.slice(0, 4).map(([k, v]) => `${k} (${v})`).join(', ')}.` };
  }

  const DOMAINS = [[/employee|salary|department|designation|payroll|hire/, 'employee (HR) data'], [/student|marks|grade|school|course|subject|gpa|class/, 'student data'],
    [/sales|revenue|order|product|customer|price|quantity|invoice|discount/, 'sales data'], [/patient|disease|diagnos|hospital|doctor|treatment|symptom/, 'healthcare data'],
    [/stock|ticker|volume|close|dividend|portfolio/, 'financial market data'], [/movie|film|genre|director|imdb/, 'movie data'], [/flight|airline|passenger|airport|ticket/, 'travel data'],
    [/house|property|bedroom|rent|sqft|bathroom/, 'real-estate data'], [/covid|death|vaccin|population|country|gdp/, 'population / public-data'], [/match|player|goal|wicket|innings|league/, 'sports data']];
  function overview() {
    const cols = DS.cols, txt = cols.join(' ').toLowerCase(); let best = null, bs = 0;
    DOMAINS.forEach(([re, name]) => { const g = new RegExp(re.source, 'g'); const sc = (txt.match(g) || []).length; if (sc > bs) { bs = sc; best = name; } });
    const L = label(), ex = cols.filter(c => c != L);
    let t = `This is ${best || 'tabular data'}. It has ${R().length.toLocaleString('en-IN')} rows and ${cols.length} columns: ${cols.join(', ')}.`;
    if (L) t += ` Each row is one ${L.toLowerCase()}, with ${list(ex.map(c => c.toLowerCase()), 8)}.`;
    return { text: t };
  }
  function missingInfo() {
    const m = DS.cols.map(c => [c, DS.meta[c].miss]).filter(x => x[1] > 0);
    if (!m.length) return 'No missing values.';
    const tot = m.reduce((a, b) => a + b[1], 0);
    return `${tot} missing ${tot == 1 ? 'value' : 'values'}: ${m.map(([c, n]) => `${c} (${n})`).join(', ')}.`;
  }
  function dupCount() { const s = new Set(); let d = 0; R().forEach(r => { const k = JSON.stringify(DS.cols.map(c => r[c])); if (s.has(k)) d++; else s.add(k); }); return d; }

  const rowsTbl = (rs, cs) => ({ head: cs, rows: rs.map(r => cs.map(c => fmt(c, r[c]))) });

  /* ---------- local routes (each returns a result or null) ---------- */
  const has = (q, re) => re.test(q);
  const ANALYSIS = /\b(average|mean|total|sum|highest|lowest|maximum|minimum|max|min|top|bottom|compare|comparison|percent|percentage|trend|median|by|per|each|greater|less|more|above|below|over|under|best|worst)\b/;

  function meta(q) {
    if (/^(hi+|hello+|hey+|hola|yo|sup|good (morning|afternoon|evening))\b/.test(q) && q.split(' ').length <= 4) return { text: 'Hi. Ask me anything about your data.' };
    if (/^(thanks?|thank you|thx|ty|ok thanks|great|nice|cool|awesome)\b/.test(q) && q.split(' ').length <= 4) return { text: "You're welcome." };
    if (/\b(who|what) are you\b|\byour name\b|who made you|who built you/.test(q)) return { text: "I'm NOVA, your data analyst. I answer from the dataset you loaded." };
    if (/\b(help|what can you do|capabilit|how do i use|how to use|what can i ask)\b/.test(q) && !matchCols(q).length)
      return { text: 'Ask about your data in plain words.', bullets: ['What is this data about?', 'Average / highest / lowest of a column', 'Compare a number by a category', 'Top 5 by a column', 'Missing values, duplicates, correlations', 'Trends over time, charts, insights'] };
    return null;
  }
  function preview(q) {
    const m = q.match(/^(?:show|display|give|see|view|print|preview)?\s*(?:me\s*)?(?:the\s*|this\s*)?(first|top|last|sample)?\s*(\d+)?\s*(rows?|records?|entries|data|dataset|table|preview)?$/);
    if (!m || !(m[3] || m[1]) || /^(data|dataset)$/.test(q)) return null; if (!m[3] && !m[1]) return null;
    const n = Math.min(+m[2] || 5, 15), rs = m[1] == 'last' ? R().slice(-n) : R().slice(0, n);
    return { text: `${m[1] == 'last' ? 'Last' : 'First'} ${rs.length} rows.`, table: rowsTbl(rs, DS.cols) };
  }
  function overviewQ(q, cols) {
    const dataW = /\b(data|dataset|database|file|table|sheet|csv|spreadsheet|records?|information|info)\b/.test(q);
    const strong = /\b(about|describe|description|contain|contains|containing|explain|represent|overview|purpose|kind of|type of|tell me about|content|contents)\b/.test(q);
    const weak = /\b(mean|meaning|have|has|include|includes|inside|tell|show|know|what is|whats|details?)\b/.test(q);
    if (/\b(insight|key finding|summari[sz]e|interesting|finding)/.test(q) || ANALYSIS.test(q) || /\b(column|field|row|missing|duplicate|correlat|chart|graph|plot|quality)/.test(q)) return null;
    if (/^(what|whats)( is| s)? (in|inside)( this| the| that)?( data| dataset| file| table| sheet)?$/.test(q) || /^(what is|what s|whats|describe|explain|tell me about)( this| it| that| the data)?( about)?$/.test(q) || /^what is (this|it) about$/.test(q)) return overview();
    if (dataW && (strong || (weak && !cols.length))) return overview();
    return null;
  }
  function summaryQ(q) {
    if (/^(give me |show me |get |provide )?(a |the )?(quick |short |brief )?(summary|overview)( of (the |this )?(data|dataset|file))?$/.test(q)) return execute({ intent: 'insights', filters: [], raw: q });
    return null;
  }
  function structure(q, cols) {
    if (/\b(how many|number of|count of|total)\b.*\b(column|field|attribute|variable)s?\b/.test(q) || /\b(column|field)s? count\b/.test(q)) return { text: `${DS.cols.length} columns.` };
    if (/^(how many|number of|count of|total( number of)?)\s*(rows|records|entries|lines|data points|observations)\b/.test(q) || /\b(size|shape|length) of (the |this )?(data|dataset|table)\b/.test(q) || /^(how (big|large) is (the |this )?(data|dataset))/.test(q)) return { text: `${R().length.toLocaleString('en-IN')} rows and ${DS.cols.length} columns.` };
    if (/\b(columns?|fields?|attributes?|variables?|headers?|features?)\b/.test(q) && /\b(what|which|list|name|show|give|have|available|all|are|contain|include|tell|see)\b/.test(q) && !ANALYSIS.test(q) && !cols.length)
      return { text: `${DS.cols.length} columns: ${DS.cols.map(c => `${c} (${typeName(typeOf(c))})`).join(', ')}.` };
    return null;
  }
  function quality(q) {
    if (/\b(missing|null|empty|blank|incomplete|nan|na)\b/.test(q) && !ANALYSIS.test(q.replace(/\btotal\b/, ''))) return { text: missingInfo() };
    if (/\bduplicat/.test(q) || /\brepeated rows\b/.test(q)) { const d = dupCount(); return { text: d ? `${d} duplicate rows.` : 'No duplicate rows.' }; }
    if (/\b(data quality|clean|quality|reliable|issues|errors?)\b/.test(q)) { const d = dupCount(); return { text: `${missingInfo()} ${d ? d + ' duplicate rows.' : 'No duplicate rows.'}` }; }
    return null;
  }
  function relate(q, orig, cols) {
    const nc = (cols || []).filter(c => typeOf(c) == 'numeric');
    if (/\b(correlat|relationship|related|depend|influence|impact|affect)/.test(q) && nc.length >= 2) { const r = corr(nc[0], nc[1]), a = Math.abs(r);
      const strength = a > .7 ? 'strong' : a > .4 ? 'moderate' : a > .2 ? 'weak' : 'no clear'; return { text: `${nc[0]} and ${nc[1]}: ${strength} ${a > .2 ? (r > 0 ? 'positive' : 'negative') + ' ' : ''}correlation (r = ${r.toFixed(2)}).` }; }
    if (/\b(correlat|relationship|related|depend|influence|impact|affect)/.test(q)) { try { const r = novaCorrelationAnswer(orig); if (r) return slim(r); } catch (e) { console.error(e); } }
    if (/\b(graph|chart|plot|visuali[sz]e|draw|diagram|pie|histogram)\b/.test(q)) { try { const r = novaVisualAnswer(orig); if (r) return slim(r); } catch (e) { console.error(e); } }
    return null;
  }
  function stats(q, cols) {
    const numCols = cols.filter(c => typeOf(c) == 'numeric'), N = DS.cols.filter(c => typeOf(c) == 'numeric');
    const nc = numCols[0] || (N.length == 1 ? N[0] : null);
    const w = /\bmedian\b/.test(q) ? 'median' : /\b(standard deviation|deviation|std|variance|stdev)\b/.test(q) ? 'sd' : /\b(range|spread)\b/.test(q) ? 'range' : null;
    if (w && nc) { const s = numStats(nc); if (!s) return null;
      if (w == 'median') return { text: `The median ${nc.toLowerCase()} is ${fmt(nc, s.median)}.` };
      if (w == 'sd') return { text: `The standard deviation of ${nc.toLowerCase()} is ${fmt(nc, s.sd)}.` };
      return { text: `${nc} ranges from ${fmt(nc, s.min)} to ${fmt(nc, s.max)} (spread ${fmt(nc, s.max - s.min)}).` }; }
    const cat = cols.find(c => ['categorical', 'boolean'].includes(typeOf(c)) && c != label());
    if (cat && /\b(most|least)\s+(common|frequent|popular)\b|\bmode\b|\bcommonest\b/.test(q)) { const f = freq(cat); const pick = /\bleast\b/.test(q) ? f.at(-1) : f[0];
      return { text: `${/\bleast\b/.test(q) ? 'Least' : 'Most'} common ${cat.toLowerCase()}: ${fmt(cat, pick[0])} (${pick[1]} of ${R().length}).` }; }
    return null;
  }
  function uniques(q, cols) {
    const cat = cols.filter(c => ['categorical', 'boolean'].includes(typeOf(c)));
    const q2 = q.replace(/\b(in|of|from) (the|this) (data|dataset|file|table|sheet)\b/g, '').replace(/\s+/g, ' ');
    const L = label();
    if (cat.length && !cat.includes(L) && /\b(how many|number of|count of)\b/.test(q2) && !/\b(by|per|each|every|in|from|with|where|who|whose|have|has|are|earn|earning|paid|working|work)\b/.test(q2.replace(/\bhow many\b|\bare there\b|\bthere are\b/g, '')) ) {
      const c = cat[0], f = freq(c); return { text: `${f.length} ${plural(c.toLowerCase())}: ${list(f.map(x => fmt(c, x[0])), 15)}.` }; }
    if (/\b(unique|distinct|different|various|types of|kinds of|categories|available|options)\b|\b(list|show|give|what are|which are|name)\b.*\b(all|every)\b|^(what|which) (are )?(the )?[a-z ]+$/.test(q2) && !ANALYSIS.test(q2)) {
      const c = cat.find(x => x != L); if (c) { const f = freq(c); return { text: `${c} (${f.length}): ${list(f.map(x => fmt(c, x[0])), 20)}.` }; }
      if (cat.includes(L) && /\b(list|all|show|names?)\b/.test(q2)) { const v = R().map(r => r[L]).filter(Boolean); return { text: `${L} (${v.length}): ${list(v, 15)}.` }; }
    }
    return null;
  }

  function colOnly(n, cols) {
    if (cols.length != 1) return null;
    const own = new Set(); cols.forEach(c => { const w = colWords(c); w.base.concat(w.syn).forEach(x => own.add(x)); });
    const left = toks(n).filter(w => !FILL.has(w) && !own.has(stem(w)));
    return left.length == 0 && !ANALYSIS.test(n) && !/\b(how many|number of|count)\b/.test(n) ? colSummary(cols[0]) : null;
  }

  /* ---------- engine + follow-ups ---------- */
  function slim(res) { if (res && res.chart && res.table) { res = Object.assign({}, res); delete res.table; } return res; }
  function runEngine(fixed) {
    const p = analyzeQuestion(fixed, DS); p.raw = fixed.toLowerCase();
    if (p.intent == 'explain') return { res: last ? { text: last.calc || 'This answer was read directly from the data.' } : { text: 'Ask a question first, then I can explain it.' }, keep: true };
    if (p.intent == 'evidence') return { res: last && last.used && last.used.length ? { text: `Showing ${Math.min(15, last.used.length)} of ${last.used.length} rows used for the answer.`, table: tbl(DS.cols, last.used.slice(0, 15).map(r => DS.cols.map(c => fmt(c, r[c])))) } : { text: 'There are no underlying rows to show yet.' }, keep: true };
    if (p.intent == 'concise') return { res: last ? { text: last.text } : { text: 'Ask a question first.' }, keep: true };
    if (!p.intent) return null;
    if (p.intent == 'agg' && p.groupBy && !p.agg && p.column && /revenue|sales|profit|amount|quantity|units|orders|cost|expense|spend|total/i.test(p.column) && !/\b(average|mean|avg|typical)\b/.test(p.raw)) p.agg = 'sum';
    const res = execute(p); if (!res) return null;
    return { res: slim(res), plan: res.noCtx ? null : p };
  }
  function followUp(fixed) {
    if (!ctx || !ctx.plan || !['agg', 'extreme', 'topn'].includes(ctx.plan.intent)) return null; const q = norm(fixed);
    if (q.split(' ').length > 7 || !/^(and|what about|how about|now|also|then|ok|okay)?\s*(the\s*)?(highest|lowest|maximum|minimum|max|min|average|total|sum|count|top|bottom|best|worst|most|least)/.test(q.replace(/^(and|what about|how about|now|also|then|ok|okay)\s+/, '$&'))) return null;
    const p = JSON.parse(JSON.stringify(ctx.plan)); let ch = false;
    const hi = /\b(highest|maximum|max|largest|most|top|best|biggest)\b/.test(q), lo = /\b(lowest|minimum|min|smallest|least|bottom|worst)\b/.test(q);
    if (lo && !hi) { p.sup = 'lo'; ch = true; } else if (hi) { p.sup = 'hi'; ch = true; }
    const ag = /\b(average|mean)\b/.test(q) ? 'average' : /\b(total|sum)\b/.test(q) ? 'sum' : /\b(count|how many)\b/.test(q) ? 'count' : null;
    if (ag) { p.agg = ag; if (p.intent == 'extreme' || p.intent == 'topn') p.intent = 'agg'; ch = true; }
    if (!ch) return null; p.raw = q; const res = execute(p); return res ? { res: slim(res), plan: p } : null;
  }

  /* ---------- row lookup & value summary ---------- */
  function rowLookup(fixed, cols) {
    const L = label(); if (!L) return null; const lq = norm(fixed), want = cols.filter(c => c != L);
    let rows = R().filter(r => r[L] && lq.includes(String(r[L]).toLowerCase()));
    if (!rows.length) { const colTok = new Set(); DS.cols.forEach(c => { const w = colWords(c); w.base.concat(w.syn).forEach(x => colTok.add(x)); });
      const qt = new Set(toks(fixed).filter(w => w.length >= 3 && !COMMONSET.has(w) && !FILL.has(w) && !colTok.has(stem(w))));
      rows = R().filter(r => r[L] && String(r[L]).toLowerCase().split(/\s+/).some(w => qt.has(w))); }
    if (!rows.length || rows.length > 25) return null;
    if (want.length) {
      if (rows.length == 1) { const r = rows[0]; return { text: want.map(c => `${r[L]}'s ${c.toLowerCase()}: ${fmt(c, r[c])}`).join('. ') + '.', used: rows }; }
      return { text: `${rows.length} matches for that name.`, table: rowsTbl(rows, [L, ...want]), used: rows };
    }
    return rows.length == 1 ? { text: DS.cols.filter(c => c != L).map(c => `${c}: ${fmt(c, rows[0][c])}`).join(', ') + '.', used: rows }
      : { text: `${rows.length} matches.`, table: rowsTbl(rows.slice(0, 10), DS.cols), used: rows };
  }
  function valueSummary(fixed) {
    const lq = ' ' + norm(fixed) + ' ', L = label();
    for (const c of DS.cols) { if (c == L || !['categorical', 'boolean'].includes(typeOf(c))) continue;
      const v = (DS.meta[c].vals || []).find(x => lq.includes(' ' + String(x).toLowerCase() + ' ')); if (v === undefined) continue;
      const rs = filterData(R(), [{ c, op: '=', v }]), N = DS.cols.filter(x => typeOf(x) == 'numeric');
      let t = `${rs.length} ${noun()} with ${c.toLowerCase()} ${v} (${(rs.length / R().length * 100).toFixed(0)}%).`;
      N.slice(0, 2).forEach(n => { const a = averageData(rs, n); if (a != null) t += ` Average ${n.toLowerCase()}: ${fmt(n, a)}.`; });
      return { text: t, used: rs }; }
    return null;
  }

  /* ---------- optional Gemini backend ---------- */
  async function remote(q) {
    if (!AI_CONFIG || !AI_CONFIG.endpoint || NB.remoteDown) return null;
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 9000);
    try {
      const r = await fetch(AI_CONFIG.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctl.signal,
        body: JSON.stringify({ question: q, schema: DS.cols.map(c => ({ name: c, type: DS.meta[c].type })), dataset: typeof getDatasetIntelligenceSummary == 'function' ? getDatasetIntelligenceSummary() : null, conversation: (typeof NOVA_CONVERSATION != 'undefined' ? NOVA_CONVERSATION : []).slice(-6) }) });
      if (r.status == 404 || r.status == 405) { NB.remoteDown = true; return null; }
      if (!r.ok) return null; return await r.json();
    } catch (e) { if (e.name != 'AbortError') NB.remoteDown = true; return null; } finally { clearTimeout(timer); }
  }

  function suggestions() {
    const s = [...document.querySelectorAll('#chips [data-q]')].map(b => b.dataset.q).slice(0, 4);
    return { text: "I couldn't match that to your data. Try one of these:", bullets: s.length ? s : ['What is this data about?', 'Show statistics', 'Generate insights'] };
  }

  /* ---------- main ---------- */
  function finish(q, res, plan) {
    last = res; if (plan) ctx = { plan };
    try { if (typeof novaRememberConversation == 'function') novaRememberConversation(q, res); } catch (e) {}
    addMsg('ai', res);
  }
  async function nbAsk(raw) {
    raw = String(raw == null ? '' : raw).trim(); if (!raw) return;
    let q = raw;
    if (q == '@compare' || q == '@trend') {
      const N = DS.cols.filter(c => DS.meta[c].type == 'numeric'), C = DS.cols.filter(c => c != label() && DS.meta[c].type == 'categorical');
      q = q == '@compare' ? (N[0] && C[0] ? `Compare average ${N[0]} by ${C[0]}` : 'Show statistics') : 'What is the trend over time';
    }
    addMsg('user', q); $('#q').value = '';
    if (!DS.rows.length) return addMsg('ai', { text: 'Upload a CSV or JSON dataset first, then I can analyze it.' });
    await think(); remember(q);
    let fixed = q; try { fixed = correct(q); } catch (e) { console.error(e); }
    if (fixed.toLowerCase() != q.toLowerCase()) console.log('NOVA corrected:', q, '→', fixed);
    const n = norm(fixed);
    try {
      let r = meta(n); if (r) return finish(q, r);
      const eng0 = /\b(how did you|explain (how|this answer|the answer|the result|the calculation|your)|calculation|data behind|which rows|just the answer|only the answer|short answer)\b/.test(n);
      if (eng0) { const e = runEngine(fixed); if (e) { addMsg('ai', e.res); return; } }
      const cols = matchCols(fixed);
      r = preview(n) || colOnly(n, cols) || summaryQ(n) || overviewQ(n, cols) || structure(n, cols) || quality(n) || relate(n, fixed, cols) || stats(n, cols) || uniques(n, cols);
      if (r) return finish(q, r);
      const named = rowLookup(fixed, cols); if (named && !ANALYSIS.test(n)) return finish(q, named);
      const followLike = /^(and|also|what about|how about|now|then|same|for|in|only|just|what if|ok|okay)\b/.test(n) || n.split(' ').length <= 3, savedCtx = ctx;
      if (!followLike) ctx = null;
      let e; try { e = runEngine(fixed) || followUp(fixed); } finally { ctx = savedCtx; }
      if (e) { if (e.keep) { addMsg('ai', e.res); return; } return finish(q, e.res, e.plan); }
      r = valueSummary(fixed); if (r) return finish(q, r);
      const ai = await remote(q);
      if (ai) {
        if (ai.intent) { const p = Object.assign(analyzeQuestion(fixed, DS), ai); p.raw = n; try { const res = execute(p); if (res && !(res.text || '').startsWith("I can't answer")) return finish(q, slim(res), res.noCtx ? null : p); } catch (err) { console.error(err); } }
        if (ai.answer) return finish(q, { text: String(ai.answer), bullets: Array.isArray(ai.bullets) && ai.bullets.length ? ai.bullets : null });
      }
      const nonNumCols = cols.filter(c => c != label());
      if (cols.length) return finish(q, colSummary((nonNumCols[0] || cols[0])));
      if (/^(what|who|when|where|why|how|which|is|are|can|does|do|tell|explain)\b/.test(n) && !ai && NB.remoteDown) {
        const s = suggestions(); s.text = "That isn't something I can find in this data. Try one of these:"; return finish(q, s); }
      return finish(q, suggestions());
    } catch (err) {
      console.error('NOVA error:', err);
      addMsg('ai', suggestions());
    }
  }
  ask = nbAsk;
  window.novaTestSpelling = q => { const c = correct(q); console.log('Original :', q, '\nCorrected:', c); return c; };
  window.__nbAsk = nbAsk; window.__nbCorrect = correct;
  console.log('NOVA BRAIN v3 active');
})();
