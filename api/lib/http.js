export class HttpError extends Error { constructor(status,message){super(message);this.status=status;} }
export const fail=(status,message)=>{throw new HttpError(status,message);};
export const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8',...headers}});
export async function body(request){
 if(!request.headers.get('Content-Type')?.startsWith('application/json'))fail(415,'JSON requis.');
 const reader=request.body?.getReader();if(!reader)fail(400,'Corps requis.');let chunks=[],size=0;
 for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>16384){await reader.cancel();fail(413,'Requête trop volumineuse.');}chunks.push(value);}
 const data=new Uint8Array(size);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.length;}
 try{const value=JSON.parse(new TextDecoder().decode(data));if(!value||Array.isArray(value)||typeof value!=='object')fail(400,'Objet attendu.');return value;}catch(e){if(e instanceof HttpError)throw e;fail(400,'JSON invalide.');}
}
export function cookie(request,name){return request.headers.get('Cookie')?.split(';').map(v=>v.trim()).find(v=>v.startsWith(name+'='))?.slice(name.length+1)||'';}
export function secure(response){const headers=new Headers(response.headers);for(const [key,value] of Object.entries({'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'no-referrer','Permissions-Policy':'camera=(), microphone=(), geolocation=()','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'"}))headers.set(key,value);headers.set('Cache-Control','no-store');return new Response(response.body,{status:response.status,headers});}
