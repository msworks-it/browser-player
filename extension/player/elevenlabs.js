// Client minimo dell'API Dubbing di ElevenLabs (REST, nessun SDK). Scheda: .claude/integrations/elevenlabs.md

const API = "https://api.elevenlabs.io";

export async function getKey() {
  const { elevenKey } = await chrome.storage.local.get("elevenKey");
  return elevenKey || null;
}

async function call(path, init = {}) {
  const key = await getKey();
  if (!key) throw new Error("Manca la chiave ElevenLabs: aggiungila nelle impostazioni dell'estensione.");
  const res = await fetch(API + path, { ...init, headers: { ...init.headers, "xi-api-key": key } });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const j = await res.json();
      detail = j.detail?.message ?? (typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail ?? j));
    } catch {}
    throw new Error(`ElevenLabs ${res.status}: ${detail}`);
  }
  return res;
}

/** Avvia un doppiaggio da un URL pubblico. start/end in secondi interi. → { dubbing_id, expected_duration_sec } */
export async function createDubbing({ sourceUrl, sourceLang, targetLang, start, end, name, watermark }) {
  const fd = new FormData();
  fd.set("source_url", sourceUrl);
  fd.set("target_lang", targetLang);
  if (sourceLang && sourceLang !== "auto") fd.set("source_lang", sourceLang);
  fd.set("num_speakers", "0");
  fd.set("watermark", String(Boolean(watermark)));
  if (start != null) fd.set("start_time", String(Math.floor(start)));
  if (end != null) fd.set("end_time", String(Math.ceil(end)));
  if (name) fd.set("name", name.slice(0, 120));
  return (await call("/v1/dubbing", { method: "POST", body: fd })).json();
}

/** → { dubbing_id, name, status: "dubbing" | "dubbed" | "failed", target_languages, error? } */
export async function getDubbing(id) {
  return (await call(`/v1/dubbing/${encodeURIComponent(id)}`)).json();
}

/** Il file doppiato (MP3 o MP4, secondo la sorgente). */
export async function downloadDubbing(id, lang) {
  return (await call(`/v1/dubbing/${encodeURIComponent(id)}/audio/${encodeURIComponent(lang)}`)).blob();
}

export async function deleteDubbing(id) {
  await call(`/v1/dubbing/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function getSubscription() {
  return (await call("/v1/user/subscription")).json();
}
