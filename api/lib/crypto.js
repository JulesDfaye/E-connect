const enc=new TextEncoder();
export const random=()=>crypto.randomUUID()+crypto.randomUUID();
const hex=b=>Array.from(new Uint8Array(b),v=>v.toString(16).padStart(2,'0')).join('');
export async function hash(value){return hex(await crypto.subtle.digest('SHA-256',enc.encode(value)));}
export function equal(a,b){if(typeof a!=='string'||typeof b!=='string')return false;let diff=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)diff|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return diff===0;}
export async function passwordHash(password,salt=random()){const key=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveBits']);const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:enc.encode(salt),iterations:100000,hash:'SHA-256'},key,256);return `pbkdf2$100000$${salt}$${hex(bits)}`;}
export async function passwordCheck(password,stored){const parts=stored.split('$');if(parts.length!==4||parts[0]!=='pbkdf2'||parts[1]!=='100000')return false;return equal(await passwordHash(password,parts[2]),stored);}
