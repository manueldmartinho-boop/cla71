'use client';
import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase';
type Member={user_id:string;email:string;role:string};
export function MemberManagement({email}:{email:string}){
 const [members,setMembers]=useState<Member[]>([]);const [notice,setNotice]=useState('');const [busy,setBusy]=useState(false);
 async function load(){const db=getSupabase();if(!db)return;const {data,error}=await db.from('clan_members').select('user_id,email,role').order('created_at');if(error)setNotice('Não foi possível carregar os membros.');else setMembers(data??[]);}
 useEffect(()=>{void load();},[]);
 async function change(member:Member,role:string){const db=getSupabase();if(!db)return;setBusy(true);setNotice('');const {error}=await db.rpc('set_member_role',{target_user:member.user_id,new_role:role});if(error)setNotice('Não foi possível alterar o acesso. Não podes alterar o teu próprio papel.');else{setNotice('Permissões atualizadas.');await load();}setBusy(false);}
 return <section className="panel settings-card member-panel"><h2>Acessos ao Clã</h2><p>Aprova o acesso das contas ao Clã. Atribui os cargos cumuláveis em Pessoas e tribos. Contas pendentes não podem consultar os dados.</p><div className="table-scroll"><table><thead><tr><th>Email</th><th>Permissão</th></tr></thead><tbody>{members.map(m=><tr key={m.user_id}><td>{m.email}{m.email===email?' (tu)':''}</td><td><select aria-label={`Permissão de ${m.email}`} value={m.role} disabled={busy||m.email===email} onChange={e=>void change(m,e.target.value)}><option value="pending">Pendente / sem acesso</option><option value="member">Membro aprovado / cargos em Pessoas e tribos</option><option value="treasurer" disabled>Permissão antiga / atribuir cargo na pessoa</option><option value="admin">Administrador</option></select></td></tr>)}</tbody></table></div>{notice&&<p role="status">{notice}</p>}</section>;
}
