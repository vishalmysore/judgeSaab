// dashboard/dashboard.js
// Pure rendering helpers: metric cards, leaderboard, per-metric bars, and the
// case-detail comparison view. Everything is dependency-free SVG/HTML.

import { fmtPct, fmtMs, round, escapeHtml } from '../core/utils.js';
import { canonicalVerdict } from '../evaluation/index.js';

export function renderSummaryCards(summary) {
  const cards = [
    { label: 'Overall score', value: fmtPct(summary.overall), tone: tone(summary.overall) },
    { label: 'Verdict accuracy', value: fmtPct(summary.verdict), tone: tone(summary.verdict) },
    { label: 'Reasoning', value: fmtPct(summary.reasoning), tone: tone(summary.reasoning) },
    { label: 'Citation quality', value: fmtPct(summary.citation), tone: tone(summary.citation) },
    {
      label: 'Hallucination rate',
      value: fmtPct(summary.hallucination),
      tone: tone(1 - summary.hallucination),
    },
    { label: 'Consistency', value: fmtPct(summary.consistency), tone: tone(summary.consistency) },
    { label: 'Latency', value: fmtMs(summary.latencyMs), tone: 'neutral' },
    { label: 'Tokens/sec', value: round(summary.tokensPerSec, 1), tone: 'neutral' },
  ];
  return cards
    .map(
      (c) => `
    <div class="card metric ${c.tone}">
      <div class="metric-value">${c.value}</div>
      <div class="metric-label">${c.label}</div>
    </div>`
    )
    .join('');
}

function tone(v) {
  if (v >= 0.7) return 'good';
  if (v >= 0.45) return 'mid';
  return 'bad';
}

export function renderLeaderboard(runs) {
  if (!runs.length) return '<p class="muted">No runs yet. Run a benchmark to populate the leaderboard.</p>';
  const sorted = [...runs].sort((a, b) => b.summary.overall - a.summary.overall);
  const rows = sorted
    .map((r, i) => {
      const s = r.summary;
      return `<tr>
        <td class="rank">${medal(i)}</td>
        <td><strong>${escapeHtml(r.modelName)}</strong><br><span class="muted small">${escapeHtml(
        r.datasetId
      )} · ${escapeHtml(r.compressor)}</span></td>
        <td>${bar(s.overall)}</td>
        <td>${fmtPct(s.verdict)}</td>
        <td>${fmtPct(s.reasoning)}</td>
        <td>${fmtPct(s.citation)}</td>
        <td class="${s.hallucination > 0.2 ? 'bad-text' : ''}">${fmtPct(s.hallucination)}</td>
        <td>${s.avgTokens ?? '—'}</td>
      </tr>`;
    })
    .join('');
  return `<table class="leaderboard">
    <thead><tr>
      <th>#</th><th>Model</th><th>Overall</th><th>Verdict</th><th>Reasoning</th>
      <th>Citation</th><th>Halluc.</th><th>Tokens</th>
    </tr></thead>
    <tbody>${rows}</tbody></table>`;
}

function medal(i) {
  return ['🥇', '🥈', '🥉'][i] ?? `${i + 1}`;
}

function bar(v) {
  const pct = Math.round(v * 100);
  return `<div class="minibar"><div class="minibar-fill" style="width:${pct}%"></div><span>${pct}%</span></div>`;
}

// Grouped bar chart comparing models across metric families (inline SVG).
export function renderComparisonChart(runs) {
  if (!runs.length) return '';
  const metrics = [
    ['verdict', 'Verdict'],
    ['reasoning', 'Reasoning'],
    ['citation', 'Citation'],
    ['consistency', 'Consistency'],
  ];
  const W = 640, H = 260, padL = 40, padB = 48, padT = 16;
  const chartW = W - padL - 16;
  const chartH = H - padB - padT;
  const groups = metrics.length;
  const gw = chartW / groups;
  const barW = Math.min(26, (gw - 12) / Math.max(runs.length, 1));
  const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#a855f7', '#ec4899'];

  let bars = '';
  metrics.forEach(([key], gi) => {
    runs.forEach((r, ri) => {
      const v = r.summary[key] ?? 0;
      const x = padL + gi * gw + 8 + ri * (barW + 2);
      const h = v * chartH;
      const y = padT + chartH - h;
      bars += `<rect x="${x}" y="${y}" width="${barW}" height="${h}" rx="3" fill="${
        colors[ri % colors.length]
      }"><title>${escapeHtml(r.modelName)} — ${key}: ${Math.round(v * 100)}%</title></rect>`;
    });
  });

  const labels = metrics
    .map(([, name], gi) => {
      const x = padL + gi * gw + gw / 2;
      return `<text x="${x}" y="${H - padB + 18}" text-anchor="middle" class="axis">${name}</text>`;
    })
    .join('');

  const yTicks = [0, 0.5, 1]
    .map((t) => {
      const y = padT + chartH - t * chartH;
      return `<line x1="${padL}" y1="${y}" x2="${W - 16}" y2="${y}" class="grid"/>
      <text x="${padL - 6}" y="${y + 4}" text-anchor="end" class="axis">${t * 100}</text>`;
    })
    .join('');

  const legend = runs
    .map(
      (r, ri) =>
        `<span class="legend-item"><span class="swatch" style="background:${
          colors[ri % colors.length]
        }"></span>${escapeHtml(r.modelName)}</span>`
    )
    .join('');

  return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="Model comparison chart">
    ${yTicks}${bars}${labels}
  </svg><div class="legend">${legend}</div>`;
}

// Compression report: for a set of runs (same model + dataset, different
// compressors) show tokens, savings vs raw, verdict accuracy, and — crucially —
// whether the compressed judgment matches the uncompressed (raw) judgment.
export function renderCompressionReport(runs) {
  if (!runs.length) return '';
  const raw = runs.find((r) => r.compressor === 'raw') || runs[0];
  const rawTokens = raw.summary.avgTokens || 0;
  const rawVerdicts = new Map(
    raw.results.map((r) => [r.caseId, canonicalVerdict(r.judgment?.verdict || '')])
  );

  const rows = runs
    .map((run) => {
      const s = run.summary;
      const savings = rawTokens ? 1 - s.avgTokens / rawTokens : 0;
      // Fraction of cases whose verdict is unchanged vs the raw (full-context) run.
      let same = 0;
      for (const r of run.results) {
        if (canonicalVerdict(r.judgment?.verdict || '') === rawVerdicts.get(r.caseId)) same++;
      }
      const sameRatio = run.results.length ? same / run.results.length : 1;
      return { run, s, savings, sameRatio };
    })
    .sort((a, b) => a.s.avgTokens - b.s.avgTokens);

  const body = rows
    .map(({ run, s, savings, sameRatio }) => {
      const isRaw = run.compressor === raw.compressor;
      return `<tr class="${isRaw ? 'row-raw' : ''}">
        <td><strong>${escapeHtml(run.compressor)}</strong>${isRaw ? ' <span class="muted small">(baseline)</span>' : ''}</td>
        <td>${s.avgTokens}</td>
        <td class="${savings > 0 ? 'good-text' : ''}">${isRaw ? '—' : fmtPct(savings)}</td>
        <td>${fmtPct(s.verdict)}</td>
        <td>${isRaw ? '—' : sameBadge(sameRatio)}</td>
        <td>${fmtPct(s.overall)}</td>
      </tr>`;
    })
    .join('');

  return `<table class="leaderboard compression-report">
    <thead><tr>
      <th>Strategy</th><th>Avg tokens</th><th>Token savings</th>
      <th>Verdict acc.</th><th>Same as raw</th><th>Overall</th>
    </tr></thead>
    <tbody>${body}</tbody></table>
    <p class="muted small">“Same as raw” = share of cases whose verdict is unchanged after compression — high savings with 100% here means the judgment held despite fewer tokens.</p>`;
}

function sameBadge(v) {
  const cls = v >= 0.999 ? 'good' : v >= 0.7 ? 'mid' : 'bad';
  return `<span class="score-pill ${cls}">${Math.round(v * 100)}%</span>`;
}

export function renderCaseDetail(result) {
  const s = result.scores;
  const j = result.judgment || {};
  const h = result.human || {};
  const match = s.verdictMatch ? 'match' : 'mismatch';
  return `<div class="case-detail">
    <div class="case-head">
      <h4>${escapeHtml(result.title)}</h4>
      <span class="pill ${match}">${s.verdictMatch ? '✓ verdict match' : '✗ verdict mismatch'}</span>
    </div>
    <div class="verdict-grid">
      <div class="vcol">
        <div class="vcol-title">AI judgment</div>
        <div class="vverdict">${escapeHtml(j.verdict || '—')}</div>
        <p>${escapeHtml(j.reasoning || '')}</p>
        <div class="laws">${(j.laws || []).map((l) => `<span class="law">${escapeHtml(l)}</span>`).join('')}</div>
        <div class="muted small">confidence ${Math.round((j.confidence ?? 0) * 100)}%</div>
      </div>
      <div class="vcol">
        <div class="vcol-title">Human judgment</div>
        <div class="vverdict">${escapeHtml(h.verdict || '—')}</div>
        <p>${escapeHtml(h.reasoning || '')}</p>
        <div class="laws">${(h.laws || []).map((l) => `<span class="law">${escapeHtml(l)}</span>`).join('')}</div>
      </div>
    </div>
    <div class="score-row">
      ${scorePill('Reasoning', s.reasoning)}
      ${scorePill('Citation', s.citation)}
      ${scorePill('Hallucination', s.hallucination, true)}
      ${scorePill('Overall', s.overall)}
    </div>
  </div>`;
}

function scorePill(label, v, invert = false) {
  const good = invert ? v <= 0.2 : v >= 0.6;
  return `<span class="score-pill ${good ? 'good' : 'mid'}">${label}: ${Math.round(v * 100)}%</span>`;
}
