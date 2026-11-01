import type {Data} from './data';
import {balance,emptyTreasury,type Entry} from './treasury';
export function personalEntry(data:Data,entry:Entry):Data {
 const t=data.treasury??emptyTreasury;
 if(!Number.isSafeInteger(entry.cents)||entry.cents===0||Math.abs(entry.cents)>1_000_000_000)throw Error('O valor deve ser positivo e ter no máximo duas casas decimais.');
 if(!t.people.some(p=>p.id===entry.personId&&p.active)||!t.typologies.some(c=>c.id===entry.typologyId))throw Error('Seleciona uma pessoa ativa e uma tipologia.');
 if(balance(t,entry.personId,entry.typologyId)+entry.cents<0)throw Error('A pessoa não tem saldo suficiente nesta tipologia.');
 return {...data,treasury:{...t,entries:[...t.entries,entry]}};
}
