-- SANTI CTA V10: VINCULO DE TÉCNICO POR IDENTIFICADOR ÚNICO.
-- Executar apenas após migrações anteriores (V9). Não apaga ordens antigas.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS mechanic_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS orders_mechanic_user_id_idx ON public.orders(mechanic_user_id);
-- Proprietários, líderes e administrativos podem ver os perfis ativos de técnicos.
-- Isto apenas disponibiliza a lista de atribuição. NÃO amplia acesso às OS.
DROP POLICY IF EXISTS staff_profiles_tech_directory_select ON public.staff_profiles;
CREATE POLICY staff_profiles_tech_directory_select ON public.staff_profiles
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (role = 'tecnico' AND active = true AND public.santi_has_role(ARRAY['proprietario','lider','administrativo']))
  );
-- OBS.: a V7 mantém o banco operacional limitado a proprietários durante o piloto.
-- Não habilite políticas amplas de SELECT / UPDATE para técnicos.
-- A visualização real de ordens por técnicos e edição apenas de campos técnicos
-- requer políticas RLS específicas e operações seguras no servidor (RPC/Edge Function).
-- Atribuições antigas por nome permanecem sem ID até revisão manual no formulário.
