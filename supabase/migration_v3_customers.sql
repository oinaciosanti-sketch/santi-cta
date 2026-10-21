-- SANTI CTA V3. Execute uma vez no SQL Editor do projeto Supabase JÁ EXISTENTE.
-- Não execute novamente o schema completo e NÃO apague a tabela orders.
create table if not exists public.customers (
 id text primary key,
 name text not null,
 phone text not null,
 email text not null default '',
 notes text not null default '',
 marketing_opt_in boolean not null default false,
 created_at timestamptz not null default now()
);
create unique index if not exists customers_phone_unique_idx on public.customers(phone);
alter table public.customers enable row level security;
revoke all on public.customers from anon;
grant select,insert,update,delete on public.customers to authenticated;
drop policy if exists "customers_auth_select" on public.customers;
drop policy if exists "customers_auth_insert" on public.customers;
drop policy if exists "customers_auth_update" on public.customers;
drop policy if exists "customers_auth_delete" on public.customers;
create policy "customers_auth_select" on public.customers for select to authenticated using (true);
create policy "customers_auth_insert" on public.customers for insert to authenticated with check (true);
create policy "customers_auth_update" on public.customers for update to authenticated using (true) with check (true);
create policy "customers_auth_delete" on public.customers for delete to authenticated using (true);
