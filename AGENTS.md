<!-- BEGIN:msworks-agent-rules -->
# AGENTS.md — Browser Player

Regole per gli agenti AI (Claude Code) che lavorano su questo repo.

> Questo blocco è gestito da `msworks-project-setup` (marker `msworks-agent-rules`). Se il progetto
> è Next.js ≥16.3, sotto c'è anche il blocco `nextjs-agent-rules` scritto da `next dev`:
> **non rimuoverlo**, viene ricreato e va committato così com'è.

## Prima di implementare
1. Leggi `.claude/project/README.md` e i doc numerati `01`–`09` pertinenti al task.
2. Leggi `.claude/project/07-bad-practices.md`: non ripetere errori già noti.
3. Se il task tocca un servizio esterno, leggi/crea la scheda in `.claude/integrations/`.
4. Se il progetto ha `.claude/project/design/` (redesign/nuovo design UI in corso), leggi
   `design/design-system.md` e `design/decisions.md` prima di toccare qualsiasi schermata.
5. Estensione Chrome MV3 senza build (D-001, D-003): per le API `chrome.*` fa fede la doc ufficiale
   Chrome for Developers, non la memoria. Dopo ogni modifica: ricarica l'estensione e la pagina del sito.

## Durante
- Rispetta `06-code-style.md` (naming, confini, test, **commenti solo dove strettamente necessari**).
- Nuovo sito = nuovo adapter in `extension/content/<sito>.js` con l'interfaccia di `01-architecture.md`,
  + `matches` nel manifest + scheda in `.claude/integrations/`. Il player non conosce i siti.
- Messaggi `postMessage`: controllare sempre `source` e `origin` (vedi `05-api-endpoints.md`).
- Ogni decisione non ovvia → registrala in `.claude/project/02-tradeoffs.md` come `D-00X` (o in
  `design/decisions.md` come `D-UI-0X` se è una decisione di design/UI).
- Chiavi: solo in `chrome.storage.local` (estensione) o `.env` (script). Mai nel codice, mai stampate.

## A task completato (obbligatorio)
- Genera un report: `/report <nome task>` → in `.claude/project/reports/`.
- Se hai integrato un servizio esterno: scheda in `.claude/integrations/` + riga nel registro (`README.md`).
- Aggiorna i doc di progetto toccati dalla decisione (stesso commit).

## Commit
- Author: `antonio.murabito@msworks.it`. **Mai co-author.** Messaggi imperativi in inglese.

## Comandi rapidi (slash-command)
- `/report <task>` — nuovo report datato
- `/research <argomento>` — nuova nota di ricerca
- `/integration <servizio>` — nuova scheda integrazione
- `/setup-project` — (ri)genera la struttura `.claude/`
- `/design-setup` — genera `.claude/project/design/` + `roadmap-frontend.md` per un redesign UI
<!-- END:msworks-agent-rules -->
