-- SANTI CTA V8: formulário público de SOLICITAÇÃO, não cadastro de usuários.
-- Execute após a migração V7. Não execute schema.sql novamente.
create table if not exists public.access_requests (
 id uuid primary key default gen_random_uuid(),
 full_name text not null check (char_length(full_name) between 2 and 120),
 username text not null check (char_length(username) between 3 and 30),
 contact_email text not null check (char_length(contact_email) between 5 and 160),
 desired_role text not null check (desired_role in ('tecnico','lider','administrativo')),
 reason text not null default '' check (char_length(reason) <= 400),
 status text not null default 'pendente' check (status in ('pendente','aprovado','rejeitado')),
 created_at timestamptz not null default now(),
 reviewed_at timestamptz
);
create index if not exists access_requests_created_idx on public.access_requests(created_at desc);
alter table public.access_requests enable row level security;
revoke all on public.access_requests from anon, authenticated;
grant insert (full_name,username,contact_email,desired_role,reason) on public.access_requests to anon;
grant select,update on public.access_requests to authenticated;
-- Somente colunas permitidas ao visitante; servidor aplica status pendente.
drop policy if exists access_requests_anon_insert on public.access_requests;
create policy access_requests_anon_insert on public.access_requests for insert to anon
 with check (status='pendente' and reviewed_at is null and desired_role in ('tecnico','lider','administrativo'));
drop policy if exists access_requests_owner_select on public.access_requests;
create policy access_requests_owner_select on public.access_requests for select to authenticated
 using (public.santi_has_role(array['proprietario']));
drop policy if exists access_requests_owner_update on public.access_requests;
create policy access_requests_owner_update on public.access_requests for update to authenticated
 using (public.santi_has_role(array['proprietario']))
 with check (public.santi_has_role(array['proprietario']));
-- Solicitação não concede perfil, conta Auth, acesso a clientes ou acesso ao banco operacional.
-- Antes do lançamento público: implementar rate limiting / CAPTCHA em endpoint seguro.
