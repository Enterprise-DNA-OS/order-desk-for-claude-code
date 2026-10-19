import assert from 'node:assert/strict';
import path from 'node:path';
import crypto from 'node:crypto';
import {getDb,REPO_ROOT} from './lib/db.mjs';
import {migrate} from './migrate.mjs';
import {seed} from './seed.mjs';
import {run} from './lib/domain.mjs';
if(!process.env.TEST_DATABASE_URL)throw Error('Provide a disposable TEST_DATABASE_URL');
process.env.DATABASE_URL=process.env.TEST_DATABASE_URL;
const schema='order_test_'+crypto.randomBytes(8).toString('hex');const db=await getDb();
try{
 assert.equal(db.mode,'postgres');await db.exec(`create schema ${schema};set search_path to ${schema},public`);
 await migrate(db);await migrate(db);await seed(db);await seed(db);
 for(const c of ['orders','channels','products','shipments','tasks','dispatch','promises','returns-due','attention','compliance','insights','history'])await run(db,[c]);
 const csv=path.join(REPO_ROOT,'examples/goflow-lines.csv');
 assert.equal((await run(db,['import','goflow',csv,'--dry-run','--actor=Postgres test'])).orders_inserted,2);
 assert.equal((await run(db,['orders'])).length,4);
 assert.equal((await run(db,['import','goflow',csv,'--actor=Postgres test'])).orders_inserted,2);
 assert.equal((await run(db,['import','goflow',csv,'--actor=Postgres test'])).orders_skipped,2);
 await assert.rejects(()=>db.query("update order_lines set cancelled=6 where id='40000000-0000-4000-8000-000000000001'"),/shipped units/);
 await assert.rejects(()=>db.query("update audit_events set actor='tampered'"),/append-only/);
 const line='40000000-0000-4000-8000-000000000001';
 const ship=await run(db,['ship',line,'--qty=1','--warehouse=Test','--carrier=Test','--tracking=PG-TEST','--date=2026-10-19','--evidence=Test docket','--actor=Postgres test']);
 assert(ship.id);assert.equal((await run(db,['show','WEB-1041'])).order.remaining,3);
 console.log('Postgres PASS: migrations, repeatable seed, all reads, quantity guards, audit immutability, imports, rollback and dispatch');
}finally{try{await db.exec(`set search_path to public;drop schema if exists ${schema} cascade`);}finally{await db.close();}}
