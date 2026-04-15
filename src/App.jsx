import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import AllProjects from './pages/AllProjects'
import NewProject from './pages/NewProject'
import ProjectWorkspace from './pages/ProjectWorkspace'
import Workflow from './pages/Workflow'
import ChecklistPage from './pages/ChecklistPage'
import Tasks from './pages/Tasks'
import Schedule from './pages/Schedule'
import Documents from './pages/Documents'
import Team from './pages/Team'
import Settings from './pages/Settings'
import useStore from './store/useStore'

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
          className="mt-4 text-sm text-blue-600 hover:underline"
        >
          Retry
        </button>
      </div>
    </div>
  )
}

export default function App() {
  const { loading, error, initialize } = useStore()

  useEffect(() => {
    initialize()
  }, [])

  if (loading) return <LoadingScreen />
  if (error) return <ErrorScreen message={error} />

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="projects" element={<AllProjects />} />
          <Route path="projects/new" element={<NewProject />} />
          <Route path="projects/:projectId" element={<ProjectWorkspace />} />
          <Route path="workflow" element={<Workflow />} />
          <Route path="checklist/:projectId" element={<ChecklistPage />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="schedule" element={<Schedule />} />
          <Route path="documents" element={<Documents />} />
          <Route path="team" element={<Team />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
