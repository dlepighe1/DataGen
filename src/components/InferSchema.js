/**
 * Infer a DataGen schema from a sample CSV — entirely in the browser.
 *
 * The privacy story is the whole point. The file is read with FileReader, parsed here,
 * reduced to *statistics* (bounds, mean, std, category weights, correlations), and then
 * thrown away. The raw rows are never uploaded, never stored, and never touch the API.
 * What leaves this module is a schema — a description of the data, not the data.
 *
 * That keeps DataGen schema-first: the sample only writes the schema, and the engine
 * still generates from the schema alone.
 */

const MAX_SAMPLE_ROWS = 5000;      // enough for stable statistics; keeps the UI instant
const MAX_CATEGORY_LEVELS = 25;    // beyond this it is free text, not a category
const CATEGORY_RATIO = 0.5;        // distinct/total below this looks categorical

/** RFC-4180-ish CSV parser: handles quoted fields, escaped quotes, and CRLF. */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 1; }
        else inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') inQuotes = true;
    else if (char === ',') { row.push(field); field = ''; }
    else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field);
      if (row.some(c => c !== '')) rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  row.push(field);
  if (row.some(c => c !== '')) rows.push(row);

  if (!rows.length) return { headers: [], records: [] };
  const headers = rows[0].map(h => h.trim());
  const records = rows.slice(1, MAX_SAMPLE_ROWS + 1)
    .filter(r => r.length === headers.length)
    .map(r => Object.fromEntries(headers.map((h, i) => [h, r[i].trim()])));
  return { headers, records };
}

const isBlank = v => v === '' || v == null || v.toLowerCase?.() === 'null' || v.toLowerCase?.() === 'na';
const asNumber = v => { const n = Number(v); return Number.isFinite(n) ? n : null; };

const BOOLEANS = new Set(['true', 'false', 'yes', 'no', '0', '1', 't', 'f']);
const DATE_RE = /^\d{4}-\d{2}-\d{2}|^\d{1,2}\/\d{1,2}\/\d{2,4}/;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function detectType(values) {
  const present = values.filter(v => !isBlank(v));
  if (!present.length) return 'string';

  if (present.every(v => asNumber(v) !== null)) return 'number';
  if (present.every(v => BOOLEANS.has(String(v).toLowerCase()))) return 'boolean';
  if (present.every(v => EMAIL_RE.test(v))) return 'email';
  if (present.every(v => DATE_RE.test(v))) return 'date';

  const distinct = new Set(present.map(String));
  if (distinct.size <= MAX_CATEGORY_LEVELS && distinct.size / present.length < CATEGORY_RATIO) {
    return 'categorical';
  }
  return 'string';
}

const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length;

function std(xs) {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length);
}

/** Robust bounds: 2nd/98th percentile, so one typo doesn't blow the range open. */
function percentile(sorted, p) {
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.round((p / 100) * (sorted.length - 1))));
  return sorted[idx];
}

function pearson(xs, ys) {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return 0;
  const mx = mean(xs), my = mean(ys);
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i += 1) {
    const a = xs[i] - mx, b = ys[i] - my;
    num += a * b; dx += a * a; dy += b * b;
  }
  if (!dx || !dy) return 0;
  return num / Math.sqrt(dx * dy);
}

/**
 * Returns { columns, correlations, stats } ready to drop into the schema editor.
 * Everything here is user-editable afterwards — this writes a first draft, not a contract.
 */
export function inferSchema(text, { maxCorrelations = 5, minRho = 0.3 } = {}) {
  const { headers, records } = parseCsv(text);
  if (!headers.length || !records.length) {
    throw new Error('That file has no readable rows. Expected a CSV with a header row.');
  }

  const numericSeries = {};
  const columns = headers.map(name => {
    const raw = records.map(r => r[name]);
    const present = raw.filter(v => !isBlank(v));
    const missingPct = Math.round(((raw.length - present.length) / raw.length) * 100);
    const type = detectType(raw);

    const base = { name, type, nanPercentage: missingPct, addNoise: false, noiseLevel: 0,
                   addOutliers: false, outlierPercentage: 0 };

    if (type === 'number') {
      const nums = present.map(asNumber).filter(v => v !== null);
      const sorted = [...nums].sort((a, b) => a - b);
      numericSeries[name] = nums;
      const allIntegers = nums.every(v => Number.isInteger(v));
      const round = v => Math.round(v * 100) / 100;
      return {
        ...base,
        numberType: allIntegers ? 'integers' : 'decimals',
        minValue: round(percentile(sorted, 2)),
        maxValue: round(percentile(sorted, 98)),
        mean: round(mean(nums)),
        stdDev: round(std(nums)),
        useMoments: true,
      };
    }

    if (type === 'categorical') {
      const counts = {};
      present.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
      const categories = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
      return {
        ...base,
        categories,
        categoryWeights: categories.map(c => Math.round((counts[c] / present.length) * 1000) / 1000),
      };
    }

    return base;
  });

  // The strongest few relationships. A user would never state 400 of them, and the
  // benchmark (RESULTS.md §4) shows the long tail buys nothing anyway.
  const names = Object.keys(numericSeries);
  const pairs = [];
  for (let i = 0; i < names.length; i += 1) {
    for (let j = i + 1; j < names.length; j += 1) {
      const a = names[i], b = names[j];
      const n = Math.min(numericSeries[a].length, numericSeries[b].length);
      const rho = pearson(numericSeries[a].slice(0, n), numericSeries[b].slice(0, n));
      if (Math.abs(rho) >= minRho) {
        pairs.push({ a, b, rho: Math.round(rho * 100) / 100 });
      }
    }
  }
  pairs.sort((x, y) => Math.abs(y.rho) - Math.abs(x.rho));

  return {
    columns,
    correlations: pairs.slice(0, maxCorrelations),
    stats: {
      rowsRead: records.length,
      columnsFound: headers.length,
      truncated: records.length >= MAX_SAMPLE_ROWS,
    },
  };
}
