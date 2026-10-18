import * as store from "./store.js";
import * as eleven from "./elevenlabs.js";

const PARENT_ORIGIN = new URLSearchParams(location.search).get("origin");
const $ = (s) => document.querySelector(s);

const app = $("#app");
const video = $("#video");
const dubAudio = $("#dub");
const fallback = $("#fallback");

const LANGS = [
  ["auto", "Rileva"],
  ["ja", "Giapponese"],
  ["it", "Italiano"],
  ["en", "Inglese"],
  ["es", "Spagnolo"],
  ["fr", "Francese"],
  ["de", "Tedesco"],
  ["pt", "Portoghese"],
  ["ko", "Coreano"],
  ["zh", "Cinese"],
];
const RATES = [0.75, 1, 1.25, 1.5, 1.75, 2];
const NEXT_COUNTDOWN = 6;

const state = {
  site: "",
  series: { id: "", title: "" },
  episodes: [],
  index: -1,
  source: null,
  settings: { ...store.DEFAULTS },
  progress: {},
  loadToken: 0,
  dub: null, // { key, lang, start, end, status, id, error, url, offset }
};

/* ---------- messaggi con la pagina ---------- */

const pending = new Map();
let reqSeq = 0;
const resolvedCache = new Map();

function post(msg) {
  if (PARENT_ORIGIN) parent.postMessage(msg, PARENT_ORIGIN);
}

addEventListener("message", (e) => {
  if (e.source !== parent || e.origin !== PARENT_ORIGIN) return;
  const m = e.data;
  if (!m || typeof m.type !== "string") return;
  switch (m.type) {
    case "bp:init":
      init(m);
      break;
    case "bp:resolved": {
      const p = pending.get(m.reqId);
      if (!p) return;
      pending.delete(m.reqId);
      m.ok ? p.resolve({ kind: m.kind, url: m.url }) : p.reject(new Error(m.error));
      break;
    }
    case "bp:select": {
      const i = state.episodes.findIndex((ep) => ep.id === m.episodeId);
      if (i >= 0) loadEpisode(i, { autoplay: true });
      break;
    }
    case "bp:step":
      step(m.dir);
      break;
    case "bp:key":
      handleKey(m.key, m.shiftKey);
      break;
  }
});

function resolveEpisode(ep) {
  if (resolvedCache.has(ep.id)) return resolvedCache.get(ep.id);
  const p = new Promise((resolve, reject) => {
    const reqId = ++reqSeq;
    pending.set(reqId, { resolve, reject });
    post({ type: "bp:resolve", reqId, episodeId: ep.id });
    setTimeout(() => {
      if (pending.delete(reqId)) reject(new Error("Il sito non ha risposto in tempo"));
    }, 20000);
  });
  resolvedCache.set(ep.id, p);
  p.catch(() => resolvedCache.delete(ep.id));
  return p;
}

/* ---------- avvio ---------- */

async function init(m) {
  state.site = String(m.site);
  state.series = { id: String(m.series?.id ?? ""), title: String(m.series?.title ?? "") };
  state.episodes = (Array.isArray(m.episodes) ? m.episodes : []).map((ep) => ({
    id: String(ep.id),
    num: String(ep.num ?? ""),
    label: String(ep.label ?? ep.num ?? ""),
  }));
  state.settings = await store.getSettings();
  const keys = state.episodes.map(progressKey);
  state.progress = await store.getMany(keys);

  video.volume = state.settings.volume;
  video.playbackRate = state.settings.rate;
  applyMute();
  $("#volume").value = String(state.settings.volume);
  $("#series").textContent = state.series.title;
  renderRate();
  renderAutoNext();
  $("#skipLabel").textContent = `+${state.settings.skipSeconds}s`;
  fillLangSelect($("#dubSource"), state.settings.dubSource, true);
  fillLangSelect($("#dubTarget"), state.settings.dubTarget, false);
  $("#dubTestLabel").textContent = `${state.settings.dubTestMinutes} minuti da qui (prova)`;

  renderEpisodes();
  const start = Math.max(0, state.episodes.findIndex((ep) => ep.id === m.currentId));
  loadEpisode(start, { autoplay: false });
}

function progressKey(ep) {
  return `p:${state.site}:${state.series.id}:${ep.id}`;
}

function dubKey(ep, lang) {
  return `dub:${state.site}:${state.series.id}:${ep.id}:${lang}`;
}

/* ---------- episodi ---------- */

async function loadEpisode(i, { autoplay }) {
  if (i < 0 || i >= state.episodes.length) return;
  saveProgress(true);
  hideNextCard();
  const token = ++state.loadToken;
  const ep = state.episodes[i];
  state.index = i;
  state.source = null;

  $("#epTitle").textContent = `Episodio ${ep.label}`;
  $("#btnPrev").disabled = i === 0;
  $("#btnNext").disabled = i === state.episodes.length - 1;
  renderEpisodes();
  post({ type: "bp:episode-changed", episodeId: ep.id });

  video.pause();
  video.removeAttribute("src");
  video.load();
  fallback.hidden = true;
  fallback.removeAttribute("src");
  setMessage("");
  setState("loading");
  detachDub();

  let src;
  try {
    src = await resolveEpisode(ep);
  } catch (err) {
    if (token !== state.loadToken) return;
    setState("error");
    return setMessage(`Impossibile caricare l'episodio: ${err.message}`);
  }
  if (token !== state.loadToken) return;
  state.source = src;

  if (src.kind === "iframe") {
    // Server esterno: niente file diretto, si usa il suo player.
    setState("external");
    fallback.src = src.url;
    fallback.hidden = false;
    return;
  }

  video.src = src.url;
  const saved = state.progress[progressKey(ep)];
  video.addEventListener(
    "loadedmetadata",
    () => {
      if (token !== state.loadToken) return;
      if (saved && !saved.w && saved.t > 5 && saved.t < video.duration - 30) {
        video.currentTime = saved.t;
        osd(`Ripreso da ${fmt(saved.t)}`);
      }
      if (autoplay) video.play().catch(() => {});
    },
    { once: true },
  );
  loadDub(ep);
  prefetch(i + 1);
}

function prefetch(i) {
  const ep = state.episodes[i];
  if (ep) resolveEpisode(ep).catch(() => {});
}

function step(dir) {
  loadEpisode(state.index + dir, { autoplay: true });
}

function renderEpisodes() {
  const box = $("#episodes");
  box.replaceChildren(
    ...state.episodes.map((ep, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "ep";
      b.textContent = ep.label;
      const p = state.progress[progressKey(ep)];
      if (i === state.index) b.classList.add("current");
      if (p?.w) b.classList.add("watched");
      else if (p?.t && p?.d) b.style.setProperty("--p", `${Math.min(100, (p.t / p.d) * 100)}%`);
      b.addEventListener("click", () => {
        loadEpisode(i, { autoplay: true });
        closePanels();
      });
      return b;
    }),
  );
  // Niente scrollIntoView: dentro un iframe farebbe scorrere anche la pagina del sito.
  const cur = box.querySelector(".current");
  if (cur && !$("#episodesPanel").hidden) box.scrollTop = cur.offsetTop - box.clientHeight / 2;
}

/* ---------- progressi ---------- */

let lastSave = 0;
function saveProgress(force = false) {
  const ep = state.episodes[state.index];
  if (!ep || !video.duration || !isFinite(video.duration)) return;
  const now = Date.now();
  if (!force && now - lastSave < 5000) return;
  lastSave = now;
  const t = video.currentTime;
  const d = video.duration;
  const prev = state.progress[progressKey(ep)];
  const rec = { t, d, w: Boolean(prev?.w) || t / d > 0.9, at: now };
  state.progress[progressKey(ep)] = rec;
  store.set(progressKey(ep), rec);
}

/* ---------- controlli ---------- */

function setState(s) {
  app.dataset.state = s;
}

function setMessage(text) {
  const el = $("#message");
  el.textContent = text;
  el.hidden = !text;
}

let osdTimer;
function osd(text) {
  const el = $("#osd");
  el.textContent = text;
  el.classList.add("show");
  clearTimeout(osdTimer);
  osdTimer = setTimeout(() => el.classList.remove("show"), 1100);
}

function fmt(s) {
  if (!isFinite(s)) return "0:00";
  s = Math.max(0, Math.floor(s));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

function togglePlay() {
  if (state.source?.kind !== "video") return;
  video.paused ? video.play().catch(() => {}) : video.pause();
}

function seekBy(delta) {
  if (!video.duration) return;
  video.currentTime = Math.min(video.duration - 0.5, Math.max(0, video.currentTime + delta));
  osd(`${delta > 0 ? "+" : "−"}${Math.abs(delta)}s`);
}

function setVolume(v) {
  v = Math.min(1, Math.max(0, v));
  video.volume = v;
  dubAudio.volume = v;
  $("#volume").value = String(v);
  if (v > 0 && state.settings.muted) state.settings.muted = false;
  applyMute();
  store.saveSettings({ volume: v, muted: state.settings.muted });
}

function toggleMute() {
  state.settings.muted = !state.settings.muted;
  applyMute();
  store.saveSettings({ muted: state.settings.muted });
  osd(state.settings.muted ? "Muto" : `Volume ${Math.round(video.volume * 100)}%`);
}

function applyMute() {
  const muted = state.settings.muted || video.volume === 0;
  $("#btnMute use").setAttribute("href", muted ? "#i-mute" : "#i-vol");
  $("#volume").style.setProperty("--v", `${(state.settings.muted ? 0 : video.volume) * 100}%`);
  syncDub();
}

function setRate(r) {
  video.playbackRate = r;
  dubAudio.playbackRate = r;
  state.settings.rate = r;
  store.saveSettings({ rate: r });
  renderRate();
  osd(`Velocità ${r}×`);
}

function renderRate() {
  $("#btnRate").textContent = `${state.settings.rate}×`;
  const menu = $("#rateMenu");
  menu.replaceChildren(
    ...RATES.map((r) => {
      const b = document.createElement("button");
      b.type = "button";
      b.innerHTML = `<span>${r === 1 ? "Normale" : `${r}×`}</span><span class="check"></span>`;
      if (r === state.settings.rate) b.classList.add("on");
      b.addEventListener("click", () => {
        setRate(r);
        closeMenus();
      });
      return b;
    }),
  );
}

function renderAutoNext() {
  $("#autoNextCheck").parentElement.classList.toggle("on", state.settings.autoNext);
}

function toggleFullscreen() {
  document.fullscreenElement ? document.exitFullscreen() : app.requestFullscreen().catch(() => {});
}

async function togglePip() {
  try {
    document.pictureInPictureElement ? await document.exitPictureInPicture() : await video.requestPictureInPicture();
  } catch {}
}

function skipIntro() {
  seekBy(state.settings.skipSeconds);
}

/* ---------- barra di avanzamento ---------- */

const seek = $("#seek");
function seekRatio(clientX) {
  const r = seek.getBoundingClientRect();
  return Math.min(1, Math.max(0, (clientX - r.left) / r.width));
}

let dragging = false;
seek.addEventListener("pointerdown", (e) => {
  if (!video.duration) return;
  dragging = true;
  seek.setPointerCapture(e.pointerId);
  seek.classList.add("drag");
  scrub(e.clientX);
});
seek.addEventListener("pointermove", (e) => {
  const ratio = seekRatio(e.clientX);
  const tip = $("#seekTip");
  tip.textContent = fmt(ratio * (video.duration || 0));
  tip.style.left = `${ratio * 100}%`;
  if (dragging) scrub(e.clientX);
});
seek.addEventListener("pointerup", () => {
  dragging = false;
  seek.classList.remove("drag");
});

function scrub(clientX) {
  video.currentTime = seekRatio(clientX) * video.duration;
  renderTime();
}

function renderTime() {
  const d = video.duration || 0;
  const t = video.currentTime;
  const pct = d ? (t / d) * 100 : 0;
  $("#seekFill").style.width = `${pct}%`;
  $("#seekThumb").style.left = `${pct}%`;
  $("#tCur").textContent = fmt(t);
  $("#tDur").textContent = fmt(d);
  if (d && video.buffered.length) {
    let end = 0;
    for (let k = 0; k < video.buffered.length; k++) {
      if (video.buffered.start(k) <= t + 1) end = Math.max(end, video.buffered.end(k));
    }
    $("#seekBuffer").style.width = `${(end / d) * 100}%`;
  }
  renderDubRange();
}

/* ---------- eventi del video ---------- */

video.addEventListener("play", () => {
  $("#btnPlay use").setAttribute("href", "#i-pause");
  setState("playing");
  syncDub();
  poke();
});
video.addEventListener("pause", () => {
  $("#btnPlay use").setAttribute("href", "#i-play");
  if (state.source?.kind === "video") setState("paused");
  saveProgress(true);
  syncDub();
  poke();
});
video.addEventListener("waiting", () => app.classList.add("buffering"));
video.addEventListener("playing", () => app.classList.remove("buffering"));
video.addEventListener("canplay", () => app.classList.remove("buffering"));
video.addEventListener("loadedmetadata", () => {
  if (app.dataset.state === "loading") setState("paused");
});
video.addEventListener("timeupdate", () => {
  renderTime();
  saveProgress();
  syncDub();
});
video.addEventListener("seeked", syncDub);
video.addEventListener("seeking", syncDub);
video.addEventListener("waiting", syncDub);
video.addEventListener("playing", syncDub);
// timeupdate arriva ogni ~250 ms solo mentre il video avanza: questo copre i casi in cui non arriva.
setInterval(() => state.dub?.url && syncDub(), 250);
video.addEventListener("progress", renderTime);
video.addEventListener("durationchange", renderTime);
video.addEventListener("ratechange", () => (dubAudio.playbackRate = video.playbackRate));
video.addEventListener("ended", () => {
  saveProgress(true);
  if (state.settings.autoNext && state.index < state.episodes.length - 1) showNextCard();
});
video.addEventListener("error", () => {
  if (!video.getAttribute("src")) return;
  setState("error");
  setMessage("Il video non si carica. Riprova o torna al player del sito dal menu ⋮.");
});

addEventListener("pagehide", () => saveProgress(true));

/* ---------- prossimo episodio ---------- */

let nextTimer;
function showNextCard() {
  const ep = state.episodes[state.index + 1];
  $("#nextTitle").textContent = `Episodio ${ep.label}`;
  $("#nextCard").hidden = false;
  let n = NEXT_COUNTDOWN;
  $("#nextCount").textContent = `(${n})`;
  nextTimer = setInterval(() => {
    n -= 1;
    $("#nextCount").textContent = `(${n})`;
    if (n <= 0) step(1);
  }, 1000);
}

function hideNextCard() {
  clearInterval(nextTimer);
  $("#nextCard").hidden = true;
}

$("#nextNow").addEventListener("click", () => step(1));
$("#nextCancel").addEventListener("click", hideNextCard);

/* ---------- comparsa dei controlli ---------- */

let idleTimer;
function poke() {
  app.classList.add("active");
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (!video.paused && !app.querySelector(".panel:not([hidden]), .menu:not([hidden])") && !dragging) {
      app.classList.remove("active");
    }
  }, 2600);
}
app.addEventListener("pointermove", poke);
app.addEventListener("pointerdown", poke);
app.addEventListener("pointerleave", () => {
  if (!video.paused) app.classList.remove("active");
});

/* ---------- pannelli e menu ---------- */

function togglePanel(id) {
  const el = $(id);
  const open = el.hidden;
  closePanels();
  closeMenus();
  el.hidden = !open;
  if (open && id === "#episodesPanel") renderEpisodes();
  if (open && id === "#dubPanel") renderDubPanel();
  poke();
}

function closePanels() {
  document.querySelectorAll(".panel").forEach((p) => (p.hidden = true));
}

function toggleMenu(id, anchor) {
  const el = $(id);
  const open = el.hidden;
  closeMenus();
  if (!open) return;
  el.hidden = false;
  const a = anchor.getBoundingClientRect();
  const appR = app.getBoundingClientRect();
  el.style.right = `${Math.max(8, appR.right - a.right)}px`;
  el.style.bottom = `${appR.bottom - a.top + 8}px`;
}

function closeMenus() {
  document.querySelectorAll(".menu").forEach((m) => (m.hidden = true));
}

document.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", closePanels));

$("#moreMenu").addEventListener("click", (e) => {
  const action = e.target.closest("[data-action]")?.dataset.action;
  if (action === "autonext") {
    state.settings.autoNext = !state.settings.autoNext;
    store.saveSettings({ autoNext: state.settings.autoNext });
    renderAutoNext();
    return;
  }
  closeMenus();
  if (action === "settings") chrome.runtime.openOptionsPage();
  if (action === "original") post({ type: "bp:original" });
});

/* ---------- pulsanti e tastiera ---------- */

$("#btnPlay").addEventListener("click", togglePlay);
$("#btnPrev").addEventListener("click", () => step(-1));
$("#btnNext").addEventListener("click", () => step(1));
$("#btnMute").addEventListener("click", toggleMute);
$("#volume").addEventListener("input", (e) => setVolume(Number(e.target.value)));
$("#btnSkip").addEventListener("click", skipIntro);
$("#btnRate").addEventListener("click", (e) => toggleMenu("#rateMenu", e.currentTarget));
$("#btnMore").addEventListener("click", (e) => toggleMenu("#moreMenu", e.currentTarget));
$("#btnEpisodes").addEventListener("click", () => togglePanel("#episodesPanel"));
$("#btnDub").addEventListener("click", () => togglePanel("#dubPanel"));
$("#btnPip").addEventListener("click", togglePip);
$("#btnFull").addEventListener("click", toggleFullscreen);

video.addEventListener("click", () => {
  if (app.querySelector(".panel:not([hidden]), .menu:not([hidden])")) {
    closePanels();
    closeMenus();
    return;
  }
  togglePlay();
});
video.addEventListener("dblclick", toggleFullscreen);
document.addEventListener("fullscreenchange", () => app.classList.toggle("fullscreen", Boolean(document.fullscreenElement)));

function handleKey(key, shift) {
  switch (key) {
    case " ":
    case "k":
      togglePlay();
      break;
    case "ArrowLeft":
      seekBy(-5);
      break;
    case "ArrowRight":
      seekBy(5);
      break;
    case "j":
      seekBy(-10);
      break;
    case "l":
      seekBy(10);
      break;
    case "ArrowUp":
      setVolume(video.volume + 0.05);
      osd(`Volume ${Math.round(video.volume * 100)}%`);
      break;
    case "ArrowDown":
      setVolume(video.volume - 0.05);
      osd(`Volume ${Math.round(video.volume * 100)}%`);
      break;
    case "m":
      toggleMute();
      break;
    case "f":
      toggleFullscreen();
      break;
    case "n":
    case "N":
      step(1);
      break;
    case "p":
    case "P":
      step(-1);
      break;
    case "s":
      skipIntro();
      break;
    case "e":
      togglePanel("#episodesPanel");
      break;
    case "d":
      togglePanel("#dubPanel");
      break;
    case "Escape":
      closePanels();
      closeMenus();
      hideNextCard();
      break;
    default:
      return false;
  }
  poke();
  return true;
}

document.addEventListener("keydown", (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.target instanceof HTMLElement && /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName) && e.target.type !== "range") return;
  if (handleKey(e.key.length === 1 ? e.key.toLowerCase() : e.key, e.shiftKey)) e.preventDefault();
});

/* ---------- doppiaggio ---------- */

function fillLangSelect(sel, value, withAuto) {
  sel.replaceChildren(
    ...LANGS.filter(([c]) => withAuto || c !== "auto").map(([code, name]) => {
      const o = document.createElement("option");
      o.value = code;
      o.textContent = name;
      o.selected = code === value;
      return o;
    }),
  );
}

async function loadDub(ep) {
  const lang = state.settings.dubTarget;
  const key = dubKey(ep, lang);
  const rec = await store.get(key);
  if (ep !== state.episodes[state.index]) return;
  state.dub = rec ? { ...rec, key } : null;
  if (!rec) return renderDub();
  if (rec.status === "ready") await attachDubAudio();
  else if (rec.status === "dubbing") pollDub();
  renderDub();
}

async function attachDubAudio() {
  const d = state.dub;
  const blob = await store.blobGet(d.key);
  if (!blob || state.dub !== d) {
    if (!blob) Object.assign(d, { status: "failed", error: "File doppiato non trovato in locale" });
    return;
  }
  if (d.url) URL.revokeObjectURL(d.url);
  d.url = URL.createObjectURL(blob);
  d.offset = d.start ?? 0;
  dubAudio.src = d.url;
  dubAudio.playbackRate = video.playbackRate;
  dubAudio.volume = video.volume;
  // Se ElevenLabs restituisce tutta la durata e non solo il tratto chiesto, il file parte da 0.
  dubAudio.addEventListener(
    "loadedmetadata",
    () => {
      const span = (d.end ?? dubAudio.duration) - (d.start ?? 0);
      if (d.start && dubAudio.duration > span + 5) d.offset = 0;
      syncDub();
    },
    { once: true },
  );
}

function detachDub() {
  if (state.dub?.url) URL.revokeObjectURL(state.dub.url);
  state.dub = null;
  clearTimeout(pollTimer);
  dubAudio.pause();
  dubAudio.removeAttribute("src");
  dubAudio.load();
  renderDub();
}

function dubActive() {
  const d = state.dub;
  if (!d || d.status !== "ready" || !d.url || !state.settings.dubOn) return false;
  const t = video.currentTime;
  return t >= (d.start ?? 0) && t < (d.end ?? Infinity) - 0.05;
}

function syncDub() {
  const muted = state.settings.muted;
  if (!dubActive()) {
    if (!dubAudio.paused) dubAudio.pause();
    video.muted = muted;
    $("#dubBadge").hidden = true;
    return;
  }
  video.muted = true;
  dubAudio.muted = muted;
  dubAudio.volume = video.volume;
  $("#dubBadge").hidden = false;
  const target = video.currentTime - state.dub.offset;
  if (Math.abs(dubAudio.currentTime - target) > 0.3) dubAudio.currentTime = Math.max(0, target);
  // Fermo anche mentre il video bufferizza, altrimenti l'audio scappa avanti.
  if (video.paused || video.seeking || video.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) {
    if (!dubAudio.paused) dubAudio.pause();
  } else if (dubAudio.paused) {
    dubAudio.play().catch(() => {});
  }
}

let pollTimer;
async function pollDub() {
  clearTimeout(pollTimer);
  const d = state.dub;
  if (!d || d.status !== "dubbing") return;
  try {
    const info = await eleven.getDubbing(d.id);
    if (state.dub !== d) return;
    if (info.status === "dubbed") {
      d.status = "downloading";
      renderDub();
      const blob = await eleven.downloadDubbing(d.id, d.lang);
      await store.blobPut(d.key, blob);
      d.status = "ready";
      await saveDubRecord(d);
      await attachDubAudio();
      state.settings.dubOn = true;
      osd("Doppiaggio pronto");
    } else if (info.status === "failed") {
      d.status = "failed";
      d.error = info.error || "ElevenLabs non è riuscito a doppiare il video";
      await saveDubRecord(d);
    } else {
      pollTimer = setTimeout(pollDub, 5000);
    }
  } catch (err) {
    if (state.dub !== d) return;
    d.error = err.message;
    pollTimer = setTimeout(pollDub, 15000);
  }
  renderDub();
}

function saveDubRecord(d) {
  const { url, offset, key, ...rec } = d;
  return store.set(key, rec);
}

async function startDub() {
  const ep = state.episodes[state.index];
  if (!ep || state.source?.kind !== "video") return showDubError("Il doppiaggio funziona solo con il video diretto.");
  const sourceLang = $("#dubSource").value;
  const lang = $("#dubTarget").value;
  const full = document.querySelector('input[name="dubRange"]:checked').value === "full";
  const start = full ? null : Math.floor(video.currentTime);
  const end = full ? null : Math.ceil(Math.min(video.duration || Infinity, video.currentTime + state.settings.dubTestMinutes * 60));
  state.settings = await store.saveSettings({ dubSource: sourceLang, dubTarget: lang });

  const btn = $("#dubStart");
  btn.disabled = true;
  showDubError("");
  try {
    const res = await eleven.createDubbing({
      sourceUrl: state.source.url,
      sourceLang,
      targetLang: lang,
      start,
      end,
      watermark: state.settings.dubWatermark,
      name: `${state.series.title} - Ep ${ep.label}`,
    });
    const old = await store.get(dubKey(ep, lang));
    if (old) await store.blobDelete(dubKey(ep, lang));
    detachDub();
    state.dub = {
      key: dubKey(ep, lang),
      id: res.dubbing_id,
      lang,
      start,
      end,
      status: "dubbing",
      expected: res.expected_duration_sec,
      createdAt: Date.now(),
    };
    await saveDubRecord(state.dub);
    pollTimer = setTimeout(pollDub, 5000);
  } catch (err) {
    showDubError(err.message);
  } finally {
    btn.disabled = false;
    renderDub();
  }
}

async function deleteDub() {
  const d = state.dub;
  if (!d) return;
  await store.remove(d.key);
  await store.blobDelete(d.key);
  eleven.deleteDubbing(d.id).catch(() => {});
  detachDub();
}

function showDubError(text) {
  const el = $("#dubError");
  el.textContent = text;
  el.hidden = !text;
}

function renderDub() {
  const d = state.dub;
  const btn = $("#btnDub");
  btn.classList.toggle("on", Boolean(d && d.status === "ready" && state.settings.dubOn));
  btn.classList.toggle("working", Boolean(d && (d.status === "dubbing" || d.status === "downloading")));
  renderDubRange();
  if (!$("#dubPanel").hidden) renderDubPanel();
  syncDub();
}

function renderDubRange() {
  const d = state.dub;
  const el = $("#seekDub");
  const dur = video.duration;
  if (!d || d.status !== "ready" || !dur) return (el.hidden = true);
  const s = d.start ?? 0;
  const e = Math.min(dur, d.end ?? dur);
  el.hidden = false;
  el.style.left = `${(s / dur) * 100}%`;
  el.style.width = `${((e - s) / dur) * 100}%`;
}

async function renderDubPanel() {
  $("#dubKeyHint").hidden = Boolean(await eleven.getKey());
  const d = state.dub;
  $("#dubCurrent").hidden = !d;
  if (!d) return;
  const range = d.start == null ? "episodio intero" : `${fmt(d.start)}–${fmt(d.end)}`;
  const lang = LANGS.find(([c]) => c === d.lang)?.[1] ?? d.lang;
  const labels = {
    dubbing: `In lavorazione (${lang}, ${range})${d.expected ? `, circa ${Math.ceil(d.expected / 60)} min` : ""}…`,
    downloading: "Scarico il doppiaggio…",
    ready: `Pronto: ${lang}, ${range}`,
    failed: `Non riuscito: ${d.error ?? "errore sconosciuto"}`,
  };
  $("#dubStatus").textContent = labels[d.status] ?? d.status;
  $("#dubStatus").dataset.status = d.status;
  $("#dubToggle").checked = Boolean(state.settings.dubOn);
  $("#dubToggle").closest(".switch").hidden = d.status !== "ready";
  if (d.error && d.status === "dubbing") showDubError(`Ultimo controllo: ${d.error}`);
}

$("#dubStart").addEventListener("click", startDub);
$("#dubDelete").addEventListener("click", deleteDub);
$("#dubOpenSettings").addEventListener("click", () => chrome.runtime.openOptionsPage());
$("#dubToggle").addEventListener("change", (e) => {
  state.settings.dubOn = e.target.checked;
  store.saveSettings({ dubOn: state.settings.dubOn });
  renderDub();
});

/* ---------- avvio ---------- */

if (!PARENT_ORIGIN) {
  setState("error");
  setMessage("Questo player si apre dentro le pagine dei siti supportati.");
} else {
  post({ type: "bp:ready" });
}
