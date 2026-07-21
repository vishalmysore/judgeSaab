<p align="center">
  <img src="judgesaab_white.png" alt="JudgeSaab" width="420" />
</p>

<h1 align="center">JudgeSaab</h1>

<p align="center"><strong>Browser-Native AI Judge Benchmark Platform</strong><br/>
<em>How good is your compression?</em></p>

JudgeSaab is an open-source, **100% browser-native** benchmark that evaluates AI
models on legal cases by comparing their judgments against actual human court
decisions. It runs entirely on your device using **WebGPU + WebLLM** — documents
never leave the browser.

> **The core idea — validating compression with real cases.**
> The best way to know whether a context-compression technique actually works is
> to run it against real historical court cases: compress the facts, re-run the AI
> judge, and check whether it reaches the **same judgment as it did on the full
> facts**. If the verdict is unchanged, the compression preserved the
> legally-decisive information — it works. JudgeSaab calls this **judgment
> fidelity**, and it is the headline metric of the "Compare compression" report
> (distinct from whether the AI agrees with the human judge).

**Live demo:** https://vishalmysore.github.io/judgeSaab/

## Highlights

- 🔒 **Privacy-first** — inference runs locally; nothing is uploaded.
- 🧠 **Multi-model** — Gemma, Qwen, Llama, Phi, SmolLM, Mistral via WebLLM, run one
  at a time with results saved to a persistent leaderboard.
- ⚖️ **Legal reasoning, not just verdicts** — scores verdict agreement, reasoning
  similarity, citation quality, hallucination rate, confidence calibration, and
  consistency.
- 🗜️ **Context-compression benchmark** — compare raw / chunking / semantic /
  structured / timeline / knowledge-graph / **Headroom** / dedupe representations
  to see which preserves legal reasoning best, with a report that measures token
  savings **against whether the verdict still matches the full-context judgment**.
- 📊 **Dashboards & leaderboard** — inline, dependency-free.
- 🧩 **Plugin system** — add models, datasets, jurisdictions, metrics, prompts.

## Running locally

No build step. Serve the folder over HTTP (ES modules require it):

```bash
python -m http.server 8123
# then open http://localhost:8123
```

Models run on-device via WebGPU, so a Chromium-based browser (Chrome/Edge 113+)
with WebGPU enabled is required. The first time you pick a model its weights
download from the CDN and are cached in the browser; run models one at a time.

## Programmatic API

Exposed on `window.JudgeSaab`:

```js
const cases = await JudgeSaab.loadDataset('ECtHR');
const run   = await JudgeSaab.runBenchmark({ modelId: 'Llama-3.2-1B-Instruct-q4f16_1-MLC', datasetId: 'ECtHR' });
const runs  = await JudgeSaab.compareCompression('Llama-3.2-1B-Instruct-q4f16_1-MLC', 'ECtHR', ['raw','headroom','semantic']);
JudgeSaab.exportResults(runs, 'csv');
```

## Token-cost reduction (Headroom + enterprise techniques)

JudgeSaab bakes in several of the token-saving techniques used in production LLM
systems, then **measures whether compressing the context changes the judgment**:

- **Headroom (smart / aggressive)** — a dependency-free port of the adaptive text
  compressor from [chopratejas/headroom](https://github.com/chopratejas/headroom)
  (Apache-2.0), via the browser port in
  [vishalmysore/ragCompressionDemo](https://github.com/vishalmysore/ragCompressionDemo).
  It scores each sentence with keyword-priority tiers + a **query-relevance** layer
  (the legal question) and keeps the top-K sentences chosen by a Kneedle
  information-saturation sizer (SimHash de-dup + bigram-diversity curve). *Retrieve
  Less Context / Summarize Long Inputs / Tune Retrieval Size.*
- **Remove Duplicate Context** — SimHash near-duplicate sentence removal.
- **Semantic / Structured / Timeline / Chunking / Knowledge-graph** — alternate
  representations of the facts.

Click **Compare compression** to run every strategy on the selected model +
dataset. The report shows, per strategy: average context tokens, token savings vs
raw, verdict accuracy, and **“same as raw”** — the share of cases whose verdict is
unchanged after compression. On the bundled ECtHR set, Headroom/semantic/structured
cut 23–52% of tokens with the verdict **100% unchanged**, while an over-aggressive
knowledge-graph view (−88% tokens) flips a verdict — exactly the tradeoff to watch.

## Architecture

```
judgesaab/
 ├── core/          registries, event bus, IndexedDB store, public API
 ├── models/        WebLLM adapter + prompt templates
 ├── datasets/      bundled synthetic cases (ECtHR, SCOTUS, CaseHOLD)
 ├── compression/   context-representation strategies (+ headroom.js port)
 ├── benchmark/     run engine (runCase / runBenchmark / compareModels)
 ├── evaluation/    metrics (accuracy, reasoning, reliability)
 ├── dashboard/     cards, leaderboard, SVG charts
 ├── ui/            DOM controller
 └── plugins/       plugin loader + example UK-dataset plugin
```

## Plugins

A plugin is any module with an `install(ctx)` export:

```js
export default {
  name: 'my-dataset',
  install(ctx) {
    ctx.datasets.register({ id: 'MyCourt', name: '…', cases, async load() { return cases; } });
  },
};
```

Load it with `JudgeSaab.use(plugin)` or `JudgeSaab.useUrl(url)`.

## Datasets & data provenance

Two kinds of bundled cases:

- **Real, public-domain landmark cases** (the default datasets) — court opinions
  are not copyrightable and these decisions are long in the public domain. Each
  links to the actual judgment:
  - **US Supreme Court — landmark:** Marbury v. Madison (1803), McCulloch v.
    Maryland (1819), Gibbons v. Ogden (1824), Weeks v. United States (1914) —
    linked to [Justia](https://supreme.justia.com/).
  - **English common law — landmark:** Carlill v Carbolic Smoke Ball Co (1892),
    Donoghue v Stevenson (1932), Rylands v Fletcher (1868), Hadley v Baxendale
    (1854) — linked to [BAILII](https://www.bailii.org/).
  - Facts and holdings are summarized in our own neutral words; the linked
    judgment is the authoritative source.
- **Synthetic scenarios** (clearly labelled) written in the style of ECtHR /
  SCOTUS / CaseHOLD for extra coverage — illustrative, not real cases.

More real corpora (ECtHR HUDOC, CaseHOLD, COLIEE, Harvard Caselaw) can be added as
plugins that fetch and normalize into the same case schema, including a
`source: { label, url }` that renders a link to the actual case in the UI.

## License

Open source. See spec in [`JudgeSaab_Spec_v1.md`](JudgeSaab_Spec_v1.md).

`compression/headroom.js` is a derivative work of
[chopratejas/headroom](https://github.com/chopratejas/headroom)
(Apache-2.0, © 2025 Headroom Contributors); attribution is preserved in the file
header as required by Apache 2.0 §4.
