// reranking/rerank-gold.js
// Ground truth for the reranking test. Reranking cares about ORDER, so the label is
// graded, not binary:
//   • controlling authority — the one the holding turns on (gain 2)
//   • other cited authority — mentioned/relied on but not decisive (gain 1)
//   • distractor            — not cited by the court (gain 0)
//
// Like the rest of JudgeSaab, the label is intrinsic to the case record: a case's
// cited authorities are case.human.laws, and by convention the FIRST listed is the
// controlling one (the provision the decision is built on). No hand-labeling.

import { SAMPLE_CASES } from '../datasets/cases.js';
import { resolveLaw, buildQuery } from '../retrieval/gold.js';

// Build reranking queries: { query text, gold ids, controlling id, graded gains }.
export function buildRerankQueries(mode = 'question', datasetId = null) {
  const cases = datasetId
    ? SAMPLE_CASES.filter((c) => c.dataset === datasetId)
    : SAMPLE_CASES;

  return cases.map((c) => {
    const laws = c.human?.laws || [];
    const gold = [];
    for (const law of laws) {
      const id = resolveLaw(law);
      if (id && !gold.includes(id)) gold.push(id);
    }
    // The controlling authority is the first cited one that resolves to the corpus.
    const controlling = gold[0] ?? null;

    // Graded relevance gains keyed by authority id.
    const gain = new Map();
    for (const id of gold) gain.set(id, 1);
    if (controlling) gain.set(controlling, 2);

    return {
      caseId: c.id,
      dataset: c.dataset,
      title: c.title,
      jurisdiction: c.jurisdiction,
      year: c.year,
      question: c.question,
      queryText: buildQuery(c, mode),
      gold,
      controlling,
      gain,
    };
  });
}
