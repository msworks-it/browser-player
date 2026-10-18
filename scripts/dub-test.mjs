// Prova del doppiaggio ElevenLabs su un episodio AnimeWorld, da terminale.
// Uso: node --env-file=.env scripts/dub-test.mjs <url /play/... di AnimeWorld> [--start 90] [--secs 60] [--from ja] [--to it]
// Scrive in out/: il file doppiato, la trascrizione .srt e un .json con tempi e crediti consumati.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

const { values: opt, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    start: { type: "string", default: "90" },
    secs: { type: "string", default: "60" },
    from: { type: "string", default: "ja" },
    to: { type: "string", default: "it" },
    watermark: { type: "boolean", default: false },
    // Taglia il tratto in locale con ffmpeg e carica solo quello, invece di far scaricare a ElevenLabs tutto il file.
    upload: { type: "boolean", default: false },
  },
});

const pagina = positionals[0];
const KEY = process.env.ELEVENLABS_API_KEY;
if (!pagina) fail("Manca l'URL della pagina /play/ di AnimeWorld.");
if (!KEY) fail("Manca ELEVENLABS_API_KEY: lancia prima `node scripts/importa-chiave.mjs` e poi usa --env-file=.env.");

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36";
const API = "https://api.elevenlabs.io";
const OUT = path.resolve(import.meta.dirname, "..", "out");

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

async function eleven(p, init = {}) {
  const res = await fetch(API + p, { ...init, headers: { ...init.headers, "xi-api-key": KEY } });
  if (!res.ok) fail(`ElevenLabs ${res.status} su ${p}: ${await res.text()}`);
  return res;
}

async function crediti() {
  const s = await (await eleven("/v1/user/subscription")).json();
  return { tier: s.tier, usati: s.character_count, limite: s.character_limit };
}

// 1. Il link MP4 dell'episodio, come fa l'adapter dell'estensione.
const url = new URL(pagina);
const html = await fetch(url, { headers: { "User-Agent": UA } });
const cookie = html.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
const testo = await html.text();
const csrf = testo.match(/name="csrf-token"[^>]*content="([^"]+)"/)?.[1];
const token = url.pathname.split("/").pop();
const info = await (
  await fetch(new URL(`/api/episode/info?id=${token}&alt=0`, url.origin), {
    headers: { "User-Agent": UA, Cookie: cookie, "CSRF-Token": csrf ?? "", Referer: url.href, "X-Requested-With": "XMLHttpRequest" },
  })
).json();
if (!info.grabber) fail(`Nessun file diretto per questo episodio: ${JSON.stringify(info)}`);
console.log(`Sorgente: ${info.grabber}`);

// 2. Doppiaggio del tratto chiesto.
const start = Number(opt.start);
const end = start + Number(opt.secs);
const prima = await crediti();
console.log(`Piano ${prima.tier}: ${prima.usati} / ${prima.limite} crediti usati.`);

const t0 = Date.now();
const fd = new FormData();
if (opt.upload) {
  fs.mkdirSync(OUT, { recursive: true });
  const taglio = path.join(OUT, `${token}_${start}-${end}_sorgente.mp4`);
  const r = spawnSync("ffmpeg", ["-y", "-v", "error", "-ss", String(start), "-i", info.grabber, "-t", opt.secs, "-c", "copy", taglio]);
  if (r.status !== 0) fail(`ffmpeg: ${r.stderr?.toString() || r.error?.message}`);
  console.log(`Tratto tagliato in ${Math.round((Date.now() - t0) / 1000)}s (${fs.statSync(taglio).size} byte), lo carico.`);
  fd.set("file", new Blob([fs.readFileSync(taglio)], { type: "video/mp4" }), path.basename(taglio));
} else {
  fd.set("source_url", info.grabber);
  fd.set("start_time", String(start));
  fd.set("end_time", String(end));
}
fd.set("source_lang", opt.from);
fd.set("target_lang", opt.to);
fd.set("num_speakers", "0");
fd.set("watermark", String(opt.watermark));
fd.set("name", `browser-player test ${token} ${start}-${end}`);
const job = await (await eleven("/v1/dubbing", { method: "POST", body: fd })).json();
console.log(`Avviato ${job.dubbing_id}, stima ${job.expected_duration_sec}s. Attendo…`);

let stato;
for (;;) {
  await new Promise((r) => setTimeout(r, 5000));
  stato = await (await eleven(`/v1/dubbing/${job.dubbing_id}`)).json();
  process.stdout.write(`\r${stato.status} dopo ${Math.round((Date.now() - t0) / 1000)}s   `);
  if (stato.status === "dubbed" || stato.status === "failed") break;
  if (Date.now() - t0 > 20 * 60 * 1000) fail("\nTimeout dopo 20 minuti.");
}
console.log();
if (stato.status === "failed") fail(`Fallito: ${stato.error ?? JSON.stringify(stato)}`);

// 3. Download del risultato e della trascrizione.
fs.mkdirSync(OUT, { recursive: true });
const base = path.join(OUT, `${token}_${start}-${end}_${opt.to}`);
const audio = await eleven(`/v1/dubbing/${job.dubbing_id}/audio/${opt.to}`);
const tipo = audio.headers.get("content-type") ?? "";
const file = `${base}.${tipo.includes("mp4") ? "mp4" : "mp3"}`;
fs.writeFileSync(file, Buffer.from(await audio.arrayBuffer()));
const srt = await fetch(`${API}/v1/dubbing/${job.dubbing_id}/transcript/${opt.to}?format_type=srt`, { headers: { "xi-api-key": KEY } });
if (srt.ok) fs.writeFileSync(`${base}.srt`, await srt.text());

const dopo = await crediti();
const report = {
  dubbing_id: job.dubbing_id,
  sorgente: info.grabber,
  tratto: { start, end },
  modo: opt.upload ? "upload del tratto" : "source_url",
  lingue: { da: opt.from, a: opt.to },
  secondi_attesa: Math.round((Date.now() - t0) / 1000),
  content_type: tipo,
  file: path.basename(file),
  bytes: fs.statSync(file).size,
  crediti_consumati: dopo.usati - prima.usati,
};
fs.writeFileSync(`${base}.json`, JSON.stringify(report, null, 2));
console.log(report);
