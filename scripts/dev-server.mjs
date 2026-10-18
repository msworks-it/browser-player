// Banco di prova del player fuori dall'estensione: serve extension/ come pagina web normale, con un finto
// chrome.storage (dev/chrome-shim.js) e una pagina /dev/ che fa la parte del bridge. Gli episodi di AnimeWorld
// li risolve questo server, come farebbe l'adapter.
// Uso: node scripts/dev-server.mjs  →  http://localhost:5173/dev/?url=<pagina /play/ di AnimeWorld>
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const PORT = Number(process.env.PORT ?? 5173);
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36";
const TYPES = { ".mp4": "video/mp4", ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml" };

const sessioni = new Map();

async function sessione(pagina) {
  if (sessioni.has(pagina)) return sessioni.get(pagina);
  const res = await fetch(pagina, { headers: { "User-Agent": UA } });
  const html = await res.text();
  const cookie = res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
  const attr = (s, n) => s.match(new RegExp(`${n}="([^"]*)"`))?.[1];
  const visti = new Set();
  const episodes = [...html.matchAll(/<li class="episode">\s*<a ([^>]*)>([^<]*)<\/a>/g)]
    .map(([, a, label]) => ({ id: attr(a, "data-id"), num: attr(a, "data-episode-num"), label: label.trim(), href: attr(a, "href") }))
    .filter((e) => e.id && !visti.has(e.id) && visti.add(e.id));
  const s = {
    cookie,
    csrf: attr(html.match(/<meta name="csrf-token"[^>]*>/)?.[0] ?? "", "content"),
    series: { id: attr(html.match(/<div id="player"[^>]*>/)?.[0] ?? "", "data-anime-id"), title: html.match(/id="anime-title"[^>]*>([^<]*)/)?.[1].trim() },
    episodes,
    currentId: new URL(pagina).pathname.split("/").pop(),
  };
  sessioni.set(pagina, s);
  return s;
}

async function risolvi(pagina, id) {
  const s = await sessione(pagina);
  const u = new URL(`/api/episode/info?id=${encodeURIComponent(id)}&alt=0`, pagina);
  const info = await (
    await fetch(u, { headers: { "User-Agent": UA, Cookie: s.cookie, "CSRF-Token": s.csrf, Referer: pagina, "X-Requested-With": "XMLHttpRequest" } })
  ).json();
  if (info.grabber) return { kind: "video", url: info.grabber };
  if (info.target) return { kind: "iframe", url: new URL(info.target, pagina).href };
  throw new Error("Nessun link per questo episodio");
}

function json(res, code, body) {
  res.writeHead(code, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

http
  .createServer(async (req, res) => {
    const u = new URL(req.url, `http://localhost:${PORT}`);
    try {
      if (u.pathname === "/dev/api/series") {
        const { cookie, csrf, ...s } = await sessione(u.searchParams.get("url"));
        return json(res, 200, s);
      }
      if (u.pathname === "/dev/api/resolve") return json(res, 200, await risolvi(u.searchParams.get("url"), u.searchParams.get("id")));

      // /out/ espone i risultati di dub-test, per provare la sincronizzazione del doppiaggio.
      let file = /^\/(dev|out)\//.test(u.pathname) ? path.join(ROOT, u.pathname) : path.join(ROOT, "extension", u.pathname);
      if (u.pathname === "/dev/") file = path.join(ROOT, "dev", "harness.html");
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404);
        return res.end("not found");
      }
      let body = fs.readFileSync(file);
      if (file.endsWith(path.join("player", "player.html")) || file.endsWith(path.join("options", "options.html"))) {
        body = body.toString().replace("<script type=\"module\"", '<script src="/dev/chrome-shim.js"></script>\n    <script type="module"');
      }
      res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] ?? "application/octet-stream", "Cache-Control": "no-store" });
      res.end(body);
    } catch (err) {
      json(res, 500, { error: err.message });
    }
  })
  .listen(PORT, () => console.log(`Banco di prova: http://localhost:${PORT}/dev/`));
