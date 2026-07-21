// plugins/example-uk-dataset.js
// Example community plugin: adds a small UK jurisdiction dataset (Phase 2) and
// a custom prompt template. Demonstrates the plugin contract. All cases are
// original synthetic scenarios.

export default {
  name: 'uk-dataset-example',
  install(ctx) {
    const cases = [
      {
        id: 'uk-001',
        dataset: 'UK',
        jurisdiction: 'United Kingdom',
        title: 'R v. Whitcombe (duty of care)',
        year: 2019,
        question: 'Was the defendant negligent in failing to guard a known hazard?',
        facts:
          'The defendant, a shopkeeper, was aware that a floor tile had come loose and posed a ' +
          'tripping hazard. Despite two prior near-misses reported by staff, no warning sign was ' +
          'placed and no repair was scheduled for three weeks. A customer tripped and was injured. ' +
          'The defendant argued the risk was obvious and the customer should have taken care.',
        human: {
          verdict: 'violation',
          laws: ['Occupiers’ Liability — duty of care'],
          reasoning:
            'The occupier had actual knowledge of a foreseeable risk and reported near-misses yet ' +
            'took no reasonable precaution such as a warning sign or timely repair. The obviousness ' +
            'of the hazard did not discharge the duty owed to lawful visitors.',
        },
      },
    ];

    ctx.datasets.register({
      id: 'UK',
      name: 'UK Courts (example)',
      jurisdiction: 'United Kingdom',
      verdictType: 'binary_violation',
      source: 'plugin:uk-dataset-example',
      cases,
      async load() {
        return cases;
      },
    });

    ctx.prompts.register({
      id: 'uk-style',
      name: 'UK bench style',
      system: 'You are a judge of the courts of England and Wales. Decide only on the facts.',
      build: (c, ctx2) =>
        `Issue: ${c.question}\nFacts: ${ctx2}\nGive JSON {verdict, reasoning, laws, confidence}.`,
    });
  },
};
