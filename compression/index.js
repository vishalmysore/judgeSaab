// compression/index.js
// Context-representation strategies. Each takes a case's facts (string) and
// returns a { text, tokensApprox, label } view fed to the model. The benchmark
// can compare which representation best preserves legal reasoning.

import { compressors } from '../core/registry.js';
import { tokens } from '../core/utils.js';
import { compressText, dedupeSentences } from './headroom.js';

const approxTokens = (s) => Math.ceil(tokens(s, { keepStop: true }).length * 1.3);

// Compressor.apply receives (facts, ctx) where ctx = { caseObj, question }.
// Query-aware strategies (headroom) use ctx.question; others ignore it.
function make(id, label, description, fn) {
  return { id, label, description, apply: fn };
}

// 1. Raw — the full document, unchanged.
const raw = make('raw', 'Raw document', 'Full text, no compression', (facts) => facts);

// 2. Chunking — keep the first and last chunk (lead + conclusion heuristic).
const chunking = make(
  'chunking',
  'Chunking',
  'Lead + tail sentence windows',
  (facts) => {
    const sents = splitSentences(facts);
    if (sents.length <= 3) return facts;
    const head = sents.slice(0, 2);
    const tail = sents.slice(-1);
    return [...head, '…', ...tail].join(' ');
  }
);

// 3. Semantic compression — keep sentences that carry legally salient terms.
const LEGAL_CUES =
  /\b(violat|breach|duty|right|reasonabl|proportion|warrant|foresee|delay|offer|deport|assembl|search|authorit|statut|disrupt|balanc|margin|suspend|charg|convict)\w*/i;
const semantic = make(
  'semantic',
  'Semantic compression',
  'Keep legally salient sentences',
  (facts) => {
    const sents = splitSentences(facts);
    const kept = sents.filter((s) => LEGAL_CUES.test(s));
    return (kept.length ? kept : sents.slice(0, 3)).join(' ');
  }
);

// 4. Structured facts — extract who/what/when style bullet points.
const structured = make(
  'structured',
  'Structured facts',
  'Bulleted salient facts',
  (facts) => {
    const sents = splitSentences(facts).filter((s) => LEGAL_CUES.test(s) || /\d/.test(s));
    const bullets = (sents.length ? sents : splitSentences(facts).slice(0, 4)).map(
      (s) => `- ${s.trim()}`
    );
    return `KEY FACTS:\n${bullets.join('\n')}`;
  }
);

// 5. Timeline extraction — order sentences that contain temporal markers.
const timeline = make(
  'timeline',
  'Timeline extraction',
  'Chronological event skeleton',
  (facts) => {
    const sents = splitSentences(facts);
    const dated = sents.filter((s) => /\b(19|20)\d{2}\b|\b(year|month|day|overnight|later|then|after|during)\b/i.test(s));
    const body = dated.length ? dated : sents.slice(0, 4);
    return `TIMELINE:\n${body.map((s, i) => `${i + 1}. ${s.trim()}`).join('\n')}`;
  }
);

// 6. Knowledge graph — crude subject–relation–object triples from cue verbs.
const kgraph = make(
  'kgraph',
  'Knowledge graph',
  'Entity–relation triples',
  (facts) => {
    const sents = splitSentences(facts);
    const triples = sents
      .map((s) => {
        const m = s.match(
          /\b(applicant|defendant|police|agency|court|authorit\w*|student|contractor|retailer|state|district)\b[^.]*?\b(charged|searched|ordered|banned|issued|suspended|left|advertised|refused|deported|convicted|adjourned|violat\w*)\b[^.]*/i
        );
        return m ? `(${m[1]}) --[${m[2]}]--> (${m[0].split(m[2])[1]?.trim().slice(0, 40) || '…'})` : null;
      })
      .filter(Boolean);
    return `GRAPH:\n${(triples.length ? triples : ['(no clear triples extracted)']).join('\n')}`;
  }
);

// 7. Headroom (smart) — query-aware adaptive extraction (from Tejas Chopra's
//    headroom; see compression/headroom.js). Keeps ~60% of sentences by
//    information saturation, biased toward the legal question.
const headroomSmart = make(
  'headroom',
  'Headroom (smart)',
  'Query-aware adaptive keep (~60%)',
  (facts, ctx) => compressText(facts, 0.6, ctx?.question || '').text
);

// 8. Headroom (aggressive) — same engine, tighter target (~30%).
const headroomAggressive = make(
  'headroom-aggressive',
  'Headroom (aggressive)',
  'Query-aware adaptive keep (~30%)',
  (facts, ctx) => compressText(facts, 0.3, ctx?.question || '').text
);

// 9. Remove duplicate context — SimHash near-duplicate sentence removal
//    (infographic technique #6).
const dedupe = make(
  'dedupe',
  'Remove duplicate context',
  'Drop near-duplicate sentences (SimHash)',
  (facts) => dedupeSentences(facts)
);

function splitSentences(text = '') {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .filter((s) => s.trim().length);
}

export function registerCompressors() {
  [raw, chunking, semantic, structured, timeline, kgraph, headroomSmart, headroomAggressive, dedupe].forEach(
    (c) => {
      compressors.register({
        ...c,
        apply: (facts, ctx) => {
          const text = c.apply(facts, ctx);
          return { text, tokensApprox: approxTokens(text), label: c.label };
        },
      });
    }
  );
  return compressors.all();
}

export function compress(id, facts, ctx) {
  const c = compressors.get(id);
  if (!c) throw new Error(`Unknown compressor: ${id}`);
  return c.apply(facts, ctx);
}
