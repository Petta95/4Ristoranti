// ============================================================================
// Configurazione Supabase
// ============================================================================
// Sostituisci i due valori qui sotto con quelli del TUO progetto Supabase:
// Dashboard -> Project Settings (icona ingranaggio) -> API
//   - "Project URL"        -> SUPABASE_URL
//   - "anon public" key    -> SUPABASE_ANON_KEY
//
// Nota: la "anon key" è pensata per stare nel codice pubblico (è protetta
// dalle policy di Row Level Security che abbiamo impostato in
// supabase-setup.sql, NON dal fatto che sia segreta). Non usare mai qui la
// "service_role key": quella sì è segreta e non deve mai finire nel browser.
// ============================================================================

const SUPABASE_URL = 'https://TUO-PROGETTO.supabase.co';
const SUPABASE_ANON_KEY = 'INCOLLA_QUI_LA_TUA_ANON_KEY';

// Client Supabase condiviso da tutto il resto dell'app (auth.js, db.js, app.js)
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

const FOTO_BUCKET = 'foto-ristoranti';
