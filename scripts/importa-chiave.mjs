// Copia ELEVENLABS_API_KEY dai segreti di Motion Studio (%APPDATA%/editor-motion/impostazioni.json) nel .env
// di questo repo, senza stamparla. Uso: node scripts/importa-chiave.mjs
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const profilo =
  process.env.EDITOR_PROFILO ??
  path.join(process.env.APPDATA ?? path.join(os.homedir(), "AppData", "Roaming"), "editor-motion");
const sorgente = path.join(profilo, "impostazioni.json");

let chiave;
try {
  chiave = JSON.parse(fs.readFileSync(sorgente, "utf8")).segreti?.ELEVENLABS_API_KEY;
} catch (err) {
  console.error(`Non riesco a leggere ${sorgente}: ${err.message}`);
  process.exit(1);
}
if (!chiave) {
  console.error(`In ${sorgente} non c'è ELEVENLABS_API_KEY tra i segreti.`);
  process.exit(1);
}

const env = path.resolve(import.meta.dirname, "..", ".env");
const righe = fs.existsSync(env) ? fs.readFileSync(env, "utf8").split(/\r?\n/).filter((r) => r && !r.startsWith("ELEVENLABS_API_KEY=")) : [];
righe.push(`ELEVENLABS_API_KEY=${chiave}`);
fs.writeFileSync(env, righe.join("\n") + "\n", { mode: 0o600 });
console.log(`Chiave copiata in ${env} (${chiave.length} caratteri).`);
