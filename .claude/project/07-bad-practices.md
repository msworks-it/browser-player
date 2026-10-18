# Browser Player — Bad practices (cosa NON fare)

> Lista viva. Ogni volta che un errore viene individuato in review, si aggiunge qui.

- ❌ `any` per zittire il compilatore. Usare `unknown` + narrowing.
- ❌ Logica di dominio dentro i componenti o le server actions.
- ❌ Import diretto del client DB fuori dal modulo dedicato.
- ❌ Segreti con prefisso pubblico (es. `NEXT_PUBLIC_`).
- ❌ Float sugli importi monetari. Usare un tipo decimale.
- ❌ Modificare lo schema DB fuori dal sistema di migrazione.
- ❌ Stringhe hardcoded sparse per testi/valori di dominio.
- ❌ Integrazione esterna senza scheda in `.claude/integrations/`.
- ❌ Task completato senza report in `reports/`.

### Next.js 16.x
- ❌ Scrivere Next "a memoria": verificare l'API in `node_modules/next/dist/docs/` della versione installata.
- ❌ Rimuovere il blocco `nextjs-agent-rules` da `AGENTS.md` (`next dev` lo ricrea): va committato.
- ❌ `middleware.ts` nei progetti nuovi → `proxy.ts` con funzione `proxy`.
- ❌ Accesso sincrono a `params`, `searchParams`, `cookies()`, `headers()`, `draftMode()`: sono async.
- ❌ `revalidateTag(tag)` a un argomento (deprecato) → `revalidateTag(tag, 'max')`, oppure
  `updateTag(tag)` nelle Server Actions quando serve read-your-writes.
- ❌ Dare per scontato il caching implicito di fetch/route (modello pre-16): con Cache Components
  si cachea solo ciò che è marcato `'use cache'`.
- ❌ `experimental.ppr`, `experimental.dynamicIO`, `export const experimental_ppr`: rimossi →
  `cacheComponents`.
- ❌ `images.domains`, `next/legacy/image`: deprecati → `images.remotePatterns`, `next/image`.
- ❌ Contare su `scroll-behavior: smooth` automatico: serve `data-scroll-behavior="smooth"` su `<html>`.
