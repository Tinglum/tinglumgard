import assert from 'node:assert/strict';
import { pigOfferPrice, qualifyingPigReferrals, pigShareMessage, recommendedPigDelivery } from '../lib/pig-campaign';
import { renderPigCampaignEmail } from '../lib/email/pig-campaign';

for (const price of [3100,3700,3900,4900]) {
  for (let friends=0;friends<=5;friends++) {
    const quote=pigOfferPrice(price,friends);
    assert.equal(quote.total,quote.deposit+quote.remainder);
    assert.equal(quote.deposit,price*.35);
  }
  assert.equal(pigOfferPrice(price,5).remainder,0);
}
assert.deepEqual(Array.from({length:6},(_,n)=>pigOfferPrice(3100,n).total),[2635,2325,2015,1705,1395,1085]);
const referrals=[{id:'1',order_id:'a',referee_email:'a@customer.no'}, {id:'2',order_id:'b',referee_email:'A@customer.no'}, {id:'3',order_id:'c',referee_email:'c@customer.no'}, {id:'4',order_id:'d',referee_email:'d@customer.no'}];
const paid={payment_type:'deposit',status:'completed'};
assert.equal(qualifyingPigReferrals(referrals,[{id:'a',status:'deposit_paid',payments:[paid]},{id:'b',status:'deposit_paid',payments:[paid]},{id:'c',status:'cancelled',payments:[paid]},{id:'d',status:'draft',payments:[]}]).length,1);
assert.equal(recommendedPigDelivery({county:'Vestfold'}),'oslo');
assert.equal(recommendedPigDelivery({locationBasis:'pickup_history'}),'farm');
assert.ok(pigShareMessage('MYCODE').includes('15 %'));
assert.ok(pigShareMessage('MYCODE').includes('?ref=MYCODE#bokser'));
const html=renderPigCampaignEmail('{{greeting}} {{purchase_summary}} {{delivery_fee}} {{offer_url}}',{name:'<script> Test',purchaseSummary:'Egg & kyllinger',delivery:'oslo'},{offerUrl:'https://example.org/?a=1&b=2'});
assert.ok(!html.includes('<script>'));
assert.ok(html.includes('Egg &amp; kyllinger'));
assert.ok(html.includes('200 kr'));
assert.throws(()=>renderPigCampaignEmail('{{unknown}}',{delivery:'farm'},{offerUrl:'https://example.org'}));
console.log('Pig campaign checks passed: 0–5 prices, paid-only referrals, deduplication, cancellations, sharing, localization and HTML escaping.');
