// Adapter AnimeWorld. Il link del video arriva da GET /api/episode/info?id=<token> (campo `grabber`, MP4 diretto
// con CORS aperto); senza `grabber` il server dell'episodio è esterno e resta solo il suo iframe (`target`).
(() => {
  const player = document.querySelector("#player");
  if (!player) return;

  const csrf = () => document.querySelector('meta[name="csrf-token"]')?.content ?? "";
  // Il server "9" è quello di AnimeWorld, l'unico che dà il file diretto.
  const lista = () =>
    document.querySelectorAll('.server[data-name="9"] .episode a').length
      ? document.querySelectorAll('.server[data-name="9"] .episode a')
      : document.querySelectorAll(".server .episode a");
  const anchor = (id) => [...lista()].find((a) => a.dataset.id === id);

  const adapter = {
    site: "animeworld",

    container: () => player,

    prepare() {
      document.querySelector("#alternativ")?.style.setProperty("display", "none");
    },

    series: () => ({
      id: player.dataset.animeId,
      title: document.querySelector("#anime-title")?.textContent.trim() ?? document.title,
    }),

    episodes() {
      const visti = new Set();
      return [...lista()]
        .filter((a) => a.dataset.id && !visti.has(a.dataset.id) && visti.add(a.dataset.id))
        .map((a) => ({
          id: a.dataset.id,
          num: a.dataset.episodeNum ?? a.dataset.num,
          label: a.textContent.trim(),
          href: a.href,
        }));
    },

    currentId: () => player.dataset.id ?? document.querySelector(".episode a.active")?.dataset.id,

    async resolve(id) {
      const res = await fetch(`/api/episode/info?id=${encodeURIComponent(id)}&alt=0`, {
        credentials: "same-origin",
        headers: { "CSRF-Token": csrf(), "X-Requested-With": "XMLHttpRequest" },
      });
      if (!res.ok) throw new Error(`AnimeWorld ha risposto ${res.status}`);
      const info = await res.json();
      if (info.grabber) return { kind: "video", url: info.grabber };
      if (info.target) return { kind: "iframe", url: new URL(info.target, location.origin).href };
      throw new Error("Nessun link per questo episodio");
    },

    onEpisodeChanged(id) {
      const a = anchor(id);
      if (!a) return;
      document.querySelectorAll(".episode a.active").forEach((x) => x.classList.remove("active"));
      a.classList.add("active");
      history.replaceState({}, "", a.href);
      document.title = document.title.replace(/Episodio\s+\S+/, `Episodio ${a.textContent.trim()}`);
      // Stesso conteggio visualizzazioni che fa il player del sito al cambio episodio.
      fetch(`/api/views/update-views/${player.dataset.animeId}`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "CSRF-Token": csrf(), "Content-Type": "application/json" },
        body: JSON.stringify({ episode: a.dataset.episodeId }),
      }).catch(() => {});
    },

    interceptClicks({ select, step }) {
      document.addEventListener(
        "click",
        (e) => {
          const t = e.target instanceof Element ? e.target : null;
          const ep = t?.closest(".episode a");
          const pn = t?.closest(".prevnext");
          if (!ep && !pn) return;
          e.preventDefault();
          e.stopImmediatePropagation();
          if (ep) select(ep.dataset.id);
          else step(pn.classList.contains("next") ? 1 : -1);
        },
        true,
      );
    },
  };

  window.BrowserPlayer.mount(adapter);
})();
