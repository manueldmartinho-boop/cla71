'use client';
import Image from 'next/image';
import {usePathname,useRouter} from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Compass, LockKeyhole, LogOut, RefreshCw, ShieldCheck } from 'lucide-react';
import Dashboard from '@/components/dashboard';
import { getSupabase } from '@/lib/supabase';
import { isData, type Data } from '@/lib/data';
import {SITE_URL,PASSWORD_RESET_URL} from '@/lib/routes';

type Snapshot = { payload: Data; revision: number };
export default function Home() {
 const pathname=usePathname();
 const router=useRouter();
 const [session,setSession]=useState<Session|null>(null);
 const [loading,setLoading]=useState(true);
 const [authLoading,setAuthLoading]=useState(false);
 const [mode,setMode]=useState<'login'|'signup'|'reset'|'password'>(pathname==='/recuperar-password'?'reset':'login');
 const [message,setMessage]=useState('');
 const [error,setError]=useState('');
 const [role,setRole]=useState<string|null>(null);
 const [snapshot,setSnapshot]=useState<Snapshot|null>(null);
 const revision=useRef(0);
 const saveLock=useRef(false);
 const mounted=useRef(true);
 const supabase=getSupabase();
 useEffect(()=>{if(pathname==='/recuperar-password')setMode(session?'password':'reset');else setMode(previous=>previous==='password'||previous==='reset'?'login':previous);},[pathname]);
 useEffect(()=>{
  mounted.current=true;
  if(!supabase){setLoading(false);return;}
  supabase.auth.getSession().then(({data,error})=>{if(!mounted.current)return;if(error)setError('Não foi possível recuperar a sessão. Entra novamente.');setSession(data.session);if(data.session&&pathname==='/recuperar-password')setMode('password');setLoading(false);});
  const {data:{subscription}}=supabase.auth.onAuthStateChange((event,next)=>{
   setSession(next);
   if(event==='PASSWORD_RECOVERY')setMode('password');
   if(event==='SIGNED_OUT'){setRole(null);setSnapshot(null);setMode('login');}
  });
  return()=>{mounted.current=false;subscription.unsubscribe();};
 },[supabase]);
 useEffect(()=>{
  if(!supabase||!session?.user.id)return;
  let cancelled=false;
  setRole(null);setSnapshot(null);setLoading(true);setError('');
  async function load(){
   const {error:joinError}=await supabase!.rpc('request_clan_access');
   if(cancelled)return;
   if(joinError){setError('Não foi possível aceder à base de dados. Confirma se a migração SQL foi aplicada.');setLoading(false);return;}
   const {data:member,error:memberError}=await supabase!.from('clan_members').select('role').eq('user_id',session!.user.id).single();
   if(cancelled)return;
   if(memberError){setError('Não foi possível verificar a autorização. Tenta novamente.');setLoading(false);return;}
   setRole(member.role);
   if(member.role!=='pending'){
    const {data,error}=await supabase!.from('clan_state').select('payload,revision').eq('id',1).single();
    if(cancelled)return;
    if(error||!data||!isData(data.payload))setError('Não foi possível carregar os dados do Clã. Verifica a ligação e a configuração da base de dados.');
    else {revision.current=data.revision;setSnapshot(data as Snapshot);}
   }
   setLoading(false);
  }
  void load();return()=>{cancelled=true;};
 },[supabase,session?.user.id]);

 async function refresh(){
  if(!supabase||!session||saveLock.current)return;
  const {data:member,error:memberError}=await supabase.from('clan_members').select('role').eq('user_id',session.user.id).single();
  if(memberError)throw Error('Não foi possível verificar o acesso.');
  setRole(member.role);
  if(member.role==='pending'){setSnapshot(null);return;}
  const {data,error}=await supabase.from('clan_state').select('payload,revision').eq('id',1).single();
  if(error||!data||!isData(data.payload))throw Error('Não foi possível atualizar os registos. Tenta novamente.');
  revision.current=data.revision;setSnapshot(data as Snapshot);
 }
 async function save(payload:Data){
  if(!supabase||!session)throw Error('Entra novamente para guardar.');
  if(saveLock.current)throw Error('Aguarda que a gravação atual termine.');
  saveLock.current=true;
  try{
   const {data,error}=await supabase.rpc('save_clan_state',{new_payload:payload,expected_revision:revision.current});
   if(error){
    if(error.message.includes('CONFLICT')){saveLock.current=false;await refresh();throw Error('Outro membro alterou os dados. A versão atual foi carregada; repete a tua alteração.');}
    if(error.message.includes('FORBIDDEN'))throw Error('Os teus cargos não permitem esta alteração. Atualiza os dados ou contacta um administrador.');
    throw Error('A gravação não foi confirmada. Atualiza os dados antes de repetir a operação.');
   }
   const row=Array.isArray(data)?data[0]:data;
   if(!row||!Number.isSafeInteger(row.revision))throw Error('A resposta da gravação não é válida. Atualiza os dados.');
   revision.current=row.revision;setSnapshot({payload,revision:row.revision});
  }finally{saveLock.current=false;}
 }
 async function logout(){if(!supabase)return;const {error}=await supabase.auth.signOut();if(error){setError('Não foi possível terminar a sessão. Tenta novamente.');return;}setSnapshot(null);setRole(null);setSession(null);}
 async function authenticate(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(!supabase)return;setAuthLoading(true);setError('');setMessage('');
  const f=new FormData(event.currentTarget);const email=String(f.get('email')??'').trim();const password=String(f.get('password')??'');
  try{
   if(mode==='login'){
    const {error}=await supabase.auth.signInWithPassword({email,password});
    if(error)throw Error('Não foi possível entrar. Confirma o email, a palavra-passe e a confirmação do email.');
   }else if(mode==='signup'){
    const {error}=await supabase.auth.signUp({email,password,options:{emailRedirectTo:SITE_URL}});
    if(error)throw Error('Não foi possível criar a conta. Tenta novamente ou contacta o administrador.');
    setMessage('Consulta o teu email para confirmar a conta. Depois, aguarda a aprovação de um administrador.');
   }else if(mode==='reset'){
    const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:PASSWORD_RESET_URL});
    if(error)throw Error('Não foi possível enviar a recuperação. Tenta novamente mais tarde.');
    setMessage('Se existir uma conta com esse email, receberás uma ligação para definir uma nova palavra-passe.');
   }else{
    const {error}=await supabase.auth.updateUser({password});
    if(error)throw Error('Não foi possível atualizar a palavra-passe. Pede uma nova ligação de recuperação.');
    window.history.replaceState({},'',window.location.pathname);setMode('login');setMessage('Palavra-passe atualizada.');router.replace('/perfil');
   }
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível concluir a operação.');}finally{setAuthLoading(false);}
 }
 if(session&&snapshot&&role&&mode!=='password')return <><Dashboard initialData={snapshot.payload} onSave={save} onLogout={logout} onRefresh={refresh} userEmail={session.user.email??''} role={role}/>{error&&<div className="toast" role="alert">{error}<button onClick={()=>setError('')}>×</button></div>}</>;
 return <main className="auth-shell"><section className="auth-story"><span className="auth-brand"><Image src="/logo-cla71.png" alt="Logótipo do Clã 71" width={130} height={134} priority className="auth-logo"/></span><span className="eyebrow">AGRUPAMENTO 1008 / FORTE DA CASA</span><h1>Juntos, vamos<br/> mais longe<span className="heading-dot">.</span></h1><p>O material, as contas e o próximo caminho.<br/>Um espaço partilhado por todo o Clã.</p><span className="auth-story-footer"><ShieldCheck size={17}/>Acesso reservado aos membros autorizados.</span></section><section className="auth-card">
 {!supabase?<><LockKeyhole size={29}/><h2>Vamos ligar o espaço do Clã</h2><p>A autenticação e a base de dados precisam da configuração do Supabase.</p><ol><li>Aplicar a migração SQL da pasta <code>supabase/migrations</code>.</li><li>Configurar <code>NEXT_PUBLIC_SUPABASE_URL</code> e <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> na Vercel.</li><li>Voltar a publicar o projeto.</li></ol><p>O guia completo está no README do repositório.</p></>:loading?<><RefreshCw size={26}/><h2>A preparar o teu espaço…</h2></>:session&&mode!=='password'?<><ShieldCheck size={29}/><h2>{role==='pending'?'Conta à espera de aprovação':'Não foi possível abrir o Clã'}</h2><p>{role==='pending'?'Um administrador precisa de aprovar o teu acesso. Após a aprovação, atualiza esta página.':'Verifica a configuração e tenta novamente.'}</p><p className="auth-email">{session.user.email}</p><div className="settings-buttons"><button className="button primary" onClick={()=>window.location.reload()}><RefreshCw size={16}/>Atualizar</button><button className="button secondary" onClick={()=>void logout()}><LogOut size={16}/>Sair</button></div></>:<><span className="settings-icon"><LockKeyhole size={23}/></span><h2>{mode==='login'?'Bem-vindo ao Clã':mode==='signup'?'Pedir acesso':mode==='reset'?'Recuperar acesso':'Nova palavra-passe'}</h2><p>{mode==='login'?'Entra para continuar o caminho.':mode==='signup'?'Cria a tua conta. Um administrador aprovará o acesso.':mode==='reset'?'Enviamos uma ligação para o teu email.':'Escolhe uma palavra-passe com pelo menos 12 caracteres.'}</p><form onSubmit={authenticate}>{mode!=='password'&&<label>Email<input type="email" name="email" autoComplete="email" required maxLength={254} placeholder="o.teu.email@exemplo.pt"/></label>}{mode!=='reset'&&<label>Palavra-passe<input type="password" name="password" required autoComplete={mode==='login'?'current-password':'new-password'} minLength={mode==='login'?1:12} maxLength={128}/></label>}<button type="submit" className="button primary" disabled={authLoading}>{authLoading?'Aguarda…':mode==='login'?'Entrar':mode==='signup'?'Criar conta':mode==='reset'?'Enviar ligação':'Guardar palavra-passe'}</button></form>{mode!=='password'&&<div className="auth-links"><button onClick={()=>{setMode(mode==='signup'?'login':'signup');setError('');setMessage('');}}>{mode==='signup'?'Já tenho conta':'Pedir acesso ao Clã'}</button><button onClick={()=>{setMode(mode==='reset'?'login':'reset');setError('');setMessage('');}}>{mode==='reset'?'Voltar a entrar':'Esqueci-me da palavra-passe'}</button></div>}</>}
 {error&&<p className="auth-error" role="alert">{error}</p>}{message&&<p className="auth-message" role="status">{message}</p>}
 </section></main>;
}
