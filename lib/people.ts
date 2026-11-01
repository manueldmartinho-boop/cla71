import type { Data } from './data';
import type { Person } from './treasury';

export const positions = [
 { id:'material_keeper', label:'Guarda-material' },
 { id:'guide', label:'Guia' },
 { id:'deputy_guide', label:'Subguia' },
 { id:'treasurer', label:'Tesoureira' },
] as const;
export type Position = typeof positions[number]['id'];
export type Tribe = { id:string; name:string };
export type Permissions = { material:boolean; finance:boolean; admin:boolean };
export function permissionsFor(role:string,email:string,people:Person[]):Permissions {
 const admin=role==='admin';
 const person=people.find(p=>p.active&&p.email?.trim().toLowerCase()===email.trim().toLowerCase());
 const roles=person?.positions??[];
 const leader=roles.includes('guide')||roles.includes('deputy_guide');
 return {admin,material:admin||leader||roles.includes('material_keeper'),finance:admin||leader||roles.includes('treasurer')};
}
export function validateDirectory(data:Data):boolean {
 const tribes=data.tribes??[];
 if(!Array.isArray(tribes)||!tribes.every(t=>t&&typeof t.id==='string'&&t.id.length>0&&typeof t.name==='string'&&t.name.trim().length>0&&t.name.length<=120)||new Set(tribes.map(t=>t.id)).size!==tribes.length)return false;
 const people=data.treasury?.people??[];
 const emails=people.map(p=>p.email?.trim().toLowerCase()).filter(Boolean);
 return new Set(emails).size===emails.length&&people.every(p=>p.tribeId===undefined||p.tribeId===null||tribes.some(t=>t.id===p.tribeId));
}
