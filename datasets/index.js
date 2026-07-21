// datasets/index.js
// Registers the bundled datasets into the dataset registry and exposes
// loadDataset(). Each dataset object exposes { id, name, jurisdiction,
// verdictType, cases, load() }.

import { datasets } from '../core/registry.js';
import { SAMPLE_CASES, groupByDataset } from './cases.js';

// verdictType tells the evaluator how to interpret human.verdict.
const VERDICT_TYPE = {
  ECtHR: 'binary_violation', // violation | no_violation
  SCOTUS: 'binary_appeal', // affirmed | reversed
  CaseHOLD: 'multiple_choice', // option_N
  COLIEE: 'binary_entailment',
  'Harvard Caselaw': 'binary_appeal',
};

const JURIS = {
  ECtHR: 'Council of Europe',
  SCOTUS: 'United States',
  CaseHOLD: 'United States',
  COLIEE: 'Japan',
  'Harvard Caselaw': 'United States',
};

export function registerBundledDatasets() {
  const groups = groupByDataset();
  for (const [id, cases] of groups) {
    datasets.register({
      id,
      name: id,
      jurisdiction: JURIS[id] || 'Unknown',
      verdictType: VERDICT_TYPE[id] || 'binary_violation',
      source: 'bundled-synthetic',
      cases,
      async load() {
        return cases;
      },
    });
  }
  return datasets.all();
}

// Public API: loadDataset(idOrObject) -> array of cases.
export async function loadDataset(idOrDataset) {
  if (idOrDataset && Array.isArray(idOrDataset.cases)) {
    return idOrDataset.load ? idOrDataset.load() : idOrDataset.cases;
  }
  const ds = datasets.get(idOrDataset);
  if (!ds) throw new Error(`Unknown dataset: ${idOrDataset}`);
  return ds.load();
}

export { SAMPLE_CASES };
