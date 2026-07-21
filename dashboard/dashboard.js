// dashboard/dashboard.js
// Pure rendering helpers: metric cards, leaderboard, per-metric bars, and the
// case-detail comparison view. Everything is dependency-free SVG/HTML.

import { fmtPct, fmtMs, round, escapeHtml } from '../core/utils.js';
import { canonicalVerdict } from '../evaluation/index.js';

export function renderSummaryCards(summary) {
  const cards = [
    { label: 'Overall score', value: fmtPct(summary.overall), tone: tone(summary.overall), tip: 'Blended score across verdict, reasoning, citation, and hallucination.' },
    { label: 'Verdict accuracy', value: fmtPct(summary.verdict), tone: tone(summary.verdict), tip: 'Share of cases where the AI matched the human court verdict.' },
    { label: 'Reasoning', value: fmtPct(summary.reasoning), tone: tone(summary.reasoning), tip: 'Text similarity between the AI and court reasoning.' },
    { label: 'Citation quality', value: fmtPct(summary.citation), tone: tone(summary.citation), tip: 'Overlap of cited laws with the laws the court applied.' },
    {
      label: 'Hallucination rate',
      value: fmtPct(summary.hallucination),
      tone: tone(1 - summary.hallucination),
      tip: 'Share of cited laws unsupported by the facts or court — lower is better.',
    },
    { label: 'Consistency', value: fmtPct(summary.consistency), tone: tone(summary.consistency), tip: 'Agreement of verdicts across repeated runs of the same case.' },
    { label: 'Latency', value: fmtMs(summary.latencyMs), tone: 'neutral', tip: 'Average time to judge one case.' },
    { label: 'Tokens/sec', value: round(summary.tokensPerSec, 1), tone: 'neutral', tip: 'Model generation throughput.' },
  ];
  return cards
    .map(
      (c) => `
    <div class="card metric ${c.tone}" title="${c.tip}">
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
      <th>#</th><th>Model</th>
      <th title="Blended score: 45% verdict + 30% reasoning + 15% citation + 10% (1 − hallucination).">Overall</th>
      <th title="Share of cases where the AI's verdict matched the human court's decision.">Verdict</th>
      <th title="Text similarity between the AI's reasoning and the court's reasoning.">Reasoning</th>
      <th title="Overlap between the laws the AI cited and the laws the court actually applied.">Citation</th>
      <th title="Share of cited laws not supported by the facts or the court — lower is better.">Halluc.</th>
      <th title="Average number of context tokens fed to the model per case.">Tokens</th>
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

// Compression report — the core thesis of JudgeSaab:
//   Compression is valid when the AI reaches the SAME judgment on the compressed
//   facts as on the full facts. "Judgment fidelity" = share of historical cases
//   whose verdict is unchanged vs the raw (full-context) run. High token savings
//   at 100% fidelity means the compression preserved the legally-decisive signal.
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
      // Per-case: did compression change the AI's verdict vs the full-context run?
      const flips = [];
      let same = 0;
      for (const r of run.results) {
        const cv = canonicalVerdict(r.judgment?.verdict || '');
        const rv = rawVerdicts.get(r.caseId);
        if (cv === rv) same++;
        else flips.push({ title: r.title, from: rv, to: cv });
      }
      const fidelity = run.results.length ? same / run.results.length : 1;
      return { run, s, savings, fidelity, flips, isRaw: run.compressor === raw.compressor };
    })
    .sort((a, b) => a.s.avgTokens - b.s.avgTokens);

  // Recommendation: the biggest token saving that keeps 100% judgment fidelity.
  const valid = rows.filter((r) => !r.isRaw && r.fidelity >= 0.999);
  const best = valid.sort((a, b) => b.savings - a.savings)[0];
  const banner = best
    ? `<div class="fidelity-banner good">✅ <strong>${escapeHtml(best.run.compressor)}</strong> cuts
       <strong>${fmtPct(best.savings)}</strong> of tokens while the AI's judgment stays
       <strong>100% unchanged</strong> across ${best.run.results.length} cases — compression is valid here.</div>`
    : `<div class="fidelity-banner bad">⚠️ No strategy kept the judgment 100% unchanged on this set —
       every compression flipped at least one verdict. Compression is not safe here yet.</div>`;

  const body = rows
    .map(({ run, s, savings, fidelity, isRaw }) => {
      return `<tr class="${isRaw ? 'row-raw' : ''}">
        <td><strong>${escapeHtml(run.compressor)}</strong>${isRaw ? ' <span class="muted small">(full context — reference)</span>' : ''}</td>
        <td>${s.avgTokens}</td>
        <td class="${savings > 0 ? 'good-text' : ''}">${isRaw ? '—' : fmtPct(savings)}</td>
        <td>${isRaw ? '<span class="muted">reference</span>' : sameBadge(fidelity)}</td>
        <td>${fmtPct(s.verdict)}</td>
      </tr>`;
    })
    .join('');

  // Show exactly where compression broke the judgment.
  const flipped = rows.filter((r) => !r.isRaw && r.flips.length);
  const flipSection = flipped.length
    ? `<div class="flip-detail">
        <h4>Where compression changed the judgment</h4>
        ${flipped
          .map(
            (r) => `<div class="flip-group"><span class="flip-strategy">${escapeHtml(
              r.run.compressor
            )}</span>${r.flips
              .map(
                (f) =>
                  `<div class="flip-row"><span class="flip-case">${escapeHtml(f.title)}</span>
                   <span class="flip-change"><span class="score-pill good">${escapeHtml(
                     f.from
                   )}</span> → <span class="score-pill bad">${escapeHtml(f.to)}</span></span></div>`
              )
              .join('')}</div>`
          )
          .join('')}
      </div>`
    : '';

  return `${banner}
    <table class="leaderboard compression-report">
    <thead><tr>
      <th>Strategy</th><th>Avg tokens</th><th>Token savings</th>
      <th>Judgment fidelity (vs full context)</th><th>Verdict acc. (vs human)</th>
    </tr></thead>
    <tbody>${body}</tbody></table>
    <p class="muted small"><strong>Judgment fidelity</strong> = share of historical cases whose AI verdict
    is unchanged after compression. This — not accuracy vs the human judge — is the test of whether the
    compression works: if the model decides the same way on fewer tokens, the decisive facts survived.</p>
    ${flipSection}`;
}

function sameBadge(v) {
  const cls = v >= 0.999 ? 'good' : v >= 0.7 ? 'mid' : 'bad';
  const label = v >= 0.999 ? '100% preserved' : `${Math.round(v * 100)}% preserved`;
  return `<span class="score-pill ${cls}">${label}</span>`;
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
    <div class="case-meta">🗜️ ${escapeHtml(result.compressorLabel || result.compressor || 'Raw document')} · ${
      result.contextTokens
    } tokens</div>
    ${renderSource(result)}
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

// Case source line. Real cases link out to the official record; the bundled
// cases are illustrative synthetic scenarios and are labelled as such.
function renderSource(result) {
  const meta = [result.jurisdiction, result.year].filter(Boolean).join(' · ');
  const src = result.source;
  if (src && src.url) {
    return `<div class="case-source">
      📎 Source: <a href="${escapeHtml(src.url)}" target="_blank" rel="noopener">${escapeHtml(
        src.label || 'View the actual case'
      )}</a>${meta ? ` <span class="muted">· ${escapeHtml(meta)}</span>` : ''}</div>`;
  }
  return `<div class="case-source muted" title="This is an original scenario written in the style of the corpus, not a real court decision, so there is no case to link to.">
    ⚠️ Illustrative synthetic case — not a real court decision${meta ? ` <span>· ${escapeHtml(meta)}</span>` : ''}</div>`;
}

function scorePill(label, v, invert = false) {
  const good = invert ? v <= 0.2 : v >= 0.6;
  return `<span class="score-pill ${good ? 'good' : 'mid'}">${label}: ${Math.round(v * 100)}%</span>`;
}
