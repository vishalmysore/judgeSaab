// retrieval/app.js
// UI for the retrieval (RAG) test. Deterministic and instant — no model/GPU — so it
// runs on load and on every control change.

import { $, escapeHtml, fmtPct, download, round } from '../core/utils.js';
import { RETRIEVERS } from './retrievers.js';
import { datasetIds } from './gold.js';
import { runRetrieval, compareRetrievers, corpusInfo, exportRuns } from './engine.js';
import { AUTHORITIES } from './authorities.js';

const el = {
  retriever: $('#retrieverSelect'),
  dataset: $('#datasetSelect'),
  k: $('#kInput'),
  queryMode: $('#queryModeSelect'),
  runBtn: $('#runBtn'),
  compareBtn: $('#compareBtn'),
  exportJson: $('#exportJsonBtn'),
  exportCsv: $('#exportCsvBtn'),
  cards: $('#summaryCards'),
  runContext: $('#runContext'),
  leaderboard: $('#leaderboard'),
  cases: $('#caseList'),
  corpus: $('#corpusList'),
  log: $('#log'),
};

let lastRuns = []; // for export

function log(msg) {
  const line = document.createElement('div');
  line.className = 'log-line';
  line.textContent = `${new Date().toLocaleTimeString()}  ${msg}`;
  el.log.prepend(line);
}

// ---- Populate controls ----
function initControls() {
  el.retriever.innerHTML = RETRIEVERS.map(
    (r) => `<option value="${r.id}" title="${escapeHtml(r.description)}">${escapeHtml(r.label)}</option>`
  ).join('');
  el.dataset.innerHTML =
    `<option value="">All datasets</option>` +
    datasetIds().map((d) => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join('');
}

function opts() {
  return {
    k: Math.max(1, Math.min(AUTHORITIES.length, Number(el.k.value) || 5)),
    queryMode: el.queryMode.value,
    datasetId: el.dataset.value || null,
  };
}

// ---- Metric cards ----
const band = (v) => (v >= 0.8 ? 'good' : v >= 0.5 ? 'mid' : 'bad');

function renderCards(run) {
  const s = run.summary;
  const cards = [
    { label: `Precedent recall@${run.k}`, value: fmtPct(s.recall), cls: band(s.recall), lead: true },
    { label: `Precision@${run.k}`, value: fmtPct(s.precision), cls: 'neutral' },
    { label: `Hit rate@${run.k}`, value: fmtPct(s.hit), cls: band(s.hit) },
    { label: 'MRR', value: s.mrr.toFixed(3), cls: 'neutral' },
    { label: `nDCG@${run.k}`, value: s.ndcg.toFixed(3), cls: band(s.ndcg) },
  ];
  el.cards.innerHTML = cards
    .map(
      (c) => `<div class="metric card ${c.cls}${c.lead ? ' lead' : ''}">
        <div class="metric-value">${c.value}</div>
        <div class="metric-label">${c.label}</div>
      </div>`
    )
    .join('');

  el.runContext.innerHTML = [
    `<span class="rc-item">Retriever: <strong>${escapeHtml(run.retrieverLabel)}</strong></span>`,
    `<span class="rc-item">Dataset: <strong>${escapeHtml(run.datasetId)}</strong></span>`,
    `<span class="rc-item rc-compression">Query: ${escapeHtml(run.queryMode)}</span>`,
    `<span class="rc-item">Cases: <strong>${run.summary.n}</strong></span>`,
  ].join('');
}

// ---- Leaderboard across retrievers ----
function renderLeaderboard(runs) {
  const rows = runs
    .map((r, i) => {
      const s = r.summary;
      const pct = round(s.recall * 100, 1);
      return `<tr>
        <td class="rank">${['🥇', '🥈', '🥉'][i] || i + 1}</td>
        <td><strong>${escapeHtml(r.retrieverLabel)}</strong></td>
        <td><div class="minibar"><div class="minibar-fill" style="width:${pct}%"></div><span>${fmtPct(s.recall)}</span></div></td>
        <td>${fmtPct(s.precision)}</td>
        <td>${fmtPct(s.hit)}</td>
        <td>${s.mrr.toFixed(3)}</td>
        <td>${s.ndcg.toFixed(3)}</td>
      </tr>`;
    })
    .join('');
  el.leaderboard.innerHTML = `<table class="leaderboard">
    <thead><tr>
      <th></th><th>Retriever</th>
      <th>Precedent recall@k <span class="info" tabindex="0" title="Of the authorities the court actually cited, the share the retriever surfaced in the top k. The headline metric — the retrieval analogue of judgment fidelity.">ⓘ</span></th>
      <th>Precision@k</th><th>Hit rate</th><th>MRR</th><th>nDCG@k</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

// ---- Per-case breakdown ----
function lawPills(list) {
  return `<div class="laws">${list.map((a) => `<span class="law">${escapeHtml(a.label)}</span>`).join('')}</div>`;
}

function renderCases(run) {
  el.cases.innerHTML = run.results
    .map((r) => {
      const s = r.scores;
      const matchCls = s.recall === 1 ? 'match' : s.hit ? 'mid-pill' : 'mismatch';
      const matchTxt = s.recall === 1 ? 'all cited found' : s.hit ? `${s.hits}/${s.goldCount} found` : 'missed';
      const retrieved = r.retrieved
        .map(
          (x, i) =>
            `<div class="rank-row ${x.relevant ? 'relevant' : ''}">
              <span class="rank-num">${i + 1}</span>
              <span class="rank-mark">${x.relevant ? '✓' : '·'}</span>
              <span class="rank-label">${escapeHtml(x.authority.label)}</span>
              <span class="rank-score">${x.score.toFixed(3)}</span>
            </div>`
        )
        .join('');
      return `<div class="case-item">
        <div class="case-head">
          <h4>${escapeHtml(r.title)} <span class="muted small">(${r.year} · ${escapeHtml(r.dataset)})</span></h4>
          <span class="pill ${matchCls}">${matchTxt}</span>
        </div>
        <div class="case-meta">${escapeHtml(r.question)}</div>
        <div class="verdict-grid">
          <div class="vcol">
            <div class="vcol-title">Cited by the court (gold)</div>
            ${lawPills(r.gold)}
          </div>
          <div class="vcol">
            <div class="vcol-title">Retrieved — top ${run.k}</div>
            <div class="rank-list">${retrieved}</div>
          </div>
        </div>
        <div class="score-row">
          <span class="score-pill ${band(s.recall)}">recall ${fmtPct(s.recall)}</span>
          <span class="score-pill">precision ${fmtPct(s.precision)}</span>
          <span class="score-pill">mrr ${s.mrr.toFixed(3)}</span>
          <span class="score-pill ${band(s.ndcg)}">ndcg ${s.ndcg.toFixed(3)}</span>
        </div>
      </div>`;
    })
    .join('');
}

// ---- Corpus viewer ----
function renderCorpus() {
  const info = corpusInfo();
  const rows = AUTHORITIES.map(
    (a) => `<tr>
      <td><span class="law">${escapeHtml(a.type)}</span></td>
      <td><strong>${escapeHtml(a.label)}</strong><div class="muted small">${escapeHtml(a.text.slice(0, 130))}…</div></td>
      <td>${a.gold ? '<span class="good-text">cited</span>' : '<span class="muted">distractor</span>'}</td>
    </tr>`
  ).join('');
  el.corpus.innerHTML = `<p class="muted small">${info.total} authorities — ${info.gold} cited by ≥1 case (gold), ${info.distractors} distractors.</p>
    <table class="leaderboard"><thead><tr><th>Type</th><th>Authority</th><th>Role</th></tr></thead><tbody>${rows}</tbody></table>`;
}

// ---- Actions ----
function doRun() {
  const o = opts();
  const run = runRetrieval(el.retriever.value, o);
  lastRuns = [run];
  renderCards(run);
  renderCases(run);
  renderLeaderboard([run]);
  log(`${run.retrieverLabel}: recall@${run.k} ${fmtPct(run.summary.recall)} over ${run.summary.n} cases (${run.datasetId}).`);
}

function doCompare() {
  const o = opts();
  const runs = compareRetrievers(RETRIEVERS.map((r) => r.id), o);
  lastRuns = runs;
  const best = runs[0];
  renderCards(best);
  renderCases(best);
  renderLeaderboard(runs);
  el.retriever.value = best.retrieverId;
  log(`Compared ${runs.length} retrievers — best: ${best.retrieverLabel} @ recall ${fmtPct(best.summary.recall)}.`);
}

function init() {
  initControls();
  renderCorpus();
  el.runBtn.addEventListener('click', doRun);
  el.compareBtn.addEventListener('click', doCompare);
  el.retriever.addEventListener('change', doRun);
  el.dataset.addEventListener('change', doRun);
  el.queryMode.addEventListener('change', doRun);
  el.k.addEventListener('change', doRun);
  el.exportJson.addEventListener('click', () =>
    download('retrieval-runs.json', exportRuns(lastRuns, 'json'))
  );
  el.exportCsv.addEventListener('click', () =>
    download('retrieval-runs.csv', exportRuns(lastRuns, 'csv'), 'text/csv')
  );

  // Run all retrievers once on load so the page is populated immediately.
  doCompare();
  log('Retrieval test ready — ground truth = the authorities each court actually cited.');
}

window.JudgeSaabRetrieval = { runRetrieval, compareRetrievers, corpusInfo };
init();
