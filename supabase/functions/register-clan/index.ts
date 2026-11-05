import {createClient} from 'npm:@supabase/supabase-js@2.118.0';

const origins=new Set(['https://cla71.vercel.app','https://cla71-manuelptps-projects.vercel.app','http://localhost:3000']);
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('origin');
 const headers={'Access-Control-Allow-Origin':origin&&origins.has(origin)?origin:'https://cla71.vercel.app','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin','Content-Type':'application/json','Cache-Control':'no-store'};
 const reply=(status:number,body:Record<string,unknown>)=>new Response(JSON.stringify(body),{status,headers});
 if(origin&&!origins.has(origin))return reply(403,{error:'Origem não permitida.'});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return reply(405,{error:'Método não permitido.'});
 try{
  if(!req.headers.get('content-type')?.includes('application/json'))return reply(415,{error:'Pedido inválido.'});
  const raw=await req.text();if(raw.length>2048)return reply(413,{error:'Pedido demasiado longo.'});
  const body=JSON.parse(raw);const email=typeof body.email==='string'?body.email.trim().toLowerCase():'';const password=typeof body.password==='string'?body.password:'';
  if(email.length>254||!/^\S+@[^\s@]+\.[^\s@]+$/.test(email)||password.length<12||password.length>128)return reply(400,{error:'Indica um email válido e uma palavra-passe com pelo menos 12 caracteres.'});
  const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:allowed,error:lookupError}=await admin.rpc('clan_registration_allowed',{p_email:email});
  if(lookupError)return reply(503,{error:'Não foi possível verificar o acesso. Tenta novamente.'});
  if(allowed!==true)return reply(403,{error:'O administrador precisa de associar este email a uma pessoa ativa do Clã antes de criares a conta.'});
  const {error}=await admin.auth.admin.createUser({email,password,email_confirm:true});
  if(error){
   if(error.code==='email_exists'||error.code==='user_already_exists')return reply(409,{error:'Esta conta já existe. Entra com a tua palavra-passe ou recupera o acesso.'});
   if(error.code==='weak_password')return reply(400,{error:'Escolhe uma palavra-passe mais forte.'});
   return reply(400,{error:'Não foi possível criar a conta. Tenta novamente ou contacta o administrador.'});
  }
  return reply(201,{created:true});
 }catch{return reply(400,{error:'Não foi possível concluir o registo. Tenta novamente.'});}
});
