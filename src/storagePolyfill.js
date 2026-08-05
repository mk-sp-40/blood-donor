/**
 * Standalone polyfill for the `window.storage` cloud key-value API.
 *
 * Inside Claude's artifact runtime, `window.storage` is provided
 * automatically and persists data in the cloud across every visitor's
 * session (see the README for details). Outside that environment —
 * i.e. when this project is run locally with `npm run dev` — this
 * polyfill backs the same API with the browser's localStorage, so the
 * app is still fully runnable and demoable on its own machine.
 *
 * Swap this file out for a real backend (Firebase, MongoDB Atlas, a
 * custom Express API, etc.) when you're ready to deploy for real
 * multi-user use — the shape of get/set/delete/list is written to
 * make that swap a drop-in replacement.
 */
function install() {
  if (typeof window === "undefined" || window.storage) return;

  const keyFor = (key, shared) => `cbp:${shared ? "shared" : "personal"}:${key}`;

  window.storage = {
    async get(key, shared = false) {
      const raw = localStorage.getItem(keyFor(key, shared));
      if (raw === null) throw new Error(`Key not found: ${key}`);
      return { key, value: raw, shared };
    },
    async set(key, value, shared = false) {
      localStorage.setItem(keyFor(key, shared), value);
      return { key, value, shared };
    },
    async delete(key, shared = false) {
      const existed = localStorage.getItem(keyFor(key, shared)) !== null;
      localStorage.removeItem(keyFor(key, shared));
      return { key, deleted: existed, shared };
    },
    async list(prefix = "", shared = false) {
      const scope = `cbp:${shared ? "shared" : "personal"}:`;
      const keys = Object.keys(localStorage)
        .filter((k) => k.startsWith(scope + prefix))
        .map((k) => k.slice(scope.length));
      return { keys, prefix, shared };
    },
  };
}

install();
