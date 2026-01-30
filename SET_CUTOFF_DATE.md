# Set Cutoff Date to Week 46, 2026

The "Mine bestillinger" page is showing the wrong year because the `app_config` table needs to be updated.

## Quick Fix - Run this SQL in Supabase SQL Editor:

```sql
-- Set the order modification cutoff date
INSERT INTO app_config (key, value, description, updated_at)
VALUES (
  'order_modification_cutoff',
  '{"year": 2026, "week": 46}'::jsonb,
  'Order modification cutoff date (year and ISO week number)',
  NOW()
)
ON CONFLICT (key)
DO UPDATE SET
  value = '{"year": 2026, "week": 46}'::jsonb,
  updated_at = NOW();
```

## Verify it worked:

```sql
SELECT * FROM app_config WHERE key = 'order_modification_cutoff';
```

You should see:
- key: `order_modification_cutoff`
- value: `{"year": 2026, "week": 46}`

After running this, the "Mine bestillinger" page will show:
- ✅ "Du kan endre bestillingen din frem til uke 46, 2026" (before cutoff)
- ✅ "Endringsperioden er utløpt (uke 46, 2026)" (after cutoff)

Instead of the incorrect:
- ❌ "(uke 46, 2024)"
