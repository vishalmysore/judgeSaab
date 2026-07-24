// retrieval/engine.js
// Orchestrates the retrieval (RAG) test: for each case, build the query, rank the
// authority corpus with the chosen retriever, and score the ranking against the
// court's actual citations. Mirrors benchmark/index.js but for the retrieval stage
// — and needs no model or GPU, so it runs instantly.

import { AUTHORITIES, AUTHORITY_BY_ID } from './authorities.js';
import { RETRIEVER_BY_ID } from './retrievers.js';
import { buildQueries } from './gold.js';
import { scoreQuery, aggregate } from './metrics.js';

// Run one retriever over the case pool. Returns per-case detail + summary.
export function runRetrieval(retrieverId, opts = {}) {
  const { k = 5, queryMode = 'question+facts', datasetId = null } = opts;
  const retriever = RETRIEVER_BY_ID.get(retrieverId);
  if (!retriever) throw new Error(`Unknown retriever: ${retrieverId}`);

  const queries = buildQueries(queryMode, datasetId);
  const results = queries.map((q) => {
    const ranked = retriever.rank(q.queryText, AUTHORITIES);
    const s = scoreQuery(ranked, q.gold, k);
    return {
      caseId: q.caseId,
      dataset: q.dataset,
      title: q.title,
      jurisdiction: q.jurisdiction,
      year: q.year,
      question: q.question,
      gold: q.gold.map((id) => AUTHORITY_BY_ID.get(id)),
      unresolved: q.unresolved,
      // top-k retrieved, annotated with whether each was actually cited.
      retrieved: ranked.slice(0, k).map((r) => ({
        authority: AUTHORITY_BY_ID.get(r.id),
        score: r.score,
        relevant: q.gold.includes(r.id),
      })),
      scores: s,
    };
  });

  return {
    retrieverId,
    retrieverLabel: retriever.label,
    k,
    queryMode,
    datasetId: datasetId ?? 'all',
    ts: Date.now(),
    results,
    summary: aggregate(results.map((r) => r.scores)),
  };
}

// Compare several retrievers on the same setup; sorted by recall@k desc.
export function compareRetrievers(retrieverIds, opts = {}) {
  const runs = retrieverIds.map((id) => runRetrieval(id, opts));
  runs.sort((a, b) => b.summary.recall - a.summary.recall);
  return runs;
}

// Corpus stats for the UI (how many gold vs distractor documents).
export function corpusInfo() {
  const gold = AUTHORITIES.filter((a) => a.gold).length;
  return { total: AUTHORITIES.length, gold, distractors: AUTHORITIES.length - gold };
}

export function exportRuns(runs, format = 'json') {
  const arr = Array.isArray(runs) ? runs : [runs];
  if (format === 'csv') {
    const header = ['retriever', 'dataset', 'queryMode', 'k', 'n', 'recall', 'precision', 'hit', 'mrr', 'ndcg'];
    const rows = arr.map((r) =>
      [
        r.retrieverLabel, r.datasetId, r.queryMode, r.k, r.summary.n,
        r.summary.recall, r.summary.precision, r.summary.hit, r.summary.mrr, r.summary.ndcg,
      ].join(',')
    );
    return [header.join(','), ...rows].join('\n');
  }
  return JSON.stringify(arr, null, 2);
}
