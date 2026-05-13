-- Supabase setup for the Baby Reveal site
-- Run this in Supabase SQL Editor, then set useSupabase: true in config.js.
-- Change the baby_sex value below to 'XX' or 'XY'.

create extension if not exists pgcrypto;

create table if not exists public.reveal_settings (
  key text primary key,
  value text not null,
  constraint reveal_settings_baby_sex_check
    check (key <> 'baby_sex' or value in ('XX', 'XY'))
);

insert into public.reveal_settings (key, value)
values ('baby_sex', 'XY')
on conflict (key) do update set value = excluded.value;

create table if not exists public.reveal_votes (
  id uuid primary key default gen_random_uuid(),
  guest_uid text not null unique,
  name text not null check (char_length(trim(name)) > 0),
  guess text not null check (guess in ('XX', 'XY')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.reveal_votes add column if not exists note text;

alter table public.reveal_settings enable row level security;
alter table public.reveal_votes enable row level security;

-- This setup intentionally does not grant direct browser reads on the tables.
-- Guests get the vote list only after submitting their own guess through the function below.
drop policy if exists "No public settings reads" on public.reveal_settings;
drop policy if exists "Guests can read guesses" on public.reveal_votes;

revoke all on public.reveal_settings from anon, authenticated;
revoke all on public.reveal_votes from anon, authenticated;

drop function if exists public.submit_reveal_vote(text, text, text);
drop function if exists public.submit_reveal_vote(text, text, text, text);
drop function if exists public.get_reveal_votes_after_vote(text);

create or replace function public.submit_reveal_vote(
  voter_name text,
  voter_guess text,
  voter_note text,
  guest_uid text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  cleaned_name text := nullif(trim(voter_name), '');
  cleaned_guest text := nullif(trim(guest_uid), '');
  cleaned_note text := nullif(trim(voter_note), '');
  actual text;
begin
  if cleaned_name is null then
    raise exception 'Name is required';
  end if;

  if cleaned_guest is null then
    cleaned_guest := gen_random_uuid()::text;
  end if;

  if voter_guess not in ('XX', 'XY') then
    raise exception 'Guess must be XX or XY';
  end if;

  insert into public.reveal_votes (guest_uid, name, guess, note)
  values (left(cleaned_guest, 120), left(cleaned_name, 80), voter_guess, left(coalesce(cleaned_note, ''), 500))
  on conflict (guest_uid)
  do update set
    name = excluded.name,
    guess = excluded.guess,
    note = excluded.note,
    updated_at = now();

  select value into actual
  from public.reveal_settings
  where key = 'baby_sex';

  return jsonb_build_object(
    'actual_sex', actual,
    'votes', (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'name', name,
            'guess', guess,
            'note', nullif(note, ''),
            'created_at', created_at,
            'updated_at', updated_at
          ) order by updated_at desc
        ),
        '[]'::jsonb
      )
      from public.reveal_votes
    )
  );
end;
$$;

create or replace function public.get_reveal_votes_after_vote(
  guest_uid text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  cleaned_guest text := nullif(trim(guest_uid), '');
  actual text;
begin
  if cleaned_guest is null then
    raise exception 'Vote first';
  end if;

  if not exists (
    select 1 from public.reveal_votes where guest_uid = left(cleaned_guest, 120)
  ) then
    raise exception 'Vote first';
  end if;

  select value into actual
  from public.reveal_settings
  where key = 'baby_sex';

  return jsonb_build_object(
    'actual_sex', actual,
    'votes', (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'name', name,
            'guess', guess,
            'note', nullif(note, ''),
            'created_at', created_at,
            'updated_at', updated_at
          ) order by updated_at desc
        ),
        '[]'::jsonb
      )
      from public.reveal_votes
    )
  );
end;
$$;

grant execute on function public.submit_reveal_vote(text, text, text, text) to anon, authenticated;
grant execute on function public.get_reveal_votes_after_vote(text) to anon, authenticated;
