// reranking/app.js
// UI for the reranking test. Deterministic and instant — no model/GPU.

import { $, escapeHtml, fmtPct, download, round } from '../core/utils.js';
import { RERANKERS } from './rerankers.js';
import { datasetIds } from '../retrieval/gold.js';
import { AUTHORITIES } from '../retrieval/authorities.js';
import { runReranking, compareRerankers, exportRuns } from './rerank-engine.js';

const el = {
  reranker: $('#rerankerSelect'),
  dataset: $('#datasetSelect'),
  candN: $('#candNInput'),
  k: $('#kInput'),
  runBtn: $('#runBtn'),
  compareBtn: $('#compareBtn'),
  exportJson: $('#exportJsonBtn'),
  exportCsv: $('#exportCsvBtn'),
  cards: $('#summaryCards'),
  runContext: $('#runContext'),
  leaderboard: $('#leaderboard'),
  cases: $('#caseList'),
  log: $('#log'),
};

let lastRuns = [];

function log(msg) {
  const line = document.createElement('div');
  line.className = 'log-line';
  line.textContent = `${new Date().toLocaleTimeString()}  ${msg}`;
  el.log.prepend(line);
}

function initControls() {
  el.reranker.innerHTML = RERANKERS.map(
    (r) => `<option value="${r.id}" title="${escapeHtml(r.description)}">${escapeHtml(r.label)}</option>`
  ).join('');
  el.dataset.innerHTML =
    `<option value="">All datasets</option>` +
    datasetIds().map((d) => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join('');
}

function opts() {
  return {
    k: Math.max(1, Math.min(AUTHORITIES.length, Number(el.k.value) || 5)),
    candN: Math.max(2, Math.min(AUTHORITIES.length, Number(el.candN.value) || 8)),
    datasetId: el.dataset.value || null,
    queryMode: 'question',
    firstStage: 'overlap',
  };
}

const band = (v) => (v >= 0.8 ? 'good' : v >= 0.5 ? 'mid' : 'bad');

function renderCards(run) {
  const s = run.summary;
  const cards = [
    { label: 'Controlling@1', value: fmtPct(s.controllingAt1), cls: band(s.controllingAt1), lead: true },
    { label: `Controlling@${run.k}`, value: fmtPct(s.controllingInTopK), cls: band(s.controllingInTopK) },
    { label: 'Controlling MRR', value: s.controllingMRR.toFixed(3), cls: 'neutral' },
    { label: `nDCG@${run.k} (graded)`, value: s.ndcg.toFixed(3), cls: band(s.ndcg) },
    { label: `Recall@${run.k}`, value: fmtPct(s.recall), cls: 'neutral' },
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
    `<span class="rc-item">Reranker: <strong>${escapeHtml(run.rerankerLabel)}</strong></span>`,
    `<span class="rc-item rc-compression">First stage: ${escapeHtml(run.firstStage)} top-${run.candN}</span>`,
    `<span class="rc-item">Dataset: <strong>${escapeHtml(run.datasetId)}</strong></span>`,
    `<span class="rc-item">Cases: <strong>${run.summary.n}</strong></span>`,
  ].join('');
}

function renderLeaderboard(runs) {
  const rows = runs
    .map((r, i) => {
      const s = r.summary;
      const pct = round(s.controllingAt1 * 100, 1);
      return `<tr>
        <td class="rank">${['🥇', '🥈', '🥉'][i] || i + 1}</td>
        <td><strong>${escapeHtml(r.rerankerLabel)}</strong></td>
        <td><div class="minibar"><div class="minibar-fill" style="width:${pct}%"></div><span>${fmtPct(s.controllingAt1)}</span></div></td>
        <td>${fmtPct(s.controllingInTopK)}</td>
        <td>${s.controllingMRR.toFixed(3)}</td>
        <td>${s.ndcg.toFixed(3)}</td>
        <td>${fmtPct(s.recall)}</td>
      </tr>`;
    })
    .join('');
  el.leaderboard.innerHTML = `<table class="leaderboard">
    <thead><tr>
      <th></th><th>Reranker</th>
      <th>Controlling@1 <span class="info" tabindex="0" title="Share of cases where the reranker put the CONTROLLING authority (the one the holding turns on) at rank 1. The headline metric.">ⓘ</span></th>
      <th>Controlling@k</th><th>Controlling MRR</th><th>nDCG@k</th><th>Recall@k</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function renderCases(run) {
  el.cases.innerHTML = run.results
    .map((r) => {
      const s = r.scores;
      const cls = s.controllingAt1 ? 'match' : s.controllingInTopK ? 'mid-pill' : 'mismatch';
      const txt = s.controllingAt1 ? 'controlling @1' : s.controllingInTopK ? 'controlling in top-k' : 'controlling missed';
      const reranked = r.reranked
        .map(
          (x, i) =>
            `<div class="rank-row ${x.gain ? 'relevant' : ''}${x.controlling ? ' controlling' : ''}">
              <span class="rank-num">${i + 1}</span>
              <span class="rank-mark">${x.controlling ? '★' : x.gain ? '✓' : '·'}</span>
              <span class="rank-label">${escapeHtml(x.authority.label)}</span>
              <span class="rank-score">${x.gain ? 'gain ' + x.gain : ''}</span>
            </div>`
        )
        .join('');
      return `<div class="case-item">
        <div class="case-head">
          <h4>${escapeHtml(r.title)} <span class="muted small">(${r.year} · ${escapeHtml(r.dataset)})</span></h4>
          <span class="pill ${cls}">${txt}</span>
        </div>
        <div class="case-meta">${escapeHtml(r.question)}</div>
        <div class="verdict-grid">
          <div class="vcol">
            <div class="vcol-title">Controlling authority (★)</div>
            <div class="laws">${r.controlling ? `<span class="law">${escapeHtml(r.controlling.label)}</span>` : '<span class="muted small">—</span>'}</div>
            <div class="vcol-title" style="margin-top:10px">First-stage candidates (weak order)</div>
            <div class="muted small">${r.candidateOrder.map(escapeHtml).join(' · ')}</div>
          </div>
          <div class="vcol">
            <div class="vcol-title">After rerank — top ${run.k}</div>
            <div class="rank-list">${reranked}</div>
          </div>
        </div>
        <div class="score-row">
          <span class="score-pill ${s.controllingAt1 ? 'good' : 'mid'}">controlling@1 ${s.controllingAt1 ? 'yes' : 'no'}</span>
          <span class="score-pill">ctrl-mrr ${s.controllingRR.toFixed(3)}</span>
          <span class="score-pill ${band(s.ndcg)}">ndcg ${s.ndcg.toFixed(3)}</span>
          <span class="score-pill">recall ${fmtPct(s.recall)}</span>
        </div>
      </div>`;
    })
    .join('');
}

function doRun() {
  const run = runReranking(el.reranker.value, opts());
  lastRuns = [run];
  renderCards(run);
  renderCases(run);
  renderLeaderboard([run]);
  log(`${run.rerankerLabel}: controlling@1 ${fmtPct(run.summary.controllingAt1)} over ${run.summary.n} cases.`);
}

function doCompare() {
  const runs = compareRerankers(RERANKERS.map((r) => r.id), opts());
  lastRuns = runs;
  const best = runs[0];
  renderCards(best);
  renderCases(best);
  renderLeaderboard(runs);
  el.reranker.value = best.rerankerId;
  log(`Compared ${runs.length} rerankers — best: ${best.rerankerLabel} @ controlling@1 ${fmtPct(best.summary.controllingAt1)}.`);
}

function init() {
  initControls();
  el.runBtn.addEventListener('click', doRun);
  el.compareBtn.addEventListener('click', doCompare);
  el.reranker.addEventListener('change', doRun);
  el.dataset.addEventListener('change', doRun);
  el.candN.addEventListener('change', doRun);
  el.k.addEventListener('change', doRun);
  el.exportJson.addEventListener('click', () => download('reranking-runs.json', exportRuns(lastRuns, 'json')));
  el.exportCsv.addEventListener('click', () => download('reranking-runs.csv', exportRuns(lastRuns, 'csv'), 'text/csv'));

  doCompare();
  log('Reranking test ready — ground truth = the controlling authority the holding turns on.');
}

window.JudgeSaabReranking = { runReranking, compareRerankers };
init();
