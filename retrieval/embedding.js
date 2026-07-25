// retrieval/embedding.js
// REAL semantic retriever — a genuine in-browser dense-vector store. Uses
// Transformers.js (Xenova/all-MiniLM-L6-v2) to compute sentence embeddings, then
// ranks the authority corpus by cosine similarity. No server, no mock: the model
// (~23 MB, quantized) downloads once and is cached by the browser; the corpus is
// embedded once per session into an in-memory vector index.
//
// Kept separate from the synchronous lexical retrievers because embedding is async
// and requires loading a model — the rest of the page stays instant and offline.

import { AUTHORITIES } from './authorities.js';

// Loaded from jsDelivr (same CDN posture as the WebLLM adapter in models/webllm.js).
const CDN = 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';
const MODEL = 'Xenova/all-MiniLM-L6-v2';

let extractorPromise = null;
let corpusVecs = null; // Map<id, Float32Array> — the in-memory vector index
let ready = false;

export function isReady() {
  return ready;
}

async function getExtractor(onProgress) {
  if (!extractorPromise) {
    extractorPromise = (async () => {
      const { pipeline, env } = await import(CDN);
      env.allowLocalModels = false;
      // Force single-threaded WASM so we don't require SharedArrayBuffer / cross-origin
      // isolation (COEP), which GitHub Pages here does not reliably provide.
      try {
        env.backends.onnx.wasm.numThreads = 1;
      } catch {}
      return pipeline('feature-extraction', MODEL, {
        quantized: true,
        progress_callback: onProgress,
      });
    })();
  }
  return extractorPromise;
}

async function embed(extractor, text) {
  // Mean-pooled + L2-normalized sentence embedding (length 384).
  const out = await extractor(text, { pooling: 'mean', normalize: true });
  return Float32Array.from(out.data);
}

// Load the model and embed the whole corpus into the in-memory index.
export async function ensureReady(onProgress) {
  const extractor = await getExtractor(onProgress);
  if (!corpusVecs) {
    const index = new Map();
    for (const a of AUTHORITIES) {
      index.set(a.id, await embed(extractor, `${a.label}. ${a.text}`));
    }
    corpusVecs = index;
  }
  ready = true;
  return true;
}

// Cosine similarity of two L2-normalized vectors == dot product.
function cosine(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

// Rank the full corpus for a query -> [{ id, score }] best-first.
export async function rankAll(queryText) {
  if (!corpusVecs) throw new Error('embedding index not ready — call ensureReady() first');
  const extractor = await getExtractor();
  const qv = await embed(extractor, queryText);
  return [...corpusVecs.entries()]
    .map(([id, v]) => ({ id, score: cosine(qv, v) }))
    .sort((a, z) => z.score - a.score);
}

export const embeddingRetriever = {
  id: 'embedding',
  label: 'Semantic (MiniLM embeddings)',
  description:
    'Real dense-vector retrieval — Transformers.js all-MiniLM-L6-v2, cosine similarity. Loads a ~23 MB model in your browser (once).',
  async: true,
  ensureReady,
  rankAll,
  isReady,
};
