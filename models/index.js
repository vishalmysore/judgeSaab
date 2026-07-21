// models/index.js
// Registers all model adapters (mock baseline + WebLLM families) into the model
// registry and provides helpers to load a model on demand.

import { models } from '../core/registry.js';
import { log } from '../core/events.js';
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

// Only one WebGPU model can realistically fit in GPU memory at a time, so before
// loading a new one we unload any other WebGPU model still resident. This is what
// makes running models "one at a time" safe — no accumulation, no GPU OOM.
async function freeOtherWebGPUModels(keepId) {
  for (const [lid, lm] of [..._loaded]) {
    if (lid !== keepId && lm.backend === 'webgpu' && typeof lm.unload === 'function') {
      try {
        await lm.unload();
        log(`Unloaded ${lm.name} to free GPU memory`);
      } catch (e) {
        console.warn('unload failed', e);
      }
      _loaded.delete(lid);
    }
  }
}

export async function loadModel(id, onProgress) {
  const m = models.get(id);
  if (!m) throw new Error(`Unknown model: ${id}`);
  if (_loaded.has(id)) return _loaded.get(id);
  if (m.backend === 'webgpu') {
    if (!(await hasWebGPU())) {
      throw new Error(
        'WebGPU is not available in this browser. Use a Chromium-based browser with WebGPU enabled, or run the Heuristic Baseline.'
      );
    }
    await freeOtherWebGPUModels(id);
  }
  await m.load(onProgress);
  _loaded.set(id, m);
  return m;
}

export { hasWebGPU };
