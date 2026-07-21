// evaluation/index.js
// Scores a model judgment against the human judgment across the metric families
// in the spec: legal accuracy, reasoning, reliability, and (optionally) fairness.

import { metrics } from '../core/registry.js';
import { cosine, jaccard, normalize, round, tokenSet } from '../core/utils.js';

// --- Verdict normalization: map model output to a canonical label. ---
const VERDICT_ALIASES = {
  violation: ['violation', 'violated', 'breach', 'infringement'],
  no_violation: ['no_violation', 'no violation', 'not violated', 'no breach', 'compliant'],
  reversed: ['reversed', 'reverse', 'vacated', 'overturned', 'unconstitutional'],
  affirmed: ['affirmed', 'affirm', 'upheld', 'valid', 'constitutional'],
};

function canonicalVerdict(v = '') {
  const n = normalize(v);
  if (/^option[\s_]?\d+$/.test(n)) return n.replace(/\s/g, '_');
  for (const [canon, aliases] of Object.entries(VERDICT_ALIASES)) {
    if (aliases.some((a) => n.includes(normalize(a)))) return canon;
  }
  return n;
}

export function verdictAgreement(modelJudgment, human) {
  const a = canonicalVerdict(modelJudgment.verdict);
  const b = canonicalVerdict(human.verdict);
  return { canonModel: a, canonHuman: b, match: a === b ? 1 : 0 };
}

// --- Reasoning similarity: blend of cosine (bag of words) and jaccard. ---
export function reasoningSimilarity(modelJudgment, human) {
  const cos = cosine(modelJudgment.reasoning || '', human.reasoning || '');
  const jac = jaccard(modelJudgment.reasoning || '', human.reasoning || '');
  return round(0.7 * cos + 0.3 * jac, 3);
}

// --- Citation quality: overlap of cited laws with the human's laws. ---
export function citationQuality(modelJudgment, human) {
  const humanLaws = (human.laws || []).map(normalize).filter(Boolean);
  const modelLaws = (modelJudgment.laws || []).map(normalize).filter(Boolean);
  if (!humanLaws.length) return { score: modelLaws.length ? 0.5 : 1, matched: [] };
  const matched = humanLaws.filter((h) =>
    modelLaws.some((m) => m.includes(h) || h.includes(m) || jaccard(m, h) > 0.5)
  );
  return { score: round(matched.length / humanLaws.length, 3), matched };
}

// --- Hallucination: fraction of cited laws that appear neither in the human
//     citation set nor in the source facts (unsupported by the record). ---
export function hallucinationRate(modelJudgment, human, facts) {
  const modelLaws = (modelJudgment.laws || []).map(normalize).filter(Boolean);
  if (!modelLaws.length) return 0;
  const support = tokenSet(`${(human.laws || []).join(' ')} ${facts}`);
  let unsupported = 0;
  for (const law of modelLaws) {
    const toks = tokenSet(law);
    const grounded = [...toks].some((t) => support.has(t));
    if (!grounded) unsupported++;
  }
  return round(unsupported / modelLaws.length, 3);
}

// --- Confidence calibration: |confidence - correctness|, lower is better. ---
export function calibrationError(modelJudgment, correct) {
  const c = Number(modelJudgment.confidence);
  const conf = isFinite(c) ? Math.min(1, Math.max(0, c)) : 0.5;
  return round(Math.abs(conf - correct), 3);
}

// Compose a full per-case evaluation.
export function evaluate(modelJudgment, caseObj, { facts } = {}) {
  const human = caseObj.human;
  const src = facts ?? caseObj.facts;
  const va = verdictAgreement(modelJudgment, human);
  const reasoning = reasoningSimilarity(modelJudgment, human);
  const citation = citationQuality(modelJudgment, human);
  const halluc = hallucinationRate(modelJudgment, human, src);
  const calib = calibrationError(modelJudgment, va.match);

  // Overall = weighted blend; hallucination penalizes.
  const overall = round(
    0.45 * va.match + 0.3 * reasoning + 0.15 * citation.score + 0.1 * (1 - halluc),
    3
  );

  return {
    verdictMatch: va.match,
    canonModel: va.canonModel,
    canonHuman: va.canonHuman,
    reasoning,
    citation: citation.score,
    citationMatched: citation.matched,
    hallucination: halluc,
    calibration: calib,
    overall,
  };
}

// Consistency across repeated runs: agreement rate of verdicts.
export function consistency(judgments) {
  if (judgments.length <= 1) return 1;
  const canon = judgments.map((j) => canonicalVerdict(j.verdict));
  const counts = new Map();
  for (const c of canon) counts.set(c, (counts.get(c) || 0) + 1);
  const top = Math.max(...counts.values());
  return round(top / canon.length, 3);
}

export function registerMetrics() {
  [
    { id: 'verdict', name: 'Verdict agreement', family: 'accuracy' },
    { id: 'reasoning', name: 'Reasoning similarity', family: 'reasoning' },
    { id: 'citation', name: 'Citation quality', family: 'accuracy' },
    { id: 'hallucination', name: 'Hallucination rate', family: 'reliability' },
    { id: 'calibration', name: 'Confidence calibration', family: 'reliability' },
    { id: 'consistency', name: 'Consistency', family: 'reliability' },
  ].forEach((m) => metrics.register(m));
  return metrics.all();
}

export { canonicalVerdict };
