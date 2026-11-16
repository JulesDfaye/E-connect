import {createInterface} from 'node:readline/promises';
import {stdin,stdout} from 'node:process';
const base=(process.env.EC_URL||'http://localhost:8787').replace(/\/$/,'');
if(!process.env.BOOTSTRAP_TOKEN||!process.env.ADMIN_PASSWORD)throw new Error('Définissez BOOTSTRAP_TOKEN et ADMIN_PASSWORD dans ce terminal. Ne les passez pas en arguments de commande.');
const rl=createInterface({input:stdin,output:stdout});
try{
 const school=await rl.question('Établissement : '),name=await rl.question('Nom administrateur : '),email=await rl.question('E-mail administrateur : ');
 const response=await fetch(base+'/api/auth/bootstrap',{method:'POST',headers:{'Content-Type':'application/json','Origin':new URL(base).origin,'X-Requested-With':'E-connect','X-Bootstrap-Token':process.env.BOOTSTRAP_TOKEN},body:JSON.stringify({school,name,email,password:process.env.ADMIN_PASSWORD})});
 const result=await response.json();if(!response.ok)throw new Error(result.error||'Échec de l’initialisation.');console.log(result.message);
}finally{rl.close();}
