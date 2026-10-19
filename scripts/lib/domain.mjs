import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {parseCsv,pick} from './csv.mjs';
import {REPO_ROOT} from './db.mjs';

export const help={
 init:'init "Business" --actor=Name',
 'add-channel':'add-channel "Channel" --actor=Name',channels:'channels',
 'add-product':'add-product SKU --name="Product" --actor=Name',products:'products',
 'add-order':'add-order REF --channel=Channel --customer=Name --currency=NZD --ordered=YYYY-MM-DD [--ship-by=DATE --deliver-by=DATE --tax-year-end=DATE --retain-until=DATE] --actor=Name',
 'add-line':'add-line ORDER --sku=SKU --line=REF --qty=2 --unit=24.00 --actor=Name',
 orders:'orders [--channel=Channel]', show:'show ORDER',
 hold:'hold ORDER --reason="Reason" --actor=Name', release:'release ORDER --evidence="Checked by operator" --actor=Name',
 'set-dates':'set-dates ORDER [--ship-by=DATE --deliver-by=DATE --tax-year-end=DATE --retain-until=DATE] --actor=Name',
 'cancel-line':'cancel-line LINE --qty=1 --evidence="Cancellation authority" --actor=Name',
 ship:'ship LINE --qty=1 --warehouse=Name --carrier=Name --tracking=REF --date=DATE --evidence="Dispatch docket" --actor=Name',
 deliver:'deliver SHIPMENT --date=DATE --evidence="Delivery confirmation" --actor=Name',
 shipments:'shipments',
 return:'return LINE --qty=1 --reason="Reason" --date=DATE --review-by=DATE --actor=Name',
 'resolve-return':'resolve-return RETURN --outcome=repair|replacement|refund-requested|declined|withdrawn --evidence="Decision reference" --date=DATE --actor=Name',
 tasks:'tasks',log:'log ORDER --owner=Name --note="Next action" --due=DATE --actor=Name',
 'complete-task':'complete-task TASK --evidence="What happened" --actor=Name',
 dispatch:'dispatch',promises:'promises','returns-due':'returns-due',attention:'attention',compliance:'compliance',insights:'insights',history:'history [ENTITY-ID]',
 import:'import goflow FILE.csv [--map=column-map.json] [--dry-run] --actor=Name',
 export:'export [--out=exports/orders.json]',
 'draft-update':'draft-update ORDER', 'weekly-review':'weekly-review'
};
const optionSets={init:[], 'add-channel':[],channels:[], 'add-product':['name'],products:[], 'add-order':['channel','customer','currency','ordered','ship-by','deliver-by','tax-year-end','retain-until'], 'add-line':['sku','line','qty','unit'], orders:['channel'],show:[],hold:['reason'],release:['evidence'],'set-dates':['ship-by','deliver-by','tax-year-end','retain-until'],'cancel-line':['qty','evidence'],ship:['qty','warehouse','carrier','tracking','date','evidence'],deliver:['date','evidence'],shipments:[],return:['qty','reason','date','review-by'],'resolve-return':['outcome','evidence','date'],tasks:[],log:['owner','note','due'],'complete-task':['evidence'],dispatch:[],promises:[],'returns-due':[],attention:[],compliance:[],insights:[],history:[],import:['map','dry-run'],export:['out'],'draft-update':[],'weekly-review':[]};
const mutating=new Set(['init','add-channel','add-product','add-order','add-line','hold','release','set-dates','cancel-line','ship','deliver','return','resolve-return','log','complete-task','import']);
const tables=['workspace','channels','products','orders','order_lines','shipments','returns','tasks','audit_events'];
export const questions=[
 'Which overdue orders are still on hold?',
 'Which customers have partial dispatches past their ship date?',
 'Which channels have overdue unshipped units?',
 'Which dispatched orders still lack full delivery evidence?',
 'Which products have unresolved returns?',
 'Which owners have overdue follow-ups?',
 'Which orders have retention dates below the recorded tax-year floor?',
 'Which channel and currency combinations carry unshipped value?',
 'Which imported shipments need delivery reconciliation?',
 'Which returned orders have no open follow-up task?'
];
const insightSql=[
 "select reference,channel,hold_reason,ship_by from order_summary where hold_reason<>'' and remaining>0 and ship_by<current_date order by reference",
 "select reference,customer,remaining,ship_by from order_summary where status='partial' and ship_by<current_date order by reference",
 "select channel,sum(remaining)::integer as overdue_units from order_summary where ship_by<current_date and remaining>0 group by channel order by channel",
 "select reference,channel,shipped,delivered,deliver_by from order_summary where shipped>delivered order by reference",
 'select sku,sum(quantity)::integer as return_units,count(*)::integer as cases from returns_queue group by sku order by sku',
 'select owner,count(*)::integer as overdue_tasks,min(due_on) as oldest from tasks where completed_on is null and due_on<current_date group by owner order by owner',
 "select reference,tax_year_end,retain_until from orders where retain_until<(tax_year_end+interval '7 years')::date order by reference",
 'select c.name as channel,o.currency,sum(l.remaining*l.unit_cents)::bigint as unshipped_cents from line_balances l join orders o on o.id=l.order_id join channels c on c.id=o.channel_id where l.remaining>0 group by c.name,o.currency order by c.name,o.currency',
 'select reference,channel,imported_shipped from order_summary where imported_shipped>0 order by reference',
 'select reference,channel,open_returns from order_summary o where open_returns>0 and not exists(select 1 from tasks t where t.order_id=o.id and completed_on is null) order by reference'
];
export function args(argv){
 const p=[],o={};for(const a of argv){if(a.startsWith('--')){const i=a.indexOf('=');const k=a.slice(2,i<0?undefined:i);if(Object.hasOwn(o,k))throw Error(`Duplicate option --${k}`);o[k]=i<0?true:a.slice(i+1);}else p.push(a);}
 const cmd=p.shift()||'help'; if(o.help)return {cmd:'help',p:[],o:{}};
 if(cmd!=='help'&&!Object.hasOwn(help,cmd))throw Error(`Unknown command ${cmd}`);
 for(const k of Object.keys(o))if(!['json','actor',...(optionSets[cmd]||[])].includes(k))throw Error(`Unknown option --${k} for ${cmd}`);
 const count={import:2,init:1,'add-channel':1,'add-product':1,'add-order':1,'add-line':1,show:1,hold:1,release:1,'set-dates':1,'cancel-line':1,ship:1,deliver:1,return:1,'resolve-return':1,log:1,'complete-task':1,'draft-update':1};
 if(cmd!=='help'&&(cmd==='history'?p.length>1:p.length!==(count[cmd]||0)))throw Error(`Usage: ${help[cmd]}`);
 return {cmd,p,o};
}
const required=(v,name)=>{if(typeof v!=='string'||!v.trim())throw Error(`Missing ${name}`);return v.trim();};
const integer=(v,name,zero=false)=>{if(!/^\d+$/.test(String(v))||!Number.isSafeInteger(Number(v))||Number(v)>(2**31-1)||Number(v)<(zero?0:1))throw Error(`Invalid ${name}: use a ${zero?'nonnegative':'positive'} whole number`);return Number(v);};
export function date(v,name){v=required(v,name);if(!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v)throw Error(`Invalid ${name}: use YYYY-MM-DD`);return v;}
const optionalDate=(v,n)=>v?date(v,n):null;
export function cents(v){v=required(v,'unit price');if(!/^\d+(\.\d{1,2})?$/.test(v))throw Error('Invalid unit price: use nonnegative decimal with at most two places');const [a,b='']=v.split('.');const n=Number(a)*100+Number(b.padEnd(2,'0'));if(!Number.isSafeInteger(n))throw Error('Unit price too large');return n;}
const currency=v=>{v=required(v,'currency');if(!/^[A-Z]{3}$/.test(v))throw Error('Currency needs three uppercase letters');try{new Intl.NumberFormat('en',{style:'currency',currency:v});}catch{throw Error('Invalid currency');}return v;};
const today=()=>new Date().toISOString().slice(0,10);
const happened=(v,n)=>{const d=date(v,n);if(d>today())throw Error(`${n} cannot be in the future`);return d;};
export async function resolve(db,table,key,value){
 if(!['orders','channels','products','order_lines','shipments','returns','tasks'].includes(table))throw Error('Invalid resolver');
 const term=required(value,'record identifier');
 let rows=await db.query(`select * from ${table} where id::text=$1 or lower(${key}::text)=lower($1) order by id`,[term]);
 if(!rows.length)rows=await db.query(`select * from ${table} where left(id::text,length($1))=$1 or position(lower($1) in lower(${key}::text))>0 order by id`,[term]);
 if(rows.length===1)return rows[0];
 if(!rows.length)throw Error(`No ${table} record matches ${term}`);
 throw Error(`Ambiguous ${table}:\n`+rows.map(r=>`${r.id}  ${r[key]}`).join('\n'));
}
async function event(db,id,cmd,actor,evidence=''){await db.query('insert into audit_events(entity_id,action,actor,evidence) values($1,$2,$3,$4)',[String(id),cmd,actor,evidence]);}
async function lockOrder(db,id){return (await db.query('select * from orders where id=$1 for update',[id]))[0];}
async function line(db,value){const l=await resolve(db,'order_lines','line_ref',value);await lockOrder(db,l.order_id);return (await db.query('select * from line_balances where id=$1',[l.id]))[0];}
async function detail(db,id){return {order:(await db.query('select * from order_summary where id=$1',[id]))[0],lines:await db.query('select * from line_balances where order_id=$1 order by line_ref',[id]),shipments:await db.query('select s.* from shipments s join order_lines l on l.id=s.line_id where l.order_id=$1 order by s.created_at',[id]),returns:await db.query('select r.* from returns r join order_lines l on l.id=r.line_id where l.order_id=$1 order by r.created_at',[id]),tasks:await db.query('select * from tasks where order_id=$1 order by due_on',[id])};}
function savePrivate(dir,name,data){const root=path.resolve(process.env.OUTPUT_DIR||REPO_ROOT);const folder=path.join(root,dir);fs.mkdirSync(folder,{recursive:true,mode:0o700});const file=path.join(folder,name);fs.writeFileSync(file,data,{mode:0o600,flag:'wx'});return {file};}
export async function run(db,argv){
 const {cmd,p,o}=args(argv);if(cmd==='help')return help;
 const actor=mutating.has(cmd)?required(o.actor,'--actor'):null;
 if(cmd!=='init'&&!(await db.query('select id from workspace')).length)throw Error('Initialise your business with init before using the desk');
 await db.exec(mutating.has(cmd)?'BEGIN':'BEGIN READ ONLY');
 try{
  const result=await execute(db,cmd,p,o,actor);
  await db.exec(o['dry-run']?'ROLLBACK':'COMMIT');return result;
 }catch(e){await db.exec('ROLLBACK');throw e;}
}
async function execute(db,cmd,p,o,actor){
 let row;
 switch(cmd){
 case 'init':
  if((await db.query('select id from workspace')).length)throw Error('Workspace already initialised');
  row=(await db.query('insert into workspace(id,name) values(1,$1) returning *',[required(p[0],'business')]))[0];break;
 case 'channels':return db.query('select id,name from channels order by name');
 case 'products':return db.query('select id,sku,name from products order by sku');
 case 'add-channel':row=(await db.query('insert into channels(name) values($1) returning *',[required(p[0],'name')]))[0];break;
 case 'add-product':row=(await db.query('insert into products(sku,name) values($1,$2) returning *',[required(p[0],'sku'),required(o.name,'--name')]))[0];break;
 case 'orders':{
  const channel=o.channel?(await resolve(db,'channels','name',o.channel)).id:null;
  return db.query('select id,reference,channel,currency,status,ship_by,deliver_by,units,shipped,remaining,value_cents from order_summary where ($1::uuid is null or channel_id=$1) order by ordered_on,reference',[channel]);}
 case 'add-order':{
  const channel=await resolve(db,'channels','name',o.channel);
  row=(await db.query('insert into orders(channel_id,reference,customer,currency,ordered_on,ship_by,deliver_by,tax_year_end,retain_until) values($1,$2,$3,$4,$5,$6,$7,$8,$9) returning *',[channel.id,required(p[0],'reference'),required(o.customer,'--customer'),currency(o.currency),date(o.ordered,'--ordered'),optionalDate(o['ship-by'],'--ship-by'),optionalDate(o['deliver-by'],'--deliver-by'),optionalDate(o['tax-year-end'],'--tax-year-end'),optionalDate(o['retain-until'],'--retain-until')]))[0];break;}
 case 'add-line':{
  const order=await resolve(db,'orders','reference',p[0]);await lockOrder(db,order.id);
  if((await db.query('select id from line_balances where order_id=$1 and (shipped>0 or cancelled>0)',[order.id])).length)throw Error('Cannot add lines after dispatch begins');
  const product=await resolve(db,'products','sku',o.sku);
  row=(await db.query('insert into order_lines(order_id,line_ref,product_id,quantity,unit_cents) values($1,$2,$3,$4,$5) returning *',[order.id,required(o.line,'--line'),product.id,integer(o.qty,'--qty'),cents(o.unit)]))[0];break;}
 case 'show':return detail(db,(await resolve(db,'orders','reference',p[0])).id);
 case 'hold':case 'release':{
  const order=await resolve(db,'orders','reference',p[0]);await lockOrder(db,order.id);
  const evidence=cmd==='release'?required(o.evidence,'--evidence'):required(o.reason,'--reason');
  row=(await db.query('update orders set hold_reason=$1 where id=$2 returning *',[cmd==='release'?'':evidence,order.id]))[0];break;}
 case 'set-dates':{
  const order=await resolve(db,'orders','reference',p[0]);await lockOrder(db,order.id);
  const cols={'ship-by':'ship_by','deliver-by':'deliver_by','tax-year-end':'tax_year_end','retain-until':'retain_until'};
  const set=[],vals=[];for(const [k,c]of Object.entries(cols))if(o[k]){vals.push(date(o[k],k));set.push(`${c}=$${vals.length}`);}
  if(!set.length)throw Error('Provide a date to update');vals.push(order.id);
  row=(await db.query(`update orders set ${set.join(',')} where id=$${vals.length} returning *`,vals))[0];break;}
 case 'cancel-line':{
  const l=await line(db,p[0]);const qty=integer(o.qty,'--qty');required(o.evidence,'--evidence');
  if(qty>l.remaining)throw Error('Cannot cancel more than unshipped quantity');
  row=(await db.query('update order_lines set cancelled=cancelled+$1 where id=$2 returning *',[qty,l.id]))[0];break;}
 case 'ship':{
  const l=await line(db,p[0]);const order=await lockOrder(db,l.order_id);const qty=integer(o.qty,'--qty');
  if(order.hold_reason)throw Error('Order is held: '+order.hold_reason);
  if(qty>l.remaining)throw Error('Cannot ship more than remaining quantity');
  const shipped=happened(o.date,'--date');if(shipped<String(order.ordered_on).slice(0,10))throw Error('Shipment predates order');
  row=(await db.query('insert into shipments(line_id,quantity,warehouse,carrier,tracking,shipped_on,evidence) values($1,$2,$3,$4,$5,$6,$7) returning *',[l.id,qty,required(o.warehouse,'--warehouse'),required(o.carrier,'--carrier'),required(o.tracking,'--tracking'),shipped,required(o.evidence,'--evidence')]))[0];break;}
 case 'deliver':{
  const shipment=await resolve(db,'shipments','tracking',p[0]);await line(db,shipment.line_id);
  const current=(await db.query('select * from shipments where id=$1',[shipment.id]))[0];
  if(current.delivered_on)throw Error('Shipment already has delivery evidence');
  row=(await db.query('update shipments set delivered_on=$1,evidence=evidence||$2 where id=$3 returning *',[happened(o.date,'--date'),'\nDelivery: '+required(o.evidence,'--evidence'),shipment.id]))[0];break;}
 case 'shipments':return db.query('select s.id,o.reference,p.sku,s.quantity,s.carrier,s.tracking,s.shipped_on,s.delivered_on from shipments s join order_lines l on l.id=s.line_id join orders o on o.id=l.order_id join products p on p.id=l.product_id order by s.shipped_on');
 case 'return':{
  const l=await line(db,p[0]);const qty=integer(o.qty,'--qty');if(qty>l.shipped-l.returned)throw Error('Return exceeds shipped units not already in a return case');
  const opened=happened(o.date,'--date');const first=(await db.query('select ordered_on from orders where id=$1',[l.order_id]))[0].ordered_on;if(opened<first)throw Error('Return predates order');
  const available=(await db.query('select coalesce(sum(quantity),0)::integer as qty from shipments where line_id=$1 and shipped_on<=$2',[l.id,opened]))[0].qty;
  if(qty+l.returned>available+l.opening_shipped)throw Error('Return predates the required shipment quantity');
  row=(await db.query('insert into returns(line_id,quantity,reason,opened_on,review_by) values($1,$2,$3,$4,$5) returning *',[l.id,qty,required(o.reason,'--reason'),opened,date(o['review-by'],'--review-by')]))[0];break;}
 case 'resolve-return':{
  const ret=await resolve(db,'returns','reason',p[0]);await line(db,ret.line_id);
  if((await db.query('select outcome from returns where id=$1',[ret.id]))[0].outcome)throw Error('Return already resolved');
  row=(await db.query('update returns set outcome=$1,evidence=$2,resolved_on=$3 where id=$4 returning *',[required(o.outcome,'--outcome'),required(o.evidence,'--evidence'),happened(o.date,'--date'),ret.id]))[0];break;}
 case 'tasks':return db.query('select t.id,o.reference,t.owner,t.note,t.due_on,t.completed_on from tasks t join orders o on o.id=t.order_id order by t.due_on');
 case 'log':{
  const order=await resolve(db,'orders','reference',p[0]);
  row=(await db.query('insert into tasks(order_id,owner,note,due_on) values($1,$2,$3,$4) returning *',[order.id,required(o.owner,'--owner'),required(o.note,'--note'),date(o.due,'--due')]))[0];break;}
 case 'complete-task':{
  const task=await resolve(db,'tasks','note',p[0]);
  row=(await db.query('update tasks set completed_on=current_date,evidence=$1 where id=$2 and completed_on is null returning *',[required(o.evidence,'--evidence'),task.id]))[0];if(!row)throw Error('Task already complete');break;}
 case 'dispatch':return db.query('select reference,channel,ship_by,remaining,status,hold_reason from dispatch_queue');
 case 'promises':return db.query('select reference,channel,deliver_by,shipped,delivered,imported_shipped from promises_due');
 case 'returns-due':return db.query('select reference,sku,quantity,reason,review_by from returns_queue');
 case 'attention':return db.query('select reference,issue,due_on from attention_queue order by due_on,reference,issue');
 case 'compliance':return db.query('select reference,rule,finding from compliance_queue order by reference,rule');
 case 'history':return db.query('select * from audit_events where ($1::text is null or entity_id=$1) order by created_at,id',[p[0]||null]);
 case 'insights':{const out=[];for(let i=0;i<questions.length;i++)out.push({question:questions[i],rows:await db.query(insightSql[i])});return out;}
 case 'import':return importGoflow(db,p,o,actor);
 case 'export':{
  const bundle={format:'order-desk-v1',exported_at:new Date().toISOString(),tables:{}};
  for(const t of tables)bundle.tables[t]=await db.query(`select * from ${t} order by id`);
  const name=o.out?path.resolve(o.out):path.join(process.env.OUTPUT_DIR||REPO_ROOT,'exports',`order-desk-${randomUUID()}.json`);
  fs.mkdirSync(path.dirname(name),{recursive:true,mode:0o700});fs.writeFileSync(name,JSON.stringify(bundle,null,2)+'\n',{mode:0o600,flag:'wx'});
  return {file:name,orders:bundle.tables.orders.length,format:bundle.format};}
 case 'draft-update':{
  const d=await detail(db,(await resolve(db,'orders','reference',p[0])).id);
  const text=`# Internal draft: ${d.order.reference}\n\nCustomer: ${d.order.customer}\nChannel: ${d.order.channel}\nStatus: ${d.order.status}\nOrdered units: ${d.order.units}\nShipped: ${d.order.shipped}\nRemaining: ${d.order.remaining}\nDelivery evidence: ${d.order.delivered}\n\nConfirm the next action and a realistic date before preparing any customer message. This draft has not been sent.\n\n${JSON.stringify(d,null,2)}\n`;
  return savePrivate('drafts',`order-${d.order.id}-${randomUUID()}.md`,text);}
 case 'weekly-review':{
  const attention=await db.query('select * from attention_queue order by due_on,reference');
  const dispatch=await db.query('select * from dispatch_queue');const returns=await db.query('select * from returns_queue');
  return savePrivate('drafts',`weekly-${today()}-${randomUUID()}.md`,'# Weekly order review\n\nInternal draft. Assign owners and confirm evidence before acting.\n\n'+JSON.stringify({attention,dispatch,returns},null,2)+'\n');}
 default:throw Error('Command not implemented');
 }
 await event(db,row.id,cmd,actor,o.evidence||o.reason||'');return row;
}
const defaultMap={reference:'Order Number',channel:'Store',line:'Line ID',sku:'Item Number',product:'Product Name',quantity:'Quantity',unit:'Unit Price',customer:'Customer',currency:'Currency',ordered:'Order Date',ship_by:'Ship By',deliver_by:'Deliver By',status:'Status',shipped:'Shipped Quantity',cancelled:'Cancelled Quantity',tax_year_end:'Tax Year End',retain_until:'Retain Until'};
async function importGoflow(db,p,o,actor){
 if(p[0]!=='goflow')throw Error('Only import goflow is supported');
 const rows=parseCsv(fs.readFileSync(p[1],'utf8'));if(!rows.length)throw Error('CSV contains no data rows');
 const custom=o.map?JSON.parse(fs.readFileSync(o.map,'utf8')):{};
 for(const [key,val]of Object.entries(custom))if(!Object.hasOwn(defaultMap,key)||typeof val!=='string'||!val.trim())throw Error('Unknown or invalid mapping key '+key);
 const map={...defaultMap,...custom};const groups=new Map();
 const headers=Object.keys(rows[0]);const requiredKeys=['reference','channel','line','sku','quantity','unit','customer','currency','ordered','status'];
 for(const key of requiredKeys)if(!headers.some(h=>h.toLowerCase()===map[key].toLowerCase()))throw Error(`Missing CSV column ${map[key]}. Use --map for custom headers.`);
 const ignored_columns=headers.filter(h=>!Object.values(map).some(v=>v.toLowerCase()===h.toLowerCase()));
 for(const [index,source]of rows.entries()){
  const x=Object.fromEntries(Object.entries(map).map(([k,h])=>[k,pick(source,h).trim()]));
  for(const k of ['reference','channel','line','sku','customer','status'])required(x[k],`row ${index+2} ${k}`);
  x.currency=currency(x.currency);x.ordered=date(x.ordered,'Order Date');x.ship_by=optionalDate(x.ship_by,'Ship By');x.deliver_by=optionalDate(x.deliver_by,'Deliver By');x.tax_year_end=optionalDate(x.tax_year_end,'Tax Year End');x.retain_until=optionalDate(x.retain_until,'Retain Until');
  if(!['open','on hold','shipped','cancelled','in progress','ready for pickup','ready to ship','partial'].includes(x.status.toLowerCase()))throw Error('Unmapped source status '+x.status+'; reconcile status before import');
  if(['shipped','partial','cancelled'].includes(x.status.toLowerCase())&&(!x.shipped||!x.cancelled))throw Error('Historical status requires explicit shipped and cancelled quantities');
  x.quantity=integer(x.quantity,'Quantity');x.unit_cents=cents(x.unit);x.shipped=integer(x.shipped||'0','Shipped Quantity',true);x.cancelled=integer(x.cancelled||'0','Cancelled Quantity',true);
  if(x.status.toLowerCase()==='shipped'&&x.shipped+x.cancelled!==x.quantity)throw Error('Shipped source status has unaccounted units');
  if(x.status.toLowerCase()==='cancelled'&&x.cancelled!==x.quantity)throw Error('Cancelled source status requires fully cancelled quantities');
  if(x.shipped+x.cancelled>x.quantity)throw Error('Imported shipped and cancelled quantities exceed ordered quantity');
  const key=JSON.stringify([x.channel.toLowerCase(),x.reference]);const g=groups.get(key)||[];
  if(g.some(y=>y.line===x.line))throw Error('Duplicate source line ID for '+x.reference);
  if(g.length&&['customer','currency','ordered','ship_by','deliver_by','tax_year_end','retain_until','status'].some(k=>g[0][k]!==x[k]))throw Error('Conflicting header fields for '+x.reference);
  g.push(x);groups.set(key,g);
 }
 let inserted=0,skipped=0;
 for(const g of groups.values()){
  g.sort((a,b)=>a.line.localeCompare(b.line));const x=g[0];
  const fingerprint=createHash('sha256').update(JSON.stringify(g)).digest('hex');
  let channel=(await db.query('select * from channels where lower(name)=lower($1)',[x.channel]))[0];
  if(!channel)channel=(await db.query('insert into channels(name) values($1) returning *',[x.channel]))[0];
  const existing=(await db.query('select * from orders where channel_id=$1 and reference=$2 for update',[channel.id,x.reference]))[0];
  if(existing){if(existing.source_fingerprint===fingerprint){skipped++;continue;}throw Error('Source conflict for '+x.reference+': reconcile changed or partial exports before import');}
  const order=(await db.query('insert into orders(channel_id,reference,customer,currency,ordered_on,ship_by,deliver_by,tax_year_end,retain_until,hold_reason,source_status,source_fingerprint) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) returning *',[channel.id,x.reference,x.customer,x.currency,x.ordered,x.ship_by,x.deliver_by,x.tax_year_end,x.retain_until,'Import reconciliation required',x.status,fingerprint]))[0];
  for(const l of g){
   let product=(await db.query('select * from products where lower(sku)=lower($1)',[l.sku]))[0];
   if(!product)product=(await db.query('insert into products(sku,name) values($1,$2) returning *',[l.sku,l.product||l.sku]))[0];
   await db.query('insert into order_lines(order_id,line_ref,product_id,quantity,unit_cents,opening_shipped,cancelled) values($1,$2,$3,$4,$5,$6,$7)',[order.id,l.line,product.id,l.quantity,l.unit_cents,l.shipped,l.cancelled]);
  }
  await event(db,order.id,'import goflow',actor,'Source fingerprint '+fingerprint);inserted++;
 }
 return {orders_inserted:inserted,orders_skipped:skipped,rows:rows.length,ignored_columns,dry_run:Boolean(o['dry-run']),note:'New orders held for reconciliation. Historical shipped quantities carry no delivery evidence. No channel connections or payments were changed.'};
}
