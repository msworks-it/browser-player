# Contribuire a Browser Player

Contributi e fork sono benvenuti.

## Come
1. Fai un fork e crea un branch dal `main`.
2. Prova le modifiche con `npm run dev` (banco di prova) e caricando `extension/` in Chrome.
3. Apri una pull request che spieghi cosa cambia e come l'hai provato.

Per un nuovo sito: un adapter in `extension/content/<sito>.js`, il sito nel `manifest.json` e una scheda in
`.claude/integrations/<sito>.md` (vedi la sezione "Aggiungere un sito" del README).

## Convenzioni
- JavaScript moderno senza build e senza dipendenze (`.claude/project/02-tradeoffs.md`, D-003).
- Commenti solo dove servono a capire il codice.
- Mai chiavi o segreti nel codice: la chiave ElevenLabs sta in `chrome.storage.local` o in `.env`.
- Messaggi di commit imperativi in inglese.

## Licenza
Inviando un contributo accetti che venga distribuito con la licenza del progetto, Apache 2.0
(Sezione 5 della licenza). Chi ridistribuisce il progetto o un suo derivato deve conservare il file
[NOTICE](NOTICE) con i crediti a M's Works.
