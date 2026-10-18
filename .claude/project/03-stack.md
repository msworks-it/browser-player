# Browser Player — Stack tecnico

> Versioni pinnate alla prima installazione; aggiornare qui a ogni upgrade.

**Versioni (2026-10-18):** Chrome ≥ 116 (Manifest V3) · Node 24.14.0 per gli script (minimo 20.9) · nessuna dipendenza npm.

## Runtime & framework
| Layer | Scelta | Note |
|---|---|---|
| Piattaforma | **Estensione Chrome MV3** | caricata non pacchettizzata da `extension/` (D-001) |
| Linguaggio | **JavaScript ES2023** | ES module nelle pagine, IIFE nei content script (D-003) |
| UI | **HTML + CSS a mano** | icone SVG inline, nessun framework |
| Stato | **chrome.storage.local + IndexedDB** | `unlimitedStorage` per i file doppiati |
| Script | **Node** con `--env-file` | `scripts/*.mjs`, solo API standard |

## Comandi
```
npm run dev                          # banco di prova del player: http://localhost:5173/dev/ (D-006)
npm run chiave                       # copia la chiave ElevenLabs da Motion Studio in .env
npm run dub-test -- <url /play/...>  # prova di doppiaggio da terminale; --upload taglia in locale (serve ffmpeg)
npm run pacchetto                    # zip dell'estensione in dist/
```
Installazione estensione: `chrome://extensions` → Modalità sviluppatore → Carica estensione non pacchettizzata →
cartella `extension/`. Dopo ogni modifica: icona ricarica sull'estensione + ricarica della pagina del sito.

## Variabili d'ambiente (contratto, solo script)
```
ELEVENLABS_API_KEY=   # .env alla radice, ignorato da git
```

## Servizi esterni e piani
- **ElevenLabs** (Dubbing API): account di M's, stessa chiave di Motion Studio. Scheda in `.claude/integrations/elevenlabs.md`.
- **AnimeWorld** (API interne non documentate). Scheda in `.claude/integrations/animeworld.md`.
