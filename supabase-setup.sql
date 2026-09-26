-- ============================================================================
-- 4 Ristoranti — Setup database Supabase
-- ============================================================================
-- Istruzioni: apri il tuo progetto su https://supabase.com -> SQL Editor ->
-- New query -> incolla TUTTO questo file -> Run.
-- Puoi eseguirlo più volte senza problemi (usa IF NOT EXISTS / DROP POLICY IF EXISTS).
-- ============================================================================

-- 1) Tabella principale dei ristoranti -------------------------------------
create table if not exists public.ristoranti (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  data_visita date,
  descrizione text default '',
  voto_location numeric(2,1) not null default 0 check (voto_location >= 0 and voto_location <= 5),
  voto_menu numeric(2,1) not null default 0 check (voto_menu >= 0 and voto_menu <= 5),
  voto_servizio numeric(2,1) not null default 0 check (voto_servizio >= 0 and voto_servizio <= 5),
  voto_prezzo numeric(2,1) not null default 0 check (voto_prezzo >= 0 and voto_prezzo <= 5),
  note text default '',
  foto_urls text[] not null default '{}',
  autore text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- media calcolata automaticamente come colonna generata (sempre coerente,
-- niente rischio di disallineamento tra i 4 voti e la media salvata)
alter table public.ristoranti
  drop column if exists voto_medio;
alter table public.ristoranti
  add column voto_medio numeric(3,2) generated always as (
    round(((voto_location + voto_menu + voto_servizio + voto_prezzo) / 4.0)::numeric, 2)
  ) stored;

-- indice utile per l'ordinamento per data/voto
create index if not exists ristoranti_data_visita_idx on public.ristoranti (data_visita desc);
create index if not exists ristoranti_voto_medio_idx on public.ristoranti (voto_medio desc);

-- trigger per aggiornare updated_at ad ogni modifica
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_ristoranti_updated_at on public.ristoranti;
create trigger trg_ristoranti_updated_at
  before update on public.ristoranti
  for each row execute function public.set_updated_at();

-- 2) Row Level Security ------------------------------------------------------
-- Solo utenti autenticati (i 2 account che creerai in Authentication > Users)
-- possono leggere/scrivere. Nessun accesso anonimo, nessuna registrazione
-- pubblica necessaria: sarà "vostro" davvero.
alter table public.ristoranti enable row level security;

drop policy if exists "authenticated can select" on public.ristoranti;
create policy "authenticated can select"
  on public.ristoranti for select
  to authenticated
  using (true);

drop policy if exists "authenticated can insert" on public.ristoranti;
create policy "authenticated can insert"
  on public.ristoranti for insert
  to authenticated
  with check (true);

drop policy if exists "authenticated can update" on public.ristoranti;
create policy "authenticated can update"
  on public.ristoranti for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "authenticated can delete" on public.ristoranti;
create policy "authenticated can delete"
  on public.ristoranti for delete
  to authenticated
  using (true);

-- 3) Storage: bucket per le foto ---------------------------------------------
insert into storage.buckets (id, name, public)
values ('foto-ristoranti', 'foto-ristoranti', true)
on conflict (id) do nothing;

-- lettura pubblica delle foto (serve per mostrarle nell'app senza login extra
-- sulle singole immagini); upload/cancellazione solo per utenti autenticati.
drop policy if exists "public read foto-ristoranti" on storage.objects;
create policy "public read foto-ristoranti"
  on storage.objects for select
  to public
  using (bucket_id = 'foto-ristoranti');

drop policy if exists "authenticated upload foto-ristoranti" on storage.objects;
create policy "authenticated upload foto-ristoranti"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'foto-ristoranti');

drop policy if exists "authenticated delete foto-ristoranti" on storage.objects;
create policy "authenticated delete foto-ristoranti"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'foto-ristoranti');

-- ============================================================================
-- Fatto! Ora vai su Authentication > Providers e assicurati che "Email" sia
-- abilitato, poi su Authentication > Settings disabilita "Allow new users to
-- sign up" (così solo voi due potrete accedere), infine crea i 2 account in
-- Authentication > Users > Add user (vedi README.md per i dettagli).
-- ============================================================================
