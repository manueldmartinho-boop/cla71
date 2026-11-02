export type MoneyType = { id: string; name: string };
export type Typology = { id: string; typeId: string; name: string; priority: number; spendable: boolean };
export type Person = { id: string; name: string; active: boolean; email?: string; positions?: ('material_keeper'|'guide'|'deputy_guide'|'treasurer'|'leader_viewer')[]; tribeId?:string|null };
export type Entry = { id: string; personId: string; typologyId: string; cents: number; description: string; date: string; batchId: string | null };
export type Treasury = { types: MoneyType[]; typologies: Typology[]; people: Person[]; entries: Entry[] };
export type Allocation = { person: Person; sources: { typology: Typology; cents: number }[]; shortfall: number };
export const emptyTreasury: Treasury = { types: [], typologies: [], people: [], entries: [] };
export const demoTreasury: Treasury = {
 types:[{id:'individual',name:'Individual'}],
 typologies:[{id:'angariacoes',typeId:'individual',name:'Angariações',priority:1,spendable:true},{id:'poupanca',typeId:'individual',name:'Poupança',priority:2,spendable:true},{id:'reservado',typeId:'individual',name:'Fundo reservado',priority:0,spendable:false}],
 people:[{id:'ana',name:'Ana / exemplo',active:true},{id:'joao',name:'João / exemplo',active:true},{id:'rita',name:'Rita / exemplo',active:true}],
 entries:[{id:'e1',personId:'ana',typologyId:'angariacoes',cents:150,description:'Saldo de exemplo',date:'2026-11-01',batchId:null},{id:'e2',personId:'ana',typologyId:'poupanca',cents:500,description:'Saldo de exemplo',date:'2026-11-01',batchId:null},{id:'e3',personId:'joao',typologyId:'angariacoes',cents:800,description:'Saldo de exemplo',date:'2026-11-01',batchId:null},{id:'e4',personId:'rita',typologyId:'angariacoes',cents:75,description:'Saldo de exemplo',date:'2026-11-01',batchId:null},{id:'e5',personId:'rita',typologyId:'reservado',cents:2000,description:'Saldo de exemplo',date:'2026-11-01',batchId:null}]
};
export const balance = (t: Treasury, personId: string, typologyId: string) => t.entries.filter(e => e.personId === personId && e.typologyId === typologyId).reduce((s,e) => s + e.cents, 0);
export function typeBalance(t: Treasury, personId: string, typeId: string): number {
 const ids=new Set(t.typologies.filter(c=>c.typeId===typeId).map(c=>c.id));
 return t.entries.reduce((sum,entry)=>sum+(entry.personId===personId&&ids.has(entry.typologyId)?entry.cents:0),0);
}
export const isBankType=(name:string)=>/^credito (do )?agrupamento$/.test(name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase());
export function financialPeople(t: Treasury): Person[] {
 const totals = new Map<string, number>();
 for (const entry of t.entries) totals.set(entry.personId, (totals.get(entry.personId) ?? 0) + entry.cents);
 return t.people.filter(person => person.active || (totals.get(person.id) ?? 0) !== 0);
}
export function allocate(t: Treasury, personIds: string[], cents: number): Allocation[] {
 if (!Number.isSafeInteger(cents) || cents <= 0) throw Error('Indica um valor válido em cêntimos.');
 const order = [...t.typologies].filter(c => c.spendable).sort((a,b) => a.priority-b.priority || a.name.localeCompare(b.name,'pt') || a.id.localeCompare(b.id));
 return t.people.filter(p => personIds.includes(p.id) && p.active).map(person => {
  let remaining = cents;
  const sources: Allocation['sources'] = [];
  for(const typology of order) {
   const used = Math.min(Math.max(0,balance(t,person.id,typology.id)),remaining);
   if(used>0) sources.push({typology,cents:used});
   remaining-=used;
   if(remaining===0)break;
  }
  return { person, sources, shortfall: remaining };
 });
}
export function validateTreasury(value: unknown): value is Treasury {
 if(!value || typeof value!=='object')return false;
 const t=value as Treasury;
 if(!Array.isArray(t.types)||!Array.isArray(t.typologies)||!Array.isArray(t.people)||!Array.isArray(t.entries))return false;
 const str=(s:unknown)=>typeof s==='string'&&s.trim().length>0&&s.length<=200;
 const unique=(rows:{id:string}[])=>new Set(rows.map(x=>x.id)).size===rows.length;
 if(!t.types.every(x=>x&&str(x.id)&&str(x.name))||!unique(t.types))return false;
 if(!t.people.every(x=>x&&str(x.id)&&str(x.name)&&typeof x.active==='boolean'&&(x.email===undefined||x.email===''||(typeof x.email==='string'&&x.email.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x.email)))&&(x.positions===undefined||(Array.isArray(x.positions)&&new Set(x.positions).size===x.positions.length&&x.positions.every(p=>['material_keeper','guide','deputy_guide','treasurer','leader_viewer'].includes(p)))))||!unique(t.people))return false;
 if(!t.typologies.every(x=>x&&str(x.id)&&str(x.name)&&t.types.some(g=>g.id===x.typeId)&&Number.isSafeInteger(x.priority)&&x.priority>=0&&typeof x.spendable==='boolean')||!unique(t.typologies))return false;
 if(!t.entries.every(x=>x&&str(x.id)&&str(x.description)&&Number.isSafeInteger(x.cents)&&x.cents!==0&&Math.abs(x.cents)<=1_000_000_000&&t.people.some(p=>p.id===x.personId)&&t.typologies.some(c=>c.id===x.typologyId)&&typeof x.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x.date)&&!Number.isNaN(Date.parse(x.date))&&(x.batchId===null||str(x.batchId)))||!unique(t.entries))return false;
 return t.people.every(p=>t.typologies.every(c=>balance(t,p.id,c.id)>=0));
}
