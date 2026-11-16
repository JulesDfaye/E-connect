import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const bridge=fileURLToPath(new URL('./d1.py',import.meta.url));
export class LocalD1 {
 constructor(path,schema){this.path=path;if(schema)this.call({schema});}
 call(data){const proc=spawnSync(process.env.PYTHON||'python3',[bridge],{input:JSON.stringify({path:this.path,...data}),encoding:'utf8'});if(proc.status!==0)throw new Error('Pont SQLite : '+proc.stderr);const value=JSON.parse(proc.stdout);if(value.error)throw new Error('D1_ERROR: '+value.error);return value.result;}
 prepare(sql){const db=this;return {sql,args:[],bind(...args){this.args=args;return this;},async first(){return (db.call({statements:[{sql:this.sql,args:this.args}]})[0].results[0])||null;},async all(){return db.call({statements:[{sql:this.sql,args:this.args}]})[0];},async run(){return db.call({statements:[{sql:this.sql,args:this.args}]})[0];}};}
 async batch(statements){return this.call({statements:statements.map(s=>({sql:s.sql,args:s.args}))});}
}
