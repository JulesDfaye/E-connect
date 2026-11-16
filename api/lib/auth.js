import {hash,random,passwordHash,passwordCheck,equal} from './crypto.js';
import {cookie,fail,json,body} from './http.js';
import * as v from './validation.js';
export function origin(request){const expected=new URL(request.url).origin;if(request.headers.get('Origin')!==expected||request.headers.get('X-Requested-With')!=='E-connect')fail(403,'Origine ou en-tête de protection invalide.');}
export async function session(request,env){const raw=cookie(request,'ec_session');if(!raw)return null;const row=await env.DB.prepare('SELECT s.csrf,s.expires,u.id,u.school_id,u.name,u.email,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>? AND u.active=1').bind(await hash(raw),Date.now()).first();return row;}
export function requireUser(user){if(!user)fail(401,'Connexion nécessaire.');}
export function csrf(request,user){requireUser(user);if(!equal(request.headers.get('X-CSRF-Token'),user.csrf))fail(403,'Session expirée ou jeton CSRF invalide.');}
export const publicUser=u=>u?{id:u.id,school_id:u.school_id,name:u.name,email:u.email,role:u.role}:null;
function sessionCookie(request,token,maxAge){return `ec_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${new URL(request.url).protocol==='https:'?'; Secure':''}`;}
export async function authRoute(request,env,path,user){
 if(path==='/api/auth/session'&&request.method==='GET')return json({user:publicUser(user),csrf:user?.csrf||null});
 if(path==='/api/auth/bootstrap'&&request.method==='POST'){
  const token=request.headers.get('X-Bootstrap-Token')||'';
  if(!env.BOOTSTRAP_TOKEN||!/^[a-f0-9]{64}$/.test(env.BOOTSTRAP_TOKEN)||!equal(token,env.BOOTSTRAP_TOKEN))fail(403,'Initialisation interdite.');
  if(await env.DB.prepare('SELECT id FROM setup WHERE id=1').first())fail(409,'Application déjà initialisée.');
  const b=await body(request),sid=crypto.randomUUID(),uid=crypto.randomUUID();
  const statements=[env.DB.prepare('INSERT INTO setup(id) VALUES(1)'),env.DB.prepare('INSERT INTO schools(id,name) VALUES(?,?)').bind(sid,v.text(b.school,'établissement')),env.DB.prepare('INSERT INTO users(id,school_id,name,email,password_hash,role) VALUES(?,?,?,?,?,?)').bind(uid,sid,v.text(b.name,'nom'),v.email(b.email),await passwordHash(v.password(b.password)),'admin')];
  await env.DB.batch(statements);return json({message:'Établissement et compte administrateur créés.'},201);
 }
 if(path==='/api/auth/login'&&request.method==='POST'){
  const b=await body(request),address=v.email(b.email),secret=v.password(b.password),fp=await hash(address),now=Date.now();
  const count=await env.DB.prepare('SELECT COUNT(*) AS n FROM login_attempts WHERE fingerprint=? AND stamp>?').bind(fp,now-900000).first();
  if(count.n>=8)fail(429,'Trop de tentatives. Réessayez dans 15 minutes.');
  await env.DB.prepare('INSERT INTO login_attempts(fingerprint,stamp) VALUES(?,?)').bind(fp,now).run();
  const u=await env.DB.prepare('SELECT * FROM users WHERE email=? AND active=1').bind(address).first();
  const dummy='pbkdf2$100000$econnect-dummy-salt$'+'0'.repeat(64);
  if(!(await passwordCheck(secret,u?.password_hash||dummy))||!u)fail(401,'Identifiants incorrects.');
  const token=random(),csrfToken=random();
  await env.DB.batch([env.DB.prepare('DELETE FROM login_attempts WHERE fingerprint=? OR stamp<?').bind(fp,now-86400000),env.DB.prepare('DELETE FROM sessions WHERE expires<?').bind(now),env.DB.prepare('INSERT INTO sessions(token_hash,user_id,csrf,expires) VALUES(?,?,?,?)').bind(await hash(token),u.id,csrfToken,now+28800000)]);
  return json({user:publicUser(u),csrf:csrfToken},200,{'Set-Cookie':sessionCookie(request,token,28800)});
 }
 if(path==='/api/auth/logout'&&request.method==='POST'){
  csrf(request,user);await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await hash(cookie(request,'ec_session'))).run();return json({message:'Déconnecté.'},200,{'Set-Cookie':sessionCookie(request,'',0)});
 }
 return null;
}
