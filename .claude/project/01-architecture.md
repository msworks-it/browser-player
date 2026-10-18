# Browser Player — Architettura

> Ultimo aggiornamento: 2026-10-18. Documento vivo: aggiornare a ogni decisione architetturale.

## Visione
Un'estensione Chrome che sostituisce il player video dei siti di streaming con un player unico e curato:
cambio episodi senza ricaricare, ripresa dal punto lasciato, scorciatoie da tastiera, episodio successivo
automatico e doppiaggio ElevenLabs in un'altra lingua. Si parte da AnimeWorld; ogni nuovo sito è un adapter.

## Diagramma logico
```
Pagina del sito (es. animeworld.ac/play/...)
 ├─ content/bridge.js       monta l'iframe, inoltra i messaggi e i tasti
 ├─ content/<sito>.js       adapter: lista episodi, link del video, URL/titolo della pagina
 │        │  postMessage (origine controllata in entrambi i versi)
 │        ▼
 └─ iframe chrome-extension://…/player/player.html
          ├─ player.js       UI, progressi, prossimo episodio, sync dell'audio doppiato
          ├─ store.js        chrome.storage.local (impostazioni, progressi, lavori) + IndexedDB (audio)
          └─ elevenlabs.js ──► api.elevenlabs.io (/v1/dubbing…)
```

## Componenti chiave
### 1. Bridge (`extension/content/bridge.js`)
- Comune a tutti i siti. Sostituisce il contenuto del contenitore del player con l'iframe dell'estensione.
- Protocollo con il player (vedi `05-api-endpoints.md`), inoltro dei tasti quando il focus è sulla pagina.
- "Torna al player del sito": flag in `sessionStorage` + ricarica; un pulsante fisso permette di riattivarlo.

### 2. Adapter di sito (`extension/content/<sito>.js`)
- Interfaccia: `site`, `container()`, `prepare()`, `series()`, `episodes()`, `currentId()`, `resolve(id)`,
  `onEpisodeChanged(id)`, `interceptClicks({select, step})`.
- Gira nel mondo isolato con l'origine del sito: chiama le API interne del sito con i suoi cookie e il CSRF.
- `resolve` restituisce `{kind: "video", url}` (file diretto) oppure `{kind: "iframe", url}` (server esterno).

### 3. Player (`extension/player/`)
- Pagina dell'estensione: ha `chrome.storage`, IndexedDB e `fetch` verso ElevenLabs senza problemi di CORS,
  ed è la stessa per tutti i siti (progressi e doppiaggi condivisi).
- `<video>` per il file diretto, `<audio>` sincronizzato per il doppiaggio, iframe di ripiego per i server esterni.

## Flussi principali
1. **Apertura**: bridge monta l'iframe → player `bp:ready` → bridge `bp:init` (serie, episodi, episodio corrente)
   → player chiede `bp:resolve` → adapter chiama l'API del sito → player carica il video e riprende la posizione.
2. **Cambio episodio** (bottoni, N/P, griglia episodi, click sulla lista del sito intercettato): player
   `bp:episode-changed` → adapter aggiorna URL (`history.replaceState`), episodio attivo e titolo della pagina.
   Il link del successivo viene risolto in anticipo.
3. **Doppiaggio**: `POST /v1/dubbing` con `source_url` = MP4 dell'episodio (tratto di prova o intero) → polling ogni
   5 s → download del file → IndexedDB → `<audio>` agganciato al video nel tratto doppiato (video muto lì).

## Struttura repo
```
extension/          # l'estensione, si carica "non pacchettizzata" da chrome://extensions
  manifest.json
  content/          # bridge + adapter per sito
  player/           # pagina del player, stato, client ElevenLabs
  options/          # impostazioni (chiave ElevenLabs, preferenze)
scripts/            # strumenti da terminale: importa-chiave, dub-test
out/                # risultati dei test di doppiaggio (ignorato da git)
```
