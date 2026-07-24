// retrieval/metrics.js
// Standard information-retrieval metrics, scored against the court's own citations
// (the gold set from gold.js). Binary relevance: an authority is relevant iff the
// court cited it. The headline is recall@k — "precedent recall": of the authorities
// the court relied on, how many did the retriever surface in the top k?

import { round } from '../core/utils.js';

// ranked: [{id, score}] best-first. gold: array of relevant authority ids.
export function scoreQuery(ranked, gold, k = 5) {
  const goldSet = new Set(gold);
  const topk = ranked.slice(0, k).map((r) => r.id);
  const topkSet = new Set(topk);

  let hits = 0;
  for (const id of goldSet) if (topkSet.has(id)) hits++;

  const recall = goldSet.size ? hits / goldSet.size : 1;
  const precision = k ? hits / k : 0;
  const hit = hits > 0 ? 1 : 0;

  // Reciprocal rank of the first relevant result (over the full ranking).
  let rr = 0;
  for (let i = 0; i < ranked.length; i++) {
    if (goldSet.has(ranked[i].id)) {
      rr = 1 / (i + 1);
      break;
    }
  }

  // nDCG@k with binary gains.
  let dcg = 0;
  for (let i = 0; i < topk.length; i++) {
    if (goldSet.has(topk[i])) dcg += 1 / Math.log2(i + 2);
  }
  let idcg = 0;
  const ideal = Math.min(goldSet.size, k);
  for (let i = 0; i < ideal; i++) idcg += 1 / Math.log2(i + 2);
  const ndcg = idcg ? dcg / idcg : 1;

  return {
    recall: round(recall, 3),
    precision: round(precision, 3),
    hit,
    mrr: round(rr, 3),
    ndcg: round(ndcg, 3),
    hits,
    goldCount: goldSet.size,
    topk,
  };
}

// Average a list of per-query metric objects.
export function aggregate(perQuery) {
  if (!perQuery.length) {
    return { n: 0, recall: 0, precision: 0, hit: 0, mrr: 0, ndcg: 0 };
  }
  const avg = (sel) => round(perQuery.reduce((s, q) => s + sel(q), 0) / perQuery.length, 3);
  return {
    n: perQuery.length,
    recall: avg((q) => q.recall),
    precision: avg((q) => q.precision),
    hit: avg((q) => q.hit),
    mrr: avg((q) => q.mrr),
    ndcg: avg((q) => q.ndcg),
  };
}
