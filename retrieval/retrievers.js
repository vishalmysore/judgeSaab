// retrieval/retrievers.js
// Retrieval strategies — the stage under test. Each retriever ranks the whole
// authority corpus for a query and returns [{ id, score }] sorted best-first.
// All are dependency-free and deterministic (COEP-safe, no CDN, no GPU), mirroring
// the compression module: swap the strategy, keep the ground truth fixed, and see
// which one surfaces the precedents the court actually relied on.
//
// A retriever is { id, label, description, rank(queryText, corpus) -> ranked[] }.

import { tokens } from '../core/utils.js';

// --- Shared corpus statistics (BM25 / TF-IDF need document frequencies). ---
// Cache per corpus array identity so repeated runs don't recompute.
const statsCache = new WeakMap();

function corpusStats(corpus) {
  let s = statsCache.get(corpus);
  if (s) return s;
  const docs = corpus.map((a) => {
    const toks = tokens(`${a.label} ${a.text}`);
    const tf = new Map();
    for (const t of toks) tf.set(t, (tf.get(t) || 0) + 1);
    return { id: a.id, len: toks.length, tf };
  });
  const df = new Map();
  for (const d of docs) for (const t of d.tf.keys()) df.set(t, (df.get(t) || 0) + 1);
  const avgLen = docs.reduce((n, d) => n + d.len, 0) / (docs.length || 1);
  s = { docs, df, avgLen, N: docs.length };
  statsCache.set(corpus, s);
  return s;
}

// --- BM25: the standard lexical retrieval baseline. ---
function bm25Rank(queryText, corpus, { k1 = 1.5, b = 0.75 } = {}) {
  const { docs, df, avgLen, N } = corpusStats(corpus);
  const qTerms = [...new Set(tokens(queryText))];
  const idf = (t) => {
    const n = df.get(t) || 0;
    return Math.log(1 + (N - n + 0.5) / (n + 0.5));
  };
  return docs
    .map((d) => {
      let score = 0;
      for (const t of qTerms) {
        const f = d.tf.get(t) || 0;
        if (!f) continue;
        const denom = f + k1 * (1 - b + b * (d.len / avgLen));
        score += idf(t) * ((f * (k1 + 1)) / denom);
      }
      return { id: d.id, score };
    })
    .sort((a, z) => z.score - a.score);
}

// --- TF-IDF cosine similarity. ---
function tfidfRank(queryText, corpus) {
  const { docs, df, N } = corpusStats(corpus);
  const idf = (t) => Math.log((N + 1) / ((df.get(t) || 0) + 1)) + 1;

  const qTf = new Map();
  for (const t of tokens(queryText)) qTf.set(t, (qTf.get(t) || 0) + 1);
  const qVec = new Map();
  let qMag = 0;
  for (const [t, f] of qTf) {
    const w = f * idf(t);
    qVec.set(t, w);
    qMag += w * w;
  }
  qMag = Math.sqrt(qMag) || 1;

  return docs
    .map((d) => {
      let dot = 0;
      let dMag = 0;
      for (const [t, f] of d.tf) {
        const w = f * idf(t);
        dMag += w * w;
        if (qVec.has(t)) dot += w * qVec.get(t);
      }
      dMag = Math.sqrt(dMag) || 1;
      return { id: d.id, score: dot / (qMag * dMag) };
    })
    .sort((a, z) => z.score - a.score);
}

// --- Jaccard token overlap: a weak lexical baseline (no term weighting). ---
function overlapRank(queryText, corpus) {
  const q = new Set(tokens(queryText));
  return corpus
    .map((a) => {
      const d = new Set(tokens(`${a.label} ${a.text}`));
      let inter = 0;
      for (const t of q) if (d.has(t)) inter++;
      const union = q.size + d.size - inter;
      return { id: a.id, score: union ? inter / union : 0 };
    })
    .sort((a, z) => z.score - a.score);
}

// --- Random: the floor. Deterministic pseudo-random by id hash so runs repeat. ---
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 2 ** 32;
}
function randomRank(queryText, corpus) {
  return corpus
    .map((a) => ({ id: a.id, score: hash(a.id + '|' + queryText.length) }))
    .sort((a, z) => z.score - a.score);
}

export const RETRIEVERS = [
  {
    id: 'bm25',
    label: 'BM25',
    description: 'Classic length-normalized lexical ranking (k1=1.5, b=0.75)',
    rank: bm25Rank,
  },
  {
    id: 'tfidf',
    label: 'TF-IDF cosine',
    description: 'Term-frequency × inverse-document-frequency, cosine similarity',
    rank: tfidfRank,
  },
  {
    id: 'overlap',
    label: 'Token overlap (Jaccard)',
    description: 'Unweighted bag-of-words overlap — a weak baseline',
    rank: overlapRank,
  },
  {
    id: 'random',
    label: 'Random',
    description: 'Deterministic shuffle — the no-signal floor',
    rank: randomRank,
  },
];

export const RETRIEVER_BY_ID = new Map(RETRIEVERS.map((r) => [r.id, r]));
