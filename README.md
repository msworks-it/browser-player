# Browser Player

Estensione Chrome che sostituisce il player video dei siti di streaming con un player unico e curato,
con doppiaggio automatico in un'altra lingua tramite [ElevenLabs](https://elevenlabs.io/docs/api-reference/dubbing/create).
Primo sito supportato: AnimeWorld. Ogni altro sito si aggiunge con un piccolo adapter.

> Progetto sperimentale di [M's Works](https://msworks.it). Non è affiliato né ad AnimeWorld né a ElevenLabs.
> Il doppiaggio usa la tua chiave ElevenLabs e consuma i tuoi crediti.

## Cosa fa
- **Cambio episodio senza ricaricare la pagina**: pulsanti, tasti N/P, griglia episodi con visti e parziali;
  il link del successivo viene preparato in anticipo.
- **Ripresa** dal punto lasciato, **episodio successivo automatico** con conto alla rovescia, **salta sigla**.
- Velocità, picture-in-picture, schermo intero e scorciatoie che funzionano anche con il focus sulla pagina del sito.
- **Doppiaggio ElevenLabs**: di un tratto di prova o dell'intero episodio. L'audio doppiato suona sopra il video
  originale, sincronizzato, e si passa da originale a doppiato al volo.
- Se un episodio è su un server esterno si usa il suo player; dal menu si torna sempre al player del sito.

## Installazione
1. Scarica o clona il repo.
2. Apri `chrome://extensions` e attiva la **Modalità sviluppatore**.
3. Clicca **Carica estensione non pacchettizzata** e scegli la cartella `extension/`.
4. Per il doppiaggio: dettagli dell'estensione → **Opzioni estensione** → incolla la chiave ElevenLabs.

Chrome su Windows e macOS non installa `.crx` che non vengano dal Chrome Web Store, per questo serve il caricamento
non pacchettizzato. `npm run pacchetto` crea comunque lo zip in `dist/` (per il Web Store).

## Scorciatoie
| Tasto | Azione |
|---|---|
| Spazio / K | play / pausa |
| ← / → | −5 s / +5 s |
| J / L | −10 s / +10 s |
| ↑ / ↓ | volume |
| M | muto |
| F | schermo intero |
| N / P | episodio successivo / precedente |
| S | salta sigla |
| E | pannello episodi |
| D | pannello doppiaggio |

## Come funziona
```
pagina del sito ── content/bridge.js + content/<sito>.js (adapter)
        │  postMessage, origine controllata in entrambi i versi
        ▼
iframe chrome-extension://…/player/player.html ── api.elevenlabs.io
```
Il player è una pagina dell'estensione: è isolato dagli script della pagina e ha a disposizione `chrome.storage`
e IndexedDB, condivisi fra tutti i siti. L'adapter conosce il sito (lista episodi, link del video, URL della pagina),
il player no. I dettagli sono in [`.claude/project/01-architecture.md`](.claude/project/01-architecture.md).

## Sviluppo
Richiede Node ≥ 20.9; ffmpeg solo per `dub-test --upload`. Nessuna dipendenza npm, nessun build step.

```bash
npm run dev        # banco di prova del player su http://localhost:5173/dev/ (finto chrome.storage)
npm run dub-test -- "<url /play/... di AnimeWorld>" --start 300 --secs 60 --upload
npm run pacchetto  # zip dell'estensione in dist/
```
`dub-test` legge `ELEVENLABS_API_KEY` da `.env` (vedi `.env.example`) e scrive in `out/` il file doppiato,
la trascrizione `.srt` e un `.json` con i tempi.

```
extension/   l'estensione (manifest, content script, player, opzioni)
scripts/     banco di prova, test del doppiaggio, utilità
dev/         pagina e finto chrome.storage del banco di prova
.claude/     documentazione di progetto: architettura, decisioni, misure, integrazioni, roadmap
```

## Aggiungere un sito
1. Scrivi `extension/content/<sito>.js` con l'interfaccia dell'adapter (vedi `content/animeworld.js`).
2. Aggiungi il sito a `content_scripts` e `web_accessible_resources` in `manifest.json`.
3. Documenta le API del sito in `.claude/integrations/<sito>.md`.

## Roadmap
In [`.claude/project/09-roadmap.md`](.claude/project/09-roadmap.md): taglio del tratto da doppiare direttamente nel
browser (oggi ElevenLabs scarica l'intero file ed è lento), adapter generico per qualsiasi `<video>`, HLS, Firefox.
