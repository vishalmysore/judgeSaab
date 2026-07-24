// retrieval/gold.js
// Builds the ground-truth relevance judgments for the retrieval test WITHOUT any
// hand-labeling: for each case, the relevant authorities are exactly the ones the
// court cited (case.human.laws), joined to the corpus in authorities.js by alias.
//
// This is the retrieval analogue of JudgeSaab's core idea — the court record is the
// gold standard. Here the court's citations are the gold documents.

import { SAMPLE_CASES } from '../datasets/cases.js';
import { AUTHORITIES } from './authorities.js';
import { normalize } from '../core/utils.js';

// Normalized alias -> authority id, for exact joins against case.human.laws.
const ALIAS_INDEX = new Map();
for (const a of AUTHORITIES) {
  for (const alias of a.aliases) ALIAS_INDEX.set(normalize(alias), a.id);
}

// Resolve one human.laws string to an authority id (exact normalized alias match).
export function resolveLaw(lawString) {
  return ALIAS_INDEX.get(normalize(lawString)) ?? null;
}

// Build the query text for a case. mode:
//   'question'      — the legal question only (the pure information need)
//   'question+facts'— question plus the facts (adds context, the default)
export function buildQuery(caseObj, mode = 'question+facts') {
  const q = caseObj.question || '';
  if (mode === 'question') return q;
  return `${q} ${caseObj.facts || ''}`.trim();
}

// A retrieval query = { case metadata, query text, gold authority ids }.
export function buildQueries(mode = 'question+facts', datasetId = null) {
  const cases = datasetId
    ? SAMPLE_CASES.filter((c) => c.dataset === datasetId)
    : SAMPLE_CASES;

  return cases.map((c) => {
    const laws = c.human?.laws || [];
    const gold = [];
    const unresolved = [];
    for (const law of laws) {
      const id = resolveLaw(law);
      if (id) {
        if (!gold.includes(id)) gold.push(id);
      } else {
        unresolved.push(law);
      }
    }
    return {
      caseId: c.id,
      dataset: c.dataset,
      title: c.title,
      jurisdiction: c.jurisdiction,
      year: c.year,
      question: c.question,
      queryText: buildQuery(c, mode),
      gold, // authority ids the court actually cited
      unresolved, // citations with no corpus entry (should be empty by construction)
    };
  });
}

// Datasets present in the case pool, for the UI filter.
export function datasetIds() {
  return [...new Set(SAMPLE_CASES.map((c) => c.dataset))];
}
