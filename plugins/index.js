// plugins/index.js
// Plugin loader. A plugin is an object (or module default export) with an
// install(ctx) function. ctx exposes the registries so community plugins can
// add models, datasets, jurisdictions, metrics, and prompt templates.

import { models, datasets, compressors, metrics, prompts } from '../core/registry.js';
import { log } from '../core/events.js';

const _installed = [];

export function pluginContext() {
  return { models, datasets, compressors, metrics, prompts, log };
}

export function use(plugin) {
  const p = plugin?.default ?? plugin;
  if (typeof p?.install !== 'function') {
    throw new Error('Plugin must export an install(ctx) function');
  }
  p.install(pluginContext());
  _installed.push(p.name || 'anonymous-plugin');
  log(`Plugin installed: ${p.name || 'anonymous'}`);
  return p;
}

export async function useUrl(url) {
  const mod = await import(/* @vite-ignore */ url);
  return use(mod);
}

export const installedPlugins = () => [..._installed];
