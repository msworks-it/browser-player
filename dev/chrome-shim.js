// Finto chrome.storage.local / chrome.runtime per provare le pagine dell'estensione come pagine web (solo banco di prova).
(() => {
  if (window.chrome?.storage) return;
  const PREFIX = "bp-shim:";
  const read = (k) => {
    const v = localStorage.getItem(PREFIX + k);
    return v == null ? undefined : JSON.parse(v);
  };
  const all = () =>
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .map((k) => k.slice(PREFIX.length));
  window.chrome = {
    storage: {
      local: {
        async get(keys) {
          const list = keys == null ? all() : typeof keys === "string" ? [keys] : Array.isArray(keys) ? keys : Object.keys(keys);
          const out = {};
          for (const k of list) {
            const v = read(k);
            if (v !== undefined) out[k] = v;
          }
          return out;
        },
        async set(obj) {
          for (const [k, v] of Object.entries(obj)) localStorage.setItem(PREFIX + k, JSON.stringify(v));
        },
        async remove(keys) {
          for (const k of [].concat(keys)) localStorage.removeItem(PREFIX + k);
        },
      },
    },
    runtime: {
      openOptionsPage: () => window.open("/options/options.html", "_blank"),
      getURL: (p) => `${location.origin}/${p}`,
    },
  };
})();
