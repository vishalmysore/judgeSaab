// core/registry.js
// Central registries for the pluggable pieces: models, datasets, compression
// strategies, metrics, and prompt templates. Plugins register into these.

function makeRegistry(kind) {
  const map = new Map();
  return {
    kind,
    register(item) {
      if (!item || !item.id) throw new Error(`[${kind}] item needs an id`);
      map.set(item.id, item);
      return item;
    },
    get: (id) => map.get(id),
    has: (id) => map.has(id),
    all: () => [...map.values()],
    ids: () => [...map.keys()],
  };
}

export const models = makeRegistry('model');
export const datasets = makeRegistry('dataset');
export const compressors = makeRegistry('compressor');
export const metrics = makeRegistry('metric');
export const prompts = makeRegistry('prompt');
