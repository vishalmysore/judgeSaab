// core/store.js
// IndexedDB-backed cache for benchmark runs, with a graceful in-memory
// fallback when IndexedDB is unavailable (private mode, etc.).

const DB_NAME = 'judgesaab';
const DB_VERSION = 1;
const STORE_RUNS = 'runs';

let _dbPromise = null;
const _memory = new Map();
let _useMemory = false;

function openDB() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      _useMemory = true;
      return reject(new Error('no-indexeddb'));
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_RUNS)) {
        db.createObjectStore(STORE_RUNS, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      _useMemory = true;
      reject(req.error);
    };
  }).catch(() => null);
  return _dbPromise;
}

async function tx(mode, fn) {
  const db = await openDB();
  if (!db || _useMemory) return null;
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE_RUNS, mode);
    const store = t.objectStore(STORE_RUNS);
    const out = fn(store);
    t.oncomplete = () => resolve(out?._result ?? out);
    t.onerror = () => reject(t.error);
  });
}

export async function saveRun(run) {
  if (_useMemory) {
    _memory.set(run.id, run);
    return run.id;
  }
  const ok = await tx('readwrite', (s) => s.put(run));
  if (ok === null) _memory.set(run.id, run);
  return run.id;
}

export async function getAllRuns() {
  const db = await openDB();
  if (!db || _useMemory) return [..._memory.values()];
  return new Promise((resolve) => {
    const t = db.transaction(STORE_RUNS, 'readonly');
    const req = t.objectStore(STORE_RUNS).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => resolve([..._memory.values()]);
  });
}

export async function clearRuns() {
  _memory.clear();
  const db = await openDB();
  if (!db || _useMemory) return;
  await tx('readwrite', (s) => s.clear());
}
