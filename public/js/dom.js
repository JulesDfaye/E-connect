export function el(tag,text,attrs={}){const node=document.createElement(tag);if(text!==undefined&&text!==null)node.textContent=String(text);for(const [key,value]of Object.entries(attrs)){if(key==='class')node.className=value;else node.setAttribute(key,value);}return node;}
export function button(text,callback,style='btn small outline'){const b=el('button',text,{type:'button',class:style});b.addEventListener('click',callback);return b;}
export function notice(message,error=false){const box=document.getElementById('status');box.replaceChildren();if(message)box.append(el('div',message,{class:'notice'+(error?' error':'')}));}
export const show=(id,visible)=>document.getElementById(id).classList.toggle('hidden',!visible);
