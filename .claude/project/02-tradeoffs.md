# Browser Player — Decisioni & trade-off (ADR)

> Ogni decisione non ovvia va registrata qui con un ID `D-00X`. Le decisioni aperte in fondo.

## Registro decisioni

### D-001 — Estensione Chrome MV3, non userscript
- **Contesto:** il player deve funzionare su più siti, salvare progressi e chiamare ElevenLabs con una chiave.
- **Opzioni:** A) userscript (Tampermonkey) B) estensione MV3.
- **Scelta:** B.
- **Motivo:** pagine dell'estensione con `chrome.storage`, IndexedDB e permessi host (niente CORS verso
  ElevenLabs), chiave fuori dal contesto della pagina, un'unica origine per i dati di tutti i siti.
- **Conseguenze:** si installa da `chrome://extensions` (modalità sviluppatore); Firefox richiederà ritocchi.
- **Data:** 2026-10-18

### D-002 — Il player è una pagina dell'estensione in iframe; i siti sono adapter
- **Contesto:** iniettare il player nel DOM del sito lo espone a CSS, script e pubblicità della pagina.
- **Opzioni:** A) player iniettato nel DOM B) iframe `chrome-extension://…/player.html` + adapter content script.
- **Scelta:** B.
- **Motivo:** isolamento totale dalla pagina, stesso codice per tutti i siti, accesso alle API dell'estensione.
  L'adapter resta nel mondo isolato con l'origine del sito, quindi può usare le API interne con i cookie.
- **Conseguenze:** comunicazione via `postMessage` con controllo dell'origine; i tasti premuti sulla pagina vanno
  inoltrati dal bridge; `player.html` è `web_accessible_resources` solo per i domini supportati.
- **Data:** 2026-10-18

### D-003 — Nessun build step, JavaScript moderno puro
- **Contesto:** progetto piccolo, da caricare non pacchettizzato e modificare in fretta.
- **Scelta:** ES module nelle pagine dell'estensione, IIFE nei content script, niente bundler né dipendenze.
- **Conseguenze:** niente TypeScript; se il codice cresce (più siti, HLS) si valuta Vite + TS.
- **Data:** 2026-10-18

### D-004 — Doppiaggio come traccia audio separata, sincronizzata al video
- **Contesto:** ElevenLabs restituisce un file (MP3 o MP4) del tratto doppiato.
- **Opzioni:** A) sostituire il video con il file doppiato B) `<audio>` agganciato al `<video>` originale.
- **Scelta:** B.
- **Motivo:** si doppia anche solo un tratto (prova economica), si passa da originale a doppiato al volo, il video
  resta in qualità piena. Il drift oltre 0,3 s viene corretto a ogni `timeupdate`.
- **Conseguenze:** se ElevenLabs restituisce l'intera durata invece del solo tratto, l'offset passa a 0 (rilevato
  confrontando la durata del file).
- **Data:** 2026-10-18

### D-005 — Chiave ElevenLabs condivisa con Motion Studio
- **Contesto:** la chiave esiste già nei segreti di Motion Studio (`%APPDATA%/editor-motion/impostazioni.json`).
- **Scelta:** `scripts/importa-chiave.mjs` la copia in `.env` (ignorato) per gli script; nell'estensione si incolla
  nelle impostazioni (`chrome.storage.local`).
- **Data:** 2026-10-18

### D-006 — Banco di prova su localhost per il player
- **Contesto:** gli strumenti di automazione del browser non possono vedere né toccare un iframe di un'altra
  estensione, quindi il player montato su AnimeWorld non si può verificare da agente.
- **Scelta:** `npm run dev` serve `extension/` come pagina web con un finto `chrome.storage` (`dev/chrome-shim.js`) e
  una pagina `/dev/` che fa da bridge; il server Node risolve gli episodi come l'adapter. `/out/` espone i risultati
  di `dub-test` per provare la sincronizzazione.
- **Conseguenze:** il banco prova player, protocollo e doppiaggio; l'adapter vero (DOM di AnimeWorld, click
  intercettati) va controllato a occhio nella pagina reale.
- **Data:** 2026-10-18

### D-007 — Licenza Apache 2.0 con NOTICE
- **Contesto:** repo pubblico su `msworks-it`; si vogliono fork e contributi, sempre con i crediti a M's Works.
- **Opzioni:** A) MIT (basta conservare la riga di copyright) B) Apache 2.0 + NOTICE C) licenza copyleft (GPL).
- **Scelta:** B.
- **Motivo:** la Sezione 4(d) obbliga a conservare il file NOTICE in ogni ridistribuzione e derivato (credito
  visibile a M's Works); la Sezione 5 copre i contributi; permette fork e uso commerciale senza imporre copyleft.
- **Conseguenze:** `LICENSE` (testo ufficiale), `NOTICE`, `CONTRIBUTING.md`; `license: Apache-2.0` in `package.json`.
- **Data:** 2026-10-18

## Misure (2026-10-18, episodio 5, 60 s, ja→it, piano Pro)
| Modo | Attesa totale | Note |
|---|---|---|
| `source_url` + `start_time/end_time` | 509 s | ElevenLabs scarica tutto il file da ~650 MB; stato `preparing` per ~8 min |
| Taglio locale (ffmpeg `-c copy`) + upload del tratto | 63 s | 26 s di taglio via Range, ~30 s di doppiaggio |
- Il file restituito è un MP4 (video+audio) lungo esattamente il tratto chiesto: l'offset è `start`.
- `GET /v1/user/subscription` non ha mostrato variazioni di `character_count` dopo i doppiaggi: il costo va letto
  dalla pagina Usage di ElevenLabs.

## Decisioni aperte
- **OA-1** — Costo reale a minuto (da leggere nella dashboard ElevenLabs, l'API non lo mostra subito) e strategia:
  doppiare a richiesta o in anticipo il prossimo episodio.
- **OA-4** — Nel player il doppiaggio usa ancora `source_url` (lento, ~8,5 min per 1 min). Per tagliare il tratto nel
  browser serve un remux MP4 senza ricodifica (mp4box.js incluso nell'estensione) partendo dalle richieste Range.
- **OA-2** — Siti con stream HLS/DASH (blob/MSE): servirà hls.js e un modo per passare il manifest al player.
- **OA-3** — Doppiaggio di serie lunghe: cache delle voci clonate per personaggio (ElevenLabs Dubbing Studio)?
