#!/usr/bin/env node
import assert from 'node:assert/strict';

const baseUrl = (process.env.EGGOPS_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');

function todayOslo() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Oslo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const json = await response.json().catch(() => ({}));
  return { response, json };
}

async function main() {
  const date = process.env.EGGOPS_DATE || todayOslo();

  const daily = await request(`/api/admin/eggs/daily?date=${encodeURIComponent(date)}`);
  assert.equal(daily.response.ok, true, `daily endpoint failed: ${daily.response.status}`);
  assert.ok(Array.isArray(daily.json.rows), 'daily rows missing');

  if (daily.json.rows.length > 0) {
    const first = daily.json.rows[0];
    const payload = {
      collection_date: date,
      breed_id: first.breed_id,
      total_collected: Number(first.total_collected || 0),
      sellable_standard: Number(first.sellable_standard || 0),
      too_small: Number(first.too_small || 0),
      dirty: Number(first.dirty || 0),
      cracked: Number(first.cracked || 0),
      shell_defect: Number(first.shell_defect || 0),
      other_unsellable: Number(first.other_unsellable || 0),
      notes: first.notes || null,
      reason: 'eggops smoke test',
    };

    const save = await request('/api/admin/eggs/daily', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    assert.equal(save.response.ok, true, `daily save failed: ${save.response.status}`);
  }

  const forecast = await request('/api/admin/eggs/forecast?weeks=4');
  assert.equal(forecast.response.ok, true, `forecast endpoint failed: ${forecast.response.status}`);
  assert.ok(Array.isArray(forecast.json.rows), 'forecast rows missing');

  const alerts = await request('/api/admin/eggs/alerts?limit=10');
  assert.equal(alerts.response.ok, true, `alerts endpoint failed: ${alerts.response.status}`);
  assert.ok(Array.isArray(alerts.json.rows), 'alerts rows missing');

  const recompute = await request('/api/admin/eggs/forecast/recompute', {
    method: 'POST',
    body: JSON.stringify({ weeks: 4 }),
  });
  assert.equal(recompute.response.ok, true, `forecast recompute failed: ${recompute.response.status}`);

  console.log(
    JSON.stringify(
      {
        ok: true,
        date,
        daily_rows: daily.json.rows.length,
        forecast_rows: forecast.json.rows.length,
        alerts_rows: alerts.json.rows.length,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
