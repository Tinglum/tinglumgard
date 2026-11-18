import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { renderPigCampaignEmail } from '../lib/email/pig-campaign';
import { PIG_SITE, recommendedPigDelivery, type PigDelivery } from '../lib/pig-campaign';

async function main() {
const dir=resolve('.codex-campaign');
const audience=JSON.parse(await readFile(resolve(dir,'audience.json'),'utf8'));
const template=await readFile('content/email/pig-box-christmas-2026.html','utf8');
let geography:Record<string,PigDelivery>={};
try { geography=JSON.parse(await readFile(resolve(dir,'delivery-geography.json'),'utf8')); } catch {}
const people=Object.fromEntries(audience.filter((r:any)=>r.status==='eligible').map((r:any)=>[r.email,{name:r.name,purchaseSummary:r.purchaseSummary,delivery:geography[r.email]||recommendedPigDelivery(r)}]));
await writeFile(resolve(dir,'personalization.json'),JSON.stringify(people,null,2));
await mkdir(resolve(dir,'rendered'),{recursive:true});
for (const [index,person] of Array.from(Object.values(people).entries())) {
  const html=renderPigCampaignEmail(template,person as any,{offerUrl:`${PIG_SITE}/?rebate=KUNDEJUL15#bokser`});
  await writeFile(resolve(dir,'rendered',`${index+1}.html`),html);
}
for (const delivery of ['farm','trondheim','e6','oslo'] as const) {
  const eggExample=audience.find((r:any)=>r.status==='eligible' && r.purchaseSummary?.includes('rugeegg av '));
  const html=renderPigCampaignEmail(template,{name:'Kenneth',purchaseSummary:`Eksempel på kundetilpasning: ${eggExample?.purchaseSummary || 'Takk for handelen hos oss i år!'}`,delivery},{offerUrl:`${PIG_SITE}/?rebate=KUNDEJUL15#bokser`});
  await writeFile(resolve(dir,`preview-${delivery}.html`),html);
}
await writeFile(resolve(dir,'campaign-preview.html'),await readFile(resolve(dir,'preview-oslo.html'),'utf8'));
console.log(`Rendered ${Object.keys(people).length} personalized emails and four pickup previews. No emails sent.`);
}
main().catch(error=>{console.error(error);process.exitCode=1});
