-- SANTI CTA V6 — permissões no banco; executar após migrações V3 e V4.
-- PRIMEIRO crie os usuários em Authentication > Users; DEPOIS rode este SQL.
-- Por segurança, todos começam sem perfil: atribua o proprietário no comando no fim.
create table if not exists public.staff_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('proprietario','consultor','tecnico','lider','administrativo')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.staff_profiles enable row level security;
revoke all on public.staff_profiles from anon;
grant select on public.staff_profiles to authenticated;
-- Atribuições e alterações de cargos apenas pelo SQL Editor (admin), não pelo navegador.
revoke insert, update, delete on public.staff_profiles from authenticated;
drop policy if exists staff_profiles_select_self on public.staff_profiles;
create policy staff_profiles_select_self on public.staff_profiles for select to authenticated using (user_id=auth.uid());

create or replace function public.santi_has_role(allowed text[])
returns boolean language sql stable security definer set search_path=public as $$
 select exists (select 1 from public.staff_profiles p where p.user_id=auth.uid() and p.active=true and p.role=any(allowed));
$$;
revoke all on function public.santi_has_role(text[]) from public;
grant execute on function public.santi_has_role(text[]) to authenticated;

-- Remover as permissões amplas do MVP (se existirem).
drop policy if exists orders_authenticated_select on public.orders;
drop policy if exists orders_authenticated_insert on public.orders;
drop policy if exists orders_authenticated_update on public.orders;
drop policy if exists orders_authenticated_delete on public.orders;
drop policy if exists orders_staff_select on public.orders;
drop policy if exists orders_staff_insert on public.orders;
drop policy if exists orders_staff_update on public.orders;
drop policy if exists orders_staff_delete on public.orders;
create policy orders_staff_select on public.orders for select to authenticated
  using (public.santi_has_role(array['proprietario','consultor','tecnico','lider','administrativo']));
create policy orders_staff_insert on public.orders for insert to authenticated
  with check (public.santi_has_role(array['proprietario','consultor','lider']));
create policy orders_staff_update on public.orders for update to authenticated
  using (public.santi_has_role(array['proprietario','consultor','tecnico','lider','administrativo']))
  with check (public.santi_has_role(array['proprietario','consultor','tecnico','lider','administrativo']));
create policy orders_staff_delete on public.orders for delete to authenticated
  using (public.santi_has_role(array['proprietario']));
-- IMPORTANTE: o MVP ainda usa uma tabela única de OS. UPDATE acima protege por cargo,
-- mas NÃO restringe quais colunas podem ser alteradas. Não usar em produção como
-- autorização fina para pagamento, preço ou histórico sem implementar RPCs dedicadas.

-- Clientes têm dados de contato. Mecânicos não precisam acessar a base inteira.
drop policy if exists customers_auth_select on public.customers;
drop policy if exists customers_auth_insert on public.customers;
drop policy if exists customers_auth_update on public.customers;
drop policy if exists customers_auth_delete on public.customers;
drop policy if exists customers_staff_select on public.customers;
drop policy if exists customers_staff_insert on public.customers;
drop policy if exists customers_staff_update on public.customers;
drop policy if exists customers_staff_delete on public.customers;
create policy customers_staff_select on public.customers for select to authenticated
 using (public.santi_has_role(array['proprietario','consultor','lider','administrativo']));
create policy customers_staff_insert on public.customers for insert to authenticated
 with check (public.santi_has_role(array['proprietario','consultor','administrativo']));
create policy customers_staff_update on public.customers for update to authenticated
 using (public.santi_has_role(array['proprietario','consultor','administrativo']))
 with check (public.santi_has_role(array['proprietario','consultor','administrativo']));
create policy customers_staff_delete on public.customers for delete to authenticated
 using (public.santi_has_role(array['proprietario']));

-- EXECUTE SEPARADAMENTE no SQL Editor, trocando pelos dados reais:
-- insert into public.staff_profiles(user_id,full_name,role)
-- values ('UUID-DO-USUARIO-EM-AUTHENTICATION','Nome do proprietário','proprietario')
-- on conflict (user_id) do update set full_name=excluded.full_name, role=excluded.role, active=true;
