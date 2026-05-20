'use client'
import { useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'

export function usePageTrack(eventType: string, page: string, metadata?: Record<string, unknown>) {
  const { isAuthenticated, isLoading } = useAuth()
  const fired = useRef(false)

  useEffect(() => {
    if (isLoading || !isAuthenticated || fired.current) return
    fired.current = true
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType, page, metadata }),
    }).catch(() => {}) // fire and forget
  }, [isLoading, isAuthenticated, eventType, page])
}
