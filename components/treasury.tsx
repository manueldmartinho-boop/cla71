'use client';
import Link from 'next/link';
import FormDialog from './form-dialog';
import CreditForm from './credit-form';
import {personalTypeEntry} from '@/lib/finance';
import { useState, type FormEvent } from 'react';
import { ArrowRight, Banknote, Check, Coins, Landmark, Plus, Users, X } from 'lucide-react';
import type { Data } from '@/lib/data';
import { allocate, emptyTreasury, financialPeople, isBankType, typeBalance, type Allocation, type Entry, type Treasury, type MoneyType } from '@/lib/treasury';
const euro=(c:number)=>new Intl.NumberFormat('pt-PT',{style:'currency',currency:'EUR'}).format(c/100);
const today=()=>new Date().toLocaleDateString('sv-SE');
type FormMode='type'|'credit'|'expense'|null;
function MoneyIcon({name}:{name:string}){const bank=isBankType(name);const Icon=bank?Landmark:Banknote;const label=bank?'Banco':'Notas';return <span className="money-icon" role="img" aria-label={label} title={label}><Icon size={17} aria-hidden="true"/></span>;}

type Proposal={rows:Allocation[];cents:number;description:string;signature:string};
export default function TreasuryPanel({data,onSave,canWrite,personId}:{data:Data;onSave:(next:Data)=>Promise<boolean>;canWrite:boolean;personId?:string}){
 const t=data.treasury??emptyTreasury;
 const [tab,setTab]=useState<'balances'|'rules'|'history'>('balances');
 const [form,setForm]=useState<FormMode>(null);
 const [edit,setEdit]=useState<MoneyType|null>(null);
 const [selected,setSelected]=useState<string[]>([]);
 const [proposal,setProposal]=useState<Proposal|null>(null);
 const [notice,setNotice]=useState('');
 const [busy,setBusy]=useState(false);
 const [charge,setCharge]=useState(false);
 const [search,setSearch]=useState('');
 const [order,setOrder]=useState('name');const [sortType,setSortType]=useState('total');
 const rulesFor=(id:string)=>t.typologies.filter(c=>c.typeId===id);
 const typeName=(id:string)=>t.types.find(g=>g.id===id)?.name??'Tipo de dinheiro';
 const entryType=(id:string)=>t.typologies.find(c=>c.id===id)?.typeId??'';
 const active=t.people.filter(p=>p.active&&(!personId||p.id===personId));
 const visiblePeople=financialPeople(t).filter(p=>!personId||p.id===personId);
 const visibleEntries=t.entries.filter(e=>!personId||e.personId===personId);
 async function save(next:Treasury){setBusy(true);try{return await onSave({...data,treasury:next});}finally{setBusy(false);}}
 function open(mode:FormMode,type:MoneyType|null=null){setForm(mode);setEdit(type);setNotice('');}
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(!canWrite||busy)return;const f=new FormData(e.currentTarget);const v=(k:string)=>String(f.get(k)??'').trim();let next=structuredClone(t);const id=crypto.randomUUID();setNotice('');
  if(form==='type'){
   if(next.types.some(p=>p.id!==edit?.id&&p.name.toLocaleLowerCase('pt')===v('name').toLocaleLowerCase('pt'))){setNotice('Esse tipo de dinheiro já existe.');return;}
   const priority=Number(v('priority'));if(!Number.isSafeInteger(priority)||priority<0||priority>9999){setNotice('Indica uma prioridade válida.');return;}
   const item={id:edit?.id??id,name:v('name')};const spendable=f.get('spendable')==='on';
   next.types=edit?next.types.map(g=>g.id===edit.id?item:g):[...next.types,item];
   if(next.typologies.some(c=>c.typeId===item.id))next.typologies=next.typologies.map(c=>c.typeId===item.id?{...c,name:item.name,priority,spendable}:c);
   else next.typologies.push({id:crypto.randomUUID(),typeId:item.id,name:item.name,priority,spendable});
  }else if(form==='expense'){
   const cents=Math.round(Number(v('amount'))*100);
   if(!Number.isSafeInteger(cents)||cents<=0||!t.people.some(p=>p.id===v('personId'))||!t.types.some(c=>c.id===v('typeId'))){setNotice('Indica uma pessoa, um tipo de dinheiro e um valor positivo.');return;}
   try{next=personalTypeEntry(data,{id,personId:v('personId'),typeId:v('typeId'),cents:-cents,description:v('description'),date:v('date'),batchId:null}).treasury!;}catch(e){setNotice(e instanceof Error?e.message:'Não foi possível registar.');return;}
  }
  if(await save(next)){setForm(null);setNotice('Registo guardado na tesouraria.');}
 }
 function generate(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setNotice('');const f=new FormData(e.currentTarget);const cents=Math.round(Number(f.get('amount'))*100);
  if(!selected.length||!Number.isSafeInteger(cents)||cents<=0){setNotice('Seleciona as pessoas e indica um valor positivo por pessoa.');return;}
  const rows=allocate(t,selected,cents);
  if(!rows.length){setNotice('Seleciona pelo menos uma pessoa ativa.');return;}
  setProposal({rows,cents,description:String(f.get('description')??'').trim(),signature:JSON.stringify(t)});
 }
 async function confirm(){
  if(!canWrite||!proposal||proposal.rows.some(r=>r.shortfall>0)||proposal.signature!==JSON.stringify(t)||busy)return;
  const batchId=crypto.randomUUID();
  const entries:Entry[]=proposal.rows.flatMap(r=>r.sources.map(s=>({id:crypto.randomUUID(),personId:r.person.id,typologyId:s.typology.id,cents:-s.cents,description:proposal.description,date:today(),batchId})));
  setBusy(true);
  try{
   const next:Data={...data,treasury:{...t,entries:[...t.entries,...entries]},movements:data.movements};
   if(await onSave(next)){setProposal(null);setCharge(false);setSelected([]);setNotice(`Retirada confirmada para ${proposal.rows.length} pessoas. Total: ${euro(proposal.cents*proposal.rows.length)}.`);}
  }finally{setBusy(false);}
 }
 const totals=new Map<string,number>();for(const e of t.entries)totals.set(e.personId,(totals.get(e.personId)??0)+e.cents);
 const amountFor=(id:string)=>sortType==='total'?(totals.get(id)??0):typeBalance(t,id,sortType);
 const sortedPeople=visiblePeople.filter(p=>p.name.toLocaleLowerCase('pt').includes(search.toLocaleLowerCase('pt'))).sort((a,b)=>{const names=a.name.localeCompare(b.name,'pt',{sensitivity:'base'});return order==='name'?names:(order==='desc'?amountFor(b.id)-amountFor(a.id):amountFor(a.id)-amountFor(b.id))||names;});
 const total=visibleEntries.reduce((s,e)=>s+e.cents,0);
 return <div className="treasury-space"><div className="treasury-intro"><div><span className="eyebrow">CADA PESSOA, AS SUAS CONTAS</span><h2>{personId?t.people.find(p=>p.id===personId)?.name:'Contas individuais'}</h2><p>Saldos separados por tipo de dinheiro, com retiradas orientadas pelas regras da tesouraria.</p></div><div className="treasury-total"><small>Total dos saldos individuais</small><strong>{euro(total)}</strong></div></div>
 <div className="treasury-toolbar"><div className="tabs"><button className={tab==='balances'?'active':''} onClick={()=>setTab('balances')}>Saldos</button><button className={tab==='rules'?'active':''} onClick={()=>setTab('rules')}>Tipos de dinheiro</button><button className={tab==='history'?'active':''} onClick={()=>setTab('history')}>Histórico</button></div>{canWrite&&<div className="treasury-actions"><button className="button secondary" disabled={!active.length||!t.typologies.length} onClick={()=>open('credit')}><Plus size={15}/>Adicionar saldo</button><button className="button secondary" disabled={!active.length||!t.typologies.length} onClick={()=>open('expense')}><Plus size={15}/>Despesa individual</button><button className="button primary" disabled={!active.length||!t.typologies.some(c=>c.spendable)} onClick={()=>{setCharge(!charge);setProposal(null);setNotice('');}}><Coins size={16}/>Retirar a cada pessoa</button></div>}</div>
 {notice&&!form&&!charge&&<div className="inline-notice" role="status">{notice}</div>}
 {!canWrite&&<div className="inline-notice">Os teus cargos permitem consultar os saldos e as regras.</div>}
 <FormDialog open={!!form&&canWrite} title="Registo individual" onClose={()=>setForm(null)}>{form==='credit'?<CreditForm data={data} onSave={onSave} personId={personId} onClose={()=>setForm(null)} onSaved={(total,count)=>{setForm(null);setNotice(`Saldo adicionado a ${count} ${count===1?'pessoa':'pessoas'}. Total: ${euro(total)}.`);}}/>:form&&<section className="panel treasury-form"><div className="panel-heading"><h2>{form==='type'?(edit?'Editar tipo de dinheiro':'Criar tipo de dinheiro'):form==='expense'?'Registar despesa individual':'Adicionar saldo individual'}</h2><button className="icon-button" aria-label="Fechar formulário" onClick={()=>setForm(null)}><X size={19}/></button></div><div className="inline-notice" role="status" hidden={!notice}>{notice}</div><form onSubmit={submit} key={`${form}-${edit?.id??''}`}>
 {form==='expense'?<><label>Pessoa<select name="personId" required>{active.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>Tipo de dinheiro<select name="typeId" required>{t.types.filter(g=>rulesFor(g.id).length).map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></label><label>Valor (€)<input type="number" name="amount" min="0.01" max="10000000" step="0.01" required/></label><label>Data<input type="date" name="date" defaultValue={today()} required/></label><label className="wide">Descrição<input name="description" required maxLength={200} placeholder="Ex.: Angariação da venda de bolos"/></label></>:<><label>Nome<input name="name" required maxLength={120} defaultValue={edit?.name} placeholder="Ex.: Rifas"/></label><label>Prioridade (menor número = usar primeiro)<input type="number" name="priority" required min="0" max="9999" step="1" defaultValue={edit?Math.min(...rulesFor(edit.id).map(c=>c.priority),9999):(t.types.length+1)*10}/></label><label className="checkbox-label"><input type="checkbox" name="spendable" defaultChecked={edit?rulesFor(edit.id).every(c=>c.spendable):true}/>Permitir retiradas automáticas deste tipo</label></>}
 <div className="wide"><button className="button primary" type="submit" disabled={busy}><Check size={15}/>{busy?'A guardar…':'Guardar'}</button></div></form></section>}
 </FormDialog><FormDialog open={charge&&canWrite} title="Retirada coletiva" onClose={()=>setCharge(false)}>{charge&&canWrite&&<section className="panel charge-panel"><div className="panel-heading"><div><h2>Retirada coletiva</h2><p>Primeiro simulamos. Só retiramos os valores depois de confirmares.</p></div><button className="icon-button" aria-label="Fechar retirada" onClick={()=>{setCharge(false);setProposal(null);}}><X size={19}/></button></div>{notice&&<div className="inline-notice" role="status">{notice}</div>}<form onSubmit={generate}><div className="charge-fields"><label>Valor por pessoa (€)<input name="amount" type="number" min="0.01" max="10000000" step="0.01" required defaultValue="2.00" onChange={()=>setProposal(null)}/></label><label>Motivo da retirada<input name="description" required maxLength={200} placeholder="Ex.: Alimentação da caminhada" onChange={()=>setProposal(null)}/></label></div><div className="participant-heading"><strong>Pessoas a incluir</strong><button type="button" className="text-link" onClick={()=>{setSelected(selected.length===active.length?[]:active.map(p=>p.id));setProposal(null);}}>{selected.length===active.length?'Desmarcar todas':'Selecionar todas'}</button></div><div className="participant-grid">{active.map(p=><label className="checkbox-label" key={p.id}><input type="checkbox" checked={selected.includes(p.id)} onChange={e=>{setSelected(e.target.checked?[...selected,p.id]:selected.filter(id=>id!==p.id));setProposal(null);}}/>{p.name}</label>)}</div><p className="form-hint">Cada retirada é uma despesa da respetiva pessoa. A caixa do Clã não é alterada.</p><button className="button primary" disabled={busy||!selected.length}><Coins size={15}/>Calcular de onde retirar <ArrowRight size={15}/></button></form>
 {proposal&&<div className="allocation-proposal"><div className="proposal-heading"><h3>Proposta / {euro(proposal.cents)} por pessoa</h3><span>{proposal.rows.length} pessoas / {euro(proposal.rows.length*proposal.cents)}</span></div><div className="table-scroll"><table><thead><tr><th>Pessoa</th><th>De onde retirar</th><th>Saldo após retirada</th><th>Falta</th></tr></thead><tbody>{proposal.rows.map(r=>{const grouped=new Map<string,number>();for(const source of r.sources)grouped.set(source.typology.typeId,(grouped.get(source.typology.typeId)??0)+source.cents);return <tr key={r.person.id}><td><strong>{r.person.name}</strong></td><td>{r.sources.length?[...grouped].map(([id,cents])=><div className="allocation-source" key={id}><span className="money-type-label"><MoneyIcon name={typeName(id)}/>{typeName(id)}</span><strong>{euro(cents)}</strong></div>):'Sem saldo elegível'}</td><td>{[...grouped].map(([id,cents])=><div key={id}>{typeName(id)}: {euro(typeBalance(t,r.person.id,id)-cents)}</div>)}</td><td><span className={`badge ${r.shortfall?'bad':'good'}`}>{r.shortfall?euro(r.shortfall):'Coberto'}</span></td></tr>;})}</tbody></table></div>{proposal.rows.some(r=>r.shortfall>0)&&<p className="auth-error">Há pessoas sem saldo suficiente nos tipos permitidos. Adiciona saldo, ajusta as regras ou desmarca essas pessoas e volta a calcular. Nenhum valor foi retirado.</p>}{proposal.signature!==JSON.stringify(t)&&<p className="auth-error">Os saldos ou as regras mudaram. Volta a calcular a proposta.</p>}<div className="proposal-confirm"><span>Só altera os saldos individuais.</span><button className="button primary" disabled={busy||proposal.signature!==JSON.stringify(t)||proposal.rows.some(r=>r.shortfall>0)} onClick={()=>void confirm()}><Check size={16}/>{busy?'A confirmar…':'Confirmar retirada'}</button></div></div>}
 </section>}
 </FormDialog>{tab==='balances'&&<section className="panel"><div className="toolbar"><input className="simple-search" aria-label="Pesquisar pessoa" placeholder="Pesquisar pessoa…" value={search} onChange={e=>setSearch(e.target.value)}/><select aria-label="Ordenar pessoas" value={order} onChange={e=>setOrder(e.target.value)}><option value="name">Ordem alfabética</option><option value="desc">Maior valor primeiro</option><option value="asc">Menor valor primeiro</option></select>{order!=='name'&&<select aria-label="Saldo a ordenar" value={sortType} onChange={e=>setSortType(e.target.value)}><option value="total">Saldo total</option>{t.types.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select>}<span className="result-count">{sortedPeople.length} pessoas</span></div><div className="table-scroll"><table><thead><tr><th>Pessoa</th>{t.types.map(g=><th key={g.id}><span className="money-type-label"><MoneyIcon name={g.name}/>{g.name}</span></th>)}<th>Total</th></tr></thead><tbody>{sortedPeople.map(p=><tr key={p.id}><td><Link className="name-button" href={'/financas/individual/'+encodeURIComponent(p.id)}>{p.name}</Link>{!p.active&&<span className="cell-sub"><span className="badge warning">Arquivada</span></span>}</td>{t.types.map(g=><td key={g.id}>{euro(typeBalance(t,p.id,g.id))}</td>)}<td><strong>{euro(totals.get(p.id)??0)}</strong></td></tr>)}</tbody></table></div>{!sortedPeople.length&&<div className="empty"><Users/>{search?'Nenhuma pessoa corresponde à pesquisa.':'Sem pessoas com contas disponíveis.'}</div>}<div className="table-footer"></div></section>}
 {tab==='rules'&&<section className="panel"><div className="panel-heading"><div><h2>Tipos de dinheiro</h2><p>As retiradas usam primeiro a menor prioridade.</p></div>{canWrite&&<button className="button primary" onClick={()=>open('type')}><Plus size={14}/>Criar tipo</button>}</div><div className="table-scroll"><table><thead><tr><th>Tipo de dinheiro</th><th>Prioridade</th><th>Retiradas automáticas</th>{canWrite&&<th/>}</tr></thead><tbody>{[...t.types].sort((a,b)=>Math.min(...rulesFor(a.id).map(c=>c.priority))-Math.min(...rulesFor(b.id).map(c=>c.priority))||a.name.localeCompare(b.name,'pt')).map(g=>{const rules=rulesFor(g.id);const priorities=[...new Set(rules.map(c=>c.priority))].sort((a,b)=>a-b);const all=rules.length>0&&rules.every(c=>c.spendable);const some=rules.some(c=>c.spendable);return <tr key={g.id}><td><strong className="money-type-label"><MoneyIcon name={g.name}/>{g.name}</strong></td><td>{priorities.join(' / ')||'—'}</td><td><span className={all?'badge good':'badge warning'}>{all?'Permitidas':some?'Parciais':'Protegido'}</span></td>{canWrite&&<td><button className="text-link" onClick={()=>open('type',g)}>Editar tipo</button></td>}</tr>;})}</tbody></table></div>{!t.types.length&&<div className="empty"><Coins/>Cria os tipos de dinheiro, como Rifas, Calendários ou Manjericos.</div>}</section>}
 {tab==='history'&&<section className="panel"><div className="panel-heading"><div><h2>Histórico individual</h2><p>Cada entrada e cada retirada, com a pessoa e a origem do dinheiro.</p></div></div><div className="table-scroll history-table"><table><thead><tr><th>Data</th><th>Pessoa</th><th>Tipo de dinheiro</th><th>Descrição</th><th>Valor</th></tr></thead><tbody>{[...visibleEntries].reverse().map(e=><tr key={e.id}><td className="nowrap">{e.date}</td><td>{t.people.find(p=>p.id===e.personId)?.name}</td><td><span className="money-type-label"><MoneyIcon name={typeName(entryType(e.typologyId))}/>{typeName(entryType(e.typologyId))}</span></td><td>{e.description}{e.batchId&&<span className="cell-sub">{e.cents>0?'Adição coletiva':'Retirada coletiva'} / {e.batchId.slice(0,8)}</span>}</td><td className={`amount ${e.cents>0?'income':'expense'}`}>{e.cents>0?'+':''}{euro(e.cents)}</td></tr>)}</tbody></table></div>{!visibleEntries.length&&<div className="empty">Ainda não há movimentos individuais.</div>}</section>}
 </div>;
}
