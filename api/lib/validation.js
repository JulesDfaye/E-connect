import {fail} from './http.js';
export function text(value,name,max=160,optional=false){if(optional&&(value===null||value===undefined||value===''))return null;if(typeof value!=='string'||!value.trim()||value.trim().length>max)fail(400,'Champ invalide : '+name);return value.trim();}
export function email(value){const v=text(value,'email',254).toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))fail(400,'Adresse e-mail invalide.');return v;}
export function number(value,name,min=0,max=1e6,integer=false){if(value===''||value===null||value===undefined)fail(400,'Nombre requis : '+name);const v=Number(value);if(!Number.isFinite(v)||v<min||v>max||(integer&&!Number.isInteger(v)))fail(400,'Nombre invalide : '+name);return v;}
export function date(value){const v=text(value,'date',10);if(!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v)fail(400,'Date invalide.');return v;}
export function password(value){if(typeof value!=='string'||value.length<12||value.length>200)fail(400,'Le mot de passe doit contenir entre 12 et 200 caractères.');return value;}
