// dashboard/dashboard.js
// Pure rendering helpers: metric cards, leaderboard, per-metric bars, and the
// case-detail comparison view. Everything is dependency-free SVG/HTML.

import { fmtPct, fmtMs, round, escapeHtml } from '../core/utils.js';

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
        <td>${fmtMs(s.latencyMs)}</td>
      </tr>`;
    })
    .join('');
  return `<table class="leaderboard">
    <thead><tr>
      <th>#</th><th>Model</th><th>Overall</th><th>Verdict</th><th>Reasoning</th>
      <th>Citation</th><th>Halluc.</th><th>Latency</th>
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
