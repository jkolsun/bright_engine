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
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Sidebar */}
      <aside className="w-64 bg-gradient-to-b from-slate-900 to-slate-800 text-white flex flex-col shadow-xl">
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-xl font-bold text-white">Bright Automations</h1>
          <p className="text-sm text-slate-300 mt-1">Control Center</p>
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
