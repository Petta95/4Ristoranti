/* ============================================================
   sync.js — lettura/scrittura condivisa dei dati su GitHub.
   Il repository stesso funge da "database": un file
   data/ristoranti.json coi testi e dei file data/photos/*.jpg
   per le foto, aggiornati tramite l'API REST di GitHub con un
   Personal Access Token generato dal vostro account GitHub già
   esistente (Impostazioni nella pagina principale). Nessun nuovo
   account, nessun server da gestire.

   Il token vive SOLO nel localStorage del browser (mai nel
   codice, mai in git) e concede scrittura sul solo repository
   che scegliete: trattatelo come una password.
   ============================================================ */

const SYNC_CONFIG_KEY = '4ristoranti:sync-config';
const DATA_PATH = 'data/ristoranti.json';
const PHOTOS_DIR = 'data/photos';
const GH_API = 'https://api.github.com';

/* Repository predefinito: basta aggiungere il token. */
const DEFAULT_SYNC_CONFIG = { owner: 'Petta95', repo: '4Ristoranti', branch: 'main', token: '' };

function getSyncConfig(){
  try{
    const raw = localStorage.getItem(SYNC_CONFIG_KEY);
    return Object.assign({}, DEFAULT_SYNC_CONFIG, raw ? JSON.parse(raw) : {});
  }catch(e){ return Object.assign({}, DEFAULT_SYNC_CONFIG); }
}

/* "Link magico": aprendo l'app con #token=... il token viene salvato
   in questo browser e subito rimosso dalla barra degli indirizzi.
   Il frammento dopo # non viene mai inviato a nessun server. */
function syncLinkFor(cfg){
  const base = location.href.split('#')[0].replace(/[^/]*$/, 'index_ristoranti.html');
  return `${base}#token=${encodeURIComponent(cfg.token)}`;
}
(function importTokenFromLink(){
  const m = location.hash.match(/(?:^#|&)token=([^&]+)/);
  if(!m) return;
  try{
    setSyncConfig(Object.assign(getSyncConfig(), { token: decodeURIComponent(m[1]) }));
  }catch(e){}
  history.replaceState(null, '', location.pathname + location.search);
})();
function setSyncConfig(cfg){
  localStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify(cfg));
}
function clearSyncConfig(){
  localStorage.removeItem(SYNC_CONFIG_KEY);
}
function isSyncConfigured(){
  const c = getSyncConfig();
  return !!(c && c.owner && c.repo && c.token && c.branch);
}

function b64EncodeUtf8(str){ return btoa(unescape(encodeURIComponent(str))); }
function b64DecodeUtf8(b64){ return decodeURIComponent(escape(atob(b64.replace(/\n/g,'')))); }
function dataUrlToBase64(dataUrl){ return dataUrl.split(',').pop(); }

function photoUrl(path){
  const cfg = getSyncConfig();
  if(!cfg || !path) return '';
  return `https://raw.githubusercontent.com/${cfg.owner}/${cfg.repo}/${cfg.branch}/${path}`;
}

async function ghError(res){
  let msg = 'Errore GitHub (' + res.status + ')';
  if(res.status === 401) msg = 'Token non valido o scaduto: controlla le Impostazioni.';
  else if(res.status === 403) msg = 'Il token non ha i permessi di scrittura su questo repository.';
  else if(res.status === 404) msg = 'Repository non trovato: controlla proprietario/nome nelle Impostazioni.';
  else if(res.status === 409) msg = 'Qualcuno ha modificato i dati nel frattempo: ricarica la pagina e riprova.';
  else {
    try{ const body = await res.json(); if(body && body.message) msg = body.message; }catch(e){}
  }
  return new Error(msg);
}

async function ghRequest(path, options){
  const cfg = getSyncConfig();
  if(!cfg) throw new Error('Sincronizzazione non configurata.');
  const res = await fetch(`${GH_API}/repos/${cfg.owner}/${cfg.repo}/contents/${path}`, {
    ...options,
    headers: {
      'Authorization': 'Bearer ' + cfg.token,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options && options.headers),
    },
    cache: 'no-store',
  });
  return res;
}

async function ghGetFile(path){
  const cfg = getSyncConfig();
  const res = await ghRequest(`${path}?ref=${encodeURIComponent(cfg.branch)}&_=${Date.now()}`);
  if(res.status === 404) return null;
  if(!res.ok) throw await ghError(res);
  const data = await res.json();
  return { raw: data, sha: data.sha };
}

async function ghGetJson(path){
  const file = await ghGetFile(path);
  if(!file) return { data: null, sha: null };
  return { data: JSON.parse(b64DecodeUtf8(file.raw.content)), sha: file.sha };
}

async function ghPutText(path, text, sha, message){
  const cfg = getSyncConfig();
  const res = await ghRequest(path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: message || `Aggiorna ${path}`,
      content: b64EncodeUtf8(text),
      branch: cfg.branch,
      ...(sha ? { sha } : {}),
    }),
  });
  if(!res.ok) throw await ghError(res);
  return res.json();
}

async function ghPutBase64(path, base64Content, message){
  const cfg = getSyncConfig();
  const res = await ghRequest(path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: message || `Aggiungi ${path}`,
      content: base64Content,
      branch: cfg.branch,
    }),
  });
  if(!res.ok) throw await ghError(res);
  return res.json();
}

/* Verifica rapida delle credenziali: legge le info base del repo. */
async function syncTestConnection(){
  const cfg = getSyncConfig();
  if(!cfg) throw new Error('Sincronizzazione non configurata.');
  const res = await fetch(`${GH_API}/repos/${cfg.owner}/${cfg.repo}`, {
    headers: {
      'Authorization': 'Bearer ' + cfg.token,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    cache: 'no-store',
  });
  if(!res.ok) throw await ghError(res);
  return res.json();
}

/* ---------------- API di alto livello usata dalle pagine ---------------- */
async function syncLoadAll(){
  const { data } = await ghGetJson(DATA_PATH);
  return data || [];
}

async function syncSaveRecord(record){
  const { data, sha } = await ghGetJson(DATA_PATH);
  const list = data || [];
  const idx = list.findIndex(r => r.id === record.id);
  if(idx >= 0) list[idx] = record; else list.push(record);
  await ghPutText(
    DATA_PATH,
    JSON.stringify(list, null, 1),
    sha,
    `${idx >= 0 ? 'Modifica' : 'Aggiungi'} ristorante: ${record.nome}`
  );
  return list;
}

async function syncDeleteRecord(id, nome){
  const { data, sha } = await ghGetJson(DATA_PATH);
  const list = (data || []).filter(r => r.id !== id);
  await ghPutText(DATA_PATH, JSON.stringify(list, null, 1), sha, `Elimina ristorante: ${nome || id}`);
  return list;
}

async function syncUploadPhoto(dataUrl){
  const id = 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  const path = `${PHOTOS_DIR}/${id}.jpg`;
  await ghPutBase64(path, dataUrlToBase64(dataUrl), `Aggiungi foto ${id}`);
  return path;
}
