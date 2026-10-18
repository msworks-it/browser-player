// Ponte comune fra la pagina del sito e il player: monta l'iframe del player al posto di quello del sito
// e fa da tramite fra il player e l'adapter del sito (lista episodi, link dei video, URL della pagina).
(() => {
  const PLAYER_URL = chrome.runtime.getURL("player/player.html");
  const EXT_ORIGIN = new URL(PLAYER_URL).origin;
  const OFF_KEY = "browser-player:off";
  // Tasti inoltrati al player quando il focus è sulla pagina e non su un campo di testo.
  const KEYS = new Set([" ", "k", "j", "l", "f", "m", "n", "p", "s", "e", "d", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"]);

  function riattiva() {
    const b = document.createElement("button");
    b.className = "bp-reenable";
    b.textContent = "Usa Browser Player";
    b.addEventListener("click", () => {
      sessionStorage.removeItem(OFF_KEY);
      location.reload();
    });
    document.body.append(b);
  }

  function mount(adapter) {
    if (sessionStorage.getItem(OFF_KEY) === "1") return riattiva();
    const host = adapter.container();
    const episodes = adapter.episodes();
    if (!host || !episodes.length) return;

    // Iframe dentro uno shadow DOM chiuso: gli script pubblicitari della pagina cercano e rimuovono gli iframe
    // estranei con querySelectorAll, che qui non li raggiunge.
    const wrap = document.createElement("div");
    wrap.className = "bp-frame";
    const shadow = wrap.attachShadow({ mode: "closed" });
    const style = document.createElement("style");
    style.textContent = ":host{display:block}iframe{display:block;width:100%;height:100%;border:0;background:#000}";
    const frame = document.createElement("iframe");
    frame.src = `${PLAYER_URL}?origin=${encodeURIComponent(location.origin)}`;
    frame.allow = "autoplay; fullscreen; picture-in-picture";
    frame.allowFullscreen = true;
    shadow.append(style, frame);
    adapter.prepare?.(host);
    host.replaceChildren(wrap);

    // Se la pagina svuota comunque il contenitore, il player torna al suo posto (con un limite, per non lottare all'infinito).
    let reattach = 5;
    new MutationObserver(() => {
      if (wrap.isConnected || reattach-- <= 0) return;
      console.warn("[browser-player] il player è stato rimosso dalla pagina, lo rimetto");
      host.replaceChildren(wrap);
    }).observe(host, { childList: true });
    console.info(`[browser-player] montato su ${adapter.site}, ${episodes.length} episodi`);

    const send = (msg) => frame.contentWindow?.postMessage(msg, EXT_ORIGIN);

    window.addEventListener("message", async (e) => {
      if (e.source !== frame.contentWindow || e.origin !== EXT_ORIGIN) return;
      const m = e.data;
      if (!m || typeof m.type !== "string") return;
      switch (m.type) {
        case "bp:ready":
          send({
            type: "bp:init",
            site: adapter.site,
            series: adapter.series(),
            episodes,
            currentId: adapter.currentId(),
          });
          break;
        case "bp:resolve":
          try {
            send({ type: "bp:resolved", reqId: m.reqId, ok: true, ...(await adapter.resolve(m.episodeId)) });
          } catch (err) {
            send({ type: "bp:resolved", reqId: m.reqId, ok: false, error: String(err?.message ?? err) });
          }
          break;
        case "bp:episode-changed":
          adapter.onEpisodeChanged(m.episodeId);
          break;
        case "bp:original":
          sessionStorage.setItem(OFF_KEY, "1");
          location.reload();
          break;
      }
    });

    adapter.interceptClicks({
      select: (episodeId) => send({ type: "bp:select", episodeId }),
      step: (dir) => send({ type: "bp:step", dir }),
    });

    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || !KEYS.has(e.key)) return;
      const t = e.target;
      if (t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      const r = wrap.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      e.preventDefault();
      send({ type: "bp:key", key: e.key, shiftKey: e.shiftKey });
    });
  }

  window.BrowserPlayer = { mount };
})();
