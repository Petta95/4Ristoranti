# 4 Ristoranti 🍽️

La vostra classifica privata dei ristoranti provati insieme, ispirata al programma TV: 4 categorie di voto con mezze stelle (Location, Menu, Servizio, Prezzo), foto, note personali. Nessun account, nessun server: tutto resta salvato nel browser, con lo stesso spirito del progetto "World Travel Bucket List" (che usa `localStorage`; qui usiamo IndexedDB per poter salvare anche le foto — vedi sotto).

## File del progetto

```
4Ristoranti/
├── index.html              ← rimanda automaticamente a index_ristoranti.html
│                              (serve solo perché GitHub Pages cerca "index.html")
├── index_ristoranti.html   ← la pagina principale: lista, ricerca, dettaglio
├── ristoranti.html         ← form per aggiungere o modificare un ristorante
└── icons/                   ← icona dell'app
```

Solo HTML + Tailwind (CDN) + JavaScript puro, nessuna build, nessuna dipendenza da installare.

## Come funziona (dati salvati con IndexedDB)

Tutti i dati — testi **e foto** — restano salvati nel database del browser (**IndexedDB**), non su un server. Abbiamo scelto IndexedDB invece del semplice `localStorage` (quello usato per i viaggi) perché le foto pesano molto di più dei testi: `localStorage` ha un tetto di circa 5MB, mentre IndexedDB può arrivare a centinaia di MB, il che vi permette di aggiungere diverse foto per ristorante senza pensieri. Le foto vengono comunque compresse automaticamente nel browser prima di essere salvate.

**Cosa significa "salvato nel browser"**: i dati restano legati a quel dispositivo/browser specifico. Se aggiungi un ristorante dal telefono e poi apri l'app sul computer, quel ristorante non ci sarà — sono due "cassetti" separati. Per questo motivo l'app ha due pulsanti in alto a destra:

- **⬇️ Esporta**: scarica un file `.json` con tutti i ristoranti (foto incluse).
- **⬆️ Importa**: carica un file `.json` esportato in precedenza, unendo i ristoranti a quelli già presenti (senza duplicarli, riconoscendoli per id).

Così potete tenere aggiornati due dispositivi: chi aggiunge un ristorante esporta il backup e lo manda all'altro/a, che lo importa. Non è automatico come un vero database condiviso, ma è zero-configurazione e senza account di nessun tipo.

> ⚠️ Svuotare la cache del browser, disinstallarlo o passare alla "navigazione in incognito" cancella i dati di IndexedDB. Fate un'esportazione ogni tanto come backup di sicurezza.

## Come funziona l'app

- **`index_ristoranti.html`**: card con foto di copertina, nome, data, voto medio a stelle. Ricerca per nome, ordina per data o voto. Click su una card → dettaglio con galleria foto, i 4 voti singoli, note, pulsanti Modifica/Elimina.
- **`ristoranti.html`**: stessa pagina serve sia per **aggiungere** (link dal pulsante "+") sia per **modificare** (link "Modifica" dal dettaglio, che passa `?id=...` nell'URL). Le 4 categorie si votano toccando/cliccando sulla barra di stelle (metà stella = tocco sulla metà sinistra); la media si calcola in automatico. Potete selezionare più foto insieme.

## Testare in locale su VS Code

Aprendo `index_ristoranti.html` col doppio click (`file://`) l'app funziona quasi del tutto, ma alcuni browser limitano IndexedDB su `file://`. Meglio usare un mini server locale:

**Opzione A — estensione "Live Server" (consigliata)**
1. In VS Code installa l'estensione **Live Server** (di Ritwick Dey).
2. Apri la cartella `4Ristoranti` in VS Code.
3. Tasto destro su `index_ristoranti.html` → **Open with Live Server**.

**Opzione B — con Node.js**
```bash
cd 4Ristoranti
npx serve .
```
poi apri l'indirizzo stampato in console.

## Pubblicare su GitHub Pages

```bash
cd 4Ristoranti
git add .
git commit -m "4 Ristoranti: versione locale con IndexedDB"
```

Poi crea un repository vuoto su GitHub e collega:
```bash
git remote add origin https://github.com/<tuo-utente>/4Ristoranti.git
git branch -M main
git push -u origin main
```

Infine, come per il progetto dei viaggi: **Settings → Pages → Source: Deploy from a branch → main → / (root) → Save**. Dopo 1-2 minuti l'app sarà su `https://<tuo-utente>.github.io/4Ristoranti/`.

Ricordate: ogni persona che apre quel link dal proprio browser ha il **suo** elenco locale (vedi sopra, sezione Export/Import) — il link pubblico su GitHub Pages non rende i dati condivisi in automatico, li rende solo raggiungibili dall'app stessa.
