// Stato persistente del player, condiviso fra tutti i siti (origine dell'estensione):
// chrome.storage.local per impostazioni, progressi e lavori di doppiaggio; IndexedDB per i file audio doppiati.

export const DEFAULTS = {
  volume: 1,
  muted: false,
  rate: 1,
  autoNext: true,
  skipSeconds: 85,
  dubSource: "ja",
  dubTarget: "it",
  dubTestMinutes: 2,
  dubWatermark: false,
  dubOn: true,
};

export async function getSettings() {
  const { settings } = await chrome.storage.local.get("settings");
  return { ...DEFAULTS, ...settings };
}

export async function saveSettings(patch) {
  const next = { ...(await getSettings()), ...patch };
  await chrome.storage.local.set({ settings: next });
  return next;
}

export async function get(key) {
  return (await chrome.storage.local.get(key))[key];
}

export const set = (key, value) => chrome.storage.local.set({ [key]: value });
export const remove = (key) => chrome.storage.local.remove(key);
export const getMany = (keys) => chrome.storage.local.get(keys);

const db = new Promise((resolve, reject) => {
  const req = indexedDB.open("browser-player", 1);
  req.onupgradeneeded = () => req.result.createObjectStore("dubs");
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});

async function tx(mode, fn) {
  const store = (await db).transaction("dubs", mode).objectStore("dubs");
  return new Promise((resolve, reject) => {
    const req = fn(store);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const blobGet = (key) => tx("readonly", (s) => s.get(key));
export const blobPut = (key, blob) => tx("readwrite", (s) => s.put(blob, key));
export const blobDelete = (key) => tx("readwrite", (s) => s.delete(key));
