import { supabaseAdmin } from '@/lib/supabase/server';
import { PIG_CAMPAIGN_CODE } from '@/lib/pig-campaign';

// Both the public quote and authoritative checkout use the same offer rules.
// Failed/abandoned checkouts do not consume the customer's offer.
export async function validatePigCampaignOffer(input: { depositAmount: number; customerEmail?: string; customerPhone?: string }) {
  const {data:code,error} = await supabaseAdmin.from('rebate_codes').select('id,is_active,discount_value,description,valid_from,valid_until').eq('code',PIG_CAMPAIGN_CODE).maybeSingle();
  if(error) throw error;
  const now=new Date().toISOString();
  if(!code?.is_active || (code.valid_from && code.valid_from>now) || (code.valid_until && code.valid_until<now)) return {valid:false,error:'Kunderabatten er ikke aktiv akkurat nå'};
  if(Number(code.discount_value)!==30) return {valid:false,error:'Kunderabatten må kontrolleres før betaling'};
  if(!Number.isFinite(input.depositAmount) || input.depositAmount<=0) return {valid:false,error:'Velg en boks først'};
  const identities: Array<['customer_email'|'customer_phone',string]> = [];
  if(input.customerEmail?.trim()) identities.push(['customer_email',input.customerEmail.trim().toLowerCase()]);
  if(input.customerPhone?.trim()) identities.push(['customer_phone',input.customerPhone.trim()]);
  const results=await Promise.all(identities.map(([column,value])=>supabaseAdmin.from('rebate_usage').select('order_id,orders(status,payments(payment_type,status))').eq('rebate_code_id',code.id).eq(column,value)));
  for(const result of results) {
    if(result.error) throw result.error;
    for(const row of result.data || []) {
      const order=Array.isArray(row.orders)?row.orders[0]:row.orders;
      if(order && order.status!=='cancelled' && order.payments?.some((p:any)=>p.payment_type==='deposit'&&p.status==='completed')) return {valid:false,error:'Du har allerede brukt kunderabatten på en betalt bestilling'};
    }
  }
  return {valid:true,code_id:code.id,discount_value:30,discount_amount:Math.round(input.depositAmount*.3),description:code.description};
}
