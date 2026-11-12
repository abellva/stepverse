// Pyodide Web Worker for StepVerse
// Loads Pyodide offline from self-hosted /pyodide/ directory via ES Module

import { loadPyodide } from '/pyodide/pyodide.mjs';

let pyodideInstance = null;
let initPromise = null;

async function getPyodide() {
  if (pyodideInstance) return pyodideInstance;
  if (!initPromise) {
    initPromise = (async () => {
      const p = await loadPyodide({
        indexURL: '/pyodide/',
      });
      p.runPython(`
import sys
import io
import json
`);
      return p;
    })();
  }
  pyodideInstance = await initPromise;
  return pyodideInstance;
}

// Background warmup
getPyodide()
  .then(() => {
    self.postMessage({ type: 'engine_ready' });
  })
  .catch((err) => {
    console.warn('[PyodideWorker] Warmup error:', err);
    self.postMessage({ type: 'engine_error', error: String(err) });
  });

self.onmessage = async (event) => {
  const data = event.data;
  if (!data) return;

  if (data.type === 'init' || data.type === 'ping') {
    try {
      await getPyodide();
      self.postMessage({ type: 'engine_ready' });
    } catch (err) {
      self.postMessage({ type: 'engine_error', error: String(err) });
    }
    return;
  }

  const { id, code } = data;
  if (!id) return;

  try {
    const p = await getPyodide();

    p.runPython(`
sys.stdout = io.StringIO()
sys.stderr = io.StringIO()
`);

    await p.runPythonAsync(code);

    const stdout = p.runPython('sys.stdout.getvalue()');
    const stderr = p.runPython('sys.stderr.getvalue()');

    let variables = {};
    try {
      const varsJson = p.runPython(`
_out = {}
for _k, _v in list(globals().items()):
    if not _k.startswith('_') and isinstance(_v, (int, float, str, bool)):
        _out[_k] = _v
json.dumps(_out)
`);
      variables = JSON.parse(varsJson);
    } catch {
      variables = {};
    }

    self.postMessage({
      id,
      status: 'success',
      stdout,
      stderr,
      variables,
    });
  } catch (err) {
    self.postMessage({
      id,
      status: 'error',
      error: err?.message || String(err),
    });
  }
};
