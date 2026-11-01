export const stages=[{id:'caminho',label:'Caminho'},{id:'comunidade',label:'Comunidade'},{id:'servico',label:'Serviço'},{id:'partida',label:'Partida'}] as const;
export const areas=[{id:'F',name:'Físico'},{id:'A',name:'Afetivo'},{id:'C',name:'Carácter'},{id:'E',name:'Espiritual'},{id:'I',name:'Intelectual'},{id:'S',name:'Social'}] as const;
export const statuses=[{id:'not_started',label:'Não tem'},{id:'proposed',label:'Proposto'},{id:'in_progress',label:'Em curso'},{id:'completed',label:'Tem'}] as const;
export type Stage=typeof stages[number]['id'];
export type Area=typeof areas[number]['id'];
export type Goal={id:string;code:string;area:Area;title:string;trailId?:string};
export type ProgressRecord={personId:string;goalId:string;status:typeof statuses[number]['id'];stage:Stage;notes:string;pending:{id:string;title:string;dueDate:string|null;done:boolean}[]};
export type Milestone={personId:string;commitmentDate:string|null;departureDate:string|null;departureReason:string};
export type Progress={catalog:Goal[];records:ProgressRecord[];stages:{personId:string;stage:Stage}[];milestones?:Milestone[]};
export const trails:{id:string;area:Area;name:string;codes:string[]}[]=[
 {id:'F-1',area:'F',name:'Desempenho',codes:['F1']},{id:'F-2',area:'F',name:'Autoconhecimento',codes:['F2','F3']},{id:'F-3',area:'F',name:'Bem-estar físico',codes:['F4','F5','F6']},
 {id:'A-1',area:'A',name:'Relacionamento e sensibilidade',codes:['A1','A2','A3']},{id:'A-2',area:'A',name:'Equilíbrio emocional',codes:['A4']},{id:'A-3',area:'A',name:'Autoestima',codes:['A5','A6']},
 {id:'C-1',area:'C',name:'Autonomia',codes:['C1','C2','C3']},{id:'C-2',area:'C',name:'Responsabilidade',codes:['C4','C5','C6']},{id:'C-3',area:'C',name:'Coerência',codes:['C7','C8']},
 {id:'E-1',area:'E',name:'Descoberta',codes:['E1','E2','E3']},{id:'E-2',area:'E',name:'Aprofundamento',codes:['E4','E5','E6']},{id:'E-3',area:'E',name:'Serviço',codes:['E7','E8']},
 {id:'I-1',area:'I',name:'Procura do conhecimento',codes:['I1','I2','I3']},{id:'I-2',area:'I',name:'Resolução de problemas',codes:['I4','I5']},{id:'I-3',area:'I',name:'Criatividade e expressão',codes:['I6','I7']},
 {id:'S-1',area:'S',name:'Cidadania',codes:['S1','S2','S3']},{id:'S-2',area:'S',name:'Solidariedade e tolerância',codes:['S4','S5']},{id:'S-3',area:'S',name:'Interação e cooperação',codes:['S6','S7']},
];
export function goalTrail(goal:Goal){return trails.find(t=>t.codes.includes(goal.id)&&t.area===goal.area)??trails.find(t=>t.id===goal.trailId&&t.area===goal.area);}
export const manualUrl='https://vianadocastelo.escutismo.pt/Documentos/formacao/Manual_do_Dirigente_Sistema_de_Progresso.pdf';
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
export function progressSummary(p:Progress,personId:string){
 const done=new Set(p.records.filter(r=>r.personId===personId&&r.status==='completed').map(r=>r.goalId));
 const counts=areas.map(a=>({area:a.id,completed:defaultCatalog.filter(g=>g.area===a.id&&done.has(g.id)).length,total:defaultCatalog.filter(g=>g.area===a.id).length}));
 const milestone=p.milestones?.find(m=>m.personId===personId);
 const stage:Stage=!milestone?.commitmentDate?'caminho':counts.every(c=>c.completed>=5)?'partida':counts.every(c=>c.completed>=2)?'servico':'comunidade';
 return {stage,counts,total:counts.reduce((s,c)=>s+c.completed,0),merit:counts.every(c=>c.completed===c.total),milestone};
}
export function negotiatedGoals(p:Progress,personId:string,stage:Stage,area:Area){return p.records.filter(r=>r.personId===personId&&(r.stage==='caminho'?'comunidade':r.stage)===stage&&r.status!=='not_started'&&defaultCatalog.some(g=>g.id===r.goalId&&g.area===area));}
export const progressSources=[{title:'Programa Educativo do CNE',url:'https://escutismo.pt/programa-educativo/'},{title:'Objetivos educativos · IV secção (CNE)',url:'https://saintalphonse.lgs.lu/wp-content/uploads/2023/02/CAMINHEIROS-Cartaz-FACEIS_compressed.pdf'},{title:'Etapas e percurso dos Caminheiros',url:'https://1351.escutismo.pt/caminheiros-sistema-de-progresso/'}];
export function validProgress(value:unknown,personIds:string[]):value is Progress{
 if(!value||typeof value!=='object')return false;const p=value as Progress;
 if(!Array.isArray(p.catalog)||!Array.isArray(p.records)||!Array.isArray(p.stages))return false;
 const text=(v:unknown,max:number)=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
 if(!p.catalog.every(g=>g&&text(g.id,200)&&text(g.code,30)&&areas.some(a=>a.id===g.area)&&text(g.title,200))||new Set(p.catalog.map(g=>g.id)).size!==p.catalog.length)return false;
 if(!p.catalog.every(g=>g.trailId===undefined||trails.some(t=>t.id===g.trailId&&t.area===g.area)))return false;
 const date=(v:unknown)=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
 if(p.milestones!==undefined&&(!Array.isArray(p.milestones)||new Set(p.milestones.map(m=>m?.personId)).size!==p.milestones.length||!p.milestones.every(m=>m&&personIds.includes(m.personId)&&(m.commitmentDate===null||date(m.commitmentDate))&&(m.departureDate===null||date(m.departureDate))&&typeof m.departureReason==='string'&&m.departureReason.length<=4000&&(!m.departureDate||(m.commitmentDate!==null&&m.departureDate>=m.commitmentDate&&m.departureReason.trim().length>0)))))return false;
 if(!p.stages.every(s=>s&&personIds.includes(s.personId)&&stages.some(x=>x.id===s.stage))||new Set(p.stages.map(s=>s.personId)).size!==p.stages.length)return false;
 return p.records.every(r=>r&&personIds.includes(r.personId)&&p.catalog.some(g=>g.id===r.goalId)&&statuses.some(x=>x.id===r.status)&&stages.some(x=>x.id===r.stage)&&typeof r.notes==='string'&&r.notes.length<=4000&&Array.isArray(r.pending)&&new Set(r.pending.map(t=>t?.id)).size===r.pending.length&&r.pending.every(t=>t&&text(t.id,200)&&text(t.title,300)&&typeof t.done==='boolean'&&(t.dueDate===null||(typeof t.dueDate==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(t.dueDate)&&!Number.isNaN(Date.parse(t.dueDate))))))&&new Set(p.records.map(r=>JSON.stringify([r.personId,r.goalId]))).size===p.records.length;
}
