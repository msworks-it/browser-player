# Browser Player — Roadmap

> Fasi con checklist e criteri di verifica. Spunta man mano; ogni fase completata → report.

## Fase 0 — Fondamenta
- [x] Struttura `.claude/`, estensione MV3 senza build, script di test
- **Verifica:** estensione caricata senza errori in `chrome://extensions`.

## Fase 1 — Player AnimeWorld
- [x] Adapter AnimeWorld (lista episodi, MP4 diretto da `api/episode/info`, URL e titolo aggiornati)
- [x] Player: controlli, barra con buffer, velocità, PiP, schermo intero, scorciatoie
- [x] Cambio episodio senza ricaricare, griglia episodi con visti/parziali, prefetch del successivo
- [x] Ripresa della posizione, episodio successivo automatico con conto alla rovescia, salta sigla
- [x] Ripiego sull'iframe per gli episodi su server esterni, "torna al player del sito"
- [ ] Prova manuale completa su più serie (anche con più range di episodi, es. One Piece)
- **Verifica:** guardare 2 episodi di fila usando solo la tastiera; la posizione resta dopo un ricarico.

## Fase 2 — Doppiaggio ElevenLabs
- [x] Client Dubbing API, pannello nel player, polling, file in IndexedDB, sync audio/video
- [x] `scripts/dub-test.mjs` con misura di tempi e crediti
- [x] Prime prove reali (60 s ja→it): tempi misurati, sincronizzazione verificata nel banco di prova
- [ ] Costo a minuto dalla dashboard ElevenLabs (OA-1)
- [ ] Taglio del tratto nel browser con mp4box.js e upload, al posto di `source_url` (OA-4)
- [ ] Sottotitoli della trascrizione doppiata (`/transcript/{lang}?format_type=webvtt`) come traccia
- **Verifica:** un tratto doppiato si sente allineato al labiale entro ~0,3 s, anche dopo seek e cambio velocità.

## Fase 3 — Più siti
- [ ] Adapter generico: qualsiasi `<video>` con sorgente http diretta
- [ ] HLS (hls.js) per i siti con stream a segmenti (OA-2)
- [ ] Secondo sito dedicato (da scegliere)

## Fase 4 — Rifinitura
- [ ] Icone dell'estensione e popup con "continua a guardare"
- [ ] Salto sigla intelligente (rilevamento della sigla ricorrente fra episodi)
- [ ] Porting Firefox
