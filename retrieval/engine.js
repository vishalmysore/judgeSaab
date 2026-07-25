// retrieval/engine.js
// Orchestrates the retrieval (RAG) test: for each case, build the query, rank the
// authority corpus with the chosen retriever, and score the ranking against the
// court's actual citations. Mirrors benchmark/index.js but for the retrieval stage
// — and needs no model or GPU, so it runs instantly.

import { AUTHORITIES, AUTHORITY_BY_ID } from './authorities.js';
import { RETRIEVER_BY_ID } from './retrievers.js';
import { embeddingRetriever } from './embedding.js';
import { buildQueries } from './gold.js';
import { scoreQuery, aggregate } from './metrics.js';

// Shape one case's ranking into the per-case result object (shared by the sync
// lexical path and the async embedding path).
function caseResult(q, ranked, k) {
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
    scores: scoreQuery(ranked, q.gold, k),
  };
}

function makeRun(retrieverId, retrieverLabel, opts, results) {
  return {
    retrieverId,
    retrieverLabel,
    k: opts.k ?? 5,
    queryMode: opts.queryMode ?? 'question+facts',
    datasetId: opts.datasetId ?? 'all',
    ts: Date.now(),
    results,
    summary: aggregate(results.map((r) => r.scores)),
  };
}

// Run one lexical (synchronous) retriever over the case pool.
export function runRetrieval(retrieverId, opts = {}) {
  const { k = 5, queryMode = 'question+facts', datasetId = null } = opts;
  const retriever = RETRIEVER_BY_ID.get(retrieverId);
  if (!retriever) throw new Error(`Unknown retriever: ${retrieverId}`);
  const queries = buildQueries(queryMode, datasetId);
  const results = queries.map((q) => caseResult(q, retriever.rank(q.queryText, AUTHORITIES), k));
  return makeRun(retrieverId, retriever.label, { k, queryMode, datasetId }, results);
}

// Run the async semantic (embedding) retriever. hooks.onProgress gets model-load
// progress events from Transformers.js.
export async function runRetrievalAsync(retrieverId, opts = {}, hooks = {}) {
  if (retrieverId !== 'embedding') return runRetrieval(retrieverId, opts);
  const { k = 5, queryMode = 'question+facts', datasetId = null } = opts;
  await embeddingRetriever.ensureReady(hooks.onProgress);
  const queries = buildQueries(queryMode, datasetId);
  const results = [];
  for (const q of queries) {
    results.push(caseResult(q, await embeddingRetriever.rankAll(q.queryText), k));
  }
  return makeRun('embedding', embeddingRetriever.label, { k, queryMode, datasetId }, results);
}

// Compare several retrievers on the same setup; sorted by recall@k desc. Any
// 'embedding' id is run via the async path (and only if its model is ready).
export async function compareRetrievers(retrieverIds, opts = {}) {
  const runs = [];
  for (const id of retrieverIds) {
    runs.push(id === 'embedding' ? await runRetrievalAsync(id, opts) : runRetrieval(id, opts));
  }
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
