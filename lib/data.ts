import { demoTreasury, validateTreasury, type Treasury } from './treasury';
import { validateDirectory, type Tribe } from './people';
import {validProgress,type Progress} from './progress';
export type MaterialAlert = {id:string;kind:'missing'|'maintenance'|'note';description:string;items:{name:string;quantity:number}[];resolved:boolean;createdAt:string};
export type Material = { id: string; name: string; category: string; total: number; borrowed: number; condition: string; location: string; alerts?:MaterialAlert[] };
export type Movement = { id: string; description: string; category: string; type: 'income' | 'expense'; amount: number; date: string };
export type Loan = { id: string; materialId: string; person: string; quantity: number; due: string; returned: boolean };
export type Data = { version: 1; materials: Material[]; movements: Movement[]; loans: Loan[]; treasury?: Treasury; tribes?:Tribe[]; progress?:Progress; access?:{progressAll:boolean;financeAll:boolean;personId:string|null}; progressOverview?:{personId:string;stage:import('./progress').Stage}[] };
export const emptyData: Data = { version: 1, materials: [], movements: [], loans: [] };
export const demoData: Data = { version: 1, treasury:demoTreasury, materials: [
 {id:'m1',name:'Tenda de patrulha / 6 pessoas',category:'Campismo',total:4,borrowed:1,condition:'Bom',location:'Sede / Armário A'},
 {id:'m2',name:'Fogão de campo',category:'Cozinha',total:3,borrowed:0,condition:'Bom',location:'Sede / Armário B'},
 {id:'m3',name:'Mochila de primeiros socorros',category:'Saúde',total:2,borrowed:0,condition:'Rever',location:'Sede / Armário A'},
 {id:'m4',name:'Lanterna de campismo',category:'Campismo',total:8,borrowed:2,condition:'Bom',location:'Sede / Armário C'},
 {id:'m5',name:'Corda de sisal / 20 m',category:'Pioneirismo',total:6,borrowed:0,condition:'Bom',location:'Sede / Armário C'},
 {id:'m6',name:'Panela de campo / 10 L',category:'Cozinha',total:2,borrowed:0,condition:'Reparar',location:'Sede / Armário B'}
 ], movements: [
 {id:'t1',description:'Fundo inicial do clã',category:'Outros',type:'income',amount:650,date:'2026-09-01'},
 {id:'t2',description:'Quotas de setembro',category:'Quotas',type:'income',amount:180,date:'2026-09-15'},
 {id:'t3',description:'Material de pioneirismo',category:'Material',type:'expense',amount:87.50,date:'2026-09-20'},
 {id:'t4',description:'Venda de bolos',category:'Angariações',type:'income',amount:245,date:'2026-10-05'},
 {id:'t5',description:'Alimentação / acampamento',category:'Atividades',type:'expense',amount:132.80,date:'2026-10-12'},
 {id:'t6',description:'Quotas de outubro',category:'Quotas',type:'income',amount:180,date:'2026-10-15'},
 {id:'t7',description:'Transporte / caminhada',category:'Atividades',type:'expense',amount:65,date:'2026-10-24'}
 ], loans: [
 {id:'l1',materialId:'m1',person:'Equipa Horizonte',quantity:1,due:'2026-11-08',returned:false},
 {id:'l2',materialId:'m4',person:'Equipa Caminho',quantity:2,due:'2026-11-15',returned:false}
 ] };
export function isData(value: unknown): value is Data {
 if(!value || typeof value !== 'object') return false;
 const d = value as Data;
 if(d.version !== 1 || !Array.isArray(d.materials) || !Array.isArray(d.movements) || !Array.isArray(d.loans) || (d.treasury!==undefined&&!validateTreasury(d.treasury)) || !validateDirectory(d) || (d.progress!==undefined&&!validProgress(d.progress,(d.treasury?.people??[]).map(p=>p.id)))) return false;
 const str = (v: unknown) => typeof v === 'string' && v.length < 10000;
 const int = (v: number) => Number.isSafeInteger(v) && v >= 0;
 const date = (v: string) => str(v) && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
 return d.materials.every(m=>m&&str(m.id)&&str(m.name)&&str(m.category)&&str(m.location)&&['Bom','Rever','Reparar'].includes(m.condition)&&int(m.total)&&int(m.borrowed)&&m.borrowed<=m.total&&validAlerts(m.alerts))
 && d.movements.every(m=>m&&str(m.id)&&str(m.description)&&str(m.category)&&['income','expense'].includes(m.type)&&Number.isFinite(m.amount)&&m.amount>0&&date(m.date))
 && d.loans.every(l=>l&&str(l.id)&&str(l.person)&&d.materials.some(m=>m.id===l.materialId)&&int(l.quantity)&&l.quantity>0&&date(l.due)&&typeof l.returned==='boolean')
 && new Set(d.materials.map(m=>m.id)).size === d.materials.length
 && new Set(d.movements.map(m=>m.id)).size === d.movements.length
 && new Set(d.loans.map(l=>l.id)).size === d.loans.length
 && d.materials.every(m=>d.loans.filter(l=>l.materialId===m.id&&!l.returned).reduce((s,l)=>s+l.quantity,0)===m.borrowed);
}
export function validAlerts(alerts:unknown):boolean {
 if(alerts===undefined)return true;
 if(!Array.isArray(alerts)||new Set(alerts.map(a=>a?.id)).size!==alerts.length)return false;
 return alerts.every(a=>a&&typeof a.id==='string'&&a.id.length>0&&['missing','maintenance','note'].includes(a.kind)&&typeof a.description==='string'&&a.description.trim().length>0&&a.description.length<=2000&&typeof a.resolved==='boolean'&&typeof a.createdAt==='string'&&!Number.isNaN(Date.parse(a.createdAt))&&Array.isArray(a.items)&&(a.kind!=='missing'||a.items.length>0)&&a.items.every((i:{name:unknown;quantity:number})=>i&&typeof i.name==='string'&&i.name.trim().length>0&&i.name.length<=120&&Number.isSafeInteger(i.quantity)&&i.quantity>0&&i.quantity<=1000000));
}
