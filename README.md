# JudgeSaab ⚖️

### Browser-Native AI Judge Benchmark Platform

> *How would AI judge this case?*

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
  structured / timeline / knowledge-graph representations to see which preserves
  legal reasoning best.
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

## Architecture

```
judgesaab/
 ├── core/          registries, event bus, IndexedDB store, public API
 ├── models/        WebLLM adapter + heuristic baseline + prompt templates
 ├── datasets/      bundled synthetic cases (ECtHR, SCOTUS, CaseHOLD)
 ├── compression/   context-representation strategies
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
