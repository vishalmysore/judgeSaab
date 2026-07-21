// core/events.js
// Minimal pub/sub event bus used to decouple engine progress from the UI.

class EventBus {
  constructor() {
    this._map = new Map();
  }
  on(evt, fn) {
    if (!this._map.has(evt)) this._map.set(evt, new Set());
    this._map.get(evt).add(fn);
    return () => this.off(evt, fn);
  }
  off(evt, fn) {
    this._map.get(evt)?.delete(fn);
  }
  emit(evt, payload) {
    this._map.get(evt)?.forEach((fn) => {
      try {
        fn(payload);
      } catch (e) {
        console.error(`[bus] handler for "${evt}" threw`, e);
      }
    });
  }
}

export const bus = new EventBus();

// Canonical event names.
export const EV = {
  MODEL_STATUS: 'model:status',
  MODEL_PROGRESS: 'model:progress',
  RUN_START: 'run:start',
  RUN_CASE: 'run:case',
  RUN_DONE: 'run:done',
  RUN_ERROR: 'run:error',
  LEADERBOARD: 'leaderboard:update',
  LOG: 'log',
};

export function log(msg, level = 'info') {
  bus.emit(EV.LOG, { msg, level, ts: Date.now() });
}
