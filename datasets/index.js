// datasets/index.js
// Registers the bundled datasets into the dataset registry and exposes
// loadDataset(). Each dataset object exposes { id, name, jurisdiction,
// verdictType, cases, load() }.

import { datasets } from '../core/registry.js';
import { SAMPLE_CASES, groupByDataset } from './cases.js';

// verdictType tells the evaluator how to interpret human.verdict.
const VERDICT_TYPE = {
  'SCOTUS-Classic': 'binary_appeal',
  CommonLaw: 'binary_outcome',
  ECtHR: 'binary_violation', // violation | no_violation
  SCOTUS: 'binary_appeal', // affirmed | reversed
  CaseHOLD: 'multiple_choice', // option_N
  COLIEE: 'binary_entailment',
  'Harvard Caselaw': 'binary_appeal',
};

const JURIS = {
  'SCOTUS-Classic': 'United States',
  CommonLaw: 'United Kingdom',
  ECtHR: 'Council of Europe',
  SCOTUS: 'United States',
  CaseHOLD: 'United States',
  COLIEE: 'Japan',
  'Harvard Caselaw': 'United States',
};

// Human-friendly display names and whether the dataset is real or synthetic.
const NAMES = {
  'SCOTUS-Classic': 'US Supreme Court — landmark (real)',
  CommonLaw: 'English common law — landmark (real)',
  ECtHR: 'ECtHR (synthetic)',
  SCOTUS: 'SCOTUS (synthetic)',
  CaseHOLD: 'CaseHOLD (synthetic)',
};

const REAL_DATASETS = new Set(['SCOTUS-Classic', 'CommonLaw']);

export function registerBundledDatasets() {
  const groups = groupByDataset();
  for (const [id, cases] of groups) {
    datasets.register({
      id,
      name: NAMES[id] || id,
      jurisdiction: JURIS[id] || 'Unknown',
      verdictType: VERDICT_TYPE[id] || 'binary_violation',
      source: REAL_DATASETS.has(id) ? 'public-domain' : 'bundled-synthetic',
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
