import {json,fail,secure,HttpError} from './lib/http.js';
import {origin,session,authRoute,requireUser} from './lib/auth.js';
import {resourcesRoute} from './lib/resources.js';
export default {
 async fetch(request,env){
  const url=new URL(request.url);
  if(!url.pathname.startsWith('/api/')&&url.pathname!=='/api')return env.ASSETS.fetch(request);
  try{
   if(!['GET','POST','PUT','DELETE'].includes(request.method))fail(405,'Méthode non autorisée.');
   if(request.method!=='GET')origin(request);
   if(url.pathname==='/api/health'&&request.method==='GET')return secure(json({ok:true,service:'E-connect'}));
   const user=await session(request,env);
   const auth=await authRoute(request,env,url.pathname,user);if(auth)return secure(auth);
   if(url.pathname==='/api/audit'&&request.method==='GET'){
    requireUser(user);if(user.role!=='admin')fail(403,'Accès administrateur requis.');
    const result=await env.DB.prepare('SELECT a.*,u.name AS actor FROM audit a JOIN users u ON u.id=a.user_id WHERE a.school_id=? ORDER BY a.created DESC,a.id DESC LIMIT 200').bind(user.school_id).all();return secure(json({data:result.results}));
   }
   const response=await resourcesRoute(request,env,url,user);if(response)return secure(response);fail(404,'Route introuvable.');
  }catch(error){
   if(error instanceof HttpError)return secure(json({error:error.message},error.status));
   if(/UNIQUE constraint|CHECK constraint|FOREIGN KEY constraint|Transition de commande/.test(error.message))return secure(json({error:'Conflit ou référence invalide. Vérifiez les champs et rechargez la liste.'},409));
   const incident=crypto.randomUUID();console.error(JSON.stringify({incident,type:error.name}));return secure(json({error:'Erreur interne.',incident},500));
  }
 }
};
