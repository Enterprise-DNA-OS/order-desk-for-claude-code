import {readFileSync} from 'node:fs';
import {getDb,REPO_ROOT} from './lib/db.mjs';
import path from 'node:path';
export async function seed(db){
 const existing=await db.query('select name from workspace');
 if(existing.length&&existing[0].name!=='Kauri Homewares Demo')throw Error('Refusing demo seed in a real workspace');
 await db.exec('BEGIN');try{await db.exec(readFileSync(path.join(REPO_ROOT,'supabase/seed.sql'),'utf8'));await db.exec('COMMIT');}catch(e){await db.exec('ROLLBACK');throw e;}
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.join(REPO_ROOT,'scripts/seed.mjs')){const db=await getDb();try{await seed(db);console.log('Demo seed ready');}finally{await db.close();}}
