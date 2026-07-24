// reranking/rerank-metrics.js
// Reranking metrics, scored against the court's own citations with GRADED relevance
// (controlling authority = 2, other cited = 1, distractor = 0). The headline is
// controlling@1 — did the reranker put the authority the holding turns on at the top?

import { round } from '../core/utils.js';

// reordered: array of authority ids (the reranked candidate list).
// q: { gold:[ids], controlling:id, gain:Map<id,gain> }
export function scoreRerank(reordered, q, k = 5) {
  const goldSet = new Set(q.gold);
  const topk = reordered.slice(0, k);

  // controlling@1 and its reciprocal rank over the full reordering.
  const controllingAt1 = q.controlling && reordered[0] === q.controlling ? 1 : 0;
  let controllingRR = 0;
  if (q.controlling) {
    const idx = reordered.indexOf(q.controlling);
    if (idx >= 0) controllingRR = 1 / (idx + 1);
  }
  const controllingInTopK = q.controlling && topk.includes(q.controlling) ? 1 : 0;

  // Binary recall@k over all cited authorities present in the candidate pool.
  const goldInPool = q.gold.filter((id) => reordered.includes(id));
  let hits = 0;
  for (const id of topk) if (goldSet.has(id)) hits++;
  const recall = goldInPool.length ? hits / goldInPool.length : 1;

  // Graded nDCG@k.
  let dcg = 0;
  for (let i = 0; i < topk.length; i++) {
    const g = q.gain.get(topk[i]) || 0;
    if (g) dcg += g / Math.log2(i + 2);
  }
  const idealGains = [...q.gain.values()].sort((a, b) => b - a).slice(0, k);
  let idcg = 0;
  for (let i = 0; i < idealGains.length; i++) idcg += idealGains[i] / Math.log2(i + 2);
  const ndcg = idcg ? dcg / idcg : 1;

  return {
    controllingAt1,
    controllingInTopK,
    controllingRR: round(controllingRR, 3),
    recall: round(recall, 3),
    ndcg: round(ndcg, 3),
    hasControlling: q.controlling ? 1 : 0,
  };
}

export function aggregateRerank(perQuery) {
  if (!perQuery.length) {
    return { n: 0, controllingAt1: 0, controllingInTopK: 0, controllingMRR: 0, recall: 0, ndcg: 0 };
  }
  const avg = (sel) => round(perQuery.reduce((s, q) => s + sel(q), 0) / perQuery.length, 3);
  return {
    n: perQuery.length,
    controllingAt1: avg((q) => q.controllingAt1),
    controllingInTopK: avg((q) => q.controllingInTopK),
    controllingMRR: avg((q) => q.controllingRR),
    recall: avg((q) => q.recall),
    ndcg: avg((q) => q.ndcg),
  };
}
