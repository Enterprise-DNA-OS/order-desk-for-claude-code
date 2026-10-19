#!/usr/bin/env node
import {getDb} from './lib/db.mjs';
import {run} from './lib/domain.mjs';
import {table} from './lib/format.mjs';
export function format(value){
 if(Array.isArray(value)){
  if(value[0]?.question)return value.map(x=>x.question+'\n'+format(x.rows)).join('\n\n');
  const keys=Object.keys(value[0]||{});return table(value,keys.map(key=>({key,label:key.replaceAll('_',' '),width:key==='id'?36:70})));
 }
 if(value&&typeof value==='object'&&value.order)return Object.entries(value).map(([k,v])=>k.toUpperCase()+'\n'+format(Array.isArray(v)?v:[v])).join('\n\n');
 return JSON.stringify(value,null,2);
}
let db;
try{db=await getDb();const result=await run(db,process.argv.slice(2));console.log(process.argv.includes('--json')?JSON.stringify(result,null,2):format(result));}
catch(e){console.error(e.message);process.exitCode=1;}
finally{if(db)await db.close();}
