import Link from 'next/link'
import { 
  LayoutDashboard, 
  Users, 
  UserCircle, 
  DollarSign, 
  MessageSquare,
  Settings,
  LogOut,
  Upload,
  Target
} from 'lucide-react'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Sidebar */}
      <aside className="hidden md:flex w-72 gradient-dark text-white flex flex-col shadow-large border-r border-slate-700/50">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center shadow-medium">
              <span className="text-white font-bold text-lg">B</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Bright Automations</h1>
              <p className="text-xs text-blue-300">Admin Control Center</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          <NavLink href="/admin/dashboard" icon={<LayoutDashboard size={20} />}>
            Dashboard
          </NavLink>
          <NavLink href="/admin/leads" icon={<Users size={20} />}>
            Leads
          </NavLink>
          <NavLink href="/admin/clients" icon={<UserCircle size={20} />}>
            Clients
          </NavLink>
          <NavLink href="/admin/revenue" icon={<DollarSign size={20} />}>
            Revenue
          </NavLink>
          <NavLink href="/admin/messages" icon={<MessageSquare size={20} />}>
            Messages
          </NavLink>
          <NavLink href="/admin/outbound" icon={<Target size={20} />}>
            Outbound Tracker
          </NavLink>
          <NavLink href="/admin/import" icon={<Upload size={20} />}>
            Lead Import
          </NavLink>
          <NavLink href="/admin/settings" icon={<Settings size={20} />}>
            Settings
          </NavLink>
        </nav>

        <div className="p-4 border-t border-slate-700 space-y-2">
          <Link 
            href="/reps"
            className="flex items-center gap-2 text-sm text-slate-300 hover:text-white w-full transition-colors px-3 py-2 rounded-lg hover:bg-slate-700/50"
          >
            <Users size={18} />
            Rep Portal
          </Link>
          <button className="flex items-center gap-2 text-sm text-slate-300 hover:text-white w-full transition-colors px-3 py-2 rounded-lg hover:bg-slate-700/50">
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
