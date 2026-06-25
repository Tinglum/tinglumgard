// Reverts chicken orders wrongly marked fully_paid/completed when the remainder
// was never actually paid. Voids any phantom remainder payments, re-enables remainder.
// Usage: node scripts/fix_dataavvik.js          (dry run)
//        node scripts/fix_dataavvik.js --apply   (writes changes)
const fs=require('fs');const{createClient}=require('@supabase/supabase-js');
function le(p){const c=fs.readFileSync(p,'utf8');const e={};for(const l of c.split(/\r?\n/)){const m=l.match(/^([^#=\s]+)=([\s\S]*)$/);if(m)e[m[1]]=m[2].trim();}return e;}
const env=le('.env.local');const sb=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY);
const APPLY=process.argv.includes('--apply');
(async()=>{
 const{data:orders}=await sb.from('chicken_orders')
   .select('id,order_number,customer_name,status,total_amount_nok,remainder_amount_nok,chicken_payments(id,payment_type,status,amount_nok)')
   .in('status',['fully_paid','completed']);
 const affected=[];
 for(const o of orders||[]){
   const pays=Array.isArray(o.chicken_payments)?o.chicken_payments:[];
   const remDue=Math.max(0,Math.round(Number(o.remainder_amount_nok||0)));
   const remPaid=pays.filter(p=>p.payment_type==='remainder'&&p.status==='completed').reduce((s,p)=>s+Math.round(Number(p.amount_nok||0)),0);
   if(remDue>0 && remPaid<remDue){
     affected.push({o,remDue,remPaid,phantom:pays.filter(p=>p.payment_type==='remainder'&&p.status==='completed').map(p=>p.id)});
   }
 }
 console.log(`${APPLY?'APPLYING':'DRY RUN'} — ${affected.length} dataavvik chicken order(s):`);
 for(const a of affected){
   console.log(`  ${a.o.order_number} (${a.o.customer_name}) status=${a.o.status} total=${a.o.total_amount_nok} remainderDue=${a.remDue} remainderPaid=${a.remPaid} phantomRemainderPays=${a.phantom.length}`);
   if(APPLY){
     if(a.phantom.length){await sb.from('chicken_payments').update({status:'voided'}).in('id',a.phantom);}
     const{error}=await sb.from('chicken_orders').update({status:'deposit_paid',remainder_payment_enabled:true}).eq('id',a.o.id);
     console.log('    ->',error?('ERROR '+error.message):'reverted to deposit_paid, remainder re-enabled');
   }
 }
 if(!APPLY) console.log('\nRe-run with --apply to write these changes.');
 process.exit(0);
})().catch(e=>{console.error(e);process.exit(1);});
