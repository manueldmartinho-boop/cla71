export const stages=[{id:'caminho',label:'Caminho'},{id:'comunidade',label:'Comunidade'},{id:'servico',label:'Serviço'},{id:'partida',label:'Partida'}] as const;
export const areas=[{id:'F',name:'Físico'},{id:'A',name:'Afetivo'},{id:'C',name:'Carácter'},{id:'E',name:'Espiritual'},{id:'I',name:'Intelectual'},{id:'S',name:'Social'}] as const;
export const statuses=[{id:'not_started',label:'Não tem'},{id:'proposed',label:'Proposto'},{id:'in_progress',label:'Em curso'},{id:'completed',label:'Tem'}] as const;
export type Stage=typeof stages[number]['id'];
export type Area=typeof areas[number]['id'];
export type Goal={id:string;code:string;area:Area;title:string};
export type ProgressRecord={personId:string;goalId:string;status:typeof statuses[number]['id'];stage:Stage;notes:string;pending:{id:string;title:string;dueDate:string|null;done:boolean}[]};
export type Progress={catalog:Goal[];records:ProgressRecord[];stages:{personId:string;stage:Stage}[]};
// Codes follow the CNE IV-section educational objectives poster. Titles are short navigation labels, not the full official wording.
export const defaultCatalog:Goal[]=(Object.entries({
 F:['Atividade física','Maturação corporal','Fisiologia humana','Vida saudável','Cuidados pessoais','Prevenção de riscos'],
 A:['Relações afetivas','Sensibilidade artística','Sexualidade responsável','Gestão emocional','Conhecimento pessoal','Confiança pessoal'],
 C:['Valores pessoais','Escolhas conscientes','Desenvolvimento pessoal','Compromisso responsável','Perseverança','Consequências dos atos','Defesa de convicções','Coerência de vida'],
 E:['História da Salvação','Mensagem de Jesus','Pertença à Igreja','Oração e celebração','Vivência do Evangelho','Diálogo religioso','Fé e dignidade','Missão cristã'],
 I:['Aprendizagem contínua','Análise de informação','Percurso formativo','Adaptação','Solução de problemas','Inovação','Comunicação criativa'],
 S:['Direitos e deveres','Participação cívica','Decisões democráticas','Serviço à sociedade','Empatia e tolerância','Trabalho conjunto','Liderança equilibrada'],
}) as [Area,string[]][]).flatMap(([area,labels])=>labels.map((title,i)=>({id:`${area}${i+1}`,code:`${area}${i+1}`,area,title})));
export const emptyProgress:Progress={catalog:defaultCatalog,records:[],stages:[]};
export const progressSources=[{title:'Programa Educativo do CNE',url:'https://escutismo.pt/programa-educativo/'},{title:'Objetivos educativos · IV secção (CNE)',url:'https://saintalphonse.lgs.lu/wp-content/uploads/2023/02/CAMINHEIROS-Cartaz-FACEIS_compressed.pdf'},{title:'Etapas e percurso dos Caminheiros',url:'https://1351.escutismo.pt/caminheiros-sistema-de-progresso/'}];
export function validProgress(value:unknown,personIds:string[]):value is Progress{
 if(!value||typeof value!=='object')return false;const p=value as Progress;
 if(!Array.isArray(p.catalog)||!Array.isArray(p.records)||!Array.isArray(p.stages))return false;
 const text=(v:unknown,max:number)=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
 if(!p.catalog.every(g=>g&&text(g.id,200)&&text(g.code,30)&&areas.some(a=>a.id===g.area)&&text(g.title,200))||new Set(p.catalog.map(g=>g.id)).size!==p.catalog.length)return false;
 if(!p.stages.every(s=>s&&personIds.includes(s.personId)&&stages.some(x=>x.id===s.stage))||new Set(p.stages.map(s=>s.personId)).size!==p.stages.length)return false;
 return p.records.every(r=>r&&personIds.includes(r.personId)&&p.catalog.some(g=>g.id===r.goalId)&&statuses.some(x=>x.id===r.status)&&stages.some(x=>x.id===r.stage)&&typeof r.notes==='string'&&r.notes.length<=4000&&Array.isArray(r.pending)&&new Set(r.pending.map(t=>t?.id)).size===r.pending.length&&r.pending.every(t=>t&&text(t.id,200)&&text(t.title,300)&&typeof t.done==='boolean'&&(t.dueDate===null||(typeof t.dueDate==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(t.dueDate)&&!Number.isNaN(Date.parse(t.dueDate))))))&&new Set(p.records.map(r=>JSON.stringify([r.personId,r.goalId]))).size===p.records.length;
}
