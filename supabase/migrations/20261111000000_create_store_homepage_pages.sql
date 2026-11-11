-- Visual Website Builder: isolated page schema storage with public published-only reads.
create table if not exists public.store_homepage_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null default 'Homepage',
  status text not null default 'draft' check (status in ('draft','published')),
  page_schema jsonb not null default '{"version":1,"blocks":[]}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);
alter table public.store_homepage_pages enable row level security;
drop policy if exists store_homepage_pages_public_read on public.store_homepage_pages;
create policy store_homepage_pages_public_read on public.store_homepage_pages
  for select to anon, authenticated using (status = 'published');
drop policy if exists store_homepage_pages_admin_manage on public.store_homepage_pages;
create policy store_homepage_pages_admin_manage on public.store_homepage_pages
  for all to authenticated using (public.is_store_admin()) with check (public.is_store_admin());
grant select on public.store_homepage_pages to anon, authenticated;
grant insert, update, delete on public.store_homepage_pages to authenticated;
