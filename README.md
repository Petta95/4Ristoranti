# 4 Ristoranti 🍽️

La vostra classifica privata dei ristoranti provati insieme, ispirata al programma TV: 4 categorie di voto (Location, Menu, Servizio, Prezzo), foto, note personali, tutto condiviso in tempo reale tra due account.

**Stack**: HTML + Tailwind (CDN) + JavaScript puro (nessun framework, nessun build step) + [Supabase](https://supabase.com) (database Postgres + Storage foto + autenticazione), ospitata gratis su GitHub Pages.

---

## 1. Struttura del progetto

```
4Ristoranti/
├── index.html              ← pagina unica (login, dashboard, form, dettaglio)
├── manifest.json            ← manifest PWA (installabile su telefono/desktop)
├── service-worker.js        ← cache offline dell'app shell
├── supabase-setup.sql       ← script SQL da incollare nel dashboard Supabase
├── css/
│   └── style.css            ← tema scuro bordeaux/oro, componenti, responsive
├── js/
│   ├── supabase-config.js   ← URL + chiave del TUO progetto Supabase (da compilare)
│   ├── auth.js              ← login/logout
│   ├── db.js                ← CRUD ristoranti + upload/compressione foto
│   └── app.js                ← interfaccia: card, form, dettaglio, stelle, filtri
├── icons/
│   ├── icon-192.png
│   ├── icon-512.png
│   └── apple-touch-icon.png
└── README.md                 ← questa guida
```

Non serve `npm install`, non serve un bundler: è tutto codice che il browser esegue direttamente.

---

## 2. Configurare il database gratuito (Supabase)

### 2.1 Crea il progetto
1. Vai su **[supabase.com](https://supabase.com)** → **Start your project** → accedi con GitHub.
2. **New project**: scegli un nome (es. `4-ristoranti`), una password per il database (salvala da qualche parte, non serve per l'app ma è utile) e una regione vicina a voi (es. `eu-central-1`).
3. Attendi 1-2 minuti che il progetto venga creato.

### 2.2 Crea le tabelle, la sicurezza e lo storage foto
1. Nel menu a sinistra apri **SQL Editor** → **New query**.
2. Apri il file `supabase-setup.sql` di questo progetto, copia **tutto** il contenuto e incollalo nell'editor.
3. Premi **Run** (in basso a destra). Deve terminare con "Success. No rows returned".

Questo script crea:
- la tabella `ristoranti` con i 4 voti, la media calcolata automaticamente, note, foto, autore;
- le regole di sicurezza (**Row Level Security**) che permettono di leggere/scrivere **solo a chi ha fatto login** — nessun accesso anonimo;
- il bucket di Storage `foto-ristoranti` per le immagini, con lettura pubblica delle foto (per mostrarle nell'app) ma upload/cancellazione riservati a voi due.

### 2.3 Crea i vostri 2 account
1. Nel menu a sinistra vai su **Authentication** → **Users**.
2. Clicca **Add user** → **Create new user**.
3. Inserisci la tua email e una password, spunta **Auto Confirm User** (così non serve confermare via email), **Create user**.
4. Ripeti per l'account della tua ragazza.

### 2.4 Disabilita le registrazioni pubbliche
1. Vai su **Authentication** → **Sign In / Providers** (o **Settings** a seconda della versione dell'interfaccia).
2. Cerca l'opzione **"Allow new users to sign up"** (in "User Signups") e **disattivala**.

Così l'app resta riservata a voi due: nessun altro potrà mai crearsi un account, anche conoscendo il link del sito.

### 2.5 Recupera URL e chiave pubblica
1. Vai su **Project Settings** (icona ingranaggio in basso a sinistra) → **API**.
2. Copia:
   - **Project URL** (es. `https://abcdefgh.supabase.co`)
   - **anon public** key (una stringa lunga che inizia con `eyJ...`)
3. Apri `js/supabase-config.js` in VS Code e incolla i due valori al posto dei placeholder:

```js
const SUPABASE_URL = 'https://abcdefgh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJ....................';
```

> La "anon key" è fatta apposta per stare nel codice pubblico: è protetta dalle regole RLS che avete appena creato, non dal fatto di essere segreta. **Non** usate mai qui la "service_role key" (quella sì è segreta).

---

## 3. Testare l'app in locale su VS Code

I file usano `fetch()` verso Supabase, che nei browser moderni può avere limitazioni se apri `index.html` direttamente col doppio click (protocollo `file://`). Meglio usare un mini server locale, in uno di questi due modi:

**Opzione A — estensione "Live Server" (consigliata, zero configurazione)**
1. In VS Code installa l'estensione **Live Server** (di Ritwick Dey) dal Marketplace.
2. Apri la cartella `4Ristoranti` in VS Code.
3. Tasto destro su `index.html` → **Open with Live Server**.
4. Si apre il browser su `http://127.0.0.1:5500` con l'app funzionante.

**Opzione B — con Node.js già installato**
```bash
cd 4Ristoranti
npx serve .
```
poi apri l'indirizzo che ti stampa in console (es. `http://localhost:3000`).

Al primo avvio vedrai la schermata di login: usa una delle due email/password create al punto 2.3.

---

## 4. Pubblicare su GitHub e attivare GitHub Pages

Da dentro la cartella `4Ristoranti`, nel terminale di VS Code:

```bash
git init
git add .
git commit -m "Prima versione di 4 Ristoranti"
```

Poi crea un nuovo repository vuoto su GitHub (es. `4Ristoranti`), **senza** README/gitignore (li avete già), e collega:

```bash
git remote add origin https://github.com/<tuo-utente>/4Ristoranti.git
git branch -M main
git push -u origin main
```

Infine, come per il progetto precedente, attiva **GitHub Pages**:
1. Sul repository GitHub → **Settings** → **Pages**.
2. **Source**: `Deploy from a branch` → Branch `main` → cartella `/ (root)` → **Save**.
3. Dopo 1-2 minuti l'app sarà online su `https://<tuo-utente>.github.io/4Ristoranti/`.

> Attenzione: `js/supabase-config.js` con la vostra `anon key` finirà nel repository pubblico su GitHub (a meno che il repo non sia privato). Come spiegato sopra è normale e sicuro grazie alla Row Level Security — ma se preferite maggiore riservatezza, potete rendere il repository **privato** nelle impostazioni GitHub (GitHub Pages funziona anche su repo privati con un account GitHub Pro, oppure con Pages gratuito su repo pubblico ma dati comunque protetti da RLS+login).

---

## 5. Installarla come app sul telefono

- **Android (Chrome)**: apri il link, tocca i tre puntini in alto a destra → **Aggiungi a schermata Home** (o comparirà un banner automatico "Installa app").
- **iPhone (Safari)**: apri il link, tocca il pulsante Condividi (quadrato con freccia) → **Aggiungi alla schermata Home**.
- **Desktop (Chrome/Edge)**: apri il link, clicca l'icona di installazione nella barra degli indirizzi (o menu → Installa 4 Ristoranti).

Da quel momento si apre a schermo intero come un'app vera, con la sua icona.

---

## 6. Come funziona l'app

- **Login**: solo con uno dei due account creati in Supabase. La sessione resta salvata nel browser (non serve rifare login ogni volta).
- **Dashboard**: card con foto di copertina, nome, data, voto medio a stelle. Ordina per data o voto, cerca per nome.
- **"+"** in basso a destra: apre il form per un nuovo ristorante. Le 4 categorie si votano toccando/cliccando sulla barra di stelle (metà stella = tocco sulla metà sinistra). La media si calcola e si aggiorna in automatico mentre votate.
- **Foto**: potete selezionarne più di una, vengono compresse automaticamente nel browser prima di caricarle (per non sprecare lo spazio gratuito di Supabase).
- **Card → dettaglio**: galleria foto (tap per ingrandire), voto finale in evidenza, i 4 voti singoli, note, con pulsanti Modifica/Elimina.
- Qualsiasi modifica fatta da uno dei due account è visibile subito all'altro al successivo aggiornamento della pagina (l'app non è "live" in tempo reale mentre siete entrambi con l'app aperta contemporaneamente, ma basta un refresh per vedere i dati aggiornati).

---

## 7. Piano gratuito Supabase: limiti da sapere

Il piano free è più che sufficiente per un uso personale in due:
- 500 MB di database, 1 GB di Storage foto, 5 GB di banda/mese.
- Il progetto va in pausa automaticamente dopo **7 giorni di inattività totale**: basta riaprire l'app (o il dashboard Supabase) per riattivarlo in pochi secondi.

---

## 8. Problemi comuni

| Problema | Causa probabile | Soluzione |
|---|---|---|
| "Email o password non corrette" | Account non creato o non confermato | Rifai il passo 2.3, spuntando "Auto Confirm User" |
| I ristoranti non si vedono / errore nel caricamento | RLS non configurata o SQL non eseguito | Riesegui `supabase-setup.sql` nello SQL Editor |
| Le foto non si caricano | Bucket mancante o policy Storage mancanti | Controlla in Storage che esista `foto-ristoranti`; riesegui lo script SQL |
| Pagina bianca dopo il deploy | `supabase-config.js` con i placeholder non sostituiti | Verifica di aver incollato URL e anon key veri |
| Non riesco a installarla come PWA | Stai usando `file://` invece di un server/https | Usa Live Server in locale, oppure apri il link GitHub Pages (https) |
