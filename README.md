<p align="center">
  <img src="judgesaab_white.png" alt="JudgeSaab" width="420" />
</p>

<h1 align="center">JudgeSaab</h1>

<p align="center"><strong>Browser-Native AI Judge Benchmark Platform</strong><br/>
<em>How would AI judge this case?</em></p>

JudgeSaab is an open-source, **100% browser-native** benchmark that evaluates AI
models on legal cases by comparing their judgments against actual human court
decisions. It runs entirely on your device using **WebGPU + WebLLM** — documents
never leave the browser.

**Live demo:** https://vishalmysore.github.io/judgeSaab/

## Highlights

- 🔒 **Privacy-first** — inference runs locally; nothing is uploaded.
- 🧠 **Multi-model** — Gemma, Qwen, Llama, Phi, SmolLM, Mistral via WebLLM, plus a
  no-GPU **heuristic baseline** that runs anywhere.
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

WebLLM models require a Chromium-based browser with WebGPU enabled. The
**Heuristic Baseline** runs in any browser and serves as the floor real models
should beat.

## Programmatic API

Exposed on `window.JudgeSaab`:

```js
const cases = await JudgeSaab.loadDataset('ECtHR');
const run   = await JudgeSaab.runBenchmark({ modelId: 'mock-heuristic', datasetId: 'ECtHR' });
const runs  = await JudgeSaab.compareModels(['mock-heuristic'], { datasetId: 'SCOTUS' });
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
 ├── models/        WebLLM adapter + heuristic baseline + prompt templates
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

## Note on data

The bundled cases are **original synthetic scenarios** written in the style of the
named corpora — they do not reproduce any real case text. Real dataset adapters
(ECtHR, CaseHOLD, SCOTUS, COLIEE, Harvard Caselaw) can be added as plugins that
fetch and normalize into the same case schema.

## License

Open source. See spec in [`JudgeSaab_Spec_v1.md`](JudgeSaab_Spec_v1.md).

`compression/headroom.js` is a derivative work of
[chopratejas/headroom](https://github.com/chopratejas/headroom)
(Apache-2.0, © 2025 Headroom Contributors); attribution is preserved in the file
header as required by Apache 2.0 §4.
