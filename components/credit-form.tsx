'use client';
import {useState,type FormEvent} from 'react';
import {Check,RotateCcw,X} from 'lucide-react';
import type {Data} from '@/lib/data';
import {euroCents,personalCredits} from '@/lib/finance';

const euro=(cents:number)=>new Intl.NumberFormat('pt-PT',{style:'currency',currency:'EUR'}).format(cents/100);
export default function CreditForm({data,onSave,onClose,onSaved,personId}:{data:Data;onSave:(next:Data)=>Promise<boolean>;onClose:()=>void;onSaved:(total:number,count:number)=>void;personId?:string}){
 const t=data.treasury;
 const people=(t?.people??[]).filter(p=>p.active&&(!personId||p.id===personId)).sort((a,b)=>a.name.localeCompare(b.name,'pt'));
 const [selected,setSelected]=useState<string[]>(personId?[personId]:[]);
 const [amount,setAmount]=useState('');
 const [exceptions,setExceptions]=useState<Record<string,string>>({});
 const [query,setQuery]=useState('');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const recipients=people.filter(p=>selected.includes(p.id));
 const visible=people.filter(p=>p.name.toLocaleLowerCase('pt').includes(query.toLocaleLowerCase('pt')));
 const values=recipients.map(p=>({personId:p.id,cents:euroCents(exceptions[p.id]??amount)}));
 const valid=!!values.length&&euroCents(amount)!==null&&values.every(r=>r.cents!==null);
 const total=values.reduce((sum,r)=>sum+(r.cents??0),0);
 function toggle(id:string,checked:boolean){
  setSelected(current=>checked?[...current,id]:current.filter(p=>p!==id));
  if(!checked)setExceptions(current=>{const next={...current};delete next[id];return next;});
 }
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(busy)return;setError('');
  if(!valid){setError('Seleciona as pessoas e preenche todos os valores.');return;}
  const form=new FormData(e.currentTarget);
  setBusy(true);
  try{
   const next=personalCredits(data,{typeId:String(form.get('typeId')),date:String(form.get('date')),description:String(form.get('description')).trim(),recipients:values.map(r=>({personId:r.personId,cents:r.cents!}))});
   if(await onSave(next))onSaved(total,values.length);
   else setError('A gravação não foi confirmada. Verifica a mensagem apresentada antes de repetir.');
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível adicionar os saldos.');}
  finally{setBusy(false);}
 }
 return <section className="panel treasury-form credit-form">
  <div className="panel-heading"><h2>Adicionar saldo individual</h2><button type="button" className="icon-button" aria-label="Fechar adição de saldo" onClick={onClose} disabled={busy}><X size={19}/></button></div>
  {error&&<p className="auth-error" role="alert">{error}</p>}
  <form onSubmit={submit}>
   <fieldset disabled={busy} className="credit-fields">
    <label>Tipo de dinheiro<select name="typeId" required>{t?.types.filter(g=>t.typologies.some(c=>c.typeId===g.id)).map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></label>
    <label>Data<input name="date" type="date" required defaultValue={new Date().toLocaleDateString('sv-SE')}/></label>
    <label>Valor comum por pessoa (€)<input type="number" name="amount" min="0.01" max="10000000" step="0.01" required value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Ex.: 1,00"/></label>
    <label>Descrição<input name="description" required maxLength={200} placeholder="Ex.: Venda de calendários"/></label>
   </fieldset>
   <div className="credit-total wide" role="status" aria-live="polite" aria-atomic="true"><div><strong>Total a adicionar</strong><span>{recipients.length} {recipients.length===1?'pessoa selecionada':'pessoas selecionadas'}</span></div><output>{!recipients.length?euro(0):valid?euro(total):'Por preencher'}</output></div>
   <fieldset disabled={busy} className="credit-recipients wide"><legend>Pessoas e exceções</legend>
    <div className="credit-people-toolbar"><input aria-label="Pesquisar destinatários" placeholder="Pesquisar pessoa…" value={query} onChange={e=>setQuery(e.target.value)}/><button type="button" className="text-link" onClick={()=>{if(recipients.length===people.length){setSelected([]);setExceptions({});}else setSelected(people.map(p=>p.id));}}>{recipients.length===people.length?'Desmarcar todas':'Selecionar todas'}</button></div>
    <div className="credit-people-list">{visible.map(p=>{
     const checked=selected.includes(p.id);const custom=Object.hasOwn(exceptions,p.id);
     return <div className={`credit-person ${checked?'selected':''}`} key={p.id}>
      <label className="checkbox-label"><input type="checkbox" checked={checked} onChange={e=>toggle(p.id,e.target.checked)} aria-label={`Adicionar saldo a ${p.name}`}/>{p.name}</label>
      {checked&&<div className="credit-person-value">{custom?<><label className="credit-exception-label"><span>Exceção (€)</span><input type="number" min="0.01" max="10000000" step="0.01" required aria-label={`Valor para ${p.name}`} value={exceptions[p.id]} onChange={e=>setExceptions(current=>({...current,[p.id]:e.target.value}))}/></label><button type="button" className="icon-button" title="Usar valor comum" aria-label={`Usar valor comum para ${p.name}`} onClick={()=>setExceptions(current=>{const next={...current};delete next[p.id];return next;})}><RotateCcw size={15}/></button></>:<><span>{euroCents(amount)!==null?euro(euroCents(amount)!):'—'}</span><button type="button" className="text-link" onClick={()=>setExceptions(current=>({...current,[p.id]:amount}))}>Definir exceção</button></>}</div>}
     </div>;
    })}{!visible.length&&<p className="form-hint">Nenhuma pessoa corresponde à pesquisa.</p>}</div>
   </fieldset>
   <div className="credit-actions wide"><span>O valor é adicionado à conta individual de cada pessoa.</span><button type="submit" className="button primary" disabled={busy||!valid}><Check size={15}/>{busy?'A guardar…':`Adicionar ${euro(valid?total:0)}`}</button></div>
  </form>
 </section>;
}
