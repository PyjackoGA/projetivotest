-- ==========================================================================
-- À coller dans Supabase → SQL Editor → New query → Run.
-- Région recommandée pour le projet : UE (Frankfurt ou Paris), pour le RGPD.
-- ==========================================================================

create extension if not exists pgcrypto;

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- identité du client, dupliquée hors du JSON pour pouvoir filtrer/trier facilement
  client_name text,
  client_email text,
  person_type text,

  -- le conseiller choisi par le client dans la liste déroulante
  advisor_email text not null,

  -- 'en_cours' (upload en cours), 'recu' (email envoyé au conseiller),
  -- 'complete' (le conseiller a rempli sa partie et généré le PDF final)
  status text not null default 'en_cours',

  -- toutes les réponses du client (le même objet `state` que le questionnaire)
  answers jsonb not null,
  -- rempli plus tard par le conseiller (Partie 8/9 du PDF officiel)
  advisor_answers jsonb,

  -- chemins dans le bucket de stockage "submissions"
  pdf_client_path text,
  pdf_final_path text
);

alter table public.submissions enable row level security;

-- Le client (non connecté) peut créer sa propre fiche, mais ne peut rien lire ni modifier.
create policy "anon peut inserer une fiche"
  on public.submissions for insert
  to anon
  with check (true);

-- Seuls les conseillers connectés (comptes créés dans Authentication → Users)
-- peuvent consulter et compléter les fiches.
create policy "les conseillers connectes peuvent tout lire"
  on public.submissions for select
  to authenticated
  using (true);

create policy "les conseillers connectes peuvent mettre a jour"
  on public.submissions for update
  to authenticated
  using (true);

-- --------------------------------------------------------------------------
-- Stockage des PDF (bucket privé — jamais accessible par une URL publique)
-- --------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('submissions', 'submissions', false)
on conflict (id) do nothing;

create policy "anon peut deposer un pdf"
  on storage.objects for insert
  to anon
  with check (bucket_id = 'submissions');

create policy "les conseillers connectes peuvent lire les pdf"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'submissions');

create policy "les conseillers connectes peuvent deposer le pdf final"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'submissions');
