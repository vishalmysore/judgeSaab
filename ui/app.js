// ui/app.js
// Wires the DOM to the JudgeSaab engine. Kept intentionally framework-free.

import { $, $$, download, escapeHtml } from '../core/utils.js';
import { bus, EV } from '../core/events.js';
import { models, datasets, compressors, prompts } from '../core/registry.js';
import { registerModels, hasWebGPU } from '../models/index.js';
import { registerBundledDatasets } from '../datasets/index.js';
import { registerCompressors } from '../compression/index.js';
import { registerMetrics } from '../evaluation/index.js';
import { registerPrompts } from '../models/prompts.js';
import { use } from '../plugins/index.js';
import ukPlugin from '../plugins/example-uk-dataset.js';
import { runBenchmark, compareCompression, exportResults } from '../benchmark/index.js';
import { getAllRuns, clearRuns } from '../core/store.js';
import { canonicalVerdict as canon } from '../evaluation/index.js';
import {
  renderSummaryCards,
  renderLeaderboard,
  renderComparisonChart,
  renderCompressionReport,
  renderCaseDetail,
} from '../dashboard/dashboard.js';

let allRuns = [];
let lastRun = null;

async function boot() {
  // Register the built-in pieces + one example plugin.
  registerModels();
  registerBundledDatasets();
  registerCompressors();
  registerMetrics();
  registerPrompts();
  use(ukPlugin);

  populateSelects();
  wireEvents();
  await refreshLeaderboard();
  await checkGPU();
  logLine('JudgeSaab ready. Pick a model and dataset, then Run benchmark.', 'info');
}

function populateSelects() {
  fill('#modelSelect', models.all(), (m) => `${m.name} · ${m.family} (${m.size})`);
  fill('#datasetSelect', datasets.all(), (d) => `${d.name} — ${d.jurisdiction} (${d.cases.length})`);
  fill('#compressorSelect', compressors.all(), (c) => c.label);
  fill('#promptSelect', prompts.all(), (p) => p.name);
}

function fill(sel, items, label) {
  const el = $(sel);
  el.innerHTML = items.map((i) => `<option value="${i.id}">${escapeHtml(label(i))}</option>`).join('');
}

async function checkGPU() {
  const ok = await hasWebGPU();
  const badge = $('#gpuBadge');
  if (ok) {
    badge.textContent = 'WebGPU available';
    badge.className = 'badge good';
  } else {
    badge.textContent = 'No WebGPU — baseline only';
    badge.className = 'badge bad';
    logLine(
      'WebGPU not detected. LLM models need a Chromium-based browser with WebGPU. The Heuristic Baseline runs anywhere.',
      'warn'
    );
  }
}

function wireEvents() {
  $('#runBtn').addEventListener('click', onRun);
  $('#compressBtn').addEventListener('click', onCompareCompression);
  $('#exportJsonBtn').addEventListener('click', () =>
    download('judgesaab-results.json', exportResults(allRuns, 'json'))
  );
  $('#exportCsvBtn').addEventListener('click', () =>
    download('judgesaab-results.csv', exportResults(allRuns, 'csv'), 'text/csv')
  );
  $('#clearBtn').addEventListener('click', async () => {
    await clearRuns();
    allRuns = [];
    lastRun = null;
    await refreshLeaderboard();
    $('#caseList').innerHTML = '';
    $('#summaryCards').innerHTML = '';
    logLine('Cleared all stored runs.', 'info');
  });

  // Engine events -> UI.
  bus.on(EV.MODEL_PROGRESS, (p) => {
    if (p.text) setProgress(p.progress ?? 0, p.text);
  });
  bus.on(EV.RUN_START, ({ total }) => {
    setProgress(0, `Running ${total} cases…`);
    $('#caseList').innerHTML = '';
  });
  bus.on(EV.RUN_CASE, ({ index, total, result }) => {
    setProgress((index + 1) / total, `Case ${index + 1}/${total}: ${result.title}`);
    appendCase(result);
  });
  bus.on(EV.LOG, ({ msg, level }) => logLine(msg, level));
}

function busyDuring(fn) {
  return async () => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      logLine(e.message, 'error');
      setProgress(0, 'Error');
    } finally {
      setBusy(false);
    }
  };
}

const onRun = busyDuring(async () => {
  const opts = readOpts();
  const run = await runBenchmark(opts);
  lastRun = run;
  renderRun(run);
  await refreshLeaderboard();
  logLine(
    `Saved “${run.modelName}” on ${run.datasetId} to the leaderboard — run another model to compare.`,
    'info'
  );
  setProgress(1, `Done — overall ${(run.summary.overall * 100).toFixed(1)}%`);
});

const onCompareCompression = busyDuring(async () => {
  const opts = readOpts();
  const ids = compressors.all().map((c) => c.id);
  logLine(`Comparing ${ids.length} compression strategies…`, 'info');
  const runs = await compareCompression(opts.modelId, opts.datasetId, ids, opts);
  await refreshLeaderboard();
  // Reframe compression runs into the comparison chart by relabeling. Set this
  // last so it wins over the leaderboard's default (by-model) chart render.
  const labeled = runs.map((r) => ({ ...r, modelName: `${r.compressor}` }));
  $('#comparisonChart').innerHTML = renderComparisonChart(labeled);
  // Token-savings vs judgment-stability report.
  $('#compressionReport').innerHTML = renderCompressionReport(runs);
  $('#compressionPanel').hidden = false;
  // Report the biggest token saving that kept the judgment 100% unchanged.
  const raw = runs.find((r) => r.compressor === 'raw');
  const rawV = new Map(raw.results.map((r) => [r.caseId, canon(r.judgment?.verdict)]));
  const rawTok = raw.summary.avgTokens || 1;
  const valid = runs
    .filter((r) => r.compressor !== 'raw')
    .map((r) => {
      const same = r.results.every((x) => canon(x.judgment?.verdict) === rawV.get(x.caseId));
      return { c: r.compressor, save: 1 - r.summary.avgTokens / rawTok, same };
    })
    .filter((r) => r.same)
    .sort((a, b) => b.save - a.save)[0];
  logLine(
    valid
      ? `Judgment-fidelity test: "${valid.c}" cuts ${(valid.save * 100).toFixed(0)}% of tokens with the verdict 100% unchanged — compression valid.`
      : 'Judgment-fidelity test: every strategy flipped at least one verdict — compression not safe on this set.',
    valid ? 'info' : 'warn'
  );
});

function readOpts() {
  return {
    modelId: $('#modelSelect').value,
    datasetId: $('#datasetSelect').value,
    compressor: $('#compressorSelect').value,
    promptId: $('#promptSelect').value,
    repeats: Number($('#repeatsInput').value) || 1,
  };
}

function renderRun(run) {
  $('#summaryCards').innerHTML = renderSummaryCards(run.summary);
}

function appendCase(result) {
  const div = document.createElement('div');
  div.className = 'case-item';
  div.innerHTML = renderCaseDetail(result);
  $('#caseList').appendChild(div);
}

async function refreshLeaderboard() {
  const stored = await getAllRuns();
  // Keep the latest run per (model · dataset · compressor) so re-running a model
  // updates its row instead of stacking duplicates. Full history stays in the
  // store and in exports.
  const latest = new Map();
  for (const r of stored.sort((a, b) => a.ts - b.ts)) {
    latest.set(`${r.modelId}|${r.datasetId}|${r.compressor}`, r);
  }
  allRuns = [...latest.values()];
  $('#leaderboard').innerHTML = renderLeaderboard(allRuns);
  if (allRuns.length) {
    const recent = [...allRuns].sort((a, b) => b.ts - a.ts).slice(0, 6);
    $('#comparisonChart').innerHTML = renderComparisonChart(recent);
  }
}

function setProgress(frac, text) {
  const pct = Math.round((frac || 0) * 100);
  $('#progressBar').style.width = `${pct}%`;
  $('#progressText').textContent = text || '';
}

function setBusy(b) {
  $$('.controls button, .controls select, .controls input').forEach((el) => (el.disabled = b));
  $('#runBtn').textContent = b ? 'Running…' : 'Run selected model';
}

function logLine(msg, level = 'info') {
  const el = $('#log');
  const line = document.createElement('div');
  line.className = `log-line ${level}`;
  const t = new Date().toLocaleTimeString();
  line.textContent = `[${t}] ${msg}`;
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
}

boot();
