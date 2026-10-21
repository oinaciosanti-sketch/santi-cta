import {createClient} from '@supabase/supabase-js';
import {seed} from './data';
const url=import.meta.env.VITE_SUPABASE_URL,key=import.meta.env.VITE_SUPABASE_ANON_KEY;
export const configured=Boolean(url&&key&&!url.includes('SEU-PROJETO'));
export const supabase=configured?createClient(url,key):null;
const DEMO_KEY='santi-cta-demo-v1';
const CUSTOMERS_KEY='santi-cta-customers-v3';
const clone=v=>JSON.parse(JSON.stringify(v));
export function demoRead(){try{const p=localStorage.getItem(DEMO_KEY);return p?JSON.parse(p):clone(seed)}catch{return clone(seed)}}
export function demoWrite(rows){localStorage.setItem(DEMO_KEY,JSON.stringify(rows))}
export async function getOrders(){if(!configured)return demoRead();const{data,error}=await supabase.from('orders').select('*').order('created_at',{ascending:false});if(error)throw error;return data||[]}
export async function saveOrder(o){if(!configured)return;const{error}=await supabase.from('orders').upsert(o);if(error)throw error}
export async function removeOrder(id){if(!configured)return;const{error}=await supabase.from('orders').delete().eq('id',id);if(error)throw error}
export async function getCustomers(){if(!configured){try{return JSON.parse(localStorage.getItem(CUSTOMERS_KEY)||'[]')}catch{return []}}
  const {data,error}=await supabase.from('customers').select('*').order('created_at',{ascending:false});if(error)throw error;return data||[]}
export async function saveCustomer(c){if(!configured){const list=await getCustomers();localStorage.setItem(CUSTOMERS_KEY,JSON.stringify([c,...list.filter(x=>x.id!==c.id)]));return}
  const{error}=await supabase.from('customers').upsert(c);if(error)throw error}
