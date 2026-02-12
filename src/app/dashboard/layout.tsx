import Link from 'next/link'
import { 
  LayoutDashboard, 
  Users, 
  UserCircle, 
  DollarSign, 
  MessageSquare,
  Settings,
  LogOut
} from 'lucide-react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Sidebar */}
      <aside className="w-72 gradient-dark text-white flex flex-col shadow-large border-r border-slate-700/50">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center shadow-medium">
              <span className="text-white font-bold text-lg">B</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Bright Automations</h1>
              <p className="text-xs text-blue-300">Control Center</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          <NavLink href="/dashboard" icon={<LayoutDashboard size={20} />}>
            Dashboard
          </NavLink>
          <NavLink href="/leads" icon={<Users size={20} />}>
            Leads
          </NavLink>
          <NavLink href="/clients" icon={<Users size={20} />}>
            Clients
          </NavLink>
          <NavLink href="/revenue" icon={<DollarSign size={20} />}>
            Revenue
          </NavLink>
          <NavLink href="/messages" icon={<MessageSquare size={20} />}>
            Messages
          </NavLink>
          <NavLink href="/outbound" icon={<Users size={20} />}>
            Outbound
          </NavLink>
          <NavLink href="/reps" icon={<Users size={20} />}>
            Rep Portal
          </NavLink>
          <NavLink href="/import" icon={<Users size={20} />}>
            Import
          </NavLink>
          <NavLink href="/settings" icon={<Settings size={20} />}>
            Settings
          </NavLink>
        </nav>

        <div className="p-4 border-t border-slate-700">
          <button className="flex items-center gap-2 text-sm text-slate-300 hover:text-white w-full transition-colors">
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}

function NavLink({ 
  href, 
  icon, 
  children 
}: { 
  href: string
  icon: React.ReactNode
  children: React.ReactNode 
}) {
  return (
    <Link 
      href={href}
      className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-300 rounded-lg hover:bg-slate-700/50 hover:text-white transition-all duration-200"
    >
      {icon}
      {children}
    </Link>
  )
}
