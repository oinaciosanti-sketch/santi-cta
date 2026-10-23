import React,{useEffect,useMemo,useState} from 'react';
import {CalendarCheck,Clock3,CheckCircle2,CarFront,MessageCircle,UserCheck,RefreshCw,AlertTriangle} from 'lucide-react';
import {configured,supabase} from './db';

const dayLocal=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Fortaleza',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const pretty=d=>d?d.split('-').reverse().join('/'):'';
const phoneLink=(order,kind)=>{
  const digits=String(order.phone||'').replace(/\D/g,'');
  const phone=digits.startsWith('55')?digits:`55${digits}`;
  const first=String(order.customer_name||'').trim().split(' ')[0];
  const copy={
    confirm:`Olá, ${first}! Aqui é da SANTI CTA. 🚗 Confirmamos sua avaliação do ${order.vehicle} (${order.plate}) para ${pretty(order.scheduled_date)} às ${order.scheduled_time}. Endereço: Zé Doca–MA. Se precisar reagendar, fale conosco por aqui. Podemos contar com sua presença?`,
    before:`Olá, ${first}! 🚗 Passando para lembrar que a avaliação do seu ${order.vehicle} na SANTI está agendada para amanhã, ${pretty(order.scheduled_date)}, às ${order.scheduled_time}. Responda a esta mensagem caso precise reagendar.`,
    today:`Bom dia, ${first}! Hoje esperamos você e seu ${order.vehicle} na SANTI às ${order.scheduled_time}. Se ocorrer algum imprevisto, avise nossa recepção. Até já!`,
  };
  return `https://wa.me/${phone}?text=${encodeURIComponent(copy[kind])}`;
};

export default function Reception({orders,staffProfiles,onRefresh,onOpen,onNotify,canOperate}){
  const [day,setDay]=useState(dayLocal());
  const [statuses,setStatuses]=useState({});
  const [loading,setLoading]=useState(false);
  const [processing,setProcessing]=useState('');
  const appointments=useMemo(()=>orders.filter(x=>x.scheduled_date===day&&!['Cancelado','Concluído'].includes(x.stage)).sort((a,b)=>String(a.scheduled_time||'').localeCompare(String(b.scheduled_time||''))),[orders,day]);
  const count=key=>appointments.filter(o=>key==='arrived'?o.stage!=='Agendado':key==='confirmed'?statuses[o.id]?.confirmation_state==='confirmado':o.stage==='Agendado').length;
  const load=async()=>{
    if(!configured)return;
    setLoading(true);
    const ids=appointments.filter(o=>o.id.startsWith('WEB-')).map(o=>o.id);
    if(ids.length){
      const {data,error}=await supabase.from('drive_appointments').select('order_id,confirmation_state,checked_in_at,status').in('order_id',ids);
      if(error)onNotify(`Confirmações: ${error.message}`);
      else setStatuses(Object.fromEntries((data||[]).map(x=>[x.order_id,x])));
    }else setStatuses({});
    setLoading(false);
  };
  useEffect(()=>{load()},[day,orders]);
  const change=async(o,action)=>{
    if(!configured){onNotify('A confirmação da recepção requer Supabase e a migração V11.2.');return}
    if(!canOperate)return;
    setProcessing(o.id+action);
    const {error}=await supabase.rpc('drive_reception_action',{p_order_id:o.id,p_action:action});
    if(error)onNotify(error.message);
    else{onNotify(action==='checkin'?'Chegada registrada e OS enviada para Recebido.':'Presença confirmada.');await onRefresh();await load()}
    setProcessing('');
  };
  return <div className="reception-v112">
    <section className="panel reception-intro"><div><span className="reception-overline">SANTI CTA / CENTRAL DE RECEPÇÃO</span><h2>Hoje, cada chegada importa.</h2><p>Confirme as visitas, envie lembretes pelo WhatsApp e registre o check-in sem perder o histórico da OS.</p></div><div className="reception-date"><label htmlFor="reception-day">Dia da agenda</label><input id="reception-day" type="date" value={day} onChange={e=>setDay(e.target.value)}/><button className="btn ghost" onClick={()=>{onRefresh();load()}}><RefreshCw size={15}/> Atualizar</button></div></section>
    <div className="reception-stats"><div><small>Programados</small><strong>{appointments.length}</strong></div><div><small>Aguardando chegada</small><strong>{count('awaiting')}</strong></div><div><small>Presença confirmada</small><strong>{count('confirmed')}</strong></div><div><small>Já recebidos</small><strong>{count('arrived')}</strong></div></div>
    <div className="panel"><div className="reception-heading"><h3>Visitas do dia</h3><span>{loading?'Atualizando confirmações...':`${appointments.length} veículo(s)`}</span></div>
    {!appointments.length&&<p className="reception-empty">Nenhuma visita programada para esta data.</p>}
    {appointments.map(o=>{const booked=!!statuses[o.id];const checkin=o.stage!=='Agendado';const confirmed=statuses[o.id]?.confirmation_state==='confirmado';return <article className="reception-visit" key={o.id}>
      <div className="reception-clock"><Clock3 size={16}/><strong>{o.scheduled_time||'—'}</strong></div>
      <div className="reception-client"><strong>{o.customer_name}</strong><span><CarFront size={13}/>{o.vehicle} · {o.plate} · {o.service}</span><small>{o.id.startsWith('WEB-')?'SANTI DRIVE / Pré-OS':'OS interna'} · {o.id}</small></div>
      <div className="reception-state"><span className={checkin?'r-state arrived':confirmed?'r-state yes':'r-state pending'}>{checkin?'Chegou':confirmed?'Presença confirmada':'Aguardando confirmação'}</span></div>
      <div className="reception-actions">
        <a className="btn ghost" href={phoneLink(o,'confirm')} target="_blank" rel="noreferrer" title="Abrir WhatsApp com mensagem pronta"><MessageCircle size={15}/> WhatsApp</a>
        <button className="btn ghost" onClick={()=>onOpen(o)}>Abrir OS</button>
        {canOperate&&booked&&!checkin&&!confirmed&&<button className="btn ghost" disabled={!!processing} onClick={()=>change(o,'confirm')}><CheckCircle2 size={15}/> Confirmar</button>}
        {canOperate&&booked&&!checkin&&<button className="btn primary" disabled={!!processing} onClick={()=>change(o,'checkin')}><UserCheck size={15}/> Check-in</button>}
        {canOperate&&!booked&&!checkin&&<span className="r-help">Check-in via OS para atendimentos internos</span>}
      </div>
    </article>})}</div>
    <section className="reception-tips"><AlertTriangle size={17}/><div><strong>Teste de WhatsApp disponível agora (manual)</strong><p>O botão abre a mensagem pronta no WhatsApp, mas você precisa apertar Enviar. Não configura disparos automáticos. Não compartilhe links privados de Pit Pass com terceiros.</p></div></section>
  </div>
}
