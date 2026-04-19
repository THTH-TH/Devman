import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  FolderKanban,
  Columns,
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
        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
          isActive
            ? 'bg-white/15 text-white'
            : 'text-white/55 hover:text-white hover:bg-white/8'
        }`
      }
    >
      <Icon size={15} />
      {label}
    </NavLink>
  )
}

export default function Sidebar() {
  return (
    <aside className="flex flex-col w-56 shrink-0 h-full bg-forest-600">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-base leading-none">A</span>
          </div>
          <div>
            <div className="text-white font-bold text-sm tracking-tight leading-none">Archispace</div>
            <div className="text-white/40 text-[10px] mt-1 leading-none">Dev Manager</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
        {mainNav.map(item => (
          <NavItem key={item.to} {...item} />
        ))}

        <div className="mt-5 mb-2 px-3 text-[9px] font-semibold uppercase tracking-widest text-white/25">
          Tools
        </div>

        {toolsNav.map(item => (
          <NavItem key={item.to} {...item} />
        ))}
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center shrink-0">
            <span className="text-white text-[10px] font-bold">TH</span>
          </div>
          <div>
            <div className="text-white/80 text-xs font-medium leading-none">Tim Haldezos</div>
            <div className="text-white/40 text-[10px] mt-1 leading-none">Director</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
