'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export const dynamic = 'force-dynamic'
import { 
  LayoutDashboard, 
  Phone,
  DollarSign,
  Target,
  LogOut,
  Award
} from 'lucide-react'

export default function RepsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      
      if (response.ok) {
        const data = await response.json()
        router.push(data.redirectUrl)
      }
    } catch (error) {
      console.error('Logout failed:', error)
      setIsLoggingOut(false)
    }
  }

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
              <p className="text-xs text-blue-300">Sales Rep Portal</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          <NavLink href="/reps" icon={<LayoutDashboard size={20} />}>
            Dashboard
          </NavLink>
          <NavLink href="/reps/dialer" icon={<Phone size={20} />}>
            Dialer
          </NavLink>
          <NavLink href="/reps/earnings" icon={<DollarSign size={20} />}>
            Earnings
          </NavLink>
          <NavLink href="/reps/tasks" icon={<Target size={20} />}>
            Tasks
          </NavLink>
          <NavLink href="/reps/leaderboard" icon={<Award size={20} />}>
            Leaderboard
          </NavLink>
        </nav>

        <div className="p-4 border-t border-slate-700">
          <button 
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex items-center gap-2 text-sm text-slate-300 hover:text-white w-full transition-colors px-3 py-2 rounded-lg hover:bg-slate-700/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LogOut size={18} />
            {isLoggingOut ? 'Signing out...' : 'Sign Out'}
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
