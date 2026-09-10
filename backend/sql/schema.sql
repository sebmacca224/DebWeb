-- Run in Supabase SQL Editor after creating the Deborah Fowler project.
-- The public frontend reads via FastAPI; the service-role key is server-only.

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  subtitle text,
  description text not null default '',
  cover_url text not null,
  cover_alt text,
  publication_date date,
  genre text,
  isbn text,
  purchase_links jsonb not null default '[]'::jsonb,
  featured boolean not null default false,
  extract text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.author_profile (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  biography text not null default '',
  photo_url text,
  photo_alt text,
  updated_at timestamptz not null default now()
);

-- Private draft data only, if Brevo's own campaign-draft system is not used.
-- These records must never be exposed through a public website route. Brevo retains
-- subscribers, consent and unsubscribe handling; no subscriber data is stored here.
create table if not exists public.newsletter_drafts (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  preview_text text,
  content text not null,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Public files only. Uploads will be made by FastAPI with the server key.
insert into storage.buckets (id, name, public)
values ('author-assets', 'author-assets', true)
on conflict (id) do nothing;

-- Do not add a browser upload policy for this bucket. The eventual authenticated
-- FastAPI admin endpoint will perform uploads with the service-role key.
