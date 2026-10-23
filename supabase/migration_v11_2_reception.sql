-- SANTI CTA V11.2 / Executar UMA VEZ após migration_v11_drive.sql.
-- Segurança: este script não publica dados de clientes nem habilita escrita anônima.
BEGIN;
ALTER TABLE public.drive_appointments
  ADD COLUMN IF NOT EXISTS confirmation_state text NOT NULL DEFAULT 'aguardando',
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS checked_in_at timestamptz;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'drive_confirmation_state_chk') THEN
   ALTER TABLE public.drive_appointments ADD CONSTRAINT drive_confirmation_state_chk
     CHECK (confirmation_state IN ('aguardando','confirmado'));
 END IF;
END $$;

DROP POLICY IF EXISTS drive_staff_read ON public.drive_appointments;
CREATE POLICY drive_staff_read ON public.drive_appointments FOR SELECT TO authenticated
 USING (public.santi_has_role(ARRAY['proprietario','administrativo','lider']));

-- Somente equipe autorizada pode confirmar presença ou registrar a entrada.
-- SECURITY DEFINER não dispensa a validação de papéis executada explicitamente abaixo.
CREATE OR REPLACE FUNCTION public.drive_reception_action(p_order_id text,p_action text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v public.drive_appointments%ROWTYPE; v_stage text;
BEGIN
 IF auth.uid() IS NULL OR NOT public.santi_has_role(ARRAY['proprietario','administrativo','lider']) THEN
   RAISE EXCEPTION 'Sem permissão para gerenciar a recepção.';
 END IF;
 IF p_action NOT IN ('confirm','checkin') THEN RAISE EXCEPTION 'Ação inválida.'; END IF;
 SELECT * INTO v FROM public.drive_appointments WHERE order_id=p_order_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Essa OS não veio do SANTI DRIVE. Registre a chegada pela própria OS.'; END IF;
 IF v.status <> 'confirmado' THEN RAISE EXCEPTION 'Agendamento cancelado.'; END IF;
 SELECT stage INTO v_stage FROM public.orders WHERE id=p_order_id FOR UPDATE;
 IF v_stage <> 'Agendado' THEN RAISE EXCEPTION 'A OS já foi recebida ou concluída.'; END IF;
 IF p_action='confirm' THEN
   UPDATE public.drive_appointments SET confirmation_state='confirmado',confirmed_at=coalesce(confirmed_at,now()),updated_at=now() WHERE id=v.id;
   RETURN jsonb_build_object('confirmation_state','confirmado');
 END IF;
 UPDATE public.drive_appointments SET confirmation_state='confirmado',confirmed_at=coalesce(confirmed_at,now()),checked_in_at=now(),updated_at=now() WHERE id=v.id;
 UPDATE public.orders SET stage='Recebido',updated_at=now(),
   history=coalesce(history,'[]'::jsonb) || jsonb_build_array(
      jsonb_build_object('at',to_char(now() AT TIME ZONE 'America/Fortaleza','DD/MM/YYYY HH24:MI'),
        'text','Check-in na recepção SANTI · confirmado pela equipe'))
 WHERE id=p_order_id AND stage='Agendado';
 RETURN jsonb_build_object('status','recebido','checked_in',true);
END;$$;
REVOKE ALL ON FUNCTION public.drive_reception_action(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.drive_reception_action(text,text) TO authenticated;

-- Bloqueia a reserva durante alterações feitas pelo link privado;
-- impede duas alterações concorrentes no mesmo Pit Pass.
CREATE OR REPLACE FUNCTION public.drive_manage(p_token uuid,p_action text,p_date date DEFAULT NULL,p_time text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v public.drive_appointments%ROWTYPE; v_capacity integer; v_today date;
BEGIN
 v_today:=(now() AT TIME ZONE 'America/Fortaleza')::date;
 IF p_action='view' THEN
   SELECT * INTO v FROM public.drive_appointments WHERE public_token=p_token;
   IF NOT FOUND THEN RAISE EXCEPTION 'Reserva não encontrada.'; END IF;
   RETURN jsonb_build_object('order_id',v.order_id,'date',v.appointment_date,'time',v.appointment_time,'status',v.status);
 END IF;
 IF p_action NOT IN ('cancel','reschedule') THEN RAISE EXCEPTION 'Ação inválida.'; END IF;
 -- Mesma trava usada por drive_book para a nova janela solicitada.
 IF p_action='reschedule' THEN
   IF p_date IS NULL OR p_date<v_today OR p_date>v_today+60 OR EXTRACT(ISODOW FROM p_date)=7
     OR p_time NOT IN ('08:00','09:30','11:00','13:00','14:30','16:00') THEN RAISE EXCEPTION 'Data ou horário inválido.'; END IF;
   PERFORM pg_advisory_xact_lock(hashtextextended(p_date::text||'/'||p_time,4931));
 END IF;
 SELECT * INTO v FROM public.drive_appointments WHERE public_token=p_token FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Reserva não encontrada.'; END IF;
 IF v.status<>'confirmado' THEN RAISE EXCEPTION 'Reserva já cancelada.'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.orders WHERE id=v.order_id AND stage='Agendado') THEN
   RAISE EXCEPTION 'A OS já foi recebida. Contate a oficina.';
 END IF;
 IF p_action='cancel' THEN
   UPDATE public.drive_appointments SET status='cancelado',updated_at=now() WHERE id=v.id;
   UPDATE public.orders SET stage='Cancelado',updated_at=now(),
    history=coalesce(history,'[]'::jsonb)||jsonb_build_array(jsonb_build_object('at',to_char(now() AT TIME ZONE 'America/Fortaleza','DD/MM/YYYY HH24:MI'),'text','Agendamento cancelado pelo cliente'))
    WHERE id=v.order_id AND stage='Agendado';
   RETURN jsonb_build_object('status','cancelado');
 END IF;
 SELECT available INTO v_capacity FROM public.drive_slots(p_date) WHERE slot_time=p_time;
 IF (p_date<>v.appointment_date OR p_time<>v.appointment_time) AND coalesce(v_capacity,0)=0 THEN
   RAISE EXCEPTION 'Horário indisponível.';
 END IF;
 UPDATE public.drive_appointments
 SET appointment_date=p_date,appointment_time=p_time,updated_at=now(),
   confirmation_state='aguardando',confirmed_at=NULL,
   reminder_day_before_sent_at=NULL,reminder_same_day_sent_at=NULL
 WHERE id=v.id;
 UPDATE public.orders SET scheduled_date=p_date,scheduled_time=p_time,updated_at=now(),
   history=coalesce(history,'[]'::jsonb)||jsonb_build_array(jsonb_build_object('at',to_char(now() AT TIME ZONE 'America/Fortaleza','DD/MM/YYYY HH24:MI'),'text','Agendamento reagendado pelo cliente'))
 WHERE id=v.order_id;
 RETURN jsonb_build_object('status','confirmado','date',p_date,'time',p_time);
END;$$;
REVOKE ALL ON FUNCTION public.drive_manage(uuid,text,date,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.drive_manage(uuid,text,date,text) TO anon,authenticated;
COMMIT;
