// core/api.js
// The public JudgeSaab API surface named in the spec, exposed on window.JudgeSaab
// so it can be driven programmatically or from the console.

import { loadDataset } from '../datasets/index.js';
import { loadModel } from '../models/index.js';
import { evaluate } from '../evaluation/index.js';
import {
  runBenchmark,
  runCase,
  compareModels,
  compareCompression,
  exportResults,
} from '../benchmark/index.js';
import { use, useUrl, installedPlugins } from '../plugins/index.js';
import { models, datasets, compressors, metrics, prompts } from './registry.js';
import { getAllRuns, clearRuns } from './store.js';

export const JudgeSaab = {
  // spec APIs
  loadDataset,
  runBenchmark,
  runCase,
  evaluate,
  compareModels,
  exportResults,
  // extras
  compareCompression,
  loadModel,
  use,
  useUrl,
  installedPlugins,
  getAllRuns,
  clearRuns,
  registry: { models, datasets, compressors, metrics, prompts },
  version: '1.0.0',
};

if (typeof window !== 'undefined') window.JudgeSaab = JudgeSaab;
