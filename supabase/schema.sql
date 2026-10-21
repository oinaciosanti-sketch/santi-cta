-- Execute no SQL Editor do Supabase. Crie usuários manualmente em Authentication > Users.
-- Sem login por cargo: todos os usuários autenticados têm o mesmo nível neste MVP.
create table if not exists public.orders (
 id text primary key,
 customer_name text not null,
 phone text not null,
 plate text not null,
 vehicle text not null,
 year text default '',
 service text default '',
 description text default '',
 stage text not null default 'Agendado',
 scheduled_date date,
 scheduled_time text default '',
 mechanic text default '',
 price numeric(12,2) not null default 0,
 estimated_hours numeric(9,2),
 worked_hours numeric(9,2),
 direct_cost numeric(12,2),
 promised_at timestamptz,
 rework boolean not null default false,
 paid boolean not null default false,
 notes text default '',
 diagnosis text default '',
 parts text default '',
 photos jsonb not null default '[]'::jsonb,
 history jsonb not null default '[]'::jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists orders_stage_idx on public.orders(stage);
create index if not exists orders_date_idx on public.orders(scheduled_date);
create index if not exists orders_plate_idx on public.orders(plate);
alter table public.orders enable row level security;
revoke all on public.orders from anon;
grant select,insert,update,delete on public.orders to authenticated;
drop policy if exists "orders_authenticated_select" on public.orders;
drop policy if exists "orders_authenticated_insert" on public.orders;
drop policy if exists "orders_authenticated_update" on public.orders;
drop policy if exists "orders_authenticated_delete" on public.orders;
create policy "orders_authenticated_select" on public.orders for select to authenticated using (true);
create policy "orders_authenticated_insert" on public.orders for insert to authenticated with check (true);
create policy "orders_authenticated_update" on public.orders for update to authenticated using (true) with check (true);
create policy "orders_authenticated_delete" on public.orders for delete to authenticated using (true);
-- NÃO crie políticas públicas/anon para dados de clientes.
-- Imagens do modo demo são locais. Produção: usar Supabase Storage PRIVADO e signed URLs,
-- com limites de tamanho e permissão por usuário; não salvar fotos base64 no banco.
