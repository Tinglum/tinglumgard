import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { type NextRequest, NextResponse } from 'next/server'

import { getPublicConfig } from '@/lib/todotwo/config'
import { todoTwoRoutes } from '@/lib/todotwo/routes'

export const dynamic = 'force-dynamic'

/** POST only, so a stray link or prefetch cannot sign anyone out. */
export async function POST(request: NextRequest) {
  const { supabaseUrl, supabaseAnonKey } = getPublicConfig()
  const cookieStore = cookies()

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options)
        })
      },
    },
  })

  await supabase.auth.signOut()

  return NextResponse.redirect(new URL(todoTwoRoutes.login(), request.nextUrl.origin), {
    status: 303,
  })
}
