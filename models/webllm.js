// models/webllm.js
// WebLLM (WebGPU) adapter. Lazily imports web-llm from a CDN so the rest of the
// app loads instantly and works even where WebGPU is unavailable. Each model is
// registered as an adapter with the same interface as the mock model.

import { bus, EV, log } from '../core/events.js';
import { tokens } from '../core/utils.js';
import { buildMessages } from './prompts.js';

const WEBLLM_CDN = 'https://esm.run/@mlc-ai/web-llm';

// Prebuilt MLC model ids, grouped by the families named in the spec.
export const WEBLLM_MODELS = [
  { id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC', name: 'Llama 3.2 1B', family: 'Llama', size: '~0.9GB' },
  { id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC', name: 'Qwen2.5 1.5B', family: 'Qwen', size: '~1.1GB' },
  { id: 'gemma-2-2b-it-q4f16_1-MLC', name: 'Gemma 2 2B', family: 'Gemma', size: '~1.6GB' },
  { id: 'Phi-3.5-mini-instruct-q4f16_1-MLC', name: 'Phi 3.5 mini', family: 'Phi', size: '~2.2GB' },
  { id: 'SmolLM2-1.7B-Instruct-q4f16_1-MLC', name: 'SmolLM2 1.7B', family: 'SmolLM', size: '~1.2GB' },
  { id: 'Mistral-7B-Instruct-v0.3-q4f16_1-MLC', name: 'Mistral 7B', family: 'Mistral', size: '~4.5GB' },
];

let _webllmMod = null;
async function getWebLLM() {
  if (_webllmMod) return _webllmMod;
  _webllmMod = await import(/* @vite-ignore */ WEBLLM_CDN);
  return _webllmMod;
}

export async function hasWebGPU() {
  if (!('gpu' in navigator)) return false;
  try {
    const adapter = await navigator.gpu.requestAdapter();
    return !!adapter;
  } catch {
    return false;
  }
}

function parseJudgment(text) {
  // Extract the first JSON object from the model output.
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      const obj = JSON.parse(match[0]);
      return {
        verdict: String(obj.verdict ?? '').trim(),
        reasoning: String(obj.reasoning ?? '').trim(),
        laws: Array.isArray(obj.laws) ? obj.laws.map(String) : [],
        confidence: clampNum(obj.confidence),
      };
    } catch {
      /* fall through */
    }
  }
  // Fallback: heuristic scrape.
  const verdict = (text.match(/verdict[^a-z0-9]*([a-z_ ]+)/i)?.[1] || '').trim();
  return { verdict, reasoning: text.slice(0, 400), laws: [], confidence: 0.5 };
}

function clampNum(n) {
  const v = Number(n);
  if (!isFinite(v)) return 0.5;
  return Math.min(1, Math.max(0, v > 1 ? v / 100 : v));
}

export function createWebLLMModel(def) {
  let engine = null;
  return {
    ...def,
    backend: 'webgpu',
    ready: false,
    async load(onProgress) {
      const webllm = await getWebLLM();
      bus.emit(EV.MODEL_STATUS, { id: def.id, status: 'loading' });
      engine = await webllm.CreateMLCEngine(def.id, {
        initProgressCallback: (p) => {
          bus.emit(EV.MODEL_PROGRESS, { id: def.id, ...p });
          onProgress?.(p);
        },
      });
      this.ready = true;
      bus.emit(EV.MODEL_STATUS, { id: def.id, status: 'ready' });
      log(`Model ready: ${def.name}`);
      return this;
    },
    async generate({ caseObj, contextText, promptId = 'default', temperature = 0.2 }) {
      if (!engine) throw new Error(`Model ${def.id} not loaded`);
      const { system, user } = buildMessages(promptId, caseObj, contextText);
      const t0 = performance.now();
      const resp = await engine.chat.completions.create({
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature,
        max_tokens: 512,
      });
      const latencyMs = performance.now() - t0;
      const text = resp.choices?.[0]?.message?.content ?? '';
      const raw = parseJudgment(text);
      const completion = resp.usage?.completion_tokens ?? tokens(text).length;
      return {
        text,
        raw,
        usage: {
          promptTokens: resp.usage?.prompt_tokens ?? tokens(contextText).length,
          completionTokens: completion,
        },
        latencyMs,
        tokensPerSec: completion / (latencyMs / 1000 || 1),
      };
    },
    async unload() {
      if (engine?.unload) await engine.unload();
      engine = null;
      this.ready = false;
    },
  };
}

export { parseJudgment };
