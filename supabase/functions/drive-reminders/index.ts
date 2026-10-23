// SANTI CTA V11 — lembretes automáticos OPCIONAIS.
// Configure META_WA_TOKEN, META_PHONE_NUMBER_ID, META_TEMPLATE_NAME,
// SANTI_CRON_SECRET e SUPABASE_SERVICE_ROLE_KEY apenas como secrets na Edge Function.
// O template da Meta precisa estar aprovado e aceitar parametros de nome, data e hora.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const secret = Deno.env.get('SANTI_CRON_SECRET');
  if (!secret || req.headers.get('x-santi-cron-secret') !== secret) return new Response('Unauthorized', { status: 401 });
  const url = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const metaToken = Deno.env.get('META_WA_TOKEN');
  const phoneId = Deno.env.get('META_PHONE_NUMBER_ID');
  const template = Deno.env.get('META_TEMPLATE_NAME');
  if (!metaToken || !phoneId || !template) return Response.json({ error: 'Meta WhatsApp não configurada' }, { status: 503 });
  const db = createClient(url, serviceKey);
  const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Fortaleza' }));
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const tomorrow = new Date(today);tomorrow.setDate(today.getDate()+1);
  const todayIso = iso(today), tomorrowIso = iso(tomorrow);
  const { data: bookings, error } = await db.from('drive_appointments').select('id,order_id,appointment_date,appointment_time,status,reminder_day_before_sent_at,reminder_same_day_sent_at').eq('status','confirmado').in('appointment_date',[todayIso,tomorrowIso]).limit(250);
  if (error) return Response.json({error:error.message}, {status:500});
  let sent = 0, failed = 0, skipped = 0;
  for (const booking of bookings||[]) {
    const before = booking.appointment_date === tomorrowIso;
    const flag = before ? 'reminder_day_before_sent_at' : 'reminder_same_day_sent_at';
    if (booking[flag]) {skipped++; continue;}
    const {data:order} = await db.from('orders').select('customer_name,phone,stage').eq('id',booking.order_id).single();
    if (!order || order.stage !== 'Agendado') {skipped++;continue;}
    const phone = String(order.phone||'').replace(/\D/g,'');
    const normalized = phone.startsWith('55') ? phone : '55'+phone;
    const displayDate = booking.appointment_date.split('-').reverse().join('/');
    try {
      const response = await fetch(`https://graph.facebook.com/v23.0/${phoneId}/messages`, {
        method:'POST', headers: { Authorization:`Bearer ${metaToken}`, 'Content-Type':'application/json' },
        body:JSON.stringify({ messaging_product:'whatsapp',to:normalized,type:'template',template:{name:template,language:{code:'pt_BR'},components:[{type:'body',parameters:[{type:'text',text:(order.customer_name||'Cliente').split(' ')[0]},{type:'text',text:displayDate},{type:'text',text:booking.appointment_time}]}]}})
      });
      if (!response.ok) {failed++;continue;}
      await db.from('drive_appointments').update({[flag]:new Date().toISOString()}).eq('id',booking.id).is(flag,null);
      sent++;
    } catch {failed++;}
  }
  return Response.json({sent,failed,skipped,total:bookings?.length||0});
});
