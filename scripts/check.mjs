import {readdir,readFile,access} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
async function walk(path){for(const e of await readdir(path,{withFileTypes:true})){if(['node_modules','.git','.wrangler'].includes(e.name))continue;const name=path+'/'+e.name;if(e.isDirectory())await walk(name);else if(/\.(m?js)$/.test(name)){const r=spawnSync(process.execPath,['--check',name],{encoding:'utf8'});if(r.status!==0)throw new Error(r.stderr);}}}
await walk(root);
for(const file of ['wrangler.toml','public/index.html','public/app.html','migrations/0001_initial.sql'])await access(root+file);
for(const name of ['index.html','app.html']){const source=await readFile(root+'public/'+name,'utf8');for(const match of source.matchAll(/(?:src|href)="(\/[^"#?]+)"/g)){if(match[1].startsWith('/api'))continue;const rel=match[1]==='/'?'index.html':match[1].slice(1);await access(root+'public/'+rel);}}
console.log('Syntaxe JavaScript et chemins statiques : OK. Aucune compilation front-end requise.');
