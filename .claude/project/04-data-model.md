# Browser Player — Modello dati

> Tutto locale al browser, nell'origine dell'estensione (condiviso fra i siti). Fonte di verità: `extension/player/store.js`.

## chrome.storage.local
| Chiave | Valore | Note |
|---|---|---|
| `settings` | `{volume, muted, rate, autoNext, skipSeconds, dubSource, dubTarget, dubTestMinutes, dubWatermark, dubOn}` | default in `DEFAULTS` |
| `elevenKey` | stringa | chiave API, scritta solo dalle impostazioni |
| `p:<sito>:<serie>:<episodio>` | `{t, d, w, at}` | posizione, durata, visto (>90%), timestamp |
| `dub:<sito>:<serie>:<episodio>:<lingua>` | `{id, lang, start, end, status, expected, createdAt, error?}` | `start/end` null = episodio intero |

## IndexedDB `browser-player` → store `dubs`
- Chiave identica a quella del lavoro `dub:…`, valore = `Blob` del file doppiato.

## Macchine a stati
### Doppiaggio
```
(nessuno) → dubbing → downloading → ready
                └──→ failed
```
- `dubbing`: creato con `POST /v1/dubbing`, polling ogni 5 s (15 s dopo un errore di rete) finché la pagina è aperta;
  riprende alla riapertura dell'episodio.
- `downloading`: solo in memoria; se si chiude a metà si torna a `dubbing` e si riscarica.
- Un nuovo doppiaggio per lo stesso episodio e lingua sostituisce il precedente (record e file).

## Regole di integrità
- Un solo doppiaggio per episodio e lingua.
- I progressi si salvano al più ogni 5 s, sempre in pausa, al cambio episodio e alla chiusura.
