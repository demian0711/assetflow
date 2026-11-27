import { useQueryClient } from '@tanstack/react-query'
import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import type { Session } from './auth/api'

const LoginPage = lazy(() => import('./auth/LoginPage'))
const Workspace = lazy(() => import('./Workspace'))

export default function App() {
  const queryClient = useQueryClient()
  const [session, setSession] = useState<Session | null>(null)
  const logout = useCallback(() => {
    setSession(null)
    queryClient.clear()
  }, [queryClient])

  useEffect(() => {
    if (!session) return

    const expiration = Date.parse(session.expiresAtUtc)
    const logoutIfExpired = () => {
      if (Date.now() >= expiration) logout()
    }
    const timer = window.setTimeout(logoutIfExpired, Math.max(0, expiration - Date.now()))
    window.addEventListener('focus', logoutIfExpired)
    return () => {
      window.removeEventListener('focus', logoutIfExpired)
      window.clearTimeout(timer)
    }
  }, [logout, session])

  return (
    <Suspense fallback={<main className="workspace-feedback" role="status">Loading…</main>}>
      <Routes>
        <Route path="/" element={session ? <Workspace session={session} onLogout={logout} /> : <Navigate to="/login" replace />} />
        <Route path="/login" element={session ? <Navigate to="/" replace /> : <LoginPage onLogin={setSession} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
