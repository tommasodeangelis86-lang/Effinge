begin;

create table public.effinge_autori (
  utente uuid primary key references auth.users(id) on delete cascade
);

create table public.effinge_archivi (
  utente uuid primary key references auth.users(id) on delete cascade,
  versione integer not null default 1 check (versione > 0),
  dati jsonb not null check (
    jsonb_typeof(dati) = 'object'
    and dati ? 'opere' and jsonb_typeof(dati->'opere') = 'array'
    and dati ? 'sezioni' and jsonb_typeof(dati->'sezioni') = 'array'
  )
);

alter table public.effinge_autori enable row level security;
alter table public.effinge_archivi enable row level security;

revoke all on public.effinge_autori, public.effinge_archivi from public, anon, authenticated;
grant select on public.effinge_autori to authenticated;
grant select, insert on public.effinge_archivi to authenticated;
grant update (dati, versione) on public.effinge_archivi to authenticated;

create policy "Accesso autore abilitato"
  on public.effinge_autori for select to authenticated
  using (utente = (select auth.uid()));

create policy "Legge il suo archivio"
  on public.effinge_archivi for select to authenticated
  using (utente = (select auth.uid()) and exists (
    select 1 from public.effinge_autori where utente = (select auth.uid())
  ));

create policy "Crea il suo archivio"
  on public.effinge_archivi for insert to authenticated
  with check (utente = (select auth.uid()) and exists (
    select 1 from public.effinge_autori where utente = (select auth.uid())
  ));

create policy "Aggiorna il suo archivio"
  on public.effinge_archivi for update to authenticated
  using (utente = (select auth.uid()) and exists (
    select 1 from public.effinge_autori where utente = (select auth.uid())
  ))
  with check (utente = (select auth.uid()));

commit;
