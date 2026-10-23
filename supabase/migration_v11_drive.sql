-- SANTI CTA V11 - execute depois da V10, UMA VEZ, no SQL Editor.
-- Reserva pública atômica, sem dar SELECT/INSERT direto a anônimos nas OS.
CREATE TABLE IF NOT EXISTS public.drive_appointments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 order_id text NOT NULL UNIQUE REFERENCES public.orders(id),
 public_token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
 appointment_date date NOT NULL,
 appointment_time text NOT NULL,
 status text NOT NULL DEFAULT 'confirmado' CHECK (status IN ('confirmado','cancelado')),
 marketing_opt_in boolean NOT NULL DEFAULT false,
 reminder_day_before_sent_at timestamptz,
 reminder_same_day_sent_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS drive_appointments_date_time_idx ON public.drive_appointments(appointment_date,appointment_time,status);
ALTER TABLE public.drive_appointments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.drive_appointments FROM anon;
GRANT SELECT ON public.drive_appointments TO authenticated;
DROP POLICY IF EXISTS drive_staff_read ON public.drive_appointments;
CREATE POLICY drive_staff_read ON public.drive_appointments FOR SELECT TO authenticated
 USING (public.santi_has_role(ARRAY['proprietario']));

CREATE OR REPLACE FUNCTION public.drive_slots(p_date date)
RETURNS TABLE(slot_time text, capacity integer, occupied integer, available integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_time text; v_used integer; v_booked integer; v_local date;
BEGIN
 v_local := (now() AT TIME ZONE 'America/Fortaleza')::date;
 IF p_date IS NULL OR p_date < v_local OR p_date > v_local + 60 OR EXTRACT(ISODOW FROM p_date) IN (7) THEN RETURN; END IF;
 FOREACH v_time IN ARRAY ARRAY['08:00','09:30','11:00','13:00','14:30','16:00'] LOOP
   SELECT count(*) INTO v_booked FROM public.drive_appointments a
     WHERE a.appointment_date=p_date AND a.appointment_time=v_time AND a.status='confirmado';
   SELECT count(*) INTO v_used FROM public.orders o
     WHERE o.scheduled_date=p_date AND o.scheduled_time=v_time
     AND o.stage NOT IN ('Concluído','Cancelado') AND o.id NOT LIKE 'WEB-%';
   slot_time:=v_time; capacity:=3; occupied:=v_used+v_booked;
   available:=greatest(0,capacity-occupied);
   IF p_date=v_local AND (v_time::time <= (now() AT TIME ZONE 'America/Fortaleza')::time + interval '1 hour') THEN available:=0; END IF;
   RETURN NEXT;
 END LOOP;
END;$$;

CREATE OR REPLACE FUNCTION public.drive_book(
 p_name text,p_phone text,p_vehicle text,p_plate text,p_service text,p_description text,
 p_date date,p_time text,p_marketing_opt_in boolean DEFAULT false
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_capacity integer; v_id text; v_token uuid; v_phone text; v_plate text; v_count integer; v_today date;
BEGIN
 v_today := (now() AT TIME ZONE 'America/Fortaleza')::date;
 v_phone := regexp_replace(coalesce(p_phone,''),'[^0-9]','','g');
 v_plate := upper(regexp_replace(coalesce(p_plate,''),'[^A-Za-z0-9]','','g'));
 IF length(trim(coalesce(p_name,''))) NOT BETWEEN 3 AND 100 OR length(v_phone) NOT BETWEEN 10 AND 13
   OR length(trim(coalesce(p_vehicle,''))) NOT BETWEEN 3 AND 100
   OR length(v_plate) NOT BETWEEN 7 AND 7
   OR length(coalesce(p_description,'')) > 1500
   OR length(trim(coalesce(p_service,''))) > 80 THEN
   RAISE EXCEPTION 'Confira nome, WhatsApp, placa, veículo e descrição.';
 END IF;
 IF p_date IS NULL OR p_date < v_today OR p_date > v_today + 60 OR EXTRACT(ISODOW FROM p_date) = 7
   OR p_time NOT IN ('08:00','09:30','11:00','13:00','14:30','16:00') THEN
   RAISE EXCEPTION 'Dia ou horário indisponível.';
 END IF;
 -- Bloqueia a combinação dia+horário dentro da transação; impede reservas simultâneas excedentes.
 PERFORM pg_advisory_xact_lock(hashtextextended(p_date::text||'/'||p_time,4931));
 SELECT s.available INTO v_capacity FROM public.drive_slots(p_date) s WHERE s.slot_time=p_time;
 IF coalesce(v_capacity,0)=0 THEN RAISE EXCEPTION 'Esse horário acabou de ser preenchido. Escolha outro.'; END IF;
 SELECT count(*) INTO v_count FROM public.drive_appointments a
   JOIN public.orders o ON o.id=a.order_id
   WHERE a.status='confirmado' AND o.phone=v_phone AND a.created_at >= now()-interval '24 hours';
 IF v_count >= 3 THEN RAISE EXCEPTION 'Limite de solicitações atingido. Entre em contato com a recepção.'; END IF;
 IF EXISTS(SELECT 1 FROM public.drive_appointments a JOIN public.orders o ON o.id=a.order_id
           WHERE a.status='confirmado' AND o.plate=v_plate AND a.appointment_date=p_date) THEN
   RAISE EXCEPTION 'Este veículo já possui uma reserva para esse dia.';
 END IF;
 v_id := 'WEB-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12));
 INSERT INTO public.orders (id,customer_name,phone,plate,vehicle,service,description,stage,scheduled_date,scheduled_time,mechanic,price,paid,notes,history)
 VALUES(v_id,trim(p_name),v_phone,v_plate,trim(p_vehicle),left(coalesce(p_service,'Avaliação inicial'),80),left(coalesce(p_description,''),1500),
 'Agendado',p_date,p_time,'',0,false,'Criado pelo SANTI DRIVE · avaliação inicial, não conclusão de reparo.',
 jsonb_build_array(jsonb_build_object('at',to_char(now() AT TIME ZONE 'America/Fortaleza','DD/MM/YYYY HH24:MI'), 'text','Pré-OS criada pelo agendamento público')));
 -- Cliente fica no CRM imediatamente, sem dar acesso público à tabela customers.
 INSERT INTO public.customers(id,name,phone,marketing_opt_in,notes)
 VALUES('CLI-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),trim(p_name),v_phone,coalesce(p_marketing_opt_in,false),'Origem: SANTI DRIVE')
 ON CONFLICT (phone) DO UPDATE SET marketing_opt_in=(public.customers.marketing_opt_in OR EXCLUDED.marketing_opt_in);
 INSERT INTO public.drive_appointments(order_id,appointment_date,appointment_time,marketing_opt_in)
 VALUES(v_id,p_date,p_time,coalesce(p_marketing_opt_in,false)) RETURNING public_token INTO v_token;
 RETURN jsonb_build_object('order_id',v_id,'token',v_token,'date',p_date,'time',p_time,'vehicle',trim(p_vehicle));
END;$$;

CREATE OR REPLACE FUNCTION public.drive_manage(p_token uuid,p_action text,p_date date DEFAULT NULL,p_time text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v public.drive_appointments%ROWTYPE; v_capacity integer; v_today date;
BEGIN
 v_today:=(now() AT TIME ZONE 'America/Fortaleza')::date;
 SELECT * INTO v FROM public.drive_appointments WHERE public_token=p_token;
 IF NOT FOUND THEN RAISE EXCEPTION 'Reserva não encontrada.'; END IF;
 IF p_action='view' THEN
 RETURN jsonb_build_object('order_id',v.order_id,'date',v.appointment_date,'time',v.appointment_time,'status',v.status);
 END IF;
 IF v.status<>'confirmado' THEN RAISE EXCEPTION 'Reserva já cancelada.'; END IF;
 IF p_action='cancel' THEN
   IF NOT EXISTS (SELECT 1 FROM public.orders WHERE id=v.order_id AND stage='Agendado') THEN RAISE EXCEPTION 'A OS já foi recebida. Contate a oficina.'; END IF;
   UPDATE public.drive_appointments SET status='cancelado',updated_at=now() WHERE id=v.id;
   UPDATE public.orders SET stage='Cancelado',updated_at=now(),history=coalesce(history,'[]'::jsonb)||jsonb_build_array(jsonb_build_object('at',to_char(now() AT TIME ZONE 'America/Fortaleza','DD/MM/YYYY HH24:MI'),'text','Agendamento cancelado pelo cliente')) WHERE id=v.order_id AND stage='Agendado';
   RETURN jsonb_build_object('status','cancelado');
 ELSIF p_action='reschedule' THEN
   IF p_date IS NULL OR p_date < v_today OR p_date>v_today+60 OR EXTRACT(ISODOW FROM p_date)=7 OR p_time NOT IN ('08:00','09:30','11:00','13:00','14:30','16:00') THEN RAISE EXCEPTION 'Data ou horário inválido.'; END IF;
   PERFORM pg_advisory_xact_lock(hashtextextended(p_date::text||'/'||p_time,4931));
   IF NOT EXISTS (SELECT 1 FROM public.orders WHERE id=v.order_id AND stage='Agendado') THEN RAISE EXCEPTION 'A OS já foi recebida. Contate a oficina.'; END IF;
   SELECT available INTO v_capacity FROM public.drive_slots(p_date) WHERE slot_time=p_time;
   IF (p_date<>v.appointment_date OR p_time<>v.appointment_time) AND coalesce(v_capacity,0)=0 THEN RAISE EXCEPTION 'Horário indisponível.'; END IF;
   UPDATE public.drive_appointments SET appointment_date=p_date,appointment_time=p_time,updated_at=now(),reminder_day_before_sent_at=NULL,reminder_same_day_sent_at=NULL WHERE id=v.id;
   UPDATE public.orders SET scheduled_date=p_date,scheduled_time=p_time,updated_at=now(),history=coalesce(history,'[]'::jsonb)||jsonb_build_array(jsonb_build_object('at',to_char(now() AT TIME ZONE 'America/Fortaleza','DD/MM/YYYY HH24:MI'),'text','Agendamento reagendado pelo cliente')) WHERE id=v.order_id;
   RETURN jsonb_build_object('status','confirmado','date',p_date,'time',p_time);
 END IF;
 RAISE EXCEPTION 'Ação inválida.';
END;$$;

REVOKE ALL ON FUNCTION public.drive_slots(date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.drive_book(text,text,text,text,text,text,date,text,boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.drive_manage(uuid,text,date,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.drive_slots(date) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.drive_book(text,text,text,text,text,text,date,text,boolean) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.drive_manage(uuid,text,date,text) TO anon,authenticated;
-- Em produção: adicione captcha/rate limit via Edge Function antes de divulgação pública.
