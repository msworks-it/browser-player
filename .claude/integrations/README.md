# Integrazioni esterne — Browser Player

> **Norma di progetto (obbligatoria):** ogni API di terze parti, ogni webhook (in entrata o in uscita) e ogni servizio esterno integrato **deve** essere documentato qui, in `.claude/integrations/`, **contestualmente** all'integrazione (stesso incremento). Un'integrazione non documentata è incompleta.
>
> Ogni scheda contiene: scopo · base URL/SDK e versione · autenticazione · variabili d'ambiente · endpoint/metodi con shape request/response · webhook (endpoint nostro, verifica firma, eventi, mapping) · file nel codice · gestione errori e gating · costi · note/TODO.

## Registro integrazioni

| Integrazione | Tipo | Stato | Scheda |
|---|---|---|---|
| ElevenLabs | API (Dubbing) | 🧪 da provare con chiave reale | [elevenlabs.md](elevenlabs.md) |
| AnimeWorld | API interne + DOM | ✅ verificata il 18/10/2026 | [animeworld.md](animeworld.md) |

## Webhook in entrata (endpoint esposti dalla nostra app)

Nessuno: l'estensione non ha un backend.

## Gating / graceful degradation
Ogni integrazione è **opzionale a runtime**: senza chiave ElevenLabs il player funziona e il pannello Doppiaggio
rimanda alle impostazioni; se l'adapter di un sito non trova la lista episodi, il sito resta con il suo player.

Nuova scheda: `/integration <nome servizio>` oppure `node .claude/scripts/new-integration.mjs "Nome"`.
