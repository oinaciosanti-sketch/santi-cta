-- SANTI CTA V9: leitura da equipe pelo proprietário no piloto.
-- Execute UMA VEZ, após a V7/V8. Não apaga tabelas, OS ou usuários.
-- Mantenha as políticas anteriores de acesso individual.
create policy staff_profiles_pilot_owner_list on public.staff_profiles
  for select to authenticated
  using (public.santi_has_role(array['proprietario']));
-- Gestão de cargos permanece EXCLUSIVA do administrador do banco.
-- A interface não concede a si própria poderes para promover, bloquear ou criar Auth users.
