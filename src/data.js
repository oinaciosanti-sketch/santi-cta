export const STAGES = [
  'Agendado',
  'Recebido',
  'Em análise',
  'Em manutenção',
  'Higienização',
  'Pronto para entrega',
  'Concluído',
];

export const COLORS = {
  'Agendado': '#5b91ff',
  'Recebido': '#42b8e8',
  'Em análise': '#efad4a',
  'Em manutenção': '#ef6f4c',
  'Higienização': '#53bdb9',
  'Pronto para entrega': '#5bc88c',
  'Concluído': '#7d8d9e',
};

export const SERVICES = [
  'Revisão preventiva',
  'Diagnóstico eletrônico',
  'Freios',
  'Suspensão',
  'Troca de óleo',
  'Ar-condicionado',
  'Motor',
  'Elétrica',
  'Outros',
];

export const nowLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
};

const day = nowLocal();

export const seed = [
  {
    id: 'S-1024',
    customer_name: 'Marcos Oliveira',
    phone: '5598999991201',
    plate: 'ABC1D23',
    vehicle: 'Toyota Corolla',
    year: '2020',
    service: 'Revisão preventiva',
    description: 'Revisão dos 40.000 km e vibração na frenagem.',
    stage: 'Agendado',
    scheduled_date: day,
    scheduled_time: '08:00',
    mechanic: 'Lucas',
    price: 850,
    paid: false,
    notes: 'Cliente prefere atualizações pelo WhatsApp.',
    diagnosis: '',
    parts: '',
    photos: [],
    history: [],
  },
  {
    id: 'S-1025',
    customer_name: 'Fernanda Lima',
    phone: '5598999991202',
    plate: 'FRT3A21',
    vehicle: 'Volkswagen T-Cross',
    year: '2023',
    service: 'Diagnóstico eletrônico',
    description: 'Luz de injeção acesa.',
    stage: 'Recebido',
    scheduled_date: day,
    scheduled_time: '09:30',
    mechanic: 'Bruno',
    price: 0,
    paid: false,
    notes: '',
    diagnosis: '',
    parts: '',
    photos: [],
    history: [],
  },
  {
    id: 'S-1026',
    customer_name: 'Roberto Alves',
    phone: '5598999991203',
    plate: 'PZX1C90',
    vehicle: 'Fiat Toro',
    year: '2021',
    service: 'Freios',
    description: 'Ruído ao acionar o pedal de freio.',
    stage: 'Em análise',
    scheduled_date: day,
    scheduled_time: '10:00',
    mechanic: 'Carlos',
    price: 460,
    paid: false,
    notes: '',
    diagnosis: 'Desgaste das pastilhas dianteiras; confirmar discos.',
    parts: '',
    photos: [],
    history: [],
  },
  {
    id: 'S-1027',
    customer_name: 'Patrícia Nogueira',
    phone: '5598999991204',
    plate: 'VSA5H44',
    vehicle: 'Toyota Hilux',
    year: '2022',
    service: 'Suspensão',
    description: 'Estalos e vibração na dianteira.',
    stage: 'Em análise',
    scheduled_date: day,
    scheduled_time: '10:30',
    mechanic: 'Lucas',
    price: 1280,
    paid: false,
    notes: 'Aguardando fechamento de orçamento com o cliente.',
    diagnosis: 'Necessário substituir componentes após autorização.',
    parts: '',
    photos: [],
    history: [],
  },
  {
    id: 'S-1028',
    customer_name: 'Leandro Souza',
    phone: '5598999991205',
    plate: 'GHT2C18',
    vehicle: 'Honda Civic',
    year: '2019',
    service: 'Troca de óleo',
    description: 'Revisão e troca de óleo.',
    stage: 'Em manutenção',
    scheduled_date: day,
    scheduled_time: '11:00',
    mechanic: 'Rafael',
    price: 390,
    paid: false,
    notes: '',
    diagnosis: 'Troca programada.',
    parts: 'Óleo 0W-20; filtro de óleo',
    photos: [],
    history: [],
  },
  {
    id: 'S-1029',
    customer_name: 'Natália Ferreira',
    phone: '5598999991206',
    plate: 'RDN7H32',
    vehicle: 'Volkswagen Nivus',
    year: '2024',
    service: 'Ar-condicionado',
    description: 'Higienização e verificação.',
    stage: 'Higienização',
    scheduled_date: day,
    scheduled_time: '13:30',
    mechanic: 'Rafael',
    price: 320,
    paid: true,
    notes: '',
    diagnosis: 'Serviço concluído.',
    parts: 'Filtro de cabine',
    photos: [],
    history: [],
  },
  {
    id: 'S-1030',
    customer_name: 'André Castro',
    phone: '5598999991207',
    plate: 'FQW8E21',
    vehicle: 'Toyota SW4',
    year: '2020',
    service: 'Suspensão',
    description: 'Revisão do conjunto traseiro.',
    stage: 'Pronto para entrega',
    scheduled_date: day,
    scheduled_time: '14:00',
    mechanic: 'Bruno',
    price: 980,
    paid: true,
    notes: '',
    diagnosis: 'Bucha substituída.',
    parts: 'Bucha traseira',
    photos: [],
    history: [],
  },
];

export const formatMoney = (n) =>
  (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const normalizePhone = (v) => {
  const d = String(v || '').replace(/\D/g, '');
  return d.startsWith('55') ? d : `55${d}`;
};

export const stageMessage = (o) =>
  (
    {
      Agendado: `Seu atendimento está agendado para ${o.scheduled_date?.split('-').reverse().join('/')} às ${o.scheduled_time}.`,
      Recebido: 'Seu veículo chegou à SANTI e foi recebido com segurança.',
      'Em análise': 'Nossa equipe iniciou a análise técnica do seu veículo.',
      'Em manutenção': 'O serviço autorizado está em execução.',
      Higienização: 'Seu veículo está na etapa final de higienização e conferência.',
      'Pronto para entrega': 'Seu veículo está pronto para entrega. Entre em contato para combinar a retirada.',
      Concluído: 'Obrigado por confiar na SANTI! Conte conosco.',
    }[o.stage] || 'Atualização do atendimento.'
  );

export const waLink = (o) =>
  `https://wa.me/${normalizePhone(o.phone)}?text=${encodeURIComponent(
    `Olá, ${o.customer_name?.split(' ')[0]}! Aqui é da SANTI CTA. 🚗\nOS ${o.id} • ${o.vehicle} (${o.plate})\n${stageMessage(o)}\nQualquer dúvida, estamos à disposição.`,
  )}`;
