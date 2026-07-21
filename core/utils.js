// core/utils.js
// Small dependency-free helpers shared across JudgeSaab modules.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
export const round = (n, d = 2) => {
  const f = 10 ** d;
  return Math.round(n * f) / f;
};

export const uid = (prefix = 'id') =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export const fmtPct = (n) => `${round(n * 100, 1)}%`;
export const fmtMs = (n) => (n >= 1000 ? `${round(n / 1000, 2)}s` : `${Math.round(n)}ms`);

// Normalize free text for comparison: lowercase, strip punctuation, collapse space.
export function normalize(text = '') {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const STOP = new Set(
  ('a an the of to in on at for and or but if then else is are was were be been being this that ' +
    'these those it its as by with from into out over under not no do does did has have had will ' +
    'would shall should may might can could must there their they them he she his her we you i').split(
    ' '
  )
);

export function tokens(text = '', { keepStop = false } = {}) {
  return normalize(text)
    .split(' ')
    .filter((t) => t && (keepStop || !STOP.has(t)));
}

export function tokenSet(text) {
  return new Set(tokens(text));
}

// Jaccard overlap of two token sets — a cheap, deterministic proxy for
// semantic similarity when no embedding model is available.
export function jaccard(a, b) {
  const A = a instanceof Set ? a : tokenSet(a);
  const B = b instanceof Set ? b : tokenSet(b);
  if (A.size === 0 && B.size === 0) return 1;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
}

// Cosine similarity over bag-of-words term frequency vectors.
export function cosine(a, b) {
  const ta = tokens(a);
  const tb = tokens(b);
  if (!ta.length || !tb.length) return 0;
  const va = tf(ta);
  const vb = tf(tb);
  let dot = 0;
  for (const [t, w] of va) if (vb.has(t)) dot += w * vb.get(t);
  const na = mag(va);
  const nb = mag(vb);
  return na && nb ? dot / (na * nb) : 0;
}

function tf(toks) {
  const m = new Map();
  for (const t of toks) m.set(t, (m.get(t) || 0) + 1);
  return m;
}
function mag(m) {
  let s = 0;
  for (const w of m.values()) s += w * w;
  return Math.sqrt(s);
}

export function download(filename, text, type = 'application/json') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function escapeHtml(s = '') {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
