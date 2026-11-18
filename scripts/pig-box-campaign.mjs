import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

export const counties = { '50': 'Trøndelag', '15': 'Møre og Romsdal', '34': 'Innlandet', '03': 'Oslo', '32': 'Akershus', '31': 'Østfold', '39': 'Vestfold' };
export const email = value => String(value || '').trim().toLowerCase();
export const phone = value => String(value || '').replace(/\D/g, '').replace(/^(?:0047|47)(?=\d{8}$)/, '');
const validEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && !/pending|example\.|test@|yourdomain|\.invalid$/i.test(value);

// Review decisions live outside git with their source IDs and reasons. They
// include resolved problems; message status never clears an exclusion.
export function selectAudience(data, postcodes, decisions) {
  const sources = ['orders', 'egg_orders', 'chicken_orders', 'vipps_users', 'customer_messages', 'egg_wishlist_requests'];
  const rows = sources.flatMap(source => (data[source] || []).map(row => ({ ...row, source })));
  const parent = new Map();
  const root = key => { if (!parent.has(key)) parent.set(key, key); if (parent.get(key) !== key) parent.set(key, root(parent.get(key))); return parent.get(key); };
  const identities = row => [email(row.customer_email || row.email), email(row.shipping_email)].filter(validEmail).map(e => `e:${e}`).concat([phone(row.customer_phone || row.phone_number), phone(row.shipping_phone)].filter(Boolean).map(p => `p:${p}`));
  for (const row of rows) { const ids = identities(row); for (const key of ids) parent.set(root(key), root(ids[0])); }
  const people = new Map();
  for (const row of rows) {
    const ids = identities(row); if (!ids.length) continue;
    const key = root(ids[0]);
    if (!people.has(key)) people.set(key, []);
    people.get(key).push(row);
  }
  const output = [];
  for (const person of people.values()) {
    const emails = [...new Set(person.flatMap(r => [email(r.customer_email || r.email), email(r.shipping_email)]).filter(validEmail))];
    if (!emails.length) continue;
    const phones = [...new Set(person.flatMap(r => [phone(r.customer_phone || r.phone_number), phone(r.shipping_phone)]).filter(Boolean))];
    const relevant = decisions.filter(d => emails.includes(email(d.email)) || (d.phone && phones.includes(phone(d.phone))));
    const reasons = relevant.map(d => d.reason);
    if (emails.some(e => /@tinglum\.com$|^(kenneth\.tinglum|5366384)@gmail\.com$/.test(e))) reasons.push('Internal/test contact');
    for (const r of person) {
      if (r.message_type === 'complaint') reasons.push(`Complaint message ${r.id}`);
      const notes = [r.notes, r.admin_notes, r.flag_reason].filter(Boolean).join(' ');
      if (/erstatnings|replacement-for:|replacement eggs|physically compensated|\bcomp, no charge\b|refusjon|refunder|refund|\bsyk høne|\(sick\)|vi mistet|dårlig klekk/i.test(notes)) reasons.push(`Order issue ${r.order_number || r.id}`);
      if (r.flagged_for_review) reasons.push(`Flagged order ${r.order_number || r.id}`);
      if (r.source === 'orders' && !['draft', 'cancelled', 'forfeited'].includes(r.status)) reasons.push('Already has a pig box order');
    }
    if ((data.email_suppression_list || []).some(r => emails.includes(email(r.email)))) reasons.push('Email suppression');
    if ((data.notification_preferences || []).some(r => phones.includes(phone(r.customer_phone)) && (r.email_enabled === false || r.promotional_enabled === false))) reasons.push('Promotional opt-out');
    const addresses = person.filter(r => /^\d{4}$/.test(String(r.shipping_postal_code || '').trim())).sort((a,b) => String(b.created_at).localeCompare(String(a.created_at)));
    const address = addresses[0];
    const postal = String(address?.shipping_postal_code || '').trim();
    const location = postcodes.get(postal);
    const country = String(address?.shipping_country || 'NO').toUpperCase();
    const county = country === 'NO' || country === 'NORWAY' || country === 'NORGE' ? location?.county : null;
    // The owner explicitly includes pickup customers as local contacts, even
    // when the checkout did not collect a postal address.
    const localPickup = person.some(r => ['farm_pickup', 'e6_pickup', 'pickup_farm', 'pickup_e6', 'delivery_namsos_trondheim'].includes(r.delivery_method || r.delivery_type) && !['draft', 'pending', 'cancelled', 'forfeited'].includes(r.status));
    const latest = [...person].filter(r => validEmail(email(r.customer_email || r.email))).sort((a,b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))[0];
    const status = reasons.length ? 'excluded' : localPickup ? 'eligible' : !county ? 'address_review' : !counties[county] ? 'outside_area' : 'eligible';
    output.push({ email: email(latest?.customer_email || latest?.email) || emails[0], name: latest?.customer_name || latest?.name || '', phone: phones[0] || '', aliases: emails, postal, city: location?.city || address?.shipping_city || '', county: counties[county] || (localPickup ? 'Local pickup (owner confirmed)' : county) || '', locationBasis: localPickup ? 'pickup_history' : county ? 'recorded_postcode' : 'unknown', status, reasons: [...new Set(reasons)], sources: [...new Set(person.map(r => r.source))] });
  }
  return output.sort((a,b) => a.email.localeCompare(b.email));
}

export function offerMath(price) {
  const originalDeposit = Math.round(price / 2);
  const discount = Math.round(originalDeposit * .3);
  const deposit = originalDeposit - discount;
  const remainder = price - originalDeposit;
  return { price, discount, deposit, remainder, total: price - discount, referralPerFriend: Math.round(remainder / 5) };
}

export function friendPrice(price, friends) {
  assert.ok(Number.isInteger(friends) && friends >= 0 && friends <= 5, 'Use 0–5 qualifying friends');
  const offer = offerMath(price);
  const credit = Math.min(offer.remainder, offer.referralPerFriend * friends);
  return { friends, discountPercent: 15 + friends * 10, credit, total: offer.total - credit, deposit: offer.deposit, remainder: offer.remainder - credit };
}

export function purchaseSummary(contact, data, year = 2026) {
  const purchased = source => (data[source] || []).filter(o => contact.aliases.includes(email(o.customer_email)) && Number(String(o.created_at || '').slice(0,4)) === year && !['draft','pending','cancelled','forfeited','refunded'].includes(o.status));
  const items = [];
  for (const [source, additions, breeds, category] of [
    ['egg_orders','egg_order_additions','egg_breeds','rugeegg'],
    ['chicken_orders','chicken_order_additions','chicken_breeds','kyllinger'],
  ]) {
    const orders = purchased(source);
    if (!orders.length) continue;
    const ids = new Set(orders.map(o=>o.id));
    const breedIds = new Set([...orders.map(o=>o.breed_id), ...(data[additions]||[]).filter(a=>ids.has(a.order_id)).map(a=>a.breed_id)].filter(Boolean));
    const names = (data[breeds]||[]).filter(b=>breedIds.has(b.id)).map(b=>b.name).filter(Boolean);
    const breedList = names.length > 1 ? `${names.slice(0,-1).join(', ')} og ${names.at(-1)}` : names[0];
    items.push(names.length ? `${category} av ${breedList}` : category);
  }
  if (purchased('orders').length) items.push('en ullgriskasse');
  const thanks = items.length ? `Takk for at du bestilte ${items.join(' og ')} hos oss i år!` : 'Takk for kontakten med oss på Tinglum Gård i år.';
  const question = purchased('egg_orders').length ? 'Hvordan gikk klekkingen, og hvordan går det med kyllingene?' : purchased('chicken_orders').length ? 'Hvordan går det med kyllingene?' : '';
  return question ? `${thanks} ${question} Svar gjerne på denne e-posten – jeg vil gjerne høre!` : thanks;
}

if (process.argv.includes('--check')) {
  assert.deepEqual(offerMath(3100), { price:3100, discount:465, deposit:1085, remainder:1550, total:2635, referralPerFriend:310 });
  assert.deepEqual(Array.from({length:6},(_,n)=>friendPrice(3100,n).total),[2635,2325,2015,1705,1395,1085]);
  assert.deepEqual(Array.from({length:6},(_,n)=>friendPrice(3100,n).remainder),[1550,1240,930,620,310,0]);
  for (const price of [3100,3700,3900,4900]) {
    for (let n=0;n<=5;n++) assert.equal(friendPrice(price,n).total,friendPrice(price,n).deposit+friendPrice(price,n).remainder);
    assert.equal(friendPrice(price,5).remainder,0);
    assert.equal(friendPrice(price,5).total,price*.35);
  }
  const data = { egg_orders:[{ customer_email:'old@customer.no', customer_phone:'+47 12345678', shipping_postal_code:'0001' },{ customer_email:'new@customer.no', customer_phone:'12345678', shipping_postal_code:'0001' }] };
  const pc = new Map([['0001',{county:'03',city:'OSLO'}]]);
  assert.equal(selectAudience(data,pc,[]).length,1);
  assert.equal(selectAudience(data,pc,[{email:'old@customer.no',reason:'Resolved complaint'}])[0].status,'excluded');
  assert.equal(selectAudience({vipps_users:[{email:'customer@customer.no'}]},pc,[])[0].status,'address_review');
  assert.equal(selectAudience({egg_orders:[{customer_email:'customer@customer.no',shipping_postal_code:'0001',admin_notes:'Gratis erstatningsordre'}]},pc,[])[0].status,'excluded');
  const pickup = {chicken_orders:[{customer_email:'local@customer.no',delivery_method:'farm_pickup',status:'picked_up'}]};
  assert.equal(selectAudience(pickup,pc,[])[0].status,'eligible');
  assert.equal(selectAudience(pickup,pc,[{email:'local@customer.no',reason:'Resolved redelivery'}])[0].status,'excluded');
  assert.equal(purchaseSummary({aliases:['a@customer.no']},{egg_orders:[{id:'1',customer_email:'a@customer.no',created_at:'2026-04-01',status:'cancelled'}]}),'Takk for kontakten med oss på Tinglum Gård i år.');
  console.log('Campaign checks passed: discount, remainder, identity deduplication, resolved complaints, replacements, unknown address.');
} else if (process.argv[2]) {
  const dir = resolve(process.argv[2]);
  const data = JSON.parse(await readFile(resolve(dir,'source-snapshot.json'),'utf8'));
  const decisions = JSON.parse(await readFile(resolve(dir,'reviewed-exclusions.json'),'utf8'));
  const postcodes = new Map((await readFile(resolve(dir,'bring-postcodes.txt'),'utf8')).trim().split(/\r?\n/).map(line => { const [postal,city,municipality] = line.split('\t'); return [postal,{city,county:municipality.slice(0,2)}]; }));
  const audience = selectAudience(data,postcodes,decisions);
  for (const contact of audience) contact.purchaseSummary = purchaseSummary(contact,data);
  await mkdir(dir,{recursive:true});
  await writeFile(resolve(dir,'audience.json'),JSON.stringify(audience,null,2));
  const fields = ['email','name','phone','postal','city','county','status','reasons'];
  const csv = [fields,...audience.map(row => fields.map(key => Array.isArray(row[key]) ? row[key].join('; ') : row[key]))].map(row => row.map(v => '"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\r\n');
  await writeFile(resolve(dir,'audience.csv'),'\uFEFF'+csv);
  console.log(JSON.stringify(audience.reduce((counts,row) => ({...counts,[row.status]:(counts[row.status]||0)+1}),{})));
}
