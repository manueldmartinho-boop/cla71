'use client';

import Link from 'next/link';
import Image from 'next/image';
import {usePathname,useRouter} from 'next/navigation';
import {viewForPath,viewPaths,type View} from '@/lib/routes';
import Profile from '@/components/profile';
import Finance from '@/components/finance';
import ProgressPanel from '@/components/progress';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowDownLeft, ArrowUpRight, ArrowRight, Backpack, Box, Check, Compass, Download, LayoutDashboard, Menu, Package, Plus, Search, Settings, Trash2, Wallet, X, Handshake, CircleHelp, ShieldCheck, TrendingUp, AlertCircle, RefreshCw, Users, Bell } from 'lucide-react';
import { isData, type Data, type Material } from '@/lib/data';
import { MemberManagement } from '@/components/member-management';
import TreasuryPanel from '@/components/treasury';
import Materials from '@/components/materials';
import People from '@/components/people';
import { permissionsFor } from '@/lib/people';

type Modal = 'material' | 'income' | 'expense' | 'loan' | null;
const money = (v: number) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v);
const dateLabel = (v: string) => new Date(v+'T12:00:00').toLocaleDateString('pt-PT', {day:'2-digit',month:'short'});
const today = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const titles: Record<View,string> = {dashboard:'Visão geral',materials:'Material',finance:'Finanças',loans:'Empréstimos',people:'Pessoas e tribos',progress:'Progresso',profile:'Perfil',settings:'Definições'};
const nav = [{id:'dashboard',label:'Visão geral',icon:LayoutDashboard},{id:'materials',label:'Material',icon:Backpack},{id:'finance',label:'Finanças',icon:Wallet},{id:'loans',label:'Empréstimos',icon:Handshake},{id:'people',label:'Pessoas e tribos',icon:Users},{id:'progress',label:'Progresso',icon:TrendingUp}] as const;
export default function Dashboard({ initialData, onSave, onLogout, userEmail, role, onRefresh }: { initialData: Data; onSave: (data: Data) => Promise<void>; onLogout: () => Promise<void>; userEmail: string; role: string; onRefresh: () => Promise<void> }) {
 const pathname=usePathname();
 const router=useRouter();
 const view=viewForPath(pathname);
 const [data,setData]=useState<Data>(initialData);
 const ready=true;
 const permissions=permissionsFor(role,userEmail,data.treasury?.people??[]);
 const canFinance=permissions.finance;
 const canMaterial=permissions.material;
 const canLoan=['admin','member','treasurer'].includes(role);

 const [saving,setSaving]=useState(false);
 const saveLock=useRef(false);
 const [modal,setModal]=useState<Modal>(null);
 const [edit,setEdit]=useState<Material|null>(null);
 const [query,setQuery]=useState('');
 const [filter,setFilter]=useState('Todas');
 const [mobile,setMobile]=useState(false);
 const [notice,setNotice]=useState('');
 const [formError,setFormError]=useState('');
 const [confirm,setConfirm]=useState<{text:string;run:()=>void}|null>(null);
 const [period,setPeriod]=useState('6');
 const dialogRef=useRef<HTMLDialogElement>(null);
 const confirmRef=useRef<HTMLDialogElement>(null);
 useEffect(()=>{setModal(null);setMobile(false);setQuery('');setFilter('Todas');},[pathname]);
 useEffect(()=>{setData(initialData);},[initialData]);
 useEffect(()=>{if(modal)dialogRef.current?.showModal();else dialogRef.current?.close();},[modal]);
 useEffect(()=>{if(confirm)confirmRef.current?.showModal();else confirmRef.current?.close();},[confirm]);
 useEffect(()=>{if(!notice)return;const t=setTimeout(()=>setNotice(''),6000);return()=>clearTimeout(t);},[notice]);
 const go=(v:View)=>{router.push(viewPaths[v]);setQuery('');setFilter('Todas');setMobile(false);};
 const open=(m:Modal, item:Material|null=null)=>{setEdit(item);setFormError('');setModal(m);};
 const income=data.movements.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
 const expense=data.movements.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
 const activeLoans=data.loans.filter(l=>!l.returned);
 const units=data.materials.reduce((s,m)=>s+m.total,0);
 const borrowed=data.materials.reduce((s,m)=>s+m.borrowed,0);
 const needsCare=data.materials.filter(m=>m.condition!=='Bom'||m.alerts?.some(a=>!a.resolved));
 const pendingAlerts=data.materials.flatMap(m=>(m.alerts??[]).filter(a=>!a.resolved).map(a=>({material:m,alert:a})));
 const overdueLoans=activeLoans.filter(l=>l.due<today());
 const transactions=[...data.movements].sort((a,b)=>b.date.localeCompare(a.date));
 const materials=data.materials.filter(m=>`${m.name} ${m.location} ${m.category}`.toLowerCase().includes(query.toLowerCase())&&(filter==='Todas'||m.category===filter));
 const filteredMovements=transactions.filter(t=>`${t.description} ${t.category}`.toLowerCase().includes(query.toLowerCase())&&(filter==='Todas'||t.type===filter));
 const update=async(next:Data)=>{
  if(saveLock.current) return false;
  if(!isData(next)){setNotice('Os dados não são válidos. Verifica as quantidades e os empréstimos.');return false;}
  saveLock.current=true;setSaving(true);
  try { await onSave(next);setData(next);return true; }
  catch(error){setNotice(error instanceof Error?error.message:'Não foi possível guardar. Tenta novamente.');return false;}
  finally{saveLock.current=false;setSaving(false);}
 };
 const askDelete=(id:string,kind:'material'|'movement')=>{if((kind==='movement'&&!canFinance)||(kind==='material'&&!canMaterial)){setNotice('Os teus cargos não permitem esta alteração.');return;}setConfirm({text:kind==='material'?'Eliminar este material do inventário? O histórico de empréstimos deste material também será eliminado.':'Eliminar este movimento? O saldo será recalculado.',run:async()=>{const next=kind==='material'?{...data,materials:data.materials.filter(m=>m.id!==id),loans:data.loans.filter(l=>l.materialId!==id)}:{...data,movements:data.movements.filter(t=>t.id!==id)};if(await update(next))setNotice('Registo eliminado.');}});};
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault(); if(modal==='loan'&&!canLoan){setFormError('É necessário ter acesso aprovado ao Clã.');return;} if(modal==='material'&&!canMaterial){setFormError('O teu cargo não permite gerir material.');return;} if((modal==='income'||modal==='expense')&&!canFinance){setFormError('Os teus cargos não permitem gerir finanças.');return;} const f=new FormData(event.currentTarget); const val=(k:string)=>String(f.get(k)||'').trim();
  const id=crypto.randomUUID();
  if(modal==='material'){
   const total=Number(val('total'));
   if(!val('name')||!Number.isSafeInteger(total)||total<0||total<(edit?.borrowed??0)){setFormError('Indica um nome e uma quantidade inteira que cubra os empréstimos ativos.');return;}
   const item:Material={...edit,id:edit?.id??id,name:val('name'),category:val('category'),total,borrowed:edit?.borrowed??0,condition:val('condition'),location:val('location')};
   if(!await update({...data,materials:edit?data.materials.map(m=>m.id===edit.id?item:m):[...data.materials,item]}))return;
  }else if(modal==='income'||modal==='expense'){
   const amount=Math.round(Number(val('amount'))*100)/100;
   if(!Number.isFinite(amount)||amount<=0||!val('description')){setFormError('Preenche a descrição e um valor superior a zero.');return;}
   if(!await update({...data,movements:[...data.movements,{id,description:val('description'),category:val('category'),type:modal,amount,date:val('date')}]}))return;
  }else if(modal==='loan'){
   const item=data.materials.find(m=>m.id===val('materialId'));const quantity=Number(val('quantity'));
   if(!item||!Number.isSafeInteger(quantity)||quantity<=0||quantity>item.total-item.borrowed){setFormError('A quantidade pedida excede o material disponível.');return;}
   if(!val('person')){setFormError('Indica quem fica responsável pelo material.');return;}
   if(!await update({...data,materials:data.materials.map(m=>m.id===item.id?{...m,borrowed:m.borrowed+quantity}:m),loans:[...data.loans,{id,materialId:item.id,person:val('person'),quantity,due:val('due'),returned:false}]}))return;
  }
  setModal(null);setNotice('Registo guardado com sucesso.');
 }
 async function returnLoan(id:string){if(!canLoan)return;const loan=data.loans.find(l=>l.id===id);if(!loan||loan.returned)return;if(await update({...data,loans:data.loans.map(l=>l.id===id?{...l,returned:true}:l),materials:data.materials.map(m=>m.id===loan.materialId?{...m,borrowed:m.borrowed-loan.quantity}:m)}))setNotice('Devolução registada. Material disponível no inventário.');}
 function download(content:string,type:string,name:string){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 function exportCSV(){const safe=(v:string)=>'"'+(/^[=+\-@\t\r]/.test(v)?"'":'')+v.replaceAll('"','""')+'"';const rows=[['Data','Descrição','Categoria','Tipo','Valor (EUR)'],...filteredMovements.map(t=>[t.date,t.description,t.category,t.type==='income'?'Receita':'Despesa',(t.type==='income'?t.amount:-t.amount).toFixed(2).replace('.',',')])];download('\uFEFF'+rows.map(row=>row.map(safe).join(';')).join('\r\n'),'text/csv;charset=utf-8',`cla71-financas-${today()}.csv`);}
 const chartMonths=Array.from({length:Number(period)},(_,i)=>{const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-Number(period)+1+i);const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;return {key,label:d.toLocaleDateString('pt-PT',{month:'short'}).replace('.',''),income:data.movements.filter(t=>t.date.startsWith(key)&&t.type==='income').reduce((s,t)=>s+t.amount,0),expense:data.movements.filter(t=>t.date.startsWith(key)&&t.type==='expense').reduce((s,t)=>s+t.amount,0)};});
 const maxChart=Math.max(100,...chartMonths.flatMap(m=>[m.income,m.expense]));
 const movementTable=(full=false)=><div className="table-scroll"><table><thead><tr><th>Descrição</th><th>Categoria</th><th>Data</th><th className="right">Valor</th>{full&&<th aria-label="Ações"/>}</tr></thead><tbody>{(full?filteredMovements:transactions.slice(0,4)).map(t=><tr key={t.id}><td><div className="transaction-name"><span className={`transaction-icon ${t.type}`} aria-label={t.type==='income'?'Receita':'Despesa'}>{t.type==='income'?<ArrowDownLeft size={18}/>:<ArrowUpRight size={18}/>}</span><strong>{t.description}</strong></div></td><td><span className="category">{t.category}</span></td><td className="muted nowrap">{dateLabel(t.date)}</td><td className={`right nowrap amount ${t.type}`}>{t.type==='income'?'+':'−'} {money(t.amount)}</td>{full&&<td><button className="icon-button" aria-label={`Eliminar ${t.description}`} disabled={!canFinance||saving} onClick={()=>askDelete(t.id,'movement')}><Trash2 size={16}/></button></td>}</tr>)}</tbody></table>{(full?filteredMovements:transactions).length===0&&<div className="empty"><Wallet/>Ainda não existem movimentos.</div>}</div>;

 return <div className="app-shell">
  {mobile&&<button className="nav-overlay" aria-label="Fechar navegação" onClick={()=>setMobile(false)}/>}
  <aside className={`sidebar ${mobile?'open':''}`}>
   <Link className="brand" href="/"><Image src="/logo-cla71.png" width={64} height={66} className="clan-logo" alt="Logótipo do Clã 71"/><span>Clã<span className="brand-number">71</span></span></Link>
   <div className="group-label">AGRUPAMENTO 1008<span>Forte da Casa</span></div>
   <span className="nav-label">NAVEGAÇÃO</span>
   <nav>{nav.map(n=><Link key={n.id} className={view===n.id?'active':''} href={viewPaths[n.id]} aria-current={view===n.id?'page':undefined}><n.icon size={19}/>{n.label}{n.id==='loans'&&activeLoans.length>0&&<span className="nav-count">{activeLoans.length}</span>}</Link>)}</nav>
   <div className="sidebar-bottom"><button className={view==='settings'?'settings-link active':'settings-link'} onClick={()=>go('settings')}><Settings size={19}/>Definições</button><div className="sidebar-footer"><span className="avatar">71</span><div><strong>Clã 71</strong><small>Agrupamento 1008</small></div><ShieldCheck size={17}/></div></div>
  </aside>
  <div className="workspace"><header className="topbar"><div className="breadcrumb"><button className="mobile-menu icon-button" aria-label="Abrir navegação" onClick={()=>setMobile(true)}><Menu size={21}/></button><span>Espaço do Clã</span><span className="slash">/</span><strong>{titles[view]}</strong></div><div className="header-right"><Link className="profile-entry" href="/perfil" aria-current={view==='profile'?'page':undefined}><Users size={18}/>Perfil</Link></div></header>
  <main>
   <div className="page-heading"><div><h1>{titles[view]}</h1><p>{view==='dashboard'?'Resumo dos registos e tarefas pendentes.':view==='materials'?'Inventário, faltas e manutenção.':view==='finance'?'Caixa geral e contas individuais.':view==='loans'?'Material emprestado, responsáveis e devoluções.':view==='people'?'Pessoas, tribos e cargos.':view==='progress'?'Objetivos, propostas e pendências de cada caminheiro.':view==='profile'?'A tua conta e palavra-passe.':'Acessos e cópias de segurança.'}</p></div><div className="heading-actions">{view==='dashboard'?<button className="button secondary" onClick={()=>download(JSON.stringify(data,null,2),'application/json',`cla71-backup-${today()}.json`)}><Download size={16}/>Exportar dados</button>:view==='materials'?<button disabled={!canMaterial||saving} className="button primary" onClick={()=>open('material')}><Plus size={17}/>Adicionar material</button>:view==='loans'?<button className="button primary" disabled={!canLoan||saving||!data.materials.some(m=>m.total>m.borrowed)} onClick={()=>open('loan')}><Plus size={16}/>Novo empréstimo</button>:null}</div></div>
   {!ready?<div className="empty">A preparar o espaço do Clã…</div>:<>
   {view==='dashboard'&&<div className="stats-grid"><div className="stat-card balance"><div className="stat-label">Saldo disponível<span><Wallet size={18}/></span></div><div className="stat-value">{money(income-expense)}</div><div className="stat-foot"><span className="live-dot"/> Balanço de todos os movimentos</div><svg className="balance-decoration" viewBox="0 0 140 80" aria-hidden="true"><path d="M0 75 25 55 45 64 66 35 85 46 105 15 140 0"/></svg></div><div className="stat-card"><div className="stat-label">Receitas totais<span className="mint"><ArrowDownLeft size={19}/></span></div><div className="stat-value">{money(income)}</div><div className="stat-foot"><span className="legend-dot green"/>{data.movements.filter(t=>t.type==='income').length} entradas registadas</div></div><div className="stat-card"><div className="stat-label">Despesas totais<span className="peach"><ArrowUpRight size={19}/></span></div><div className="stat-value">{money(expense)}</div><div className="stat-foot"><span className="legend-dot orange"/>{data.movements.filter(t=>t.type==='expense').length} saídas registadas</div></div><div className="stat-card"><div className="stat-label">Material disponível<span className="sand"><Backpack size={19}/></span></div><div className="stat-value">{units-borrowed}<small> / {units}</small></div><div className="stat-foot"><span className="legend-dot tan"/>{borrowed} unidades emprestadas</div></div></div>}
   {view==='dashboard'&&<>
    <div className="dashboard-grid"><section className="panel chart-panel"><div className="panel-heading"><div><h2>Evolução financeira</h2><p>Receitas e despesas ao longo do tempo</p></div><label className="select-wrap"><select aria-label="Período do gráfico" value={period} onChange={e=>setPeriod(e.target.value)}><option value="6">Últimos 6 meses</option><option value="3">Últimos 3 meses</option><option value="12">Últimos 12 meses</option></select></label></div><div className="chart-legend"><span><i className="legend-dot green"/>Receitas</span><span><i className="legend-dot orange"/>Despesas</span></div><div className="chart"><div className="chart-axis">{[1,.75,.5,.25,0].map(v=><span key={v}>{Math.round(maxChart*v)} €</span>)}</div><div className="plot"><div className="grid-lines">{[0,1,2,3,4].map(n=><i key={n}/>)}</div><div className="chart-columns">{chartMonths.map(m=><div className="month" key={m.key}><div className="bar-pair"><div className="bar income" title={`${m.label}: receitas ${money(m.income)}`} style={{height:`${m.income/maxChart*100}%`}}/><div className="bar expense" title={`${m.label}: despesas ${money(m.expense)}`} style={{height:`${m.expense/maxChart*100}%`}}/></div><span>{m.label}</span><span className="sr-only">Receitas {money(m.income)}, despesas {money(m.expense)}</span></div>)}</div></div></div><div className="chart-footer"><TrendingUp size={15}/><span>Totais dos movimentos por mês.</span><button onClick={()=>go('finance')}>Ver finanças <ArrowRight size={14}/></button></div></section>
    <section className="panel inventory-panel"><div className="panel-heading"><div><h2>Inventário</h2><p>O estado do nosso material</p></div><Box size={19} className="muted"/></div><div className="inventory-ring" style={{background:`conic-gradient(var(--green) 0 ${units?(units-borrowed)/units*100:0}%, #e9ede7 0 100%)`}}><div><strong>{units}</strong><span>unidades no inventário</span></div></div><div className="inventory-key"><div><span><i className="legend-dot green"/>Disponíveis</span><strong>{units-borrowed}</strong></div><div><span><i className="legend-dot light"/>Emprestadas</span><strong>{borrowed}</strong></div></div><button className="text-link inventory-link" onClick={()=>go('materials')}>Consultar inventário <ArrowRight size={15}/></button></section></div>
    <div className="dashboard-bottom"><section className="panel movements-panel"><div className="panel-heading"><div><h2>Últimos movimentos</h2><p>Movimentos mais recentes</p></div><button className="text-link" onClick={()=>go('finance')}>Ver todos <ArrowRight size={14}/></button></div>{movementTable()}</section><section className="panel attention-panel"><div className="panel-heading"><div><h2>De olho no material</h2><p>Avisos por resolver e artigos a rever</p></div><span className="count-badge">{needsCare.length}</span></div>{needsCare.slice(0,3).map(m=><button className="attention-item" key={m.id} onClick={()=>{router.push('/material/'+encodeURIComponent(m.id));}}><span className="attention-icon"><Package size={19}/></span><span><strong>{m.name}</strong><small>{m.location}</small></span><span className={`badge ${m.condition==='Reparar'?'bad':'warning'}`}>{m.alerts?.some(a=>!a.resolved)?'Avisos':m.condition}</span></button>)}{!needsCare.length&&<div className="empty compact"><Check/>Tudo em bom estado!</div>}<div className="attention-footer"><ShieldCheck size={15}/>Seleciona um artigo para abrir os avisos.</div></section></div>
    <section className="panel overview-alerts"><div className="panel-heading"><div><h2>Notificações de material</h2><p>{pendingAlerts.length} avisos pendentes · {overdueLoans.length} devoluções em atraso</p></div><button className="text-link" onClick={()=>go('materials')}>Ver material <ArrowRight size={14}/></button></div>{pendingAlerts.slice(0,8).map(({material,alert})=><button className="overview-alert-row" key={material.id+alert.id} onClick={()=>{router.push('/material/'+encodeURIComponent(material.id));}}><Bell size={17}/><span><strong>{material.name}</strong><small>{alert.description}</small>{alert.items.length>0&&<small>{alert.items.map(i=>i.quantity+' '+i.name).join(' · ')}</small>}</span><span className="badge warning">{alert.kind==='missing'?'Em falta':alert.kind==='maintenance'?'Manutenção':'Nota'}</span><ArrowRight size={15}/></button>)}{!pendingAlerts.length&&<div className="empty compact"><Check size={20}/>Sem notificações pendentes.</div>}</section>
    <div className="quick-actions"><span>Ações rápidas</span><button disabled={!canMaterial||saving} onClick={()=>open('material')}><Plus size={16}/>Adicionar material</button><button disabled={!canFinance||saving} onClick={()=>open('income')}><Plus size={16}/>Receita na caixa do Clã</button><button disabled={!canFinance||saving} onClick={()=>open('expense')}><Plus size={16}/>Despesa na caixa do Clã</button></div>
   </>}
   {view==='materials'&&<Materials data={data} onSave={update} canWrite={canMaterial} onEdit={m=>open('material',m)} onDelete={id=>askDelete(id,'material')} initialMaterialId={pathname.startsWith('/material/')?decodeURIComponent(pathname.split('/')[2]):null}/>}
   {view==='people'&&<People data={data} onSave={update} canManage={permissions.admin}/>}
   {view==='finance'&&<Finance data={data} onSave={update} canWrite={canFinance}/>}
   {view==='profile'&&<Profile data={data} email={userEmail} role={role} onLogout={onLogout}/>}
   {view==='progress'&&<ProgressPanel key={pathname} data={data} onSave={update} canWrite={permissions.progress}/>}
   {view==='loans'&&<section className="panel"><div className="toolbar"><div className="search"><Search size={17}/><input placeholder="Pesquisar responsável ou material…" aria-label="Pesquisar empréstimos" value={query} onChange={e=>setQuery(e.target.value)}/></div><select aria-label="Estado do empréstimo" value={filter} onChange={e=>setFilter(e.target.value)}><option>Todas</option><option>Ativos</option><option>Devolvidos</option></select></div><div className="table-scroll"><table><thead><tr><th>Material / responsável</th><th>Quantidade</th><th>Devolver até</th><th>Estado</th><th aria-label="Ações"/></tr></thead><tbody>{data.loans.filter(l=>`${l.person} ${data.materials.find(m=>m.id===l.materialId)?.name}`.toLowerCase().includes(query.toLowerCase())&&(filter==='Todas'||(filter==='Ativos'?!l.returned:l.returned))).map(l=><tr key={l.id}><td><strong>{data.materials.find(m=>m.id===l.materialId)?.name}</strong><div className="cell-sub">{l.person}</div></td><td>{l.quantity}</td><td>{dateLabel(l.due)} {l.due.slice(0,4)}</td><td><span className={`badge ${l.returned?'good':l.due<today()?'bad':'warning'}`}>{l.returned?'Devolvido':l.due<today()?'Em atraso':'Emprestado'}</span></td><td>{!l.returned&&<button className="button secondary small-button" disabled={!canLoan||saving} onClick={()=>returnLoan(l.id)}><Check size={14}/>Devolver</button>}</td></tr>)}</tbody></table>{data.loans.length===0&&<div className="empty"><Handshake/>Ainda não existem empréstimos. Adiciona material para começar.</div>}</div></section>}
   {view==='settings'&&<div className="settings-grid"><section className="panel settings-card"><span className="settings-icon"><ShieldCheck/></span><h2>A tua conta</h2><p>{userEmail}<br/>{permissions.admin?'Administrador':((data.treasury?.people??[]).find(p=>p.active&&p.email?.toLowerCase()===userEmail.toLowerCase())?.name??'Membro do Clã')}</p><div className="role-badges"><span className="badge good">Consulta</span>{canMaterial&&<span className="badge good">Gestão de material</span>}{canFinance&&<span className="badge good">Gestão financeira</span>}{permissions.admin&&<span className="badge good">Pessoas e acessos</span>}</div><p>Os cargos são atribuídos em Pessoas e tribos. As permissões acumulam-se quando existem vários cargos.</p></section><section className="panel settings-card"><span className="settings-icon"><Download/></span><h2>Cópia de segurança</h2><p>Exporta o material, notificações, pessoas, tribos, contas e empréstimos do Clã.</p><div className="settings-buttons"><button className="button primary" onClick={()=>download(JSON.stringify(data,null,2),'application/json',`cla71-backup-${today()}.json`)}><Download size={16}/>Exportar cópia</button></div></section>{permissions.admin&&<MemberManagement email={userEmail}/>}</div>}
   </>}
   <footer className="page-footer"><span>Clã 71 <span> / </span> Agrupamento 1008 · Forte da Casa</span><span><Compass size={13}/> Sempre a caminho.</span></footer>
  </main></div>
  <dialog ref={dialogRef} className="modal" onCancel={()=>setModal(null)} onClick={e=>{if(e.target===e.currentTarget)setModal(null);}}><div className="modal-heading"><div><span className="eyebrow">Clã 71</span><h2>{modal==='material'?(edit?'Editar material':'Novo material'):modal==='income'?'Registar receita':modal==='expense'?'Registar despesa':'Novo empréstimo'}</h2></div><button className="icon-button" aria-label="Fechar" onClick={()=>setModal(null)}><X size={20}/></button></div><form onSubmit={submit} key={`${modal}-${edit?.id??'new'}`}>
   {modal==='material'?<><label>Nome do material<input required name="name" maxLength={120} defaultValue={edit?.name} placeholder="Ex.: Tenda de patrulha"/></label><div className="form-grid"><label>Categoria<select name="category" defaultValue={edit?.category??'Campismo'}>{['Campismo','Cozinha','Pioneirismo','Saúde','Ferramentas','Outros'].map(c=><option key={c}>{c}</option>)}</select></label><label>Quantidade total<input type="number" required name="total" min={Math.max(0,edit?.borrowed??0)} max={100000} step="1" defaultValue={edit?.total??1}/></label></div><label>Localização<input name="location" maxLength={120} defaultValue={edit?.location} placeholder="Ex.: Sede · Armário A"/></label><label>Estado<select name="condition" defaultValue={edit?.condition??'Bom'}><option>Bom</option><option>Rever</option><option>Reparar</option></select></label></>:modal==='income'||modal==='expense'?<><label>Descrição<input required name="description" maxLength={160} placeholder={modal==='income'?'Ex.: Quotas de novembro':'Ex.: Alimentação do acampamento'}/></label><div className="form-grid"><label>Valor (€)<input type="number" required name="amount" min="0.01" max="9999999" step="0.01" placeholder="0,00"/></label><label>Data<input required type="date" name="date" defaultValue={today()}/></label></div><label>Categoria<select name="category">{(modal==='income'?['Quotas','Angariações','Donativos','Atividades','Outros']:['Material','Atividades','Transportes','Alimentação','Outros']).map(c=><option key={c}>{c}</option>)}</select></label></>:<><label>Material<select name="materialId" required>{data.materials.filter(m=>m.total>m.borrowed).map(m=><option value={m.id} key={m.id}>{m.name} ({m.total-m.borrowed} disponíveis)</option>)}</select></label><label>Responsável / equipa<input required name="person" maxLength={120} placeholder="Quem fica com o material?"/></label><div className="form-grid"><label>Quantidade<input required type="number" min="1" step="1" name="quantity" defaultValue="1"/></label><label>Data de devolução<input required type="date" name="due" min={today()} defaultValue={today()}/></label></div></>}
   {formError&&<p className="form-error" role="alert">{formError}</p>}<div className="modal-actions"><button type="button" className="button secondary" onClick={()=>setModal(null)}>Cancelar</button><button className="button primary" type="submit" disabled={saving}><Check size={16}/>Guardar {modal==='material'?'material':modal==='loan'?'empréstimo':'movimento'}</button></div>
  </form></dialog>
  <dialog ref={confirmRef} className="modal confirm-modal" onCancel={()=>setConfirm(null)}><h2>Confirmar alteração</h2><p>{confirm?.text}</p><div className="modal-actions"><button className="button secondary" onClick={()=>setConfirm(null)}>Cancelar</button><button className="button primary" onClick={()=>{confirm?.run();setConfirm(null);}}>Confirmar</button></div></dialog>
  {notice&&<div className="toast" role="status"><AlertCircle size={18}/>{notice}<button aria-label="Fechar aviso" onClick={()=>setNotice('')}><X size={16}/></button></div>}
 </div>;
}
