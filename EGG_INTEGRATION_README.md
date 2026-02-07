# Egg Integration - Current State

## Status
Eggs are integrated into the main app under `/rugeegg`. There is no standalone eggs app.

## Key Locations
- `app/rugeegg/` - customer-facing eggs pages
- `components/eggs/` - eggs UI components
- `contexts/eggs/` - eggs cart and order state
- `lib/eggs/` - eggs types, utils, mock data
- `app/api/eggs/` - eggs API endpoints

## Database
If you have not already applied it, run:
- `EGG_INTEGRATION_MIGRATION.sql`

## Admin
Eggs are managed in the unified admin at:
- `/admin`

## Run
Main app:
```
npm run dev
npm run build
```
