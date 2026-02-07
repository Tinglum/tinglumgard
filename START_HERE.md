# START HERE - Eggs (Integrated)

## Status
Eggs are integrated into the main app under `/rugeegg`. There is no separate eggs app.

## Quick Checks
1. Database migration applied (`EGG_INTEGRATION_MIGRATION.sql`)
2. `/rugeegg` loads in dev
3. Admin `/admin` shows eggs data where relevant

## Where Things Live
- `app/rugeegg/` - eggs pages
- `components/eggs/` - eggs UI components
- `contexts/eggs/` - cart and order context
- `lib/eggs/` - types, utils, mock data
- `app/api/eggs/` - API routes

## Run
```
npm run dev
npm run build
```

## Next Steps
- Populate egg inventory in Supabase
- Connect API routes to live data
- Review `/rugeegg` copy and hero content
