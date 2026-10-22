-- SANTI CTA V4: executar somente depois da migração V3. Não apaga registros.
alter table public.orders add column if not exists estimated_hours numeric(9,2);
alter table public.orders add column if not exists worked_hours numeric(9,2);
alter table public.orders add column if not exists direct_cost numeric(12,2);
alter table public.orders add column if not exists promised_at timestamptz;
alter table public.orders add column if not exists rework boolean not null default false;
-- Preserve os estados já registrados. Agendamentos novos para datas futuras nascem 'Agendado' pelo formulário.
