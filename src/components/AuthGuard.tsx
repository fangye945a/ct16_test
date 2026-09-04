import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { getAuthStatus } from '@/api/auth'
import { clearSessionToken } from '@/api/client'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const [state, setState] = useState<'loading' | 'loggedIn' | 'notLoggedIn'>('loading')

  useEffect(() => {
    let cancelled = false

    getAuthStatus()
      .then((status) => {
        if (cancelled) return
        if (status.isLoggedIn) {
          setState('loggedIn')
        } else {
          clearSessionToken()
          setState('notLoggedIn')
        }
      })
      .catch(() => {
        if (cancelled) return
        clearSessionToken()
        setState('notLoggedIn')
      })

    return () => {
      cancelled = true
    }
  }, [])

  if (state === 'loading') {
    return null
  }

  if (state === 'notLoggedIn') {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}
