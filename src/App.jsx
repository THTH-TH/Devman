import { Suspense, lazy, useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import AuthGate from './components/AuthGate'
import Dashboard from './pages/Dashboard'
import useStore from './store/useStore'
import { supabase } from './lib/supabase'

const AllProjects = lazy(() => import('./pages/AllProjects'))
const NewProject = lazy(() => import('./pages/NewProject'))
const ProjectWorkspace = lazy(() => import('./pages/ProjectWorkspace'))
const Workflow = lazy(() => import('./pages/Workflow'))
const ChecklistPage = lazy(() => import('./pages/ChecklistPage'))
const Tasks = lazy(() => import('./pages/Tasks'))
const Calendar = lazy(() => import('./pages/Calendar'))
const Documents = lazy(() => import('./pages/Documents'))
const Team = lazy(() => import('./pages/Team'))
const Settings = lazy(() => import('./pages/Settings'))
const SharePage = lazy(() => import('./pages/SharePage'))
const SalesHub = lazy(() => import('./sales/SalesHub'))

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="text-center">
        <div className="text-2xl font-bold text-gray-800 mb-2">Archispace</div>
        <div className="text-sm text-gray-400 mb-6">Development Manager</div>
        <div className="flex items-center gap-2 justify-center text-gray-400 text-sm">
          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Loading…
        </div>
      </div>
    </div>
  )
}

function ErrorScreen({ message }) {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="text-center max-w-sm px-6">
        <div className="text-2xl font-bold text-gray-800 mb-2">Archispace</div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mt-4">
          <p className="text-sm font-medium text-red-700 mb-1">Could not connect to database</p>
          <p className="text-xs text-red-500">{message}</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 text-sm text-ocean-600 hover:underline"
        >
          Retry
        </button>
      </div>
    </div>
  )
}

function ProtectedApp({ authLoading, session, loading, error }) {
  if (authLoading) return <LoadingScreen />
  if (!session) return <AuthGate />
  if (loading) return <LoadingScreen />
  if (error) return <ErrorScreen message={error} />

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="projects" element={<AllProjects />} />
          <Route path="projects/new" element={<NewProject />} />
          <Route path="projects/:projectId" element={<ProjectWorkspace />} />
          <Route path="workflow" element={<Workflow />} />
          <Route path="checklist/:projectId" element={<ChecklistPage />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="schedule" element={<Navigate to="/calendar" replace />} />
          <Route path="documents" element={<Documents />} />
          <Route path="team" element={<Team />} />
          <Route path="settings" element={<Settings />} />
          <Route path="sales/*" element={<SalesHub />} />
        </Route>
      </Routes>
    </Suspense>
  )
}

export default function App() {
  const { loading, error, initialize, reset } = useStore()
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      setAuthLoading(false)
    })

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      if (!nextSession) reset()
    })

    return () => {
      mounted = false
      authListener.subscription.unsubscribe()
    }
  }, [reset])

  useEffect(() => {
    if (session?.user) initialize(session.user)
  }, [session?.user?.id])

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/share/:token" element={<SharePage />} />
          <Route path="/*" element={<ProtectedApp authLoading={authLoading} session={session} loading={loading} error={error} />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
