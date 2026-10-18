# AnimeWorld

> Primo sito supportato. API interne non documentate, osservate dal loro `playerServersAndDownloads.js` (18/10/2026).

## Scopo
Ottenere la lista episodi della serie e, per ogni episodio, il link MP4 diretto da dare al player.

## Base URL
- `https://www.animeworld.ac` (il dominio cambia spesso: in `manifest.json` ci sono anche `.so`, `.tv`, `.it`).
- File video su `srv*-*.sweetpixel.org`: `Access-Control-Allow-Origin: *`, Range supportato, nessun controllo del Referer.

## Autenticazione
Cookie di sessione della pagina + header `CSRF-Token` letto da `<meta name="csrf-token">`.
L'adapter gira nell'origine del sito, quindi i cookie passano da soli.

## Endpoint / DOM usati
| Metodo | Path / selettore | Request | Response |
|---|---|---|---|
| GET | `/api/episode/info?id=<token>&alt=0` | header `CSRF-Token` | `{grabber: "<mp4>", name, target: "/api/episode/serverPlayerAnimeWorld?id=…"}`; per i server esterni solo `target` |
| POST | `/api/views/update-views/<animeId>` | JSON `{episode: <data-episode-id>}` | conteggio visualizzazioni, come fa il sito |
| POST | `/api/download/<episodeId>` | — | link di download (non usato: a volte `links` vuoto) |
| DOM | `#player[data-id, data-episode-id, data-anime-id]` | | contenitore sostituito dall'iframe |
| DOM | `.server[data-name="9"] .episode a[data-id, data-episode-id, data-episode-num]` | | lista episodi (server 9 = AnimeWorld, l'unico con file diretto) |
| DOM | `.prevnext.prev/.next`, `#alternativ` | | intercettati / nascosto |

## File nel codice
- `extension/content/animeworld.js`

## Gestione errori
- `api/episode/info` non 2xx → messaggio nel player ("Impossibile caricare l'episodio").
- Nessun `grabber` → il player mostra l'iframe `target` del sito (server esterno).

## Note / TODO
- Se cambiano i selettori, il bridge non monta nulla (lista episodi vuota) e il sito resta com'è.
- Le serie lunghe hanno più "range" (`.episodes.range[data-range-id]`): la lista li include tutti.
