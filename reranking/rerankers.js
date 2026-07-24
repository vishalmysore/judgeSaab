// reranking/rerankers.js
// Reranking strategies — the stage under test. A reranker receives a first-stage
// CANDIDATE list (ids) plus precomputed signals and returns a reordered id list.
// The goal: push the CONTROLLING authority to the top. All dependency-free and
// deterministic (no model, no GPU), mirroring the retrieval module.
//
// A reranker is { id, label, description, rerank(candidateIds, ctx) -> ids[] }.
// ctx = { scores: {bm25,tfidf,overlap: Map<id,score>},
//         ranks:  {bm25,tfidf,overlap: Map<id,rankIndex>},
//         corpusById: Map<id,authority>, tokensById: Map<id,Set> }

import { jaccard } from '../core/utils.js';

// 1. None — keep the first-stage order (the baseline: "don't rerank at all").
const none = {
  id: 'none',
  label: 'No rerank (first stage)',
  description: 'Keep the retriever’s original order — the baseline',
  rerank: (cands) => [...cands],
};

// 2. BM25 rerank — reorder candidates by their BM25 relevance to the query.
const bm25 = {
  id: 'bm25',
  label: 'BM25 rerank',
  description: 'Reorder candidates by length-normalized lexical relevance',
  rerank: (cands, ctx) =>
    [...cands].sort((a, b) => (ctx.scores.bm25.get(b) || 0) - (ctx.scores.bm25.get(a) || 0)),
};

// 3. Reciprocal-rank fusion — blend BM25, TF-IDF, and overlap rankings.
const rrf = {
  id: 'rrf',
  label: 'Reciprocal-rank fusion',
  description: 'Fuse BM25 + TF-IDF + overlap ranks (k=60)',
  rerank: (cands, ctx) => {
    const K = 60;
    const fuse = (id) =>
      ['bm25', 'tfidf', 'overlap'].reduce((s, m) => {
        const r = ctx.ranks[m].get(id);
        return s + (r == null ? 0 : 1 / (K + r));
      }, 0);
    return [...cands].sort((a, b) => fuse(b) - fuse(a));
  },
};

// 4. MMR — Maximal Marginal Relevance: relevance to the query, penalized by
//    similarity to already-selected candidates (diversity). λ balances the two.
const mmr = {
  id: 'mmr',
  label: 'MMR (diversity)',
  description: 'Relevance minus redundancy, greedy selection (λ=0.7)',
  rerank: (cands, ctx) => {
    const LAMBDA = 0.7;
    const rel = (id) => ctx.scores.tfidf.get(id) || 0;
    const sim = (a, b) => jaccard(ctx.tokensById.get(a), ctx.tokensById.get(b));
    const remaining = new Set(cands);
    const out = [];
    while (remaining.size) {
      let best = null;
      let bestScore = -Infinity;
      for (const id of remaining) {
        const maxSim = out.length ? Math.max(...out.map((o) => sim(id, o))) : 0;
        const score = LAMBDA * rel(id) - (1 - LAMBDA) * maxSim;
        if (score > bestScore) {
          bestScore = score;
          best = id;
        }
      }
      out.push(best);
      remaining.delete(best);
    }
    return out;
  },
};

export const RERANKERS = [none, bm25, rrf, mmr];
export const RERANKER_BY_ID = new Map(RERANKERS.map((r) => [r.id, r]));
