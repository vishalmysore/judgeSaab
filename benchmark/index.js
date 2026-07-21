// benchmark/index.js
// Orchestrates the benchmark flow from the spec:
//   1. load case  2. hide human judgment  3. generate AI judgment
//   4. reveal actual  5. score  6. update leaderboard.

import { bus, EV, log } from '../core/events.js';
import { uid, round } from '../core/utils.js';
import { loadModel } from '../models/index.js';
import { loadDataset } from '../datasets/index.js';
import { compress } from '../compression/index.js';
import { evaluate, consistency } from '../evaluation/index.js';
import { saveRun } from '../core/store.js';

// Run a single case through a model and score it.
export async function runCase(model, caseObj, opts = {}) {
  const { compressor = 'raw', promptId = 'default', repeats = 1, temperature = 0.2 } = opts;

  // 2. hide human judgment — we only pass facts + question to the model.
  //    Query-aware compressors (headroom) get the legal question as context.
  const view = compress(compressor, caseObj.facts, {
    caseObj,
    question: caseObj.question,
  }); // { text, tokensApprox }
  const contextText = view.text;

  const judgments = [];
  let totalLatency = 0;
  let totalTps = 0;
  let lastOut = null;

  for (let i = 0; i < repeats; i++) {
    // 3. generate AI judgment
    const out = await model.generate({ caseObj, contextText, promptId, temperature });
    lastOut = out;
    const judgment = out.raw ?? {};
    judgments.push(judgment);
    totalLatency += out.latencyMs || 0;
    totalTps += out.tokensPerSec || 0;
  }

  // 4 + 5. reveal actual & score (score the last judgment; add consistency).
  const scores = evaluate(judgments[judgments.length - 1], caseObj, { facts: contextText });
  scores.consistency = consistency(judgments);

  return {
    caseId: caseObj.id,
    dataset: caseObj.dataset,
    title: caseObj.title,
    jurisdiction: caseObj.jurisdiction,
    year: caseObj.year,
    source: caseObj.source ?? null,
    compressor,
    contextTokens: view.tokensApprox,
    judgment: judgments[judgments.length - 1],
    rawText: lastOut?.text,
    human: caseObj.human,
    scores,
    perf: {
      latencyMs: round(totalLatency / repeats, 1),
      tokensPerSec: round(totalTps / repeats, 1),
    },
  };
}

// Run a whole benchmark: one model over a dataset (or explicit case list).
export async function runBenchmark(opts = {}) {
  const {
    modelId,
    datasetId,
    cases: explicitCases,
    compressor = 'raw',
    promptId = 'default',
    repeats = 1,
    onProgress,
  } = opts;

  const runId = uid('run');
  const cases = explicitCases ?? (await loadDataset(datasetId));
  const model = await loadModel(modelId, (p) =>
    bus.emit(EV.MODEL_PROGRESS, { id: modelId, ...p })
  );

  bus.emit(EV.RUN_START, { runId, modelId, datasetId, total: cases.length });
  log(`Benchmark start: ${model.name} × ${cases.length} cases (${compressor})`);

  const results = [];
  for (let i = 0; i < cases.length; i++) {
    const c = cases[i];
    try {
      const r = await runCase(model, c, { compressor, promptId, repeats });
      results.push(r);
      bus.emit(EV.RUN_CASE, { runId, index: i, total: cases.length, result: r });
      onProgress?.({ index: i, total: cases.length, result: r });
    } catch (e) {
      log(`Case ${c.id} failed: ${e.message}`, 'error');
      bus.emit(EV.RUN_ERROR, { runId, caseId: c.id, error: e.message });
    }
  }

  const summary = summarize(results);
  const run = {
    id: runId,
    modelId,
    modelName: model.name,
    modelFamily: model.family,
    datasetId: datasetId ?? 'custom',
    compressor,
    promptId,
    repeats,
    ts: Date.now(),
    results,
    summary,
  };
  await saveRun(run);
  bus.emit(EV.RUN_DONE, { run });
  bus.emit(EV.LEADERBOARD, {});
  log(`Benchmark done: ${model.name} overall ${(summary.overall * 100).toFixed(1)}%`);
  return run;
}

export function summarize(results) {
  if (!results.length) {
    return {
      n: 0, overall: 0, verdict: 0, reasoning: 0, citation: 0,
      hallucination: 0, calibration: 0, consistency: 0, latencyMs: 0, tokensPerSec: 0,
      avgTokens: 0,
    };
  }
  const avg = (sel) => round(results.reduce((s, r) => s + sel(r), 0) / results.length, 3);
  return {
    n: results.length,
    overall: avg((r) => r.scores.overall),
    verdict: avg((r) => r.scores.verdictMatch),
    reasoning: avg((r) => r.scores.reasoning),
    citation: avg((r) => r.scores.citation),
    hallucination: avg((r) => r.scores.hallucination),
    calibration: avg((r) => r.scores.calibration),
    consistency: avg((r) => r.scores.consistency ?? 1),
    latencyMs: round(results.reduce((s, r) => s + r.perf.latencyMs, 0) / results.length, 1),
    tokensPerSec: round(results.reduce((s, r) => s + r.perf.tokensPerSec, 0) / results.length, 1),
    avgTokens: Math.round(results.reduce((s, r) => s + (r.contextTokens || 0), 0) / results.length),
  };
}

// Compare several models on the same dataset; returns runs sorted by overall.
export async function compareModels(modelIds, opts = {}) {
  const runs = [];
  for (const modelId of modelIds) {
    const run = await runBenchmark({ ...opts, modelId });
    runs.push(run);
  }
  runs.sort((a, b) => b.summary.overall - a.summary.overall);
  return runs;
}

// Compare compression strategies for one model on one dataset.
export async function compareCompression(modelId, datasetId, compressorIds, opts = {}) {
  const runs = [];
  for (const compressor of compressorIds) {
    runs.push(await runBenchmark({ ...opts, modelId, datasetId, compressor }));
  }
  return runs;
}

export function exportResults(runs, format = 'json') {
  const arr = Array.isArray(runs) ? runs : [runs];
  if (format === 'csv') {
    const header = [
      'runId', 'model', 'dataset', 'compressor', 'n', 'overall', 'verdict',
      'reasoning', 'citation', 'hallucination', 'calibration', 'consistency',
      'latencyMs', 'tokensPerSec',
    ];
    const rows = arr.map((r) =>
      [
        r.id, r.modelName, r.datasetId, r.compressor, r.summary.n, r.summary.overall,
        r.summary.verdict, r.summary.reasoning, r.summary.citation, r.summary.hallucination,
        r.summary.calibration, r.summary.consistency, r.summary.latencyMs, r.summary.tokensPerSec,
      ].join(',')
    );
    return [header.join(','), ...rows].join('\n');
  }
  return JSON.stringify(arr, null, 2);
}
