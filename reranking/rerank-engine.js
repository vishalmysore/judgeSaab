// reranking/rerank-engine.js
// Orchestrates the reranking test:
//   1. First stage — a deliberately WEAK retriever (token overlap) proposes the top-N
//      candidates. This is real retrieval over the real corpus, so the controlling
//      authority is usually IN the pool but not necessarily at the top.
//   2. Rerank — each reranker reorders those candidates.
//   3. Score — graded relevance vs the court's citations (controlling@1, nDCG, …).
//
// Reuses the retrieval module's real corpus and retrievers — nothing here is mocked;
// the only synthetic element anywhere is the retrieval module's clearly-labeled
// "random" floor, which this stage does not use.

import { tokens } from '../core/utils.js';
import { AUTHORITIES, AUTHORITY_BY_ID } from '../retrieval/authorities.js';
import { RETRIEVER_BY_ID } from '../retrieval/retrievers.js';
import { RERANKER_BY_ID } from './rerankers.js';
import { buildRerankQueries } from './rerank-gold.js';
import { scoreRerank, aggregateRerank } from './rerank-metrics.js';

// Precompute per-authority token sets once (for MMR similarity).
const TOKENS_BY_ID = new Map(
  AUTHORITIES.map((a) => [a.id, new Set(tokens(`${a.label} ${a.text}`))])
);

// Turn a full-corpus ranking into {score map, rank-index map}.
function rankingMaps(queryText, retrieverId) {
  const ranked = RETRIEVER_BY_ID.get(retrieverId).rank(queryText, AUTHORITIES);
  const scores = new Map();
  const ranks = new Map();
  ranked.forEach((r, i) => {
    scores.set(r.id, r.score);
    ranks.set(r.id, i);
  });
  return { scores, ranks };
}

// Run one reranker over the case pool.
export function runReranking(rerankerId, opts = {}) {
  const { k = 5, candN = 8, firstStage = 'overlap', queryMode = 'question', datasetId = null } = opts;
  const reranker = RERANKER_BY_ID.get(rerankerId);
  if (!reranker) throw new Error(`Unknown reranker: ${rerankerId}`);

  const queries = buildRerankQueries(queryMode, datasetId);

  const results = queries.map((q) => {
    // Precompute the three lexical signals over the full corpus.
    const bm25 = rankingMaps(q.queryText, 'bm25');
    const tfidf = rankingMaps(q.queryText, 'tfidf');
    const overlap = rankingMaps(q.queryText, 'overlap');

    // First stage: weak retriever proposes candidates.
    const firstRanked = RETRIEVER_BY_ID.get(firstStage).rank(q.queryText, AUTHORITIES);
    const candidateIds = firstRanked.slice(0, candN).map((r) => r.id);

    const ctx = {
      scores: { bm25: bm25.scores, tfidf: tfidf.scores, overlap: overlap.scores },
      ranks: { bm25: bm25.ranks, tfidf: tfidf.ranks, overlap: overlap.ranks },
      corpusById: AUTHORITY_BY_ID,
      tokensById: TOKENS_BY_ID,
    };

    const reordered = reranker.rerank(candidateIds, ctx);
    const scores = scoreRerank(reordered, q, k);

    return {
      caseId: q.caseId,
      dataset: q.dataset,
      title: q.title,
      year: q.year,
      question: q.question,
      controlling: q.controlling ? AUTHORITY_BY_ID.get(q.controlling) : null,
      gold: q.gold.map((id) => AUTHORITY_BY_ID.get(id)),
      candidateOrder: candidateIds.map((id) => AUTHORITY_BY_ID.get(id)?.label),
      reranked: reordered.slice(0, k).map((id) => ({
        authority: AUTHORITY_BY_ID.get(id),
        gain: q.gain.get(id) || 0,
        controlling: id === q.controlling,
      })),
      scores,
    };
  });

  return {
    rerankerId,
    rerankerLabel: reranker.label,
    k,
    candN,
    firstStage,
    queryMode,
    datasetId: datasetId ?? 'all',
    ts: Date.now(),
    results,
    summary: aggregateRerank(results.map((r) => r.scores)),
  };
}

// Compare all rerankers; sorted by controlling@1 then controllingMRR.
export function compareRerankers(rerankerIds, opts = {}) {
  const runs = rerankerIds.map((id) => runReranking(id, opts));
  runs.sort(
    (a, b) =>
      b.summary.controllingAt1 - a.summary.controllingAt1 ||
      b.summary.controllingMRR - a.summary.controllingMRR
  );
  return runs;
}

export function exportRuns(runs, format = 'json') {
  const arr = Array.isArray(runs) ? runs : [runs];
  if (format === 'csv') {
    const header = ['reranker', 'dataset', 'firstStage', 'candN', 'k', 'n', 'controllingAt1', 'controllingInTopK', 'controllingMRR', 'recall', 'ndcg'];
    const rows = arr.map((r) =>
      [r.rerankerLabel, r.datasetId, r.firstStage, r.candN, r.k, r.summary.n,
       r.summary.controllingAt1, r.summary.controllingInTopK, r.summary.controllingMRR,
       r.summary.recall, r.summary.ndcg].join(',')
    );
    return [header.join(','), ...rows].join('\n');
  }
  return JSON.stringify(arr, null, 2);
}
