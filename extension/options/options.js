import * as store from "../player/store.js";
import { getKey, getSubscription } from "../player/elevenlabs.js";

const $ = (s) => document.querySelector(s);

const settings = await store.getSettings();
$("#autoNext").checked = settings.autoNext;
$("#skipSeconds").value = settings.skipSeconds;
$("#dubTestMinutes").value = settings.dubTestMinutes;
$("#dubWatermark").checked = settings.dubWatermark;
if (await getKey()) $("#key").placeholder = "Chiave salvata (scrivine una nuova per sostituirla)";

let savedTimer;
async function save(patch) {
  await store.saveSettings(patch);
  $("#saved").textContent = "Salvato";
  clearTimeout(savedTimer);
  savedTimer = setTimeout(() => ($("#saved").textContent = ""), 1500);
}

const clamp = (v, min, max, def) => (Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : def);

$("#autoNext").addEventListener("change", (e) => save({ autoNext: e.target.checked }));
$("#dubWatermark").addEventListener("change", (e) => save({ dubWatermark: e.target.checked }));
$("#skipSeconds").addEventListener("change", (e) =>
  save({ skipSeconds: clamp(Number(e.target.value), 5, 300, store.DEFAULTS.skipSeconds) }),
);
$("#dubTestMinutes").addEventListener("change", (e) =>
  save({ dubTestMinutes: clamp(Number(e.target.value), 1, 30, store.DEFAULTS.dubTestMinutes) }),
);

$("#saveKey").addEventListener("click", async () => {
  const key = $("#key").value.trim();
  if (!key) return;
  await chrome.storage.local.set({ elevenKey: key });
  $("#key").value = "";
  $("#key").placeholder = "Chiave salvata (scrivine una nuova per sostituirla)";
  $("#keyStatus").textContent = "Chiave salvata.";
});

$("#testKey").addEventListener("click", async () => {
  const out = $("#keyStatus");
  out.textContent = "Verifico…";
  try {
    const s = await getSubscription();
    out.textContent = `Funziona. Piano ${s.tier}: ${s.character_count.toLocaleString("it")} / ${s.character_limit.toLocaleString("it")} crediti usati.`;
  } catch (err) {
    out.textContent = err.message;
  }
});
