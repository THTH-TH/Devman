import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  FolderKanban,
  Columns,
  BadgeDollarSign,
  FileText,
  Calendar,
  ListTodo,
  Users,
  Settings,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import useStore from '../store/useStore'
import { supabase } from '../lib/supabase'

const mainNav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/projects', label: 'All Projects', icon: FolderKanban },
  { to: '/workflow', label: 'Workflow', icon: Columns },
  { to: '/sales', label: 'Sales Hub', icon: BadgeDollarSign },
]

const toolsNav = [
  { to: '/documents', label: 'Documents', icon: FileText },
  { to: '/contacts', label: 'Contacts', icon: Users },
  { to: '/calendar', label: 'Calendar', icon: Calendar },
  { to: '/tasks', label: 'Tasks', icon: ListTodo },
  { to: '/team', label: 'Team', icon: Users },
  { to: '/settings', label: 'Settings', icon: Settings },
]

function NavItem({ to, label, icon: Icon, end, collapsed }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
          isActive
            ? 'bg-white/15 text-white'
            : 'text-white/55 hover:text-white hover:bg-white/8'
        }`
      }
      title={collapsed ? label : undefined}
    >
      <Icon size={15} className="shrink-0" />
      {!collapsed && <span>{label}</span>}
    </NavLink>
  )
}

export default function Sidebar({ collapsed = false, onToggleCollapsed }) {
  const { profile, currentUser } = useStore()
  const initials = (profile?.name || currentUser || 'A')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || 'A'

  return (
    <aside className={`flex h-full shrink-0 flex-col bg-forest-600 transition-all duration-200 ${collapsed ? 'w-16' : 'w-56'}`}>
      {/* Logo */}
      <div className={`border-b border-white/10 ${collapsed ? 'px-3 py-4' : 'px-4 py-5'}`}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-base leading-none">A</span>
          </div>
          {!collapsed && <div>
            <div className="text-white font-bold text-sm tracking-tight leading-none">Archispace</div>
            <div className="text-white/40 text-[10px] mt-1 leading-none">Dev Manager</div>
          </div>}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
        {mainNav.map(item => (
          <NavItem key={item.to} {...item} collapsed={collapsed} />
        ))}

        <div className={`mt-5 mb-2 px-3 text-[9px] font-semibold uppercase tracking-widest text-white/25 ${collapsed ? 'text-center' : ''}`}>
          {collapsed ? '...' : 'Tools'}
        </div>

        {toolsNav.map(item => (
          <NavItem key={item.to} {...item} collapsed={collapsed} />
        ))}
      </nav>

      {/* User */}
      <div className={`border-t border-white/10 ${collapsed ? 'px-3 py-3' : 'px-4 py-4'}`}>
        <button
          onClick={onToggleCollapsed}
          className={`mb-3 flex w-full items-center justify-center gap-2 rounded-lg px-2 py-2 text-xs font-medium text-white/50 hover:bg-white/10 hover:text-white ${collapsed ? '' : 'justify-start'}`}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
          {!collapsed && <span>Collapse</span>}
        </button>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center shrink-0">
            <span className="text-white text-[10px] font-bold">{initials}</span>
          </div>
          {!collapsed && <div className="min-w-0 flex-1">
            <div className="text-white/80 text-xs font-medium leading-none truncate">{profile?.name || currentUser || 'Archispace'}</div>
            <div className="text-white/40 text-[10px] mt-1 leading-none truncate">{profile?.email || profile?.role || 'Team'}</div>
          </div>}
          {!collapsed && <button onClick={() => supabase.auth.signOut()} className="rounded-md p-1.5 text-white/35 hover:bg-white/10 hover:text-white" title="Sign out">
            <LogOut size={13} />
          </button>}
        </div>
      </div>
    </aside>
  )
}
