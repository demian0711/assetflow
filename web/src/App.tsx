import { useQueryClient } from '@tanstack/react-query'
import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router'
import type { Session } from './auth/api'

const LoginPage = lazy(() => import('./auth/LoginPage'))
const Workspace = lazy(() => import('./Workspace'))
const Overview = lazy(() => import('./Overview'))
const DashboardPage = lazy(() => import('./reporting/DashboardPage'))
const AuditHistoryPage = lazy(() => import('./reporting/AuditHistoryPage'))
const AssetsPage = lazy(() => import('./inventory/AssetsPage'))
const CategoriesPage = lazy(() => import('./inventory/CategoriesPage'))
const RequestsPage = lazy(() => import('./requests/RequestsPage'))
const AdminRequestsPage = lazy(() => import('./requests/AdminRequestsPage'))
const AssignedAssetsPage = lazy(() => import('./requests/AssignedAssetsPage'))

function RequireSession({ session, onLogout }: { session: Session | null; onLogout: () => void }) {
  const location = useLocation()
  const returnTo = location.pathname + location.search + location.hash

  return session
    ? <Workspace session={session} onLogout={onLogout} />
    : <Navigate to="/login" replace state={{ returnTo }} />
}

function LoginRoute({ session, onLogin }: { session: Session | null; onLogin: (session: Session) => void }) {
  const { state } = useLocation()
  const path: unknown = state?.returnTo
  const returnTo = typeof path === 'string' && /^\/(?![/\\])/.test(path) ? path : '/assets'
  return session ? <Navigate to={returnTo} replace /> : <LoginPage onLogin={onLogin} />
}

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
        <Route element={<RequireSession session={session} onLogout={logout} />}>
          <Route index element={<Navigate to="/assets" replace />} />
          <Route path="assets" element={<AssetsPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="requests/:id?" element={<RequestsPage />} />
          <Route path="admin/requests/:id?" element={<AdminRequestsPage />} />
          <Route path="assigned-assets" element={<AssignedAssetsPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="admin/audit" element={<AuditHistoryPage />} />
          <Route path="overview" element={<Overview />} />
        </Route>
        <Route path="login" element={<LoginRoute session={session} onLogin={setSession} />} />
        <Route path="*" element={<Navigate to="/assets" replace />} />
      </Routes>
    </Suspense>
  )
}
