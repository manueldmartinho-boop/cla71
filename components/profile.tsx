'use client';
import {useState,type FormEvent} from 'react';
import {Check,KeyRound,LogOut,UserRound} from 'lucide-react';
import {getSupabase} from '@/lib/supabase';
import type {Data} from '@/lib/data';
import {positions} from '@/lib/people';

export default function Profile({data,email,role,onLogout}:{data:Data;email:string;role:string;onLogout:()=>Promise<void>}){
 const person=data.treasury?.people.find(p=>p.email?.toLowerCase()===email.toLowerCase());
 const [busy,setBusy]=useState(false);const [notice,setNotice]=useState('');const [error,setError]=useState('');
 async function changePassword(event:FormEvent<HTMLFormElement>){
  event.preventDefault();const form=event.currentTarget;const f=new FormData(form);const current=String(f.get('current'));const password=String(f.get('password'));const repeat=String(f.get('repeat'));
  setError('');setNotice('');if(password!==repeat){setError('As duas palavras-passe novas não coincidem.');return;}if(password.length<12){setError('Usa pelo menos 12 caracteres.');return;}
  const db=getSupabase();if(!db){setError('O serviço de autenticação está indisponível.');return;}setBusy(true);
  try{const {error:authError}=await db.auth.signInWithPassword({email,password:current});if(authError){setError('A palavra-passe atual não está correta.');return;}const {error}=await db.auth.updateUser({password});if(error){setError('Não foi possível alterar a palavra-passe. Confirma os requisitos e tenta novamente.');return;}form.reset();setNotice('Palavra-passe alterada com sucesso.');}finally{setBusy(false);}
 }
 return <div className="settings-grid"><section className="panel settings-card"><span className="settings-icon"><UserRound/></span><h2>{person?.name??'A minha conta'}</h2><p>{email}</p><div className="role-badges">{role==='admin'&&<span className="badge good">Administrador</span>}{person?.positions?.length?person.positions.map(p=><span key={p} className="category">{positions.find(r=>r.id===p)?.label}</span>):<span className="category">Caminheiro</span>}</div><p>Tribo: {data.tribes?.find(t=>t.id===person?.tribeId)?.name??'Sem tribo'}</p><button className="button secondary" onClick={()=>void onLogout()}><LogOut size={16}/>Terminar sessão</button></section><section className="panel settings-card"><span className="settings-icon"><KeyRound/></span><h2>Alterar palavra-passe</h2><form className="ops-form profile-password" onSubmit={changePassword}><label>Palavra-passe atual<input required type="password" name="current" autoComplete="current-password" maxLength={128}/></label><label>Nova palavra-passe<input required type="password" name="password" autoComplete="new-password" minLength={12} maxLength={128}/></label><label>Repetir nova palavra-passe<input required type="password" name="repeat" autoComplete="new-password" minLength={12} maxLength={128}/></label>{error&&<p className="auth-error" role="alert">{error}</p>}{notice&&<div className="inline-notice" role="status">{notice}</div>}<button className="button primary" disabled={busy}><Check size={16}/>{busy?'A alterar…':'Alterar palavra-passe'}</button></form></section></div>;
}
