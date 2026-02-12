import { redirect } from 'next/navigation'
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

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // In production, check auth here
  // For now, assume authenticated

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">Bright Automations</h1>
          <p className="text-sm text-gray-500 mt-1">Control Center</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          <NavLink href="/admin/dashboard" icon={<LayoutDashboard size={20} />}>
            Dashboard
          </NavLink>
          <NavLink href="/admin/leads" icon={<Users size={20} />}>
            Leads
          </NavLink>
          <NavLink href="/admin/clients" icon={<Users size={20} />}>
            Clients
          </NavLink>
          <NavLink href="/admin/reps" icon={<UserCircle size={20} />}>
            Reps
          </NavLink>
          <NavLink href="/admin/revenue" icon={<DollarSign size={20} />}>
            Revenue
          </NavLink>
          <NavLink href="/admin/messages" icon={<MessageSquare size={20} />}>
            Messages
          </NavLink>
          <NavLink href="/admin/settings" icon={<Settings size={20} />}>
            Settings
          </NavLink>
        </nav>

        <div className="p-4 border-t border-gray-200">
          <button className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 w-full">
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
      className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors"
    >
      {icon}
      {children}
    </Link>
  )
}
