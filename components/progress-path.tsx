'use client';
import {useState,type FormEvent} from 'react';
import type {Data} from '@/lib/data';
import {areas,stages,progressSummary,negotiatedGoals,type Progress,type Milestone} from '@/lib/progress';

export default function ProgressPath({data,progress,personId,canWrite,busy,onSave}:{data:Data;progress:Progress;personId:string;canWrite:boolean;busy:boolean;onSave:(d:Data)=>Promise<boolean>}){
 const summary=progressSummary(progress,personId);
 const milestone=summary.milestone;
 const [notice,setNotice]=useState('');
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();setNotice('');const f=new FormData(event.currentTarget);
  const next:Milestone={personId,commitmentDate:String(f.get('commitmentDate')??'')||null,departureDate:String(f.get('departureDate')??'')||null,departureReason:String(f.get('departureReason')??'').trim()};
  if(next.departureDate&&(!next.commitmentDate||next.departureDate<next.commitmentDate||!next.departureReason)){setNotice('Regista o compromisso e fundamenta a decisão do Clã. A Partida não pode ser anterior ao compromisso.');return;}
  const milestones=[...(progress.milestones??[]).filter(m=>m.personId!==personId),next];
  await onSave({...data,progress:{...progress,milestones}});
 }
 return <>
  <section className="panel automatic-path"><div className="panel-heading"><div><h2>Etapa calculada: {stages.find(s=>s.id===summary.stage)?.label}</h2><p>Caminho: todos. Após o compromisso: Comunidade. Serviço: pelo menos 2 OEF em cada área. Partida: pelo menos 5 em cada área.</p></div><span className="badge good">Automático</span></div>
   <div className="oef-counts">{summary.counts.map(c=><div key={c.area}><strong>{areas.find(a=>a.id===c.area)?.name}</strong><span>{c.completed} / {c.total} OEF validados</span><small>{c.completed<2?`Faltam ${2-c.completed} para Serviço`:c.completed<5?`Faltam ${5-c.completed} para Partida`:'Limiar de Partida atingido'}</small></div>)}</div>
   <div className="path-explanation">{summary.merit?'Todos os 42 OEF estão validados: percurso educativo completo para reconhecimento de mérito.':'As propostas, as oportunidades realizadas e os objetivos adicionais do Clã não contam como OEF validados.'} A etapa Partida não equivale à cerimónia de Partida.</div>
   <form className="ops-form" onSubmit={submit} key={JSON.stringify(milestone??null)}><div className="form-grid"><label>Promessa / Investidura na IV secção<input name="commitmentDate" type="date" readOnly={!canWrite} defaultValue={milestone?.commitmentDate??''}/></label><label>Partida aprovada pelo Clã · data<input name="departureDate" type="date" readOnly={!canWrite} defaultValue={milestone?.departureDate??''}/></label><label className="wide">Fundamentação / reconhecimento da Partida<textarea name="departureReason" rows={2} maxLength={4000} readOnly={!canWrite} defaultValue={milestone?.departureReason??''}/></label></div>{notice&&<p className="auth-error" role="alert">{notice}</p>}{canWrite&&<button className="button primary" disabled={busy}>Guardar compromisso e reconhecimento</button>}</form>
  </section>
  <section className="panel negotiation-panel"><div className="panel-heading"><div><h2>Escolha e negociação dos OEF</h2><p>Constrói cada etapa com 2 ou 3 objetivos por área. Inclui os que já foram validados na negociação e identifica as oportunidades educativas para os restantes.</p></div></div><div className="table-scroll"><table><thead><tr><th>Etapa a trabalhar</th>{areas.map(a=><th key={a.id}>{a.name}</th>)}</tr></thead><tbody>{stages.filter(s=>s.id!=='caminho').map(s=><tr key={s.id}><td><strong>{s.label}</strong></td>{areas.map(a=>{const records=negotiatedGoals(progress,personId,s.id,a.id);const done=records.filter(r=>r.status==='completed').length;return <td key={a.id}><strong>{records.length} escolhidos · {done} validados</strong><span className="cell-sub">{records.map(r=>r.goalId).join(', ')||'Por escolher'}</span><small className="cell-sub">{records.length<2?'Escolher mais '+(2-records.length):records.length<=3?'Composição de referência: 2–3':'Rever composição na negociação'}</small></td>;})}</tr>)}</tbody></table></div><p className="path-explanation">Abre um objetivo abaixo, indica a etapa a trabalhar e regista a proposta e as oportunidades educativas. Concluir uma oportunidade não valida automaticamente o OEF.</p></section>
 </>;
}
