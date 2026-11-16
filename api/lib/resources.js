import {fail,json,body} from './http.js';
import {csrf,requireUser} from './auth.js';
import {passwordHash} from './crypto.js';
import * as v from './validation.js';
const A=['admin'],T=['admin','enseignant'],P=['admin','enseignant','parent'],I=['admin','intendant'];
export const resources={
 years:{read:P,write:A,fields:['name','active']},
 classes:{read:P,write:A,fields:['name','teacher_id']},
 students:{read:P,write:A,fields:['name','class_id','parent_id']},
 grades:{read:P,write:T,fields:['student_id','year_id','term','subject','score','maximum','coefficient']},
 attendance:{read:P,write:T,fields:['student_id','year_id','day','status']},
 suppliers:{read:I,write:I,fields:['name','email','phone']},
 items:{read:I,write:I,fields:['name','quantity']},
 orders:{read:I,write:I,fields:['supplier_id','item_id','quantity']},
 users:{read:A,write:A,fields:['name','email','role']}
};
const columns=(entity)=>entity==='users'?'id,name,email,role,active': '*';
const permitted=(u,list)=>{if(!list.includes(u.role))fail(403,'Action non autorisée pour ce rôle.');};
export async function reference(env,u,entity,id){
 if(!resources[entity])fail(400,'Ressource inconnue.');
 const r=await env.DB.prepare(`SELECT ${columns(entity)} FROM ${entity} WHERE id=? AND school_id=? AND ${entity==='users'?'active=1':'archived=0'}`).bind(id,u.school_id).first();
 if(!r)fail(403,'Référence inaccessible ou archivée.');return r;
}
export function scope(entity,u){
 const conditions=['school_id=?',entity==='users'?'active=1':'archived=0'],args=[u.school_id];
 if(u.role==='enseignant'){
  if(entity==='classes'){conditions.push('teacher_id=?');args.push(u.id);}
  if(entity==='students'){conditions.push('class_id IN(SELECT id FROM classes WHERE teacher_id=? AND archived=0)');args.push(u.id);}
  if(['grades','attendance'].includes(entity)){conditions.push('student_id IN(SELECT s.id FROM students s JOIN classes c ON c.id=s.class_id WHERE c.teacher_id=? AND s.archived=0 AND c.archived=0)');args.push(u.id);}
 }
 if(u.role==='parent'){
  if(entity==='students'){conditions.push('parent_id=?');args.push(u.id);}
  if(entity==='classes'){conditions.push('id IN(SELECT class_id FROM students WHERE parent_id=? AND archived=0)');args.push(u.id);}
  if(['grades','attendance'].includes(entity)){conditions.push('student_id IN(SELECT id FROM students WHERE parent_id=? AND archived=0)');args.push(u.id);}
 }
 return {sql:conditions.join(' AND '),args};
}
async function accessibleStudent(env,u,id){
 const r=await reference(env,u,'students',id);
 if(u.role==='enseignant'){const c=await reference(env,u,'classes',r.class_id);if(c.teacher_id!==u.id)fail(403,'Élève hors de vos classes.');}
 return r;
}
async function validate(env,u,entity,b){
 const r={};const fields=resources[entity].fields;
 for(const f of fields){
  if(['teacher_id','parent_id'].includes(f))r[f]=v.text(b[f],f,80,true);
  else if(f==='active')r[f]=v.number(b[f],f,0,1,true);
  else if(f==='quantity')r[f]=v.number(b[f],f,entity==='orders'?1:0,1e6,true);
  else if(['score','maximum','coefficient'].includes(f))r[f]=v.number(b[f],f,f==='score'?0:0.001,10000);
  else if(f==='email')r[f]=entity==='suppliers'&&!b[f]?'':v.email(b[f]);
  else if(f==='phone')r[f]=v.text(b[f],f,40,true)||'';
  else if(f==='day')r[f]=v.date(b[f]);
  else r[f]=v.text(b[f],f,160);
 }
 if(entity==='users'&&!['admin','enseignant','parent','intendant'].includes(r.role))fail(400,'Rôle inconnu.');
 if(entity==='classes'&&r.teacher_id){const teacher=await reference(env,u,'users',r.teacher_id);if(teacher.role!=='enseignant')fail(400,'Compte enseignant attendu.');}
 if(entity==='students'){
  await reference(env,u,'classes',r.class_id);
  if(r.parent_id){const p=await reference(env,u,'users',r.parent_id);if(p.role!=='parent')fail(400,'Compte parent attendu.');}
 }
 if(['grades','attendance'].includes(entity)){
  await accessibleStudent(env,u,r.student_id);await reference(env,u,'years',r.year_id);
  if(entity==='grades'&&r.score>r.maximum)fail(400,'La note dépasse le barème.');
  if(entity==='attendance'&&!['Présent','Absent','Retard'].includes(r.status))fail(400,'Statut invalide.');
 }
 if(entity==='orders'){await reference(env,u,'suppliers',r.supplier_id);await reference(env,u,'items',r.item_id);}
 return r;
}
function audit(env,u,action,entity,id){return env.DB.prepare('INSERT INTO audit(id,school_id,user_id,action,entity,record_id) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),u.school_id,u.id,action,entity,id);}
export async function resourcesRoute(request,env,url,u){
 const parts=url.pathname.split('/').filter(Boolean),entity=parts[1],id=parts[2],operation=parts[3];
 const def=resources[entity];if(!def)return null;requireUser(u);
 if(parts.length>4)fail(404,'Route inconnue.');
 if(request.method==='GET'){
  if(operation)fail(404,'Route inconnue.');permitted(u,def.read);const filter=scope(entity,u);
  if(id){const row=await env.DB.prepare(`SELECT ${columns(entity)} FROM ${entity} WHERE id=? AND ${filter.sql}`).bind(id,...filter.args).first();if(!row)fail(404,'Dossier introuvable.');return json({data:row});}
  const page=Math.max(1,Math.min(10000,Number(url.searchParams.get('page'))||1))|0;
  const query=(url.searchParams.get('q')||'').slice(0,80);const search=def.fields.includes('name')?'name':def.fields.includes('subject')?'subject':null;
  if(query&&search){filter.sql+=` AND ${search} LIKE ?`;filter.args.push('%'+query+'%');}
  const count=await env.DB.prepare(`SELECT COUNT(*) AS total FROM ${entity} WHERE ${filter.sql}`).bind(...filter.args).first();
  const result=await env.DB.prepare(`SELECT ${columns(entity)} FROM ${entity} WHERE ${filter.sql} ORDER BY id LIMIT 25 OFFSET ?`).bind(...filter.args,(page-1)*25).all();
  return json({data:result.results,page,pageSize:25,total:count.total});
 }
 csrf(request,u);permitted(u,def.write);
 if(entity==='orders'&&id&&request.method==='POST'&&operation){
  const order=await reference(env,u,'orders',id);let next;
  if(operation==='approve'||operation==='cancel'){permitted(u,A);if(order.status!=='demandee')fail(409,'Commande déjà traitée.');next=operation==='approve'?'approuvee':'annulee';}
  else if(operation==='receive'){if(order.status!=='approuvee')fail(409,'Commande non approuvée ou déjà reçue.');await reference(env,u,'items',order.item_id);next='recue';}
  else fail(404,'Action inconnue.');
  const results=await env.DB.batch([env.DB.prepare('UPDATE orders SET status=? WHERE id=? AND school_id=? AND status=?').bind(next,id,u.school_id,order.status),audit(env,u,'order_'+next,entity,id)]);
  if(!results[0].meta.changes)fail(409,'Commande modifiée entre-temps.');return json({message:'Commande mise à jour.'});
 }
 if(operation)fail(404,'Route inconnue.');
 if(request.method==='POST'&&!id){
  const b=await body(request),data=await validate(env,u,entity,b),newId=crypto.randomUUID();
  if(entity==='users')data.password_hash=await passwordHash(v.password(b.password));
  const keys=Object.keys(data),statements=[];
  if(entity==='years'&&data.active)statements.push(env.DB.prepare('UPDATE years SET active=0 WHERE school_id=?').bind(u.school_id));
  statements.push(env.DB.prepare(`INSERT INTO ${entity}(id,school_id,${keys.join(',')}) VALUES(${Array(keys.length+2).fill('?').join(',')})`).bind(newId,u.school_id,...keys.map(k=>data[k])),audit(env,u,'create',entity,newId));
  await env.DB.batch(statements);return json({id:newId,message:'Dossier créé.'},201);
 }
 if(!id)fail(405,'Méthode non autorisée.');
 const existing=await reference(env,u,entity,id);
 if(['grades','attendance'].includes(entity))await accessibleStudent(env,u,existing.student_id);
 if(request.method==='PUT'){
  if(entity==='orders')fail(405,'Utilisez les actions de commande.');
  const b=await body(request),data=await validate(env,u,entity,b),statements=[];
  if(entity==='users'){
   if(id===u.id&&data.role!=='admin')fail(400,'Vous ne pouvez pas retirer votre propre rôle administrateur.');
   if(existing.role==='admin'&&data.role!=='admin')fail(400,'Un compte administrateur doit conserver son rôle dans cette version.');
   if(b.password)data.password_hash=await passwordHash(v.password(b.password));
   // Toute modification de compte révoque ses sessions.
   statements.push(env.DB.prepare('DELETE FROM sessions WHERE user_id=?').bind(id));
   if(data.role!==existing.role)statements.push(env.DB.prepare('UPDATE classes SET teacher_id=NULL WHERE teacher_id=?').bind(id),env.DB.prepare('UPDATE students SET parent_id=NULL WHERE parent_id=?').bind(id));
  }
  if(entity==='years'&&data.active)statements.push(env.DB.prepare('UPDATE years SET active=0 WHERE school_id=?').bind(u.school_id));
  const keys=Object.keys(data);
  statements.push(env.DB.prepare(`UPDATE ${entity} SET ${keys.map(k=>k+'=?').join(',')} WHERE id=? AND school_id=?`).bind(...keys.map(k=>data[k]),id,u.school_id),audit(env,u,'update',entity,id));await env.DB.batch(statements);return json({message:'Dossier modifié.'});
 }
 if(request.method==='DELETE'){
  const statements=[];
  if(entity==='users'){
   if(existing.role==='admin')fail(400,'Les administrateurs ne peuvent pas être désactivés ici.');
   statements.push(env.DB.prepare('DELETE FROM sessions WHERE user_id=?').bind(id),env.DB.prepare('UPDATE students SET parent_id=NULL WHERE parent_id=?').bind(id),env.DB.prepare('UPDATE classes SET teacher_id=NULL WHERE teacher_id=?').bind(id));
  }
  if(entity==='classes'&&await env.DB.prepare('SELECT id FROM students WHERE class_id=? AND archived=0 LIMIT 1').bind(id).first())fail(409,'Déplacez les élèves actifs avant archivage.');
  if(entity==='years'&&existing.active)fail(409,'Activez une autre année avant archivage.');
  if(entity==='items'&&existing.quantity!==0)fail(409,'Le stock doit être nul.');
  if(['items','suppliers'].includes(entity)){
   const key=entity==='items'?'item_id':'supplier_id';
   if(await env.DB.prepare(`SELECT id FROM orders WHERE ${key}=? AND status IN('demandee','approuvee') AND archived=0 LIMIT 1`).bind(id).first())fail(409,'Une commande ouverte utilise ce dossier.');
  }
  if(entity==='orders'&&['demandee','approuvee'].includes(existing.status))fail(409,'Terminez la commande avant archivage.');
  statements.push(env.DB.prepare(`UPDATE ${entity} SET ${entity==='users'?'active=0':'archived=1'} WHERE id=? AND school_id=?`).bind(id,u.school_id),audit(env,u,'archive',entity,id));await env.DB.batch(statements);return json({message:'Dossier archivé.'});
 }
 fail(405,'Méthode non autorisée.');
}
