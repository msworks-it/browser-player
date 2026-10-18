# ElevenLabs

> Doppiaggio degli episodi in un'altra lingua (Dubbing API). **Gated**: senza chiave il pannello Doppiaggio lo dice
> e rimanda alle impostazioni; il resto del player funziona.

## Scopo
Doppiare un tratto (prova) o un episodio intero partendo dall'URL del file video, scaricare il risultato e
riprodurlo come traccia audio sincronizzata al video originale (D-004).

## Base URL / SDK e versione
- REST, nessun SDK: `fetch` diretto. Base `https://api.elevenlabs.io`.

## Autenticazione
Header `xi-api-key: <chiave>`. La chiave è la stessa di Motion Studio (D-005).

## Variabili d'ambiente / dove sta la chiave
```
ELEVENLABS_API_KEY=   # solo per gli script, .env alla radice (npm run chiave la copia da Motion Studio)
```
Nell'estensione: `chrome.storage.local.elevenKey`, impostata dalla pagina Impostazioni.

## Endpoint / metodi usati
| Metodo | Path | Request | Response |
|---|---|---|---|
| POST | `/v1/dubbing` | multipart: `source_url`, `source_lang` (opz.), `target_lang`, `num_speakers=0`, `watermark`, `start_time`/`end_time` (s, interi, opz.), `name` | `{dubbing_id, expected_duration_sec}` |
| GET | `/v1/dubbing/{id}` | — | `{dubbing_id, name, status: preparing\|dubbing\|dubbed\|failed, target_languages, error?}` |
| GET | `/v1/dubbing/{id}/audio/{lang}` | — | file MP3 o MP4 (stream) |
| GET | `/v1/dubbing/{id}/transcript/{lang}?format_type=srt\|webvtt` | — | sottotitoli (solo `dub-test` per ora) |
| DELETE | `/v1/dubbing/{id}` | — | elimina il progetto (quando si elimina il doppiaggio nel player) |
| GET | `/v1/user/subscription` | — | `{tier, character_count, character_limit, …}`: verifica chiave e misura crediti |

## Webhook
Nessuno: polling ogni 5 s.

## File nel codice
- `extension/player/elevenlabs.js` — client.
- `extension/player/player.js` — sezione "doppiaggio" (avvio, polling, download, sync).
- `extension/options/options.js` — salvataggio e verifica chiave.
- `scripts/dub-test.mjs`, `scripts/importa-chiave.mjs`.

## Gestione errori e gating
- Chiave mancante: errore esplicito + link alle impostazioni nel pannello.
- Errori HTTP: `ElevenLabs <status>: <detail.message>` mostrato nel pannello.
- Polling: errore di rete → nuovo tentativo dopo 15 s; `failed` → stato salvato con il messaggio.

## Costi
- Si paga a minuto di sorgente doppiata. Costo reale da misurare con `npm run dub-test` (stampa `crediti_consumati`) → OA-1.
- `watermark=true` su alcuni piani costa meno; il watermark è sul video, che noi non usiamo.

## Note / TODO
- Verificato il 18/10/2026: con `source_url` ElevenLabs scarica tutto il file (~650 MB) anche per 60 s → 509 s di
  attesa; caricando solo il tratto tagliato (`file` multipart) → 63 s. Misure in `02-tradeoffs.md`.
- Il file restituito copre solo il tratto chiesto (MP4 con video e audio, 60,1 s per 60 s).
- Lo stato `preparing` precede `dubbing`: il player continua il polling per ogni stato diverso da `dubbed`/`failed`.
- Qualità ja→it buona e naturale nella prova (trascrizione in `out/*.srt`).
