-- Sabbir Hosen Akash portfolio platform schema
-- Run this entire file in Supabase Dashboard -> SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  summary text,
  content text,
  image_url text,
  url text,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  summary text,
  content text,
  image_url text,
  price text,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  summary text,
  content text,
  image_url text,
  url text,
  price text,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  summary text,
  content text,
  image_url text,
  url text,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text,
  content text,
  image_url text,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  service text,
  budget text,
  message text not null,
  source text default 'portfolio',
  status text not null default 'pending' check (status in ('pending','replied','completed')),
  admin_notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  product_title text,
  service text,
  budget text,
  details text not null,
  status text not null default 'pending' check (status in ('pending','replied','completed')),
  admin_notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_activity (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users(id) on delete set null,
  action text not null,
  resource text not null,
  record_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists projects_status_created_idx on public.projects(status, created_at desc);
create index if not exists services_status_sort_idx on public.services(status, sort_order);
create index if not exists products_status_created_idx on public.products(status, created_at desc);
create index if not exists posts_status_published_idx on public.posts(status, published_at desc);
create index if not exists contact_messages_status_created_idx on public.contact_messages(status, created_at desc);
create index if not exists orders_status_created_idx on public.orders(status, created_at desc);

-- All public reads and writes go through the Cloudflare Worker.
-- Never expose the service-role key to the browser.
do $$
declare t text;
begin
  foreach t in array array['admin_users','projects','services','products','posts','testimonials','contact_messages','orders','site_settings','admin_activity']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from anon, authenticated', t);
    execute format('grant all on table public.%I to service_role', t);
  end loop;
end $$;

-- After creating your own administrator account in Supabase Auth,
-- run the following with the real account UUID and email:
-- insert into public.admin_users (id,email,active)
-- values ('YOUR-AUTH-USER-UUID','you@example.com',true)
-- on conflict (id) do update set active=true,email=excluded.email;
