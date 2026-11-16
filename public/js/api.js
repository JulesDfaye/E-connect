let csrf=null;
export function setCsrf(value){csrf=value;}
export async function api(path,{method='GET',data}={}){
 const headers={'Accept':'application/json'};
 if(method!=='GET'){headers['X-Requested-With']='E-connect';if(csrf)headers['X-CSRF-Token']=csrf;if(data!==undefined)headers['Content-Type']='application/json';}
 const response=await fetch('/api'+path,{method,headers,credentials:'same-origin',body:data===undefined?undefined:JSON.stringify(data)});
 const value=await response.json().catch(()=>({error:'Réponse serveur illisible.'}));
 if(!response.ok){const e=new Error(value.error||'Échec de la requête.');e.status=response.status;throw e;}
 return value;
}
export async function all(entity){let page=1,rows=[];for(;;){const result=await api('/'+entity+'?page='+page);rows.push(...result.data);if(rows.length>=result.total)return rows;if(page++>=160)throw new Error('Trop de données pour ce sélecteur. Affinez le module avant usage à grande échelle.');}}
