import type {Data} from './data';
import {balance,emptyTreasury,type Entry} from './treasury';
export function personalTypeEntry(data:Data,entry:Omit<Entry,'typologyId'> & {typeId:string}):Data {
 const t=data.treasury??emptyTreasury;
 const sources=t.typologies.filter(c=>c.typeId===entry.typeId).sort((a,b)=>a.priority-b.priority||a.name.localeCompare(b.name,'pt')||a.id.localeCompare(b.id));
 if(!sources.length)throw Error('Seleciona um tipo de dinheiro.');
 const {typeId,...movement}=entry;void typeId;
 if(entry.cents>0)return personalEntry(data,{...movement,typologyId:sources[0].id});
 if(!Number.isSafeInteger(entry.cents)||entry.cents>=0||Math.abs(entry.cents)>1_000_000_000)throw Error('Indica um valor válido.');
 if(sources.reduce((s,c)=>s+balance(t,entry.personId,c.id),0)<-entry.cents)throw Error('A pessoa não tem saldo suficiente neste tipo de dinheiro.');
 let remaining=-entry.cents;let next=data;
 for(const source of sources){const cents=Math.min(remaining,balance(t,entry.personId,source.id));if(cents>0){next=personalEntry(next,{...movement,id:remaining===-entry.cents?entry.id:crypto.randomUUID(),typologyId:source.id,cents:-cents});remaining-=cents;}if(!remaining)break;}
 return next;
}
export function personalEntry(data:Data,entry:Entry):Data {
 const t=data.treasury??emptyTreasury;
 if(!Number.isSafeInteger(entry.cents)||entry.cents===0||Math.abs(entry.cents)>1_000_000_000)throw Error('O valor deve ser positivo e ter no máximo duas casas decimais.');
 if(!t.people.some(p=>p.id===entry.personId&&p.active)||!t.typologies.some(c=>c.id===entry.typologyId))throw Error('Seleciona uma pessoa ativa e um tipo de dinheiro.');
 if(balance(t,entry.personId,entry.typologyId)+entry.cents<0)throw Error('A pessoa não tem saldo suficiente nesta tipologia.');
 return {...data,treasury:{...t,entries:[...t.entries,entry]}};
}
