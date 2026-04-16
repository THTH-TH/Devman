import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  FolderKanban,
  Columns,
  CheckSquare,
  FileText,
  Calendar,
  ListTodo,
  Users,
  Settings,
} from 'lucide-react'

const mainNav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/projects', label: 'All Projects', icon: FolderKanban },
  { to: '/workflow', label: 'Workflow', icon: Columns },
]

const toolsNav = [
  { to: '/documents', label: 'Documents', icon: FileText },
  { to: '/schedule', label: 'Schedule', icon: Calendar },
  { to: '/tasks', label: 'Tasks', icon: ListTodo },
  { to: '/team', label: 'Team', icon: Users },
  { to: '/settings', label: 'Settings', icon: Settings },
]

function NavItem({ to, label, icon: Icon, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? 'bg-white/10 text-white'
            : 'text-white/60 hover:text-white hover:bg-white/5'
        }`
      }
    >
      <Icon size={16} />
      {label}
    </NavLink>
  )
}

export default function Sidebar() {
  return (
    <aside
      className="flex flex-col w-56 shrink-0 h-full bg-forest-600"
    >
      {/* Wordmark */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="text-white font-bold text-lg tracking-tight leading-none">
          Archispace
        </div>
        <div className="text-white/40 text-xs mt-0.5">Development Manager</div>
      </div>

      <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
        {mainNav.map(item => (
          <NavItem key={item.to} {...item} />
        ))}

        <div className="mt-4 mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-white/25">
          Tools
        </div>

        {toolsNav.map(item => (
          <NavItem key={item.to} {...item} />
        ))}
      </nav>

      <div className="px-5 py-4 border-t border-white/10">
        <div className="text-white/60 text-xs">Tim Haldezos</div>
        <div className="text-white/30 text-xs">Director</div>
      </div>
    </aside>
  )
}
