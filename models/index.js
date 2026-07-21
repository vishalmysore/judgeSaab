// models/index.js
// Registers all model adapters (mock baseline + WebLLM families) into the model
// registry and provides helpers to load a model on demand.

import { models } from '../core/registry.js';
import { createMockModel } from './mock.js';
import { WEBLLM_MODELS, createWebLLMModel, hasWebGPU } from './webllm.js';

export function registerModels() {
  models.register(createMockModel());
  for (const def of WEBLLM_MODELS) {
    models.register(createWebLLMModel(def));
  }
  return models.all();
}

const _loaded = new Map();

export async function loadModel(id, onProgress) {
  const m = models.get(id);
  if (!m) throw new Error(`Unknown model: ${id}`);
  if (_loaded.has(id)) return _loaded.get(id);
  if (m.backend === 'webgpu' && !(await hasWebGPU())) {
    throw new Error(
      'WebGPU is not available in this browser. Use a Chromium-based browser with WebGPU enabled, or run the Heuristic Baseline.'
    );
  }
  await m.load(onProgress);
  _loaded.set(id, m);
  return m;
}

export { hasWebGPU };
