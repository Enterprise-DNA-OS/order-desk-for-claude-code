import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {REPO_ROOT} from './lib/db.mjs';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'order-desk-demo-'));
const env={...process.env,DATABASE_URL:'',DATA_DIR:path.join(dir,'db'),OUTPUT_DIR:dir};
function call(script,args=[]){const r=spawnSync(process.execPath,[path.join(REPO_ROOT,'scripts',script),...args],{env,cwd:REPO_ROOT,encoding:'utf8'});if(r.status!==0)throw Error(r.stderr||r.stdout||r.error?.message);return r.stdout;}
try{
 console.log(call('migrate.mjs'));console.log(call('seed.mjs'));
 const screens=[];
 for(const [title,ask,cmd]of [['Dispatch desk','Which orders still need dispatching?','dispatch'],['Delivery promises','Which delivery promises need checking?','promises'],['Returns review','Which returns are waiting for a decision?','returns-due']]){
  const output=call('orders.mjs',[cmd]);console.log(output);screens.push({title,ask,command:`node scripts/orders.mjs ${cmd}`,output});
 }
 console.log(call('view.mjs'));console.log(call('docs.mjs'));
 const capture=process.argv.find(a=>a.startsWith('--capture='));if(capture)fs.writeFileSync(path.resolve(capture.slice(10)),JSON.stringify(screens,null,2)+'\n');
 if(process.argv.includes('--keep'))console.log('Demo workspace: '+dir);
}finally{if(!process.argv.includes('--keep'))fs.rmSync(dir,{recursive:true,force:true});}
