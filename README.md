# 4 Ristoranti 🍽️

La vostra classifica privata dei ristoranti provati insieme, ispirata al programma TV: 4 categorie di voto con mezze stelle (Location, Menu, Servizio, Prezzo), foto, note personali — sincronizzata automaticamente tra i vostri dispositivi, senza creare nessun account nuovo.

## Come funziona la sincronizzazione (senza account nuovi)

I ristoranti vengono salvati come file **nel vostro stesso repository GitHub** — quello che già usate per ospitare l'app — tramite l'API di GitHub, autenticata con un **Personal Access Token** che generate dal vostro account GitHub esistente (Settings → Developer settings). Non serve creare nessun account su nessun servizio esterno.

Concretamente, l'app scrive/legge:
- `data/ristoranti.json` → tutti i ristoranti (testi e voti)
- `data/photos/*.jpg` → le foto, compresse automaticamente nel browser prima del caricamento

Ogni volta che aggiungi, modifichi o elimini un ristorante, l'app fa un piccolo commit su quel repository. Aprendo l'app da un altro dispositivo (o premendo **🔄 Aggiorna**), i dati vengono riletti da lì: è così che restano sincronizzati tra voi due.

> Avete scelto un repository **pubblico**: chiunque conosca il link può vedere ristoranti, voti, note e foto (in sola lettura — non può modificarli senza il vostro token). Se in futuro preferite più riservatezza, potete rendere il repository privato dalle impostazioni GitHub in qualsiasi momento.

## File del progetto

```
4Ristoranti/
├── index.html              ← rimanda automaticamente a index_ristoranti.html
├── index_ristoranti.html   ← pagina principale: lista, ricerca, dettaglio, Impostazioni
├── ristoranti.html         ← form per aggiungere o modificare un ristorante
├── js/
│   └── sync.js              ← tutta la logica di lettura/scrittura su GitHub
└── icons/                   ← icona dell'app
```

Solo HTML + Tailwind (CDN) + JavaScript puro, nessuna build, nessuna dipendenza da installare.

## Configurazione — un'unica volta

### 1. Crea il Personal Access Token
1. Su GitHub: foto profilo (in alto a destra) → **Settings**
2. In fondo al menu a sinistra → **Developer settings**
3. **Personal access tokens → Fine-grained tokens → Generate new token**
4. Dagli un nome (es. "4 Ristoranti app")
5. **Repository access → Only select repositories** → scegli il repository di quest'app
6. **Permissions → Repository permissions → Contents: Read and write** (è l'unico permesso che serve)
7. **Generate token** e copialo subito: si vede una volta sola

### 2. Collega l'app
Apri `index_ristoranti.html`, premi **⚙️ Configura ora** (o l'icona ingranaggio in alto) e inserisci:
- **Utente/organizzazione GitHub** (es. `Petta95`)
- **Nome del repository** (es. `4Ristoranti`)
- **Branch** (di solito `main`)
- **Token** appena creato

Premi **Salva e connetti**: fatto, ora sei sincronizzato. Ripeti questo secondo passaggio (solo questo, il token si genera una volta a testa) anche sull'altro dispositivo/account.

> Il token resta solo nel `localStorage` del browser che lo inserisce — non finisce mai nel codice pubblicato su GitHub. Trattatelo come una password: chiunque lo ottenga può scrivere su quel repository. Se doveste mai sospettare che sia trapelato, revocatelo da GitHub (Developer settings → Personal access tokens) e createne uno nuovo.

## Come funziona l'app

- **`index_ristoranti.html`**: card con foto di copertina, nome, data, voto medio a stelle. Ricerca per nome, ordina per data o voto. Click su una card → dettaglio con galleria foto, i 4 voti singoli, note, pulsanti Modifica/Elimina. In alto: **⬇️ Esporta** (backup JSON di sicurezza), **🔄 Aggiorna** (rilegge i dati da GitHub — utile se l'altra persona ha appena aggiunto qualcosa), **⚙️ Impostazioni**.
- **`ristoranti.html`**: stessa pagina serve sia per **aggiungere** (link dal pulsante "+") sia per **modificare** (link "Modifica" dal dettaglio, che passa `?id=...` nell'URL). Le 4 categorie si votano toccando/cliccando sulla barra di stelle (metà stella = tocco sulla metà sinistra); la media si calcola in automatico.

## Testare in locale su VS Code

**Opzione A — estensione "Live Server" (consigliata)**
1. In VS Code installa l'estensione **Live Server** (di Ritwick Dey).
2. Apri la cartella `4Ristoranti` in VS Code.
3. Tasto destro su `index_ristoranti.html` → **Open with Live Server**.

**Opzione B — con Node.js**
```bash
cd 4Ristoranti
npx serve .
```

Il primo avvio ti chiederà comunque di configurare la sincronizzazione (serve una connessione internet: i dati sono su GitHub, non più in locale).

## Pubblicare su GitHub Pages

```bash
cd 4Ristoranti
git add .
git commit -m "4 Ristoranti: sincronizzazione via GitHub"
git remote add origin https://github.com/<tuo-utente>/4Ristoranti.git
git branch -M main
git push -u origin main
```

Poi: **Settings → Pages → Source: Deploy from a branch → main → / (root) → Save**. Dopo 1-2 minuti l'app sarà su `https://<tuo-utente>.github.io/4Ristoranti/`.

## Limiti da sapere

- **Serve sempre una connessione internet**: senza rete l'app non può leggere né scrivere su GitHub.
- **Niente merge automatico in caso di modifiche simultanee**: se voi due salvate qualcosa nello stesso istante, chi arriva secondo riceve un errore ("qualcuno ha modificato i dati nel frattempo") e deve solo ricaricare e riprovare — capita raramente con un uso normale.
- **Le foto eliminate insieme a un ristorante restano nel repository** (in `data/photos/`) per semplicità: non occupano molto spazio e potete cancellarle a mano se volete fare pulizia.
- **Rate limit GitHub**: 5000 richieste/ora col token — enormemente più di quanto un uso normale in due persone possa mai raggiungere.
