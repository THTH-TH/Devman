import { Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Sidebar from './Sidebar'
import AIAssistant from './AIAssistant'

export default function Layout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem('devman-sidebar-collapsed') === 'true'
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem('devman-sidebar-collapsed', String(sidebarCollapsed))
    } catch {
      // Ignore private browsing/local storage restrictions.
    }
  }, [sidebarCollapsed])

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      <Sidebar collapsed={sidebarCollapsed} onToggleCollapsed={() => setSidebarCollapsed(value => !value)} />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
      <AIAssistant />
    </div>
  )
}
