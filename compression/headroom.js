// compression/headroom.js
//
// Dependency-free port of the "headroom" adaptive text compressor, adapted for
// JudgeSaab. It scores each sentence with keyword-priority tiers plus a
// query-relevance layer, then keeps the top-K sentences chosen by the Kneedle
// adaptive sizer (SimHash de-duplication + unique-bigram saturation curve +
// a compressibility validation step).
//
// Ported/adapted from headroom by Tejas Chopra (Apache-2.0):
//   https://github.com/chopratejas/headroom
//   crates/headroom-core/src/transforms/adaptive_sizer.rs
//   crates/headroom-core/src/signals/keyword_detector.rs
// via the browser TypeScript port in vishalmysore/ragCompressionDemo
// (src/lib/headroom-engine/). Changes here: TypeScript -> plain ES modules;
// MD5 -> a small non-crypto 64-bit hash and zlib -> a bigram-redundancy proxy,
// so the engine stays synchronous, offline, and cross-origin-isolation safe
// (no CDN deps). The information-saturation logic is preserved.

// ─── Keyword-priority tiers (from keyword_detector.rs, extended for legal prose) ───
const PRIORITY = { critical: 0.95, importance: 0.6, structural: 0.45 };

const KEYWORDS = {
  // Terms that decide a legal outcome — treated as high priority.
  critical: [
    'violat', 'breach', 'unconstitutional', 'liable', 'negligent', 'warrant',
    'disproportion', 'must', 'shall', 'reversed', 'affirmed', 'suppress',
    'exceeded', 'unlawful', 'infring',
  ],
  // Legally salient but not decisive on their own.
  importance: [
    'duty', 'right', 'reasonabl', 'proportion', 'statute', 'article', 'amendment',
    'court', 'held', 'because', 'therefore', 'foresee', 'balanc', 'margin',
    'deport', 'assembl', 'search', 'disrupt', 'authorit', 'offer', 'charg',
    'convict', 'delay', 'best interests', 'precedent',
  ],
};

function scoreSentence(sentence) {
  const lower = sentence.toLowerCase();
  for (const kw of KEYWORDS.critical) if (lower.includes(kw)) return PRIORITY.critical;
  for (const kw of KEYWORDS.importance) if (lower.includes(kw)) return PRIORITY.importance;
  // Sentences carrying numbers/dates are structurally useful (facts, timelines).
  if (/\b(19|20)\d{2}\b|\d+\s*(year|month|day|metre|meter|people|time)/i.test(sentence)) {
    return PRIORITY.structural;
  }
  return 0;
}

// ─── SimHash (non-crypto hash instead of MD5; concept preserved) ───
function hash32(str, seed) {
  // FNV-1a variant with a seed offset.
  let h = (2166136261 ^ seed) >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function hash64(str) {
  const hi = hash32(str, 0);
  const lo = hash32(str, 0x9e3779b9);
  return (BigInt(hi) << 32n) | BigInt(lo);
}

export function simhash(text) {
  const lower = text.toLowerCase().slice(0, 150);
  const chars = [...lower];
  const n = chars.length;
  const iterCount = n <= 3 ? 1 : n - 3;
  const votes = new Int32Array(64);
  for (let i = 0; i < iterCount; i++) {
    const gram = chars.slice(i, i + 4).join('');
    const h = hash64(gram);
    for (let j = 0; j < 64; j++) {
      if ((h >> BigInt(j)) & 1n) votes[j]++;
      else votes[j]--;
    }
  }
  let fp = 0n;
  for (let j = 0; j < 64; j++) if (votes[j] > 0) fp |= 1n << BigInt(j);
  return fp;
}

export function hammingDistance(a, b) {
  let diff = a ^ b;
  let count = 0;
  while (diff) {
    if (diff & 1n) count++;
    diff >>= 1n;
  }
  return count;
}

function countUniqueSimhash(items, threshold = 3) {
  if (!items.length) return 0;
  const clusters = [];
  for (const it of items) {
    const fp = simhash(it);
    if (!clusters.some((rep) => hammingDistance(fp, rep) <= threshold)) clusters.push(fp);
  }
  return clusters.length;
}

// ─── Bigram-saturation curve + Kneedle knee detection ───
function computeUniqueBigramCurve(items) {
  const seen = new Set();
  const curve = [];
  for (const item of items) {
    const words = item.toLowerCase().slice(0, 200).split(/\s+/).filter(Boolean);
    if (words.length < 2) seen.add(`${words[0] ?? ''}\x00`);
    else for (let j = 0; j < words.length - 1; j++) seen.add(`${words[j]}\x00${words[j + 1]}`);
    curve.push(seen.size);
  }
  return curve;
}

function findKnee(curve) {
  const n = curve.length;
  if (n < 3) return null;
  const yMin = curve[0];
  const yMax = curve[n - 1];
  if (Math.abs(yMax - yMin) < Number.EPSILON) return 1;
  const xRange = n - 1;
  const yRange = yMax - yMin;
  let maxDiff = -1;
  let kneeIdx = null;
  for (let i = 0; i < n; i++) {
    const diff = (curve[i] - yMin) / yRange - i / xRange;
    if (diff > maxDiff) {
      maxDiff = diff;
      kneeIdx = i;
    }
  }
  if (maxDiff < 0.05) return null;
  return kneeIdx + 1;
}

// Compressibility proxy replacing the zlib validation: subsets that are far more
// redundant (repeated bigrams) than the full set get a small K bump.
function redundancy(text) {
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length < 2) return 0;
  const seen = new Set();
  let total = 0;
  for (let i = 0; i < words.length - 1; i++) {
    seen.add(`${words[i]} ${words[i + 1]}`);
    total++;
  }
  return 1 - seen.size / total;
}

function validateRedundancy(items, k, maxK, tolerance = 0.15) {
  if (k >= items.length || k >= maxK) return k;
  const full = items.join(' ');
  if (full.length < 200) return k;
  const subset = items.slice(0, k).join(' ');
  if (Math.abs(redundancy(full) - redundancy(subset)) > tolerance) {
    return Math.min(Math.floor(k * 1.2), maxK);
  }
  return k;
}

export function computeOptimalK(items, bias, minK, maxK) {
  const n = items.length;
  const effectiveMax = maxK ?? n;
  // headroom's original guard is n<=8 (don't bother compressing short logs);
  // legal fact patterns here are short, so we engage the adaptive sizer sooner
  // while the minK floor still preserves enough context for the verdict.
  if (n <= 3) return n;
  const uniqueCount = countUniqueSimhash(items, 3);
  if (uniqueCount <= 3) return Math.min(Math.max(minK, uniqueCount), effectiveMax);
  const curve = computeUniqueBigramCurve(items);
  const diversityRatio = uniqueCount / n;
  let knee = findKnee(curve);
  if (knee === null) {
    knee = Math.max(minK, Math.floor(n * (0.3 + 0.7 * diversityRatio)));
  } else if (diversityRatio > 0.7) {
    const floor = Math.max(minK, Math.floor(n * (0.3 + 0.7 * diversityRatio)));
    knee = Math.max(knee, floor);
  }
  let k = Math.max(minK, Math.floor(knee * bias));
  k = Math.min(k, effectiveMax);
  k = validateRedundancy(items, k, effectiveMax, 0.15);
  return Math.max(minK, Math.min(k, effectiveMax));
}

function splitSentences(text) {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+(?=[A-Z\[\(0-9])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);
}

// ─── Main: query-aware adaptive compression ───
export function compressText(text, ratioTarget = 0.6, query = '') {
  const sentences = splitSentences(text);
  const n = sentences.length;
  if (n <= 3) return { text, keptSentences: n, originalSentences: n, ratio: 1 };

  const queryTerms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3);

  const scored = sentences.map((line, idx) => {
    let score = scoreSentence(line);
    if (queryTerms.length) {
      const lower = line.toLowerCase();
      const hits = queryTerms.filter((t) => lower.includes(t)).length;
      if (hits > 0) score = Math.max(score, 0.3 + (hits / queryTerms.length) * 0.4);
    }
    return { line, score, idx };
  });

  const scoreStrs = scored.map((s) => `${s.score.toFixed(2)} ${s.line.slice(0, 80)}`);
  const maxK = Math.max(3, Math.round(n * ratioTarget));
  const k = computeOptimalK(scoreStrs, ratioTarget < 0.3 ? 0.5 : 1.0, 3, maxK);

  const kept = scored
    .slice()
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .sort((a, b) => a.idx - b.idx)
    .map((s) => s.line);

  return {
    text: kept.join(' '),
    keptSentences: kept.length,
    originalSentences: n,
    ratio: kept.length / n,
  };
}

// "Remove Duplicate Context" — drop near-duplicate sentences via SimHash.
export function dedupeSentences(text, threshold = 6) {
  const sentences = splitSentences(text);
  const kept = [];
  const reps = [];
  for (const s of sentences) {
    const fp = simhash(s);
    if (!reps.some((r) => hammingDistance(fp, r) <= threshold)) {
      reps.push(fp);
      kept.push(s);
    }
  }
  return kept.join(' ');
}
