import React, { useEffect, useMemo, useState } from 'react';
import {
  LayoutDashboard,
  CalendarDays,
  Columns3,
  ClipboardList,
  Users,
  CarFront,
  ChartColumnIncreasing,
  Settings,
  Search,
  Plus,
  ChevronDown,
  ChevronRight,
  Clock3,
  Wrench,
  FileText,
  MessageCircle,
  Camera,
  Printer,
  Trash2,
  X,
  Menu,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCcw,
  Save,
  ExternalLink,
  LogOut,
  LockKeyhole,
  Filter,
  UserPlus,
  CreditCard,
  BarChart3,
} from 'lucide-react';
import {
  STAGES,
  COLORS,
  SERVICES,
  nowLocal,
  seed,
  formatMoney,
  waLink,
} from './data';
import {testAppointments} from './fixtures';
import {
  configured,
  supabase,
  getOrders,
  saveOrder,
  removeOrder,
  demoWrite,
  getCustomers,
  saveCustomer,
} from './db';

const IconMap = {
  Dashboard: LayoutDashboard,
  Kanban: Columns3,
  Agenda: CalendarDays,
  'Ordens de serviço': ClipboardList,
  Clientes: Users,
  Veículos: CarFront,
  Relatórios: ChartColumnIncreasing,
  Configurações: Settings,
  Funcionários: Users,
};

const NAV = [
  'Dashboard',
  'Kanban',
  'Agenda',
  'Ordens de serviço',
  'Clientes',
  'Veículos',
  'Relatórios',
  'Configurações',
  'Funcionários',
];

const VEHICLE_FILTERS = [
  { key: 'em-oficina', label: 'Em oficina' },
  { key: 'hoje', label: 'Programados hoje' },
  { key: 'semana', label: 'Programados na semana' },
  { key: 'mes', label: 'Programados no mês' },
  { key: 'todos', label: 'Todos' },
];

const empty = () => ({
  id: '',
  customer_name: '',
  phone: '',
  plate: '',
  vehicle: '',
  year: '',
  service: 'Revisão preventiva',
  description: '',
  stage: 'Agendado',
  scheduled_date: nowLocal(),
  scheduled_time: '09:00',
  mechanic: '',
  price: 0,
  paid: false,
  notes: '',
  diagnosis: '',
  parts: '',
  photos: [],
  history: [],
});

const friendlyDate = (d) => {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
};

const datetime = () => new Date().toLocaleString('pt-BR');

function isSameWeek(isoDate) {
  if (!isoDate) return false;
  const target = new Date(`${isoDate}T12:00:00`);
  const today = new Date();
  const start = new Date(today);
  const day = (today.getDay() + 6) % 7;
  start.setDate(today.getDate() - day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return target >= start && target <= end;
}

function isSameMonth(isoDate) {
  if (!isoDate) return false;
  const target = new Date(`${isoDate}T12:00:00`);
  const now = new Date();
  return (
    target.getMonth() === now.getMonth() &&
    target.getFullYear() === now.getFullYear()
  );
}

function Brand({ small = false }) {
  return (
    <div className={`brand ${small ? 'brand-sm' : ''}`}>
      <img
        src="/logo-santi-topo.png"
        alt="SANTI CTA - Centro Técnico Automotivo"
      />
    </div>
  );
}

function Badge({ stage }) {
  return (
    <span className="badge" style={{ '--tone': COLORS[stage] || '#abb0be' }}>
      <i />
      {stage}
    </span>
  );
}

function initials(n) {
  return String(n || '?')
    .split(' ')
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase();
}

function App() {
  const [page, setPage] = useState('Dashboard');
  const [reportSection,setReportSection] = useState('Oficina');
  const [reportsOpen,setReportsOpen] = useState(false);
  const [profile,setProfile] = useState(null);
  const [profileReady,setProfileReady] = useState(!configured);
  const [staffRequests,setStaffRequests]=useState([]);
  const [staffDraft,setStaffDraft]=useState({full_name:'',username:'',role:'tecnico'});
  const [publicAccessRequests,setPublicAccessRequests]=useState([]);
  const [selectedTech,setSelectedTech]=useState('');
  const [orders, setOrders] = useState([]);
  const [clients, setClients] = useState([]);
  const [clientSelected, setClientSelected] = useState(null);
  const [clientEditing, setClientEditing] = useState(null);
  const [reportWindow, setReportWindow] = useState('7');
  const [reportFrom,setReportFrom]=useState('2026-10-21');
  const [reportTo,setReportTo]=useState('2026-10-23');
  const [query, setQuery] = useState('');
  const [date, setDate] = useState(nowLocal());
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const [sidebar, setSidebar] = useState(false);
  const [busy, setBusy] = useState(true);
  const [notice, setNotice] = useState('');
  const [session, setSession] = useState(null);
  const [authReady,setAuthReady] = useState(!configured);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [rememberMe,setRememberMe]=useState(localStorage.getItem('santi-remember-session')==='true');
  const [accessView,setAccessView]=useState('login');
  const [accessDraft,setAccessDraft]=useState({full_name:'',username:'',email:'',role:'tecnico',reason:''});
  const [accessBusy,setAccessBusy]=useState(false);
  const [detailTab, setDetailTab] = useState('Resumo');
  const [showClosed, setShowClosed] = useState(false);
  const [vehicleFilter, setVehicleFilter] = useState('em-oficina');

  const toast = (t) => {
    setNotice(t);
    setTimeout(() => setNotice(''), 4000);
  };

  useEffect(() => {
    if (!configured) {
      setSession({ user: { email: 'demonstração' } });
      return;
    }
    supabase.auth.getSession().then(({ data,error }) => {if(error)toast('Falha ao verificar sessão: '+error.message);setSession(data?.session||null);setAuthReady(true)}).catch(e=>{toast(e.message);setAuthReady(true)});
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_evt, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if(!configured){setProfile({full_name:'Demonstração SANTI',role:'proprietario',active:true});setProfileReady(true);return;}
    if(!session?.user?.id){setProfile(null);setProfileReady(true);return;}
    let cancelled=false;
    setProfileReady(false);
    supabase.from('staff_profiles').select('full_name,role,active').eq('user_id',session.user.id).maybeSingle()
      .then(({data,error})=>{if(!cancelled){setProfile(error?null:data);setProfileReady(true);if(error)toast('Erro ao carregar cargo: '+error.message)}})
      .catch(e=>{if(!cancelled){setProfile(null);setProfileReady(true);toast(e.message)}});
    return ()=>{cancelled=true};
  },[session?.user?.id]);

  const role=profile?.role||'sem_perfil';
  const canEditOS=['proprietario','tecnico','lider','administrativo'].includes(role);
  const canCreateOS=['proprietario','lider','administrativo'].includes(role);
  const canManageClients=['proprietario','administrativo'].includes(role);
  const permittedPages={
    proprietario:NAV,
    tecnico:['Kanban','Ordens de serviço'],
    lider:['Dashboard','Kanban','Agenda','Ordens de serviço','Veículos','Relatórios'],
    administrativo:['Dashboard','Kanban','Agenda','Ordens de serviço','Clientes','Veículos','Funcionários'],
  };
  const visibleNav=permittedPages[role]||[];
  const roleLabel={proprietario:'Proprietário',tecnico:'Técnico',lider:'Líder de oficina',administrativo:'Administrativo'};
  const navigate=(destination)=>{if(visibleNav.includes(destination))setPage(destination)};
  const loadPublicAccess=async()=>{
    if(!configured)return;
    const {data,error}=await supabase.from('access_requests').select('*').order('created_at',{ascending:false});
    if(!error)setPublicAccessRequests(data||[]);
  };
  const reviewPublicAccess=async(req,status)=>{
    if(role!=='proprietario')return;
    const {error}=await supabase.from('access_requests').update({status,reviewed_at:new Date().toISOString()}).eq('id',req.id);
    if(error)toast(error.message);else{await loadPublicAccess();toast(status==='aprovado'?'Pedido aprovado. Crie o usuário em Authentication e atribua seu perfil no Supabase.':'Pedido recusado.');}
  };
  const loadStaff=async()=>{if(!configured){setStaffRequests(JSON.parse(localStorage.getItem('santi-staff-requests-v7')||'[]'));return;}const {data,error}=await supabase.from('staff_requests').select('*').order('created_at',{ascending:false});if(!error)setStaffRequests(data||[]);};
  useEffect(()=>{if(profile?.active&&['proprietario','administrativo'].includes(role))loadStaff();if(role==='proprietario')loadPublicAccess();},[profile?.active,role]);
  const submitStaff=async(e)=>{e.preventDefault();const name=staffDraft.full_name.trim(),username=staffDraft.username.trim().toLowerCase();if(!name||!/^[a-z0-9._-]{3,24}$/.test(username)){toast('Informe nome e login com 3 a 24 caracteres, sem espaços.');return;}const entry={full_name:name,username,role:staffDraft.role,status:'pendente'};try{if(configured){const {error}=await supabase.from('staff_requests').insert(entry);if(error)throw error;}else{localStorage.setItem('santi-staff-requests-v7',JSON.stringify([{...entry,id:Date.now()},...staffRequests]));}setStaffDraft({full_name:'',username:'',role:'tecnico'});await loadStaff();toast('Solicitação enviada para aprovação do proprietário.');}catch(err){toast(err.message)}};
  const approveStaff=async(req,status)=>{if(role!=='proprietario')return;try{if(configured){const {error}=await supabase.from('staff_requests').update({status,reviewed_at:new Date().toISOString()}).eq('id',req.id);if(error)throw error;}else{localStorage.setItem('santi-staff-requests-v7',JSON.stringify(staffRequests.map(x=>x.id===req.id?{...x,status}:x)));}await loadStaff();toast(status==='aprovado'?'Cadastro aprovado. Falta criar conta Auth antes de liberar login.':'Solicitação rejeitada.');}catch(err){toast(err.message)}};

  const refresh = async () => {
    setBusy(true);
    try {
      const [ordersResult,clientsResult] = await Promise.allSettled([getOrders(),getCustomers()]);
      if (ordersResult.status==='fulfilled') setOrders(ordersResult.value);
      else toast('Falha ao carregar ordens: '+ordersResult.reason?.message);
      if (clientsResult.status==='fulfilled') setClients(clientsResult.value);
      else toast('Falha ao carregar clientes: '+clientsResult.reason?.message);
    } catch (e) {
      toast(`Erro ao carregar: ${e.message}. Use Atualizar para tentar novamente.`);
    } finally {setBusy(false)}
  };

  useEffect(() => {
    if (!authReady || !profileReady)return;
    if (session && profile?.active) refresh();
    else setBusy(false);
  }, [session?.user?.id,authReady,profileReady,profile?.active]);

  const persist = async (next) => {
    setOrders(next);
    if (!configured) demoWrite(next);
  };

  const syncCustomer = async (o) => {
    const key = String(o.phone || '').replace(/\D/g, '');
    if (!key) return;
    const existing = clients.find((x) => x.phone.replace(/\D/g, '') === key);
    try {
      const c = { id: existing?.id || `C-${key}`, name: o.customer_name, phone: key,
        email: existing?.email || '', notes: existing?.notes || '',
        marketing_opt_in: existing?.marketing_opt_in || false };
      await saveCustomer(c);
      setClients((prev) => [c, ...prev.filter((x) => x.id !== c.id)]);
    } catch (e) {
      toast('OS salva. Cadastro do cliente pendente: ' + e.message);
    }
  };

  const saveClient = async (c) => {
    const payload = { id: c.id || `C-${Date.now()}`, name: c.name, phone: String(c.phone || '').replace(/\D/g, ''), email: c.email || '', notes: c.notes || '', marketing_opt_in: !!c.marketing_opt_in };
    try {
      await saveCustomer(payload);
      setClients((prev) => [payload, ...prev.filter((x) => x.id !== payload.id)]);
      setClientEditing(null);
      setClientSelected(payload);
      toast('Cliente salvo no cadastro.');
    } catch (e) { toast('Erro ao salvar cliente: ' + e.message); }
  };

  const save = async (data) => {
    const existing = orders.find((x) => x.id === data.id);
    const payload = {
      ...data,
      plate: data.plate.toUpperCase().replace(/[^A-Z0-9]/g, ''),
      price: Number(data.price) || 0,
      estimated_hours: data.estimated_hours === '' || data.estimated_hours == null ? null : Number(data.estimated_hours),
      worked_hours: data.worked_hours === '' || data.worked_hours == null ? null : Number(data.worked_hours),
      direct_cost: data.direct_cost === '' || data.direct_cost == null ? null : Number(data.direct_cost),
      history: data.history || [],
      photos: data.photos || [],
    };

    if (!payload.id && payload.scheduled_date > nowLocal())payload.stage='Agendado';
    if (!payload.id) {
      payload.id = `S-${String(Date.now()).slice(-7)}`;
      payload.history = [{ at: datetime(), text: 'Ordem de serviço criada' }];
    } else if (existing) {
      const changes = [];
      if(existing.stage !== payload.stage) changes.push(`Etapa: ${existing.stage} → ${payload.stage}`);
      if(Boolean(existing.paid) !== Boolean(payload.paid)) changes.push(`Pagamento: ${existing.paid?'concluído':'em aberto'} → ${payload.paid?'concluído':'em aberto'}`);
      for(const [field,label] of [['estimated_hours','Horas previstas'],['worked_hours','Horas trabalhadas']]) {
        if(String(existing[field]??'') !== String(payload[field]??'')) {
          const reason = (data.hours_change_reason||'').trim();
          if(!reason){toast('Informe o motivo da alteração das horas.');return;}
          changes.push(`${label}: ${existing[field]??'não registrado'} h → ${payload[field]??'não registrado'} h • Motivo: ${reason}`);
        }
      }
      payload.history = [...(existing.history||[]),...changes.map(text=>({at:datetime(),text}))];
    }
    delete payload.hours_change_reason;

    try {
      await saveOrder(payload);
      await persist(
        existing
          ? orders.map((o) => (o.id === payload.id ? payload : o))
          : [payload, ...orders],
      );
      setEditing(null);
      if (selected?.id === payload.id) setSelected(payload);
      await syncCustomer(payload);
      toast('Ordem de serviço salva com sucesso.');
    } catch (e) {
      toast(`Não foi possível salvar: ${e.message}`);
    }
  };

  const patch = async (o, changes) => {
    const next = {
      ...o,
      ...changes,
      history: [
        ...(o.history || []),
        {
          at: datetime(),
          text: changes.stage && changes.stage !== o.stage
            ? `Etapa: ${o.stage} → ${changes.stage}`
            : typeof changes.paid === 'boolean' && changes.paid !== o.paid
              ? `Pagamento ${changes.paid ? 'concluído' : 'marcado como em aberto'}`
              : 'Dados da OS atualizados',
        },
      ],
    };
    try {
      await saveOrder(next);
      await persist(orders.map((x) => (x.id === o.id ? next : x)));
      if (selected?.id === o.id) setSelected(next);
      toast('Atendimento atualizado.');
    } catch (e) {
      toast(e.message);
    }
  };

  const del = async (o) => {
    if(role!=='proprietario'){toast('Apenas o proprietário pode excluir OS.');return;}
    if (!window.confirm(`Excluir a OS ${o.id} de ${o.customer_name}?`)) return;
    try {
      await removeOrder(o.id);
      await persist(orders.filter((x) => x.id !== o.id));
      setSelected(null);
      toast('OS excluída.');
    } catch (e) {
      toast(e.message);
    }
  };

  const filtered = useMemo(
    () =>
      orders.filter((o) => (role!=='tecnico'||o.mechanic?.trim().toLowerCase()===profile?.full_name?.trim().toLowerCase())).filter((o) =>
        [o.customer_name, o.plate, o.vehicle, o.id, o.phone, o.mechanic, o.service]
          .join(' ')
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [orders, query,role,profile?.full_name],
  );

  const today = orders.filter((o) => o.scheduled_date === date);
  const active = orders.filter((o) => !['Agendado', 'Concluído'].includes(o.stage));
  const revenue = orders.filter((o) => o.paid).reduce((a, o) => a + Number(o.price || 0), 0);
  const pending = orders.filter((o) => !o.paid).reduce((a, o) => a + Number(o.price || 0), 0);
  const counts = Object.fromEntries(
    STAGES.map((s) => [s, orders.filter((o) => o.stage === s).length]),
  );

  const vehicleCards = useMemo(() => {
    const grouped = Object.values(
      filtered.reduce((acc, o) => {
        if (!acc[o.plate]) {
          acc[o.plate] = {
            plate: o.plate,
            vehicle: o.vehicle,
            customer_name: o.customer_name,
            latest: o,
            items: [],
          };
        }
        acc[o.plate].items.push(o);
        const curr = acc[o.plate].latest;
        const currStamp = `${curr.scheduled_date || ''} ${curr.scheduled_time || ''}`;
        const nextStamp = `${o.scheduled_date || ''} ${o.scheduled_time || ''}`;
        if (nextStamp >= currStamp) {
          acc[o.plate].latest = o;
          acc[o.plate].vehicle = o.vehicle;
          acc[o.plate].customer_name = o.customer_name;
        }
        return acc;
      }, {}),
    );

    return grouped.filter((entry) => {
      const latest = entry.latest;
      if (vehicleFilter === 'todos') return true;
      if (vehicleFilter === 'em-oficina') {
        return !['Agendado', 'Concluído'].includes(latest.stage);
      }
      if (vehicleFilter === 'hoje') return latest.scheduled_date === nowLocal();
      if (vehicleFilter === 'semana') return isSameWeek(latest.scheduled_date);
      if (vehicleFilter === 'mes') return isSameMonth(latest.scheduled_date);
      return true;
    });
  }, [filtered, vehicleFilter]);

  const customerCards = useMemo(() => {
    const map = new Map();
    clients.forEach((c) => map.set(String(c.phone).replace(/\D/g, ''), {
      ...c, customer_name: c.name, visits: 0, vehicles: new Set(), related: [],
    }));
    orders.forEach((o) => {
      const phone = String(o.phone).replace(/\D/g, '');
      if (!map.has(phone)) map.set(phone, { id: `C-${phone}`, name: o.customer_name,
        customer_name: o.customer_name, phone, email: '', notes: '',
        marketing_opt_in: false, visits: 0, vehicles: new Set(), related: [] });
      const c = map.get(phone);
      c.visits++;
      c.vehicles.add(o.plate);
      c.related.push(o);
    });
    return [...map.values()].filter(c => [c.name,c.phone,c.email].join(' ').toLowerCase().includes(query.toLowerCase()));
  }, [clients, orders, query]);

  const reportOrders = useMemo(() => orders.filter(o => {
    if (reportWindow==='todos')return true;
    if(!o.scheduled_date)return false;
    if(reportWindow==='personalizado')return (!reportFrom||o.scheduled_date>=reportFrom)&&(!reportTo||o.scheduled_date<=reportTo);
    const n=Number(reportWindow);
    if(reportWindow==='hoje')return o.scheduled_date===nowLocal();
    const start=new Date();start.setHours(0,0,0,0);start.setDate(start.getDate()-(n-1));
    const iso=[start.getFullYear(),String(start.getMonth()+1).padStart(2,'0'),String(start.getDate()).padStart(2,'0')].join('-');
    return o.scheduled_date>=iso&&o.scheduled_date<=nowLocal();
  }), [orders, reportWindow,reportFrom,reportTo]);
  const reportStats = useMemo(() => {
    const n = reportOrders.length;
    const completed = reportOrders.filter(o => o.stage === 'Concluído').length;
    const billed = reportOrders.reduce((sum,o) => sum + Number(o.price||0),0);
    const received = reportOrders.filter(o => o.paid).reduce((sum,o) => sum + Number(o.price||0),0);
    const activeJobs = reportOrders.filter(o => !['Agendado','Concluído'].includes(o.stage)).length;
    const techs = Object.entries(reportOrders.reduce((acc,o) => {
      const k = o.mechanic?.trim() || 'Não atribuído';
      acc[k] = (acc[k] || 0) + 1; return acc;
    }, {})).sort((a,b)=>b[1]-a[1]);
    const withHours=reportOrders.filter(o=>o.worked_hours!=null&&o.worked_hours!==''),hours=withHours.reduce((v,o)=>v+Number(o.worked_hours||0),0);
    const estimated=reportOrders.filter(o=>o.estimated_hours!=null&&o.estimated_hours!=='').reduce((v,o)=>v+Number(o.estimated_hours||0),0);
    const withCost=reportOrders.filter(o=>o.direct_cost!=null&&o.direct_cost!==''),costs=withCost.reduce((v,o)=>v+Number(o.direct_cost||0),0);
    const contribution=withCost.reduce((v,o)=>v+Number(o.price||0)-Number(o.direct_cost||0),0);
    const due=reportOrders.filter(o=>o.promised_at&&o.stage!=='Concluído'&&o.stage!=='Pronto para entrega'&&new Date(o.promised_at).getTime()<Date.now());
    const reworks=reportOrders.filter(o=>o.rework===true);
    const techDetail=Object.entries(reportOrders.reduce((a,o)=>{const name=o.mechanic?.trim()||'Não atribuído';a[name]??={name,orders:0,hours:0,estimated:0,withHours:0,reworks:0};a[name].orders++;if(o.worked_hours!=null){a[name].hours+=Number(o.worked_hours||0);a[name].withHours++}if(o.estimated_hours!=null)a[name].estimated+=Number(o.estimated_hours||0);if(o.rework)a[name].reworks++;return a},{})).map(([name,v])=>v).sort((a,b)=>b.hours-a.hours);
    return {n,completed,billed,received,activeJobs,techs,avg:n?billed/n:0,hours,estimated,hourCount:withHours.length,costCount:withCost.length,costs,contribution,due,reworks,techDetail};
  }, [reportOrders]);

  const signin = async (e) => {
    e.preventDefault();
    setAuthBusy(true);
    const loginEmail=email.includes('@')?email:`${email.trim().toLowerCase()}@santicta.test`;
    localStorage.setItem('santi-remember-session',String(rememberMe));
    const { error } = await supabase.auth.signInWithPassword({ email:loginEmail, password });
    setAuthBusy(false);
    if (error) toast(`Não foi possível entrar: ${error.message}`);
  };

  const submitAccess=async(e)=>{
    e.preventDefault();
    const username=accessDraft.username.trim().toLowerCase();
    const emailAddress=accessDraft.email.trim().toLowerCase();
    if(!/^[a-z0-9._-]{3,30}$/.test(username)){toast('Usuário precisa ter 3–30 caracteres, sem espaços.');return;}
    setAccessBusy(true);
    try{
      const {error}=await supabase.from('access_requests').insert({
        full_name:accessDraft.full_name.trim().slice(0,120),
        username,
        contact_email:emailAddress.slice(0,160),
        desired_role:accessDraft.role,
        reason:accessDraft.reason.trim().slice(0,400)
      });
      if(error)throw error;
      setAccessView('submitted');
    }catch(err){toast('Não foi possível enviar a solicitação: '+err.message)}
    finally{setAccessBusy(false)}
  };
  const sendAccessCode=async()=>{
    const loginEmail=email.includes('@')?email.trim().toLowerCase():`${email.trim().toLowerCase()}@santicta.test`;
    if(!email.trim()){toast('Informe seu usuário antes de solicitar o código.');return;}
    setAuthBusy(true);
    try{
      const {error}=await supabase.auth.signInWithOtp({email:loginEmail,options:{shouldCreateUser:false}});
      if(error)throw error;
      toast('Se a conta tiver e-mail acessível e autorizado, o código será enviado.');
      setAccessView('otp');
    }catch(err){toast('Não foi possível solicitar código: '+err.message)}
    finally{setAuthBusy(false)}
  };
  const [otpCode,setOtpCode]=useState('');
  const verifyAccessCode=async(e)=>{
    e.preventDefault();
    const loginEmail=email.includes('@')?email.trim().toLowerCase():`${email.trim().toLowerCase()}@santicta.test`;
    localStorage.setItem('santi-remember-session',String(rememberMe));
    setAuthBusy(true);
    const {error}=await supabase.auth.verifyOtp({email:loginEmail,token:otpCode.trim(),type:'email'});
    setAuthBusy(false);
    if(error)toast('Código inválido ou expirado: '+error.message);
  };
  if(configured&&!authReady)return <div className="login"><div className="login-box"><Brand/><p>Verificando sessão...</p></div></div>;
  if (configured && !session) {
    return <div className="login"><div className="login-box"><Brand/><div className="login-divider"/>
      {accessView==='login'&&<><h1>Central de operações</h1><p>Acesso exclusivo à equipe autorizada SANTI CTA.</p>
        <form onSubmit={signin}>
          <label>Usuário<input autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="seu usuário"/></label>
          <label>Senha<input autoComplete="current-password" type="password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Sua senha"/></label>
          <label className="remember-row"><input type="checkbox" checked={rememberMe} onChange={e=>setRememberMe(e.target.checked)}/><span>Manter conectado neste dispositivo</span></label>
          <button type="submit" disabled={authBusy} className="btn primary"><LockKeyhole size={17}/>{authBusy?'Entrando...':'Entrar no sistema'}</button>
        </form>
        <div className="login-secondary-actions"><button type="button" onClick={()=>setAccessView('request')}>Solicitar acesso</button><button type="button" onClick={sendAccessCode}>Entrar com código por e-mail</button></div>
        <small>Apenas usuários aprovados podem acessar os dados. Não compartilhe sua senha.</small></>}
      {accessView==='request'&&<><h1>Solicitar acesso</h1><p>Preencha seus dados. O proprietário avaliará seu pedido; nenhuma conta é criada automaticamente.</p>
        <form onSubmit={submitAccess}>
          <label>Nome completo<input required maxLength={120} value={accessDraft.full_name} onChange={e=>setAccessDraft(v=>({...v,full_name:e.target.value}))}/></label>
          <label>Usuário desejado<input required maxLength={30} value={accessDraft.username} onChange={e=>setAccessDraft(v=>({...v,username:e.target.value}))} placeholder="ex.: joao.silva"/></label>
          <label>E-mail de contato<input required type="email" maxLength={160} value={accessDraft.email} onChange={e=>setAccessDraft(v=>({...v,email:e.target.value}))}/></label>
          <label>Cargo desejado<select value={accessDraft.role} onChange={e=>setAccessDraft(v=>({...v,role:e.target.value}))}><option value="tecnico">Técnico</option><option value="lider">Líder de oficina</option><option value="administrativo">Administrativo</option></select></label>
          <label>Observação (opcional)<textarea rows={2} maxLength={400} value={accessDraft.reason} onChange={e=>setAccessDraft(v=>({...v,reason:e.target.value}))}/></label>
          <button className="btn primary" disabled={accessBusy}>{accessBusy?'Enviando...':'Enviar para aprovação'}</button>
        </form><button className="login-back" onClick={()=>setAccessView('login')}>Voltar ao login</button></>}
      {accessView==='submitted'&&<><h1>Solicitação enviada</h1><p>Seu pedido entrou na fila de avaliação. O proprietário precisa aprovar e criar uma conta de acesso antes de você entrar.</p><button className="btn primary" onClick={()=>setAccessView('login')}>Voltar ao login</button></>}
      {accessView==='otp'&&<><h1>Verificação por e-mail</h1><p>Digite o código enviado para o e-mail cadastrado. Esta é uma alternativa ao login por senha, não uma segunda etapa obrigatória.</p><form onSubmit={verifyAccessCode}><label>Código de acesso<input required inputMode="numeric" value={otpCode} onChange={e=>setOtpCode(e.target.value)} placeholder="Código recebido"/></label><label className="remember-row"><input type="checkbox" checked={rememberMe} onChange={e=>setRememberMe(e.target.checked)}/>Manter conectado neste dispositivo</label><button className="btn primary" disabled={authBusy}>Validar código</button></form><button className="login-back" onClick={()=>setAccessView('login')}>Voltar ao login</button></>}
      </div>{notice&&<div className="toast">{notice}</div>}</div>;
  }

  if(configured&&!profileReady)return <div className="login"><div className="login-box"><Brand/><p>Carregando seu perfil...</p></div></div>;
  if(configured&&(!profile?.active||!profile?.role))return <div className="login"><div className="login-box"><Brand/><h2>Acesso aguardando liberação</h2><p>Sua conta ainda não possui nome, cargo e liberação no banco de dados. Solicite o cadastro ao administrador.</p><button className="btn ghost" onClick={()=>supabase.auth.signOut()}>Sair da conta</button></div></div>;
  if(!visibleNav.includes(page))setTimeout(()=>setPage(role==='tecnico'?'Kanban':'Dashboard'),0);

  const kanbanStages = (role==='tecnico'?['Recebido','Em análise','Em manutenção','Higienização','Pronto para entrega']:showClosed?STAGES:STAGES.filter((s)=>s!=='Concluído'));

  return (
    <div className="shell">
      <aside className={`sidebar ${sidebar ? 'open' : ''}`}>
        <Brand />
        <div className="side-caption">CENTRAL OPERACIONAL</div>

        <nav>
          {visibleNav.map((n) => {
            const I=IconMap[n];
            return <React.Fragment key={n}>
              <button className={`navitem ${page===n?'active':''}`}
                onMouseEnter={()=>{if(n==='Relatórios')setReportsOpen(true)}}
                onClick={()=>{
                  navigate(n);
                  if(n==='Relatórios')setReportsOpen(v=>!v);
                  else setSidebar(false);
                }}>
                <I size={18}/>{n}
                {n==='Relatórios'?<ChevronDown size={15} className="navright"/>:(page===n&&<ChevronRight size={14} className="navright"/>)}
              </button>
              {n==='Relatórios'&&reportsOpen&&<div className="reports-submenu">
                <button className={page==='Relatórios'&&reportSection==='Oficina'?'chosen':''} onClick={()=>{navigate('Relatórios');setReportSection('Oficina');setSidebar(false)}}>Oficina</button>
                <button className={page==='Relatórios'&&reportSection==='Equipe'?'chosen':''} onClick={()=>{navigate('Relatórios');setReportSection('Equipe');setSidebar(false)}}>Equipe</button>
              </div>}
            </React.Fragment>
          })}
        </nav>

        <div className="sidebar-foot">
          <div className="unit">
            <span className="live-dot" /> UNIDADE ZÉ DOCA <small>Operação SANTI CTA</small>
          </div>
          <div className="side-claim">
            DISCIPLINA.
            <br />
            TÉCNICA.
            <br />
            <span>RESULTADO.</span>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="icon-btn hamburger" onClick={() => setSidebar(!sidebar)}>
            <Menu size={20} />
          </button>

          <div className="search">
            <Search size={18} />
            <input
              placeholder="Buscar OS, cliente, placa, veículo..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button onClick={() => setQuery('')} aria-label="Limpar busca">
                <X size={15} />
              </button>
            )}
          </div>

          <div className="top-actions">
            <span className={`mode ${!configured ? 'demo' : 'online'}`}>
              {!configured ? 'MODO DEMONSTRAÇÃO' : 'SUPABASE CONECTADO'}
            </span>
            <button className="icon-btn" title="Atualizar dados" onClick={refresh}>
              <RefreshCcw size={18} />
            </button>
            <div className="staff-indicator"><strong>{profile?.full_name||'SANTI'}</strong><small>{roleLabel[role]||'Sem cargo'}</small></div><div className="avatar">{initials(profile?.full_name||'SANTI')}</div>
            {configured && (
              <button className="icon-btn" title="Sair" onClick={() => supabase.auth.signOut()}>
                <LogOut size={18} />
              </button>
            )}
          </div>
        </header>

        <main className="content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">SANTI CTA / {page.toUpperCase()}</div>
              <h1>
                {page === 'Dashboard'
                  ? 'Visão geral da operação'
                  : page === 'Kanban'
                    ? 'Fluxo de atendimentos'
                    : page}
              </h1>
              <p>
                {
                  {
                    Dashboard: 'Sua oficina sob controle, em qualquer lugar.',
                    Kanban: 'Veja seus serviços do recebimento à entrega, com diagnósticos e evidências.',
                    Agenda: 'Compromissos, chegadas e capacidade da equipe.',
                    'Ordens de serviço': 'Histórico técnico e acompanhamento de todas as OS.',
                    Clientes: 'Relacionamento e histórico dos clientes.',
                    Veículos: 'Programação e passaporte digital dos veículos.',
                    Relatórios: 'Indicadores para decisões mais inteligentes.',
                    Configurações: 'Informações do sistema e operações de manutenção.',
                  }[page]
                }
              </p>
            </div>

            <div className="heading-actions">
              {['Dashboard', 'Agenda'].includes(page) && (
                <input
                  className="date-picker"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              )}
              {canCreateOS&&<button className="btn primary" onClick={() => setEditing(empty())}>
                <Plus size={17} /> Nova OS
              </button>}
            </div>
          </div>

          {!configured && (
            <div className="demo-banner">
              <AlertCircle size={18} />
              <span>
                Você está no <b>modo demonstração</b>. Os dados são fictícios e ficam salvos neste
                navegador. Para operar com a equipe, configure o Supabase e o login.
              </span>
            </div>
          )}

          {busy ? (
            <div className="loading">Carregando atendimentos...</div>
          ) : (
            <>
              {page === 'Dashboard' && (
                <>
                  <div className="stats">
                    <Stat
                      icon={CalendarDays}
                      label="Agendados para o dia"
                      value={today.filter((o) => o.stage === 'Agendado').length}
                      color="#548bff"
                      foot="Chegadas previstas"
                    />
                    <Stat
                      icon={CarFront}
                      label="Veículos em oficina"
                      value={active.length}
                      color="#31b8de"
                      foot="Atendimentos em andamento"
                    />
                    <Stat
                      icon={Wrench}
                      label="Em manutenção"
                      value={counts['Em manutenção']}
                      color="#ff825f"
                      foot="Serviços em execução"
                    />
                    <Stat
                      icon={CheckCircle2}
                      label="Prontos para entrega"
                      value={counts['Pronto para entrega']}
                      color="#60d7a3"
                      foot="Aguardando o proprietário"
                    />
                  </div>

                  <div className="dashboard-layout">
                    <section className="panel">
                      <PanelHead
                        title="Fluxo operacional"
                        subtitle="Distribuição atual dos atendimentos"
                        action={
                          <button className="text-button" onClick={() => setPage('Kanban')}>
                            Abrir Kanban <ArrowRight size={15} />
                          </button>
                        }
                      />
                      <div className="pipeline">
                        {STAGES.map((s) => (
                          <div className="pipeline-item" key={s}>
                            <div className="pipeline-label">
                              <span className="color-dot" style={{ background: COLORS[s] }} />
                              {s}
                              <strong>{counts[s]}</strong>
                            </div>
                            <div className="track">
                              <div
                                style={{
                                  width: `${Math.max(
                                    (counts[s] / Math.max(orders.length, 1)) * 100,
                                    counts[s] ? 6 : 0,
                                  )}%`,
                                  background: COLORS[s],
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className="panel">
                      <PanelHead
                        title="Chegadas do dia"
                        subtitle={`${friendlyDate(date)} · ${today.length} atendimento(s)`}
                        action={
                          <button className="text-button" onClick={() => setPage('Agenda')}>
                            Agenda <ArrowRight size={15} />
                          </button>
                        }
                      />
                      <div className="arrival-list">
                        {today
                          .sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time))
                          .map((o) => (
                            <button
                              className="arrival"
                              onClick={() => {
                                setSelected(o);
                                setDetailTab('Resumo');
                              }}
                              key={o.id}
                            >
                              <div className="arrival-time">{o.scheduled_time}</div>
                              <div className="arrival-main">
                                <strong>{o.vehicle}</strong>
                                <span>
                                  {o.customer_name} · {o.plate}
                                </span>
                              </div>
                              <Badge stage={o.stage} />
                            </button>
                          ))}
                        {today.length === 0 && <Empty text="Nenhuma chegada para esta data." />}
                      </div>
                    </section>
                  </div>

                  <div className="bottom-grid">
                    <section className="panel">
                      <PanelHead
                        title="Últimas ordens"
                        subtitle="Acesso rápido aos atendimentos"
                        action={
                          <button className="text-button" onClick={() => setPage('Ordens de serviço')}>
                            Ver todas <ArrowRight size={15} />
                          </button>
                        }
                      />
                      <OrderTable list={filtered.slice(0, 6)} open={(o) => setSelected(o)} />
                    </section>

                    <section className="panel finance">
                      <PanelHead title="Resumo financeiro" subtitle="Valores cadastrados nas OS" />
                      <div className="money-block">
                        <span>Recebido</span>
                        <strong>{formatMoney(revenue)}</strong>
                      </div>
                      <div className="money-block">
                        <span>Em aberto</span>
                        <strong>{formatMoney(pending)}</strong>
                      </div>
                      <div className="financial-note">
                        <AlertCircle size={15} /> Valores demonstrativos de OS; não substituem um módulo
                        contábil ou financeiro completo.
                      </div>
                    </section>
                  </div>
                </>
              )}

              {page === 'Kanban' && (
                <>
                  <div className="kanban-tools">
                    <div>
                      <strong>{filtered.filter((o) => o.stage !== 'Concluído').length}</strong>{' '}
                      atendimentos abertos <span>· fluxo enxuto do agendamento à entrega</span>
                    </div>
                    {role!=='tecnico'&&<label className="show-closed">
                      <input
                        type="checkbox"
                        checked={showClosed}
                        onChange={(e) => setShowClosed(e.target.checked)}
                      />{' '}
                      Mostrar concluídos
                    </label>}
                  </div>

                  <div className="kanban-scroll">
                    <div className="kanban-board">
                      {kanbanStages.map((s) => (
                        <div
                          key={s}
                          className={`kanban-col ${s === 'Concluído' ? 'closed-col' : ''}`}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            const id = e.dataTransfer.getData('text/plain');
                            const o = orders.find((x) => x.id === id);
                            if (o && o.stage !== s) patch(o, { stage: s });
                          }}
                        >
                          <div className="col-heading" style={{ borderTopColor: COLORS[s] }}>
                            <span className="color-dot" style={{ background: COLORS[s] }} />
                            {s}
                            <b>{filtered.filter((x) => x.stage === s).length}</b>
                          </div>
                          <div className="col-cards">
                            {filtered
                              .filter((x) => x.stage === s)
                              .sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time))
                              .map((o) => (
                                <button
                                  draggable
                                  onDragStart={(e) => e.dataTransfer.setData('text/plain', o.id)}
                                  onClick={() => {
                                    setSelected(o);
                                    setDetailTab('Resumo');
                                  }}
                                  className="kanban-card"
                                  key={o.id}
                                >
                                  <div className="kanban-card-top">
                                    <span>{o.id}</span>
                                    <strong>{friendlyDate(o.scheduled_date).slice(0,6)}{friendlyDate(o.scheduled_date).slice(8)} {o.scheduled_time}</strong>
                                  </div>
                                  <h3>{o.vehicle}</h3>
                                  <div className="plate">{o.plate}</div>
                                  <p>{o.description || o.service}</p>
                                  <div className="kanban-card-foot">
                                    <span className="person-dot">{initials(o.customer_name)}</span>
                                    <span>{o.customer_name}</span>
                                    <ChevronRight size={15} />
                                  </div>
                                </button>
                              ))}
                            {!filtered.some((x) => x.stage === s) && (
                              <div className="empty-col">Nenhum veículo</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="kanban-hint">
                    Arraste entre etapas ou abra a OS para mudar o status. Enviar WhatsApp é uma ação
                    separada e manual nesta versão.
                  </div>
                </>
              )}

              {page === 'Agenda' && (
                <div className="panel">
                  <PanelHead
                    title="Agenda operacional"
                    subtitle="Horários cadastrados e status das chegadas"
                    action={<input type="date" className="date-picker" value={date} onChange={(e) => setDate(e.target.value)} />}
                  />
                  <div className="agenda-list">
                    {today
                      .sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time))
                      .map((o) => (
                        <div className="agenda-row" key={o.id}>
                          <div className="agenda-hour">
                            <Clock3 size={16} />
                            {o.scheduled_time}
                          </div>
                          <div className="agenda-vehicle">
                            <strong>{o.vehicle}</strong>
                            <span>
                              {o.plate} · {o.customer_name} · {o.service}
                            </span>
                          </div>
                          <Badge stage={o.stage} />
                          <button className="btn ghost" onClick={() => setSelected(o)}>
                            Detalhes <ChevronRight size={15} />
                          </button>
                        </div>
                      ))}
                    {today.length === 0 && <Empty text="Nenhum agendamento nesta data." />}
                  </div>
                </div>
              )}

              {page === 'Ordens de serviço' && (
                <div className="panel">
                  <PanelHead title="Todas as ordens de serviço" subtitle={`${filtered.length} registros encontrados`} />
                  <OrderTable list={filtered} open={(o) => setSelected(o)} />
                </div>
              )}

              {page === 'Clientes' && (
                <div className="panel">
                  <PanelHead title="Cadastro e relacionamento" subtitle={`${customerCards.length} cliente(s) · registros independentes das ordens de serviço`}
                    action={canManageClients?<button className="btn primary" onClick={() => setClientEditing({name:'',phone:'',email:'',notes:'',marketing_opt_in:false})}><UserPlus size={16}/> Novo cliente</button>:null} />
                  <div className="vehicle-grid">
                    {customerCards.map(c => (
                      <button className="vehicle-card" key={c.id} onClick={()=>setClientSelected(c)}>
                        <div className="vehicle-symbol"><Users size={24}/></div>
                        <strong>{c.name}</strong><span className="plate">{c.phone}</span>
                        <small>{c.vehicles.size} veículo(s) · {c.visits} atendimento(s)</small>
                        <div><span>Ver ficha e histórico</span><ChevronRight size={15}/></div>
                      </button>
                    ))}
                  </div>
                  {customerCards.length===0 && <Empty text="Nenhum cliente cadastrado."/>}
                </div>
              )}

              {page === 'Veículos' && (
                <div className="panel">
                  <PanelHead
                    title="Passaporte digital dos veículos"
                    subtitle="Filtro rápido da operação e da programação"
                    action={
                      <div className="filter-pills">
                        <Filter size={15} />
                        {VEHICLE_FILTERS.map((f) => (
                          <button
                            key={f.key}
                            className={`pill ${vehicleFilter === f.key ? 'active' : ''}`}
                            onClick={() => setVehicleFilter(f.key)}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                    }
                  />
                  <div className="vehicle-grid">
                    {vehicleCards.map((v) => (
                      <button className="vehicle-card" key={v.plate} onClick={() => setSelected(v.latest)}>
                        <div className="vehicle-symbol">
                          <CarFront size={27} />
                        </div>
                        <strong>{v.vehicle}</strong>
                        <span className="plate">{v.plate}</span>
                        <small>{v.customer_name}</small>
                        <div>
                          <span>{v.latest.stage}</span>
                          <ChevronRight size={15} />
                        </div>
                      </button>
                    ))}
                  </div>
                  {vehicleCards.length === 0 && <Empty text="Nenhum veículo encontrado neste filtro." />}
                </div>
              )}

              {page === 'Relatórios' && (
                <div className="reports-v3">
                  <div className="report-section-switch"><button className={reportSection==='Oficina'?'selected':''} onClick={()=>setReportSection('Oficina')}>Oficina</button><button className={reportSection==='Equipe'?'selected':''} onClick={()=>setReportSection('Equipe')}>Equipe</button></div>
                  <div className="panel"><PanelHead title={reportSection==='Oficina'?'SANTI Control • Oficina':'SANTI Control • Equipe'} subtitle="Operação, horas apontadas, custos e alertas por período"
                    action={<div className="report-filters"><select aria-label="Período do relatório" className="status-select" value={reportWindow} onChange={e=>setReportWindow(e.target.value)}>
                      <option value="hoje">Hoje</option><option value="7">Últimos 7 dias</option><option value="15">Últimos 15 dias</option><option value="30">Últimos 30 dias</option><option value="todos">Geral</option><option value="personalizado">Personalizado</option>
                    </select>{reportWindow==='personalizado'&&<><input aria-label="Data inicial" className="date-picker" type="date" value={reportFrom} onChange={e=>setReportFrom(e.target.value)}/><span>até</span><input aria-label="Data final" className="date-picker" type="date" min={reportFrom} value={reportTo} onChange={e=>setReportTo(e.target.value)}/></>}</div>}/></div>
                  {reportSection === 'Oficina' && <div className="report-kpis">
                    <Metric label="Atendimentos" value={reportStats.n} helper="Ordens no período"/>
                    <Metric label="Em andamento" value={reportStats.activeJobs} helper="Veículos em processo"/>
                    <Metric label="Concluídos" value={reportStats.completed} helper={reportStats.n?`${Math.round(reportStats.completed/reportStats.n*100)}% das ordens`: 'Sem chamados'}/>
                    <Metric label="Valor de serviços" value={formatMoney(reportStats.billed)} helper="Receita cadastrada — não é lucro"/>
                    <Metric label="Recebido" value={formatMoney(reportStats.received)} helper="Conforme status de pagamento"/>
                    <Metric label="Horas apontadas" value={reportStats.hourCount?reportStats.hours.toFixed(1)+' h':'Sem dados'} helper={`${reportStats.hourCount}/${reportStats.n} OS com horas registradas`}/>
                    <Metric label="Contribuição conhecida" value={reportStats.costCount?formatMoney(reportStats.contribution):'Sem dados'} helper={`Receita menos custos diretos em ${reportStats.costCount} OS; não é lucro líquido`}/>
                    <Metric label="Retrabalhos sinalizados" value={reportStats.reworks.length} helper="Exige marcação na OS"/>
                    <Metric label="Prazo vencido" value={reportStats.due.length} helper="OS abertas com entrega prometida vencida"/>
                  </div>
                  }
                  <div className="report-panes">
                    {reportSection==='Oficina' && <section className="panel"><PanelHead title="Funil operacional" subtitle="Distribuição das etapas"/><div className="report-bars">{STAGES.map(stage=>{
                      const count=reportOrders.filter(o=>o.stage===stage).length;
                      return <div className="report-bar" key={stage}><span>{stage}</span><div><i style={{width:`${reportStats.n?count/reportStats.n*100:0}%`,background:COLORS[stage]}}/></div><b>{count}</b></div>;
                    })}</div></section>}
                    <section className="panel"><PanelHead title="Produtividade por técnico" subtitle="Horas registradas nas OS — não equivale à jornada de trabalho"/>
                      <div className="tech-table-wrap"><table><thead><tr><th>TÉCNICO</th><th>OS</th><th>HORAS</th><th>PREVISTAS</th><th>RETRABALHOS</th></tr></thead><tbody>{reportStats.techDetail.map(t=><tr key={t.name}><td><strong>{t.name}</strong></td><td>{t.orders}</td><td>{t.withHours?t.hours.toFixed(1)+' h':'—'}</td><td>{t.estimated?t.estimated.toFixed(1)+' h':'—'}</td><td>{t.reworks}</td></tr>)}</tbody></table></div>
                      {reportSection==='Equipe' && <div className="tech-performance-cards">{reportStats.techDetail.map(t=><div className="tech-performance-card" key={t.name}><strong>{t.name}</strong><div><span>Ordens vinculadas</span><b>{t.orders}</b></div><div><span>Horas trabalhadas</span><b>{t.withHours?t.hours.toFixed(1)+' h':'Não lançadas'}</b></div><div><span>Horas previstas</span><b>{t.estimated?t.estimated.toFixed(1)+' h':'Não lançadas'}</b></div><div><span>Eficiência técnica*</span><b>{t.withHours&&t.hours>0&&t.estimated?(t.estimated/t.hours*100).toFixed(1)+'%':'Sem dados'}</b></div><div><span>Retrabalhos</span><b>{t.reworks}</b></div></div>)}</div>}
                      {reportSection==='Equipe' && <p className="report-footnote">* Eficiência técnica = horas previstas ÷ horas registradas. Não representa utilização da jornada nem autoriza comparações individuais sem considerar a complexidade dos serviços.</p>}
                    </section>
                  </div>
                  {reportSection==='Oficina' && <><div className="panel"><PanelHead title="Alertas operacionais" subtitle="Prioridades que exigem ação"/>
                    <div className="alerts-list">{reportStats.due.map(o=><button key={o.id} onClick={()=>setSelected(o)} className="alert-item"><AlertCircle size={17}/><span><strong>Entrega vencida: {o.vehicle}</strong><small>{o.id} • {o.customer_name} • prazo {new Date(o.promised_at).toLocaleString('pt-BR')}</small></span><ChevronRight size={17}/></button>)}
                    {reportStats.reworks.map(o=><button key={o.id} onClick={()=>setSelected(o)} className="alert-item"><AlertCircle size={17}/><span><strong>Retrabalho: {o.vehicle}</strong><small>{o.id} • {o.mechanic||'Não atribuído'}</small></span><ChevronRight size={17}/></button>)}
                    {!reportStats.due.length&&!reportStats.reworks.length&&<Empty text="Nenhum alerta de prazo ou retrabalho registrado no período."/>}</div>
                  </div>
                  <div className="panel"><PanelHead title="Agenda por dia" subtitle="Volume previsto e atendimentos que avançaram"/><div className="daily-report">{[...new Set(reportOrders.map(o=>o.scheduled_date))].sort().map(day=>{
                      const list=reportOrders.filter(o=>o.scheduled_date===day);
                      return <div className="day-tile" key={day}><span>{friendlyDate(day)}</span><strong>{list.length}</strong><small>{list.filter(o=>o.stage!=='Agendado').length} avançados</small></div>;
                    })}</div></div>
                  </>}
                  <div className="report-footnote">Importante: horas e custos aparecem somente quando registrados; lucro líquido exige despesas fixas, tributos e outras apropriações. O atraso compara a entrega prometida com o horário atual. Indicadores não devem tratar dados ausentes como zero.</div>
                </div>
              )}

              {page === 'Funcionários' && ['proprietario','administrativo'].includes(role) && (
                <div className="staff-layout">
                  <section className="panel settings-card">
                    <h3>Pré-cadastro de funcionário</h3>
                    <p>O administrativo solicita; o proprietário aprova. A aprovação NÃO cria senha ou acesso automaticamente.</p>
                    <form onSubmit={submitStaff} className="staff-form">
                      <label className="field"><span>Nome completo</span><input required value={staffDraft.full_name} onChange={e=>setStaffDraft(v=>({...v,full_name:e.target.value}))}/></label>
                      <label className="field"><span>Usuário desejado</span><input required placeholder="ex.: joao.silva" value={staffDraft.username} onChange={e=>setStaffDraft(v=>({...v,username:e.target.value}))}/></label>
                      <label className="field"><span>Cargo</span><select value={staffDraft.role} onChange={e=>setStaffDraft(v=>({...v,role:e.target.value}))}><option value="tecnico">Técnico</option><option value="lider">Líder de oficina</option><option value="administrativo">Administrativo</option></select></label>
                      <button type="submit" className="btn primary"><Plus size={16}/> Enviar para aprovação</button>
                    </form>
                  </section>
                  <section className="panel settings-card">
                    {role==='proprietario'&&<div className="access-request-section"><h3>Solicitações pela tela de login</h3><p>Por segurança, aprovar não cria automaticamente a conta. Crie o usuário no Supabase e associe o perfil após conferir a identidade.</p>{publicAccessRequests.map(r=><div className="staff-request" key={r.id}><div><strong>{r.full_name}</strong><small>@{r.username} · {r.contact_email} · {roleLabel[r.desired_role]} · {r.status}</small>{r.reason&&<small>{r.reason}</small>}</div>{r.status==='pendente'&&<div className="staff-actions"><button className="btn ghost" onClick={()=>reviewPublicAccess(r,'aprovado')}>Aprovar</button><button className="btn dangerous" onClick={()=>reviewPublicAccess(r,'rejeitado')}>Recusar</button></div>}</div>)}{!publicAccessRequests.length&&<p>Não há solicitações externas.</p>}</div>}
                    <h3>Solicitações e avaliação</h3>
                    <p>Somente o proprietário pode aprovar. Contas reais devem ser provisionadas com segurança no Supabase.</p>
                    {staffRequests.map(r=><div className="staff-request" key={r.id}><div><strong>{r.full_name}</strong><small>@{r.username} · {roleLabel[r.role]} · {r.status}</small></div>{role==='proprietario'&&r.status==='pendente'&&<div className="staff-actions"><button className="btn ghost" onClick={()=>approveStaff(r,'aprovado')}>Aprovar</button><button className="btn dangerous" onClick={()=>approveStaff(r,'rejeitado')}>Recusar</button></div>}</div>)}
                    {!staffRequests.length&&<p>Nenhum pré-cadastro registrado.</p>}
                  </section>
                </div>
              )}
              {page === 'Configurações' && (
                <div className="settings-grid">
                  <div className="panel settings-card">
                    <h3>Ambiente de dados</h3>
                    <p>
                      {configured
                        ? 'Supabase ativo. Os dados ficam na tabela orders e exigem autenticação.'
                        : 'Modo demonstração. Dados armazenados somente neste navegador.'}
                    </p>
                    <button className="btn ghost" onClick={refresh}>
                      <RefreshCcw size={16} /> Atualizar dados
                    </button>
                    {!configured && <button className="btn primary" onClick={async()=>{
                      const ids=new Set(orders.map(x=>x.id));
                      const next=[...orders,...testAppointments.filter(x=>!ids.has(x.id))];
                      await persist(next);
                      toast('24 chamados fictícios adicionados para 21, 22 e 23/10/2026.');
                    }}>Carregar 24 chamados de teste</button>}
                  </div>
                  <div className="panel settings-card">
                    <h3>Observação da versão</h3>
                    <p>
                      Versão focada em recepção, agenda, fluxo de oficina, passaporte de veículos e
                      WhatsApp. Sem áreas de acesso por cargo por enquanto.
                    </p>
                    <div className="setting-note">
                      <AlertCircle size={16} /> Próximo passo sugerido: perfis por cargo, anexos em
                      Storage e dashboards avançados.
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {editing && canEditOS && <EditModal order={editing} onClose={() => setEditing(null)} onSave={save} />}
      {selected && !editing && (
        <Detail
          order={selected}
          all={orders}
          onClose={() => setSelected(null)}
          onPatch={patch}
          onEdit={() => canEditOS&&setEditing(selected)}
          onDelete={() => del(selected)}
          tab={detailTab}
          setTab={setDetailTab}
          onNotice={toast}
        />
      )}
      {clientSelected && !clientEditing && <CustomerDetail c={customerCards.find(c=>c.id===clientSelected.id)||clientSelected}
        onClose={()=>setClientSelected(null)} onEdit={()=>canManageClients&&setClientEditing(clientSelected)} openOS={o=>{setClientSelected(null);setSelected(o)}}/>}
      {clientEditing && canManageClients && <CustomerEdit value={clientEditing} onClose={()=>setClientEditing(null)} onSave={saveClient}/>}
      {notice && <div className="toast">{notice}</div>}
    </div>
  );
}

function Metric({label,value,helper}) { return <div className="report-metric"><span>{label}</span><strong>{value}</strong><small>{helper}</small></div> }

function CustomerEdit({value,onClose,onSave}) {
  const [c,setC]=useState(value);
  const [saving,setSaving]=useState(false);
  const update=(key,v)=>setC(p=>({...p,[key]:v}));
  return <div className="overlay" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><div className="modal edit-modal">
    <div className="modal-head"><div><span className="eyebrow">SANTI CARE</span><h2>{c.id?'Editar cliente':'Novo cliente'}</h2></div><button className="icon-btn" onClick={onClose}><X/></button></div>
    <form onSubmit={async e=>{e.preventDefault();setSaving(true);await onSave(c);setSaving(false)}}>
    <div className="form-body"><div className="form-grid"><Field label="Nome *"><input required value={c.name} onChange={e=>update('name',e.target.value)}/></Field>
    <Field label="WhatsApp *"><input required value={c.phone} onChange={e=>update('phone',e.target.value)}/></Field>
    <Field label="E-mail"><input type="email" value={c.email||''} onChange={e=>update('email',e.target.value)}/></Field></div>
    <Field label="Observações e preferências"><textarea rows="4" value={c.notes||''} onChange={e=>update('notes',e.target.value)}/></Field>
    <label className="payment-toggle"><input type="checkbox" checked={!!c.marketing_opt_in} onChange={e=>update('marketing_opt_in',e.target.checked)}/> Cliente autorizou receber ofertas e comunicações promocionais</label>
    <p className="hint">Cadastro de contato não equivale a autorização para marketing. Registre o consentimento real. Integração automática do WhatsApp não está ativa.</p></div>
    <div className="modal-actions"><button className="btn ghost" type="button" onClick={onClose}>Cancelar</button><button disabled={saving} className="btn primary" type="submit"><Save size={16}/>{saving?'Salvando...':'Salvar cliente'}</button></div></form></div></div>
}

function CustomerDetail({c,onClose,onEdit,openOS}) {
  const list=[...(c.related||[])].sort((a,b)=>b.scheduled_date.localeCompare(a.scheduled_date));
  return <div className="overlay" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><div className="modal detail-modal">
    <div className="modal-head"><div><span className="eyebrow">SANTI CARE / BASE DE CLIENTES</span><h2>{c.name}</h2><p>{c.phone} {c.email?'· '+c.email:''}</p></div><button className="icon-btn" onClick={onClose}><X/></button></div>
    <div className="detail-content"><div className="client-summary"><div><small>Veículos</small><strong>{c.vehicles?.size||0}</strong></div><div><small>Atendimentos</small><strong>{list.length}</strong></div><div><small>Marketing autorizado</small><strong>{c.marketing_opt_in?'Sim':'Não'}</strong></div></div>
    <section className="mini-panel"><h3>Preferências e observações</h3><p>{c.notes||'Sem observações cadastradas.'}</p></section>
    <h3>Histórico de atendimentos</h3>{list.map(o=><button key={o.id} className="client-order" onClick={()=>openOS(o)}><div><strong>{o.vehicle} · {o.plate}</strong><small>{o.id} · {friendlyDate(o.scheduled_date)} · {o.service}</small></div><Badge stage={o.stage}/><ChevronRight size={15}/></button>)}
    {!list.length&&<Empty text="Este cliente ainda não tem ordens de serviço."/>}
    </div><div className="modal-actions"><button className="btn ghost" onClick={onEdit}>Editar cadastro</button><button className="btn primary" onClick={onClose}>Fechar</button></div>
  </div></div>
}

function PanelHead({ title, subtitle, action }) {
  return (
    <div className="panel-head">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

function Stat({ icon: Icon, label, value, color, foot }) {
  return (
    <div className="stat" style={{ '--accent': color }}>
      <div className="stat-head">
        <span>{label}</span>
        <Icon size={18} />
      </div>
      <strong>{value}</strong>
      <small>{foot}</small>
    </div>
  );
}

function Empty({ text }) {
  return <div className="empty-col">{text}</div>;
}

function OrderTable({ list, open }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>VEÍCULO</th>
            <th>CLIENTE</th>
            <th>AGENDAMENTO</th>
            <th>ETAPA</th>
            <th>RESPONSÁVEL</th>
            <th>VALOR</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {list.map((o) => (
            <tr key={o.id} onClick={() => open(o)} className="click-row">
              <td>
                <strong>{o.vehicle}</strong>
                <small>
                  {o.id} · {o.plate}
                </small>
              </td>
              <td>{o.customer_name}</td>
              <td>
                {friendlyDate(o.scheduled_date)} <small>{o.scheduled_time}</small>
              </td>
              <td>
                <Badge stage={o.stage} />
              </td>
              <td>{o.mechanic || '—'}</td>
              <td>{formatMoney(o.price)}</td>
              <td>
                <ChevronRight size={16} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {list.length === 0 && <Empty text="Nenhum atendimento encontrado." />}
    </div>
  );
}

function EditModal({ order, onClose, onSave }) {
  const [f, setF] = useState(order);
  const [saving, setSaving] = useState(false);

  const update = (k, v) => setF((x) => ({ ...x, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave(f);
    setSaving(false);
  };

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal edit-modal">
        <div className="modal-head">
          <div>
            <span className="eyebrow">SANTI CTA / ATENDIMENTO</span>
            <h2>{order.id ? 'Editar ordem de serviço' : 'Nova ordem de serviço'}</h2>
          </div>
          <button className="icon-btn" onClick={onClose}>
            <X />
          </button>
        </div>

        <form onSubmit={submit}>
          <div className="form-body">
            <h3>Cliente e veículo</h3>
            <div className="form-grid">
              <Field label="Nome do cliente *">
                <input value={f.customer_name} onChange={(e) => update('customer_name', e.target.value)} required />
              </Field>
              <Field label="WhatsApp (DDD + número) *">
                <input
                  value={f.phone}
                  onChange={(e) => update('phone', e.target.value)}
                  placeholder="5598999999999"
                  required
                />
              </Field>
              <Field label="Placa *">
                <input
                  value={f.plate}
                  onChange={(e) => update('plate', e.target.value.toUpperCase())}
                  maxLength={8}
                  placeholder="ABC1D23"
                  required
                />
              </Field>
              <Field label="Veículo *">
                <input
                  value={f.vehicle}
                  onChange={(e) => update('vehicle', e.target.value)}
                  placeholder="Ex.: Toyota Corolla"
                  required
                />
              </Field>
              <Field label="Ano">
                <input value={f.year || ''} onChange={(e) => update('year', e.target.value)} />
              </Field>
              <Field label="Técnico responsável">
                <input value={f.mechanic || ''} onChange={(e) => update('mechanic', e.target.value)} />
              </Field>
            </div>

            <h3>Serviço e agenda</h3>
            <div className="form-grid">
              <Field label="Serviço">
                <select value={f.service} onChange={(e) => update('service', e.target.value)}>
                  {SERVICES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field label="Etapa atual">
                <select value={f.stage} onChange={(e) => update('stage', e.target.value)}>
                  {STAGES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field label="Data">
                <input type="date" value={f.scheduled_date || ''} onChange={(e) => update('scheduled_date', e.target.value)} />
              </Field>
              <Field label="Horário">
                <input type="time" value={f.scheduled_time || ''} onChange={(e) => update('scheduled_time', e.target.value)} />
              </Field>
              <Field label="Valor previsto / final (R$)">
                <input type="number" step="0.01" min="0" value={f.price} onChange={(e) => update('price', e.target.value)} />
              </Field>
              <Field label="Pagamento">
                <select value={String(!!f.paid)} onChange={(e) => update('paid', e.target.value === 'true')}>
                  <option value="false">Em aberto</option>
                  <option value="true">Pago</option>
                </select>
              </Field>
            </div>

            <h3>Produtividade e controle</h3>
            <div className="form-grid">
              <Field label="Horas previstas (h)"><input type="number" min="0" step="0.25" value={f.estimated_hours??''} onChange={e=>update('estimated_hours',e.target.value)}/></Field>
              <Field label="Horas efetivamente trabalhadas (h)"><input type="number" min="0" step="0.25" value={f.worked_hours??''} onChange={e=>update('worked_hours',e.target.value)}/></Field>
              {order.id && (String(f.worked_hours??'')!==String(order.worked_hours??'') || String(f.estimated_hours??'')!==String(order.estimated_hours??'')) && <Field label="Motivo da correção das horas *"><input required value={f.hours_change_reason||''} onChange={e=>update('hours_change_reason',e.target.value)} placeholder="Ex.: apontamento corrigido após conferência" /></Field>}
              <Field label="Custo direto do serviço (R$)"><input type="number" min="0" step="0.01" value={f.direct_cost??''} onChange={e=>update('direct_cost',e.target.value)}/></Field>
              <Field label="Entrega prometida"><input type="datetime-local" value={f.promised_at?String(f.promised_at).slice(0,16):''} onChange={e=>update('promised_at',e.target.value||null)}/></Field>
              <Field label="Retorno por falha no reparo"><select value={String(!!f.rework)} onChange={e=>update('rework',e.target.value==='true')}><option value="false">Não</option><option value="true">Sim — retrabalho</option></select></Field>
            </div>
            <p className="hint">Horas trabalhadas são lançamentos manuais nesta versão; custo direto não inclui despesas fixas nem tributos.</p>
            <Field label="Queixa ou solicitação">
              <textarea rows="3" value={f.description || ''} onChange={(e) => update('description', e.target.value)} />
            </Field>
            <Field label="Diagnóstico técnico">
              <textarea rows="3" value={f.diagnosis || ''} onChange={(e) => update('diagnosis', e.target.value)} />
            </Field>
            <Field label="Peças utilizadas / serviços executados">
              <textarea rows="3" value={f.parts || ''} onChange={(e) => update('parts', e.target.value)} />
            </Field>
            <Field label="Observações internas">
              <textarea rows="2" value={f.notes || ''} onChange={(e) => update('notes', e.target.value)} />
            </Field>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn ghost" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="btn primary">
              <Save size={16} />
              {saving ? 'Salvando...' : 'Salvar atendimento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Detail({ order: o, all, onClose, onPatch, onEdit, onDelete, tab, setTab, onNotice }) {
  const vehicleHistory = all.filter((x) => x.plate === o.plate).sort((a, b) => b.scheduled_date.localeCompare(a.scheduled_date));
  const [photoTitle, setPhotoTitle] = useState('');

  const addPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (configured) {
      onNotice('Fotos em produção exigem Supabase Storage privado. Nesta versão, use o diagnóstico textual e o relatório.');
      return;
    }
    if (file.size > 900000) {
      onNotice('Use imagem de até 900 KB no modo demo.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onPatch(o, { photos: [...(o.photos || []), { name: photoTitle || file.name, url: reader.result }] });
    reader.readAsDataURL(file);
  };

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal detail-modal">
        <div className="modal-head">
          <div>
            <span className="eyebrow">ORDEM DE SERVIÇO · {o.id}</span>
            <h2>
              {o.vehicle} <span className="muted">· {o.plate}</span>
            </h2>
            <p>
              {o.customer_name} · {o.phone}
            </p>
          </div>
          <button className="icon-btn" onClick={onClose}>
            <X />
          </button>
        </div>

        <div className="detail-summary">
          <Badge stage={o.stage} />
          <span>
            <CalendarDays size={15} />
            {friendlyDate(o.scheduled_date)} · {o.scheduled_time}
          </span>
          <span>
            <Wrench size={15} />
            {o.mechanic || 'Sem técnico'}
          </span>
          <strong>{formatMoney(o.price)}</strong>
        </div>

        <div className="detail-tabs">
          {['Resumo', 'Histórico', 'Fotos', 'Relatório'].map((t) => (
            <button key={t} onClick={() => setTab(t)} className={tab === t ? 'active' : ''}>
              {t}
            </button>
          ))}
        </div>

        <div className="detail-content">
          {tab === 'Resumo' && (
            <div className="detail-grid">
              <div>
                <section className="mini-panel">
                  <h3>Descrição da solicitação</h3>
                  <p>{o.description || 'Sem descrição.'}</p>
                </section>
                <section className="mini-panel">
                  <h3>Diagnóstico</h3>
                  <p>{o.diagnosis || 'Diagnóstico não registrado.'}</p>
                </section>
                <section className="mini-panel">
                  <h3>Peças e serviços</h3>
                  <p>{o.parts || 'Nenhum item registrado.'}</p>
                </section>
                <section className="mini-panel">
                  <h3>Observações internas</h3>
                  <p>{o.notes || 'Sem observações.'}</p>
                </section>
              </div>
              <div>
                <section className="mini-panel">
                  <h3>Atualizar etapa</h3>
                  <select className="status-select" value={o.stage} onChange={(e) => onPatch(o, { stage: e.target.value })}>
                    {STAGES.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                  <small>O estágio pode ser alterado aqui ou no Kanban. O histórico é atualizado automaticamente. O WhatsApp continua manual.</small>
                  <button className="btn ghost stretch" style={{marginTop:12}} onClick={onEdit}><Wrench size={16}/> Editar os dados completos</button>
                </section>
                <section className="mini-panel">
                  <h3>Pagamento</h3>
                  <select className="status-select" value={o.paid ? 'pago' : 'aberto'} onChange={(e)=>onPatch(o,{paid:e.target.value==='pago'})}>
                    <option value="aberto">Pagamento em aberto</option>
                    <option value="pago">Pagamento concluído</option>
                  </select>
                </section>
                <section className="mini-panel">
                  <h3>Ações rápidas</h3>
                  <a className="btn whatsapp" href={waLink(o)} target="_blank" rel="noreferrer">
                    <MessageCircle size={17} /> Avisar cliente no WhatsApp <ExternalLink size={14} />
                  </a>
                  <button className="btn ghost stretch" onClick={() => setTab('Relatório')}>
                    <FileText size={17} /> Abrir relatório técnico
                  </button>
                </section>
              </div>
            </div>
          )}

          {tab === 'Histórico' && (
            <div>
              <h3>Passaporte digital · {o.plate}</h3>
              <p className="hint">Histórico de ordens para este veículo e eventos da OS atual.</p>
              <div className="timeline">
                {[...(o.history || [])].reverse().map((h, i) => (
                  <div className="timeline-item" key={i}>
                    <span className="timeline-dot" />
                    <div>
                      <strong>{h.text}</strong>
                      <small>{h.at}</small>
                    </div>
                  </div>
                ))}
              </div>
              <h3>Visitas deste veículo</h3>
              {vehicleHistory.map((x) => (
                <div className="history-visit" key={x.id}>
                  <strong>
                    {x.id} · {friendlyDate(x.scheduled_date)}
                  </strong>
                  <span>
                    {x.service} — {x.stage}
                  </span>
                </div>
              ))}
            </div>
          )}

          {tab === 'Fotos' && (
            <div>
              <h3>Evidências fotográficas</h3>
              <p className="hint">No modo de demonstração, fotos pequenas ficam no navegador. No modo Supabase, o armazenamento de imagens requer uma etapa adicional de configuração segura.</p>
              {!configured && (
                <div className="photo-actions">
                  <input placeholder="Descrição da foto" value={photoTitle} onChange={(e) => setPhotoTitle(e.target.value)} />
                  <label className="btn ghost">
                    <Camera size={17} /> Adicionar foto
                    <input type="file" accept="image/*" hidden onChange={addPhoto} />
                  </label>
                </div>
              )}
              <div className="photos">
                {(o.photos || []).map((p, i) => (
                  <div className="photo" key={i}>
                    <img src={p.url} alt={p.name} />
                    <small>{p.name}</small>
                  </div>
                ))}
              </div>
              {!(o.photos || []).length && <Empty text="Nenhuma fotografia anexada." />}
            </div>
          )}

          {tab === 'Relatório' && (
            <div className="report-preview">
              <div className="report-white" id="printable-report">
                <div className="report-header">
                  <div>
                    <h2>SANTI CTA</h2>
                    <p>CENTRO TÉCNICO AUTOMOTIVO</p>
                  </div>
                  <strong>RELATÓRIO TÉCNICO</strong>
                </div>
                <div className="report-meta">
                  <p><b>ORDEM:</b> {o.id}</p>
                  <p><b>CLIENTE:</b> {o.customer_name}</p>
                  <p><b>VEÍCULO:</b> {o.vehicle} · {o.plate} · {o.year || '—'}</p>
                  <p><b>DATA:</b> {friendlyDate(o.scheduled_date)}</p>
                  <p><b>TÉCNICO:</b> {o.mechanic || '—'}</p>
                  <p><b>VALOR REGISTRADO:</b> {formatMoney(o.price)}</p>
                </div>
                <h4>QUEIXA INFORMADA</h4>
                <p>{o.description || 'Não registrada.'}</p>
                <h4>DIAGNÓSTICO</h4>
                <p>{o.diagnosis || 'Não registrado.'}</p>
                <h4>PEÇAS E SERVIÇOS</h4>
                <p>{o.parts || 'Não registrados.'}</p>
                <h4>ETAPA</h4>
                <p>{o.stage}</p>
                {(o.photos || []).length > 0 && (
                  <>
                    <h4>FOTOS ANEXADAS</h4>
                    <div className="report-photos">
                      {o.photos.map((p, i) => (
                        <img key={i} src={p.url} alt={p.name} />
                      ))}
                    </div>
                  </>
                )}
                <div className="report-legal">Este documento resume informações registradas no sistema. Nota fiscal, termos de garantia e autorização de serviços são documentos próprios e devem ser emitidos conforme a legislação aplicável.</div>
              </div>
              <button className="btn primary print-action" onClick={() => window.print()}>
                <Printer size={17} /> Imprimir / Salvar como PDF
              </button>
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button className="btn dangerous outline" onClick={onDelete}>
            <Trash2 size={16} /> Excluir
          </button>
          <div className="flex-spacer" />
          <button className="btn ghost" onClick={onEdit}>
            <Wrench size={16} /> Editar OS
          </button>
          <button className="btn primary" onClick={onClose}>Concluir</button>
        </div>
      </div>
    </div>
  );
}

export default App;
