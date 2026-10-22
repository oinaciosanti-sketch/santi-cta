-- SANTI CTA V7 PILOTO. Execute DEPOIS de schema.sql, migration_v3_customers.sql,
-- migration_v4_indicadores.sql e migration_v6_acessos.sql (se ainda não executados).
-- Versão piloto: somente contas do proprietário e Alcides explicitamente liberadas.
-- Nunca coloque senhas no SQL ou no GitHub.

alter table public.staff_profiles add column if not exists pilot_access boolean not null default false;
-- Desabilita perfis legados com o cargo descontinuado.
update public.staff_profiles set active=false, pilot_access=false where role='consultor';
-- Só quatro cargos para novos registros. Retém check antigo? substitui.
alter table public.staff_profiles drop constraint if exists staff_profiles_role_check;
alter table public.staff_profiles add constraint staff_profiles_role_check
  check (role in ('proprietario','lider','tecnico','administrativo'));

create or replace function public.santi_has_role(allowed text[])
returns boolean language sql stable security definer set search_path=public as $$
  select exists (
    select 1 from public.staff_profiles p
    where p.user_id=auth.uid() and p.active=true and p.pilot_access=true
      and p.role=any(allowed)
  );
$$;
revoke all on function public.santi_has_role(text[]) from public;
grant execute on function public.santi_has_role(text[]) to authenticated;

-- Piloto: acesso ao banco operacional EXCLUSIVAMENTE ao proprietário liberado.
-- Nenhum usuário técnico/administrativo é ativado nesta fase.
drop policy if exists orders_staff_select on public.orders;
drop policy if exists orders_staff_insert on public.orders;
drop policy if exists orders_staff_update on public.orders;
drop policy if exists orders_staff_delete on public.orders;
create policy orders_pilot_select on public.orders for select to authenticated
  using (public.santi_has_role(array['proprietario']));
create policy orders_pilot_insert on public.orders for insert to authenticated
  with check (public.santi_has_role(array['proprietario']));
create policy orders_pilot_update on public.orders for update to authenticated
  using (public.santi_has_role(array['proprietario']))
  with check (public.santi_has_role(array['proprietario']));
create policy orders_pilot_delete on public.orders for delete to authenticated
  using (public.santi_has_role(array['proprietario']));

-- Evita que políticas anteriores permaneçam mais permissivas.
drop policy if exists orders_authenticated_select on public.orders;
drop policy if exists orders_authenticated_insert on public.orders;
drop policy if exists orders_authenticated_update on public.orders;
drop policy if exists orders_authenticated_delete on public.orders;

drop policy if exists customers_staff_select on public.customers;
drop policy if exists customers_staff_insert on public.customers;
drop policy if exists customers_staff_update on public.customers;
drop policy if exists customers_staff_delete on public.customers;
create policy customers_pilot_select on public.customers for select to authenticated
 using (public.santi_has_role(array['proprietario']));
create policy customers_pilot_insert on public.customers for insert to authenticated
 with check (public.santi_has_role(array['proprietario']));
create policy customers_pilot_update on public.customers for update to authenticated
 using (public.santi_has_role(array['proprietario']))
 with check (public.santi_has_role(array['proprietario']));
create policy customers_pilot_delete on public.customers for delete to authenticated
 using (public.santi_has_role(array['proprietario']));

drop policy if exists customers_auth_select on public.customers;
drop policy if exists customers_auth_insert on public.customers;
drop policy if exists customers_auth_update on public.customers;
drop policy if exists customers_auth_delete on public.customers;

create table if not exists public.staff_requests (
 id uuid primary key default gen_random_uuid(),
 full_name text not null,
 username text not null,
 role text not null check (role in ('lider','tecnico','administrativo')),
 status text not null default 'pendente' check (status in ('pendente','aprovado','rejeitado')),
 created_at timestamptz not null default now(),
 reviewed_at timestamptz,
 requested_by uuid references auth.users(id)
);
create unique index if not exists staff_requests_username_idx on public.staff_requests(lower(username));
alter table public.staff_requests enable row level security;
revoke all on public.staff_requests from anon;
grant select,insert,update on public.staff_requests to authenticated;
drop policy if exists staff_requests_pilot_select on public.staff_requests;
drop policy if exists staff_requests_pilot_insert on public.staff_requests;
drop policy if exists staff_requests_pilot_update on public.staff_requests;
create policy staff_requests_pilot_select on public.staff_requests for select to authenticated
 using (public.santi_has_role(array['proprietario']));
create policy staff_requests_pilot_insert on public.staff_requests for insert to authenticated
 with check (public.santi_has_role(array['proprietario']) and status='pendente');
create policy staff_requests_pilot_update on public.staff_requests for update to authenticated
 using (public.santi_has_role(array['proprietario']))
 with check (public.santi_has_role(array['proprietario']));

-- Configure os dois perfis SOMENTE depois de criar as contas Auth:
-- Exemplo (troque e-mails pelos usados no Auth; deixe ambos com perfil de proprietário
-- para revisar todas as funcionalidades durante o piloto):
-- insert into public.staff_profiles (user_id,full_name,role,active,pilot_access)
-- select id,'Inácio','proprietario',true,true from auth.users where email='inacio@santicta.test'
-- on conflict(user_id) do update set full_name=excluded.full_name, role=excluded.role,
-- active=true,pilot_access=true;
-- insert into public.staff_profiles (user_id,full_name,role,active,pilot_access)
-- select id,'Alcides','proprietario',true,true from auth.users where email='alcides@santicta.test'
-- on conflict(user_id) do update set full_name=excluded.full_name, role=excluded.role,
-- active=true,pilot_access=true;
