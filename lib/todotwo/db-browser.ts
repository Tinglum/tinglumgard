'use client'

import { createBrowserClient } from '@supabase/ssr'

/**
 * Browser client for TodoTwo. Anon/publishable key only, bound to the `todotwo`
 * schema. Row Level Security is what protects the data; this key is safe in a
 * bundle by design.
 *
 * Environment variables are read as static property accesses so Next inlines
 * them at build time. Do not refactor into a dynamic lookup.
 */

let cached: ReturnType<typeof createBrowserClient> | null = null

export function getTodoTwoBrowserClient() {
  if (cached) return cached

  const url = process.env.NEXT_PUBLIC_TODOTWO_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_TODOTWO_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error(
      'TodoTwo is missing NEXT_PUBLIC_TODOTWO_SUPABASE_URL or NEXT_PUBLIC_TODOTWO_SUPABASE_ANON_KEY. See docs/todotwo/SETUP.md.'
    )
  }

  cached = createBrowserClient(url, key, { db: { schema: 'todotwo' } })
  return cached
}
