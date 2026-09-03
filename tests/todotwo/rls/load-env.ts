import path from 'node:path'
import dotenv from 'dotenv'

// RLS tests need the real dev project credentials, which live in .env.local.
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') })
