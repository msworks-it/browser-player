# Browser Player — Protocollo interno ed endpoint usati

> Non c'è un backend nostro. Qui il protocollo fra pagina e player e gli endpoint esterni che usiamo.

## Messaggi bridge ↔ player (`postMessage`)
Controlli: il bridge accetta solo `e.source === iframe.contentWindow` con origine dell'estensione; il player solo
`e.source === parent` con l'origine passata in `?origin=` dal bridge.

| Verso | Tipo | Campi |
|---|---|---|
| player → pagina | `bp:ready` | — |
| pagina → player | `bp:init` | `site`, `series {id,title}`, `episodes [{id,num,label,href}]`, `currentId` |
| player → pagina | `bp:resolve` | `reqId`, `episodeId` |
| pagina → player | `bp:resolved` | `reqId`, `ok`, `kind` (`video`/`iframe`), `url` oppure `error` |
| player → pagina | `bp:episode-changed` | `episodeId` |
| pagina → player | `bp:select` | `episodeId` (click sulla lista del sito) |
| pagina → player | `bp:step` | `dir` (±1, pulsanti precedente/successivo del sito) |
| pagina → player | `bp:key` | `key`, `shiftKey` (tasti premuti con il focus sulla pagina) |
| player → pagina | `bp:original` | — torna al player del sito per la sessione |

## Scorciatoie
Spazio/K play · ←/→ ±5 s · J/L ±10 s · ↑/↓ volume · M muto · F schermo intero · N/P episodio · S salta sigla ·
E episodi · D doppiaggio · Esc chiude pannelli.

## Endpoint esterni
- AnimeWorld: `.claude/integrations/animeworld.md`
- ElevenLabs: `.claude/integrations/elevenlabs.md`
