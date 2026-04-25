-- =====================================================
-- Health Research Agent v2 — Supabase Schema
-- Run this in your Supabase SQL Editor
-- =====================================================

-- Enable UUID extension (usually already enabled)
create extension if not exists "uuid-ossp";

-- =====================================================
-- USER PROFILES TABLE
-- Stores per-user app settings and patient profiles
-- =====================================================
create table if not exists user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  patient_profiles jsonb default '[]'::jsonb,  -- array of PatientProfile objects
  settings jsonb default '{}'::jsonb,           -- language, model preferences
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Auto-create user_profile row on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.user_profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- =====================================================
-- DOCUMENTS TABLE
-- =====================================================
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  session_id text,                              -- fallback for anonymous use
  profile_id integer not null,
  profile_name text,
  file_name text not null,
  file_path text not null,
  file_url text not null,
  file_type text not null check (file_type in ('image', 'pdf')),
  category text not null default 'other' check (category in ('report', 'prescription', 'other')),
  report_date date,
  ai_summary text,
  ai_values jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_docs_user on documents(user_id);
create index if not exists idx_docs_session on documents(session_id);
create index if not exists idx_docs_profile on documents(profile_id);
create index if not exists idx_docs_category on documents(category);
create index if not exists idx_docs_date on documents(report_date);

-- =====================================================
-- REPORT ANALYSES TABLE
-- =====================================================
create table if not exists report_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  session_id text,
  profile_id integer not null,
  analysis_text text,
  document_ids uuid[],
  created_at timestamptz default now()
);

create index if not exists idx_analyses_user on report_analyses(user_id, profile_id);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
alter table user_profiles enable row level security;
alter table documents enable row level security;
alter table report_analyses enable row level security;

-- user_profiles: users can only see/edit their own
create policy "Users own their profile"
  on user_profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- documents: users can only see/edit their own; allow session fallback for anon
create policy "Users own their documents"
  on documents for all
  using (
    (auth.uid() is not null and auth.uid() = user_id)
    or
    (auth.uid() is null and session_id is not null)
  )
  with check (
    (auth.uid() is not null and auth.uid() = user_id)
    or
    (auth.uid() is null and session_id is not null)
  );

-- report_analyses: same pattern
create policy "Users own their analyses"
  on report_analyses for all
  using (
    (auth.uid() is not null and auth.uid() = user_id)
    or
    (auth.uid() is null and session_id is not null)
  )
  with check (
    (auth.uid() is not null and auth.uid() = user_id)
    or
    (auth.uid() is null and session_id is not null)
  );

-- =====================================================
-- STORAGE BUCKET
-- Run these separately or create manually in Supabase UI:
-- 1. Go to Storage → New bucket
-- 2. Name: health-documents
-- 3. Public: YES
-- 4. Max file size: 10MB
-- 5. Allowed types: image/jpeg, image/png, image/webp, application/pdf
-- =====================================================

-- Storage RLS (if not using public bucket):
-- create policy "Users can upload their own files"
--   on storage.objects for insert
--   with check (bucket_id = 'health-documents' and auth.uid()::text = (storage.foldername(name))[1]);

-- create policy "Anyone can read public files"
--   on storage.objects for select
--   using (bucket_id = 'health-documents');
