// models/prompts.js
// Prompt templates registered into the prompt registry. The default template
// follows the spec verbatim in spirit and asks for a structured JSON judgment
// so the evaluator can parse verdict / reasoning / laws / confidence reliably.

import { prompts } from '../core/registry.js';

const SYSTEM = `You are an impartial judge. You decide based ONLY on the facts provided. You never invent facts, statutes, or precedents that are not supported by the record.`;

function buildUser(caseObj, contextText) {
  const opts = caseObj.options
    ? `\n\nCandidate holdings (choose exactly one by index):\n${caseObj.options
        .map((o, i) => `[${i}] ${o}`)
        .join('\n')}`
    : '';
  return `LEGAL QUESTION:\n${caseObj.question}\n\nFACTS (this is all you may rely on):\n${contextText}${opts}

Produce your judgment. Respond with ONLY a JSON object, no prose before or after:
{
  "verdict": "<one short verdict label${
    caseObj.options ? ', e.g. option_0' : ', e.g. violation / no_violation / affirmed / reversed'
  }>",
  "reasoning": "<2-4 sentences of legal reasoning grounded in the facts>",
  "laws": ["<statute or legal principle actually relevant>", "..."],
  "confidence": <number between 0 and 1>
}`;
}

export function registerPrompts() {
  prompts.register({
    id: 'default',
    name: 'Impartial Judge (JSON)',
    system: SYSTEM,
    build: buildUser,
  });

  prompts.register({
    id: 'terse',
    name: 'Terse verdict',
    system: SYSTEM,
    build: (c, ctx) =>
      `Question: ${c.question}\nFacts: ${ctx}\nReturn JSON {verdict, reasoning, laws, confidence}. Be brief.`,
  });

  return prompts.all();
}

export function buildMessages(promptId, caseObj, contextText) {
  const p = prompts.get(promptId) || prompts.get('default');
  return {
    system: p.system,
    user: p.build(caseObj, contextText),
  };
}
