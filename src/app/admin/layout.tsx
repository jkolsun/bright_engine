'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  UserCircle,
  DollarSign,
  MessageSquare,
  Settings,
  LogOut,
  Upload,
  Target,
  Mail,
  Radio,
  ShieldCheck,
  Hammer,
  Wallet,
} from 'lucide-react'
import { BriefingModal } from '@/components/admin/BriefingModal'

export const dynamic = 'force-dynamic'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [pendingApprovals, setPendingApprovals] = useState(0)
  const [buildQueueBadge, setBuildQueueBadge] = useState(0)

  // Poll for pending approvals and build queue counts
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [approvalsRes, buildRes] = await Promise.all([
          fetch('/api/admin/approvals?status=PENDING&limit=1'),
          fetch('/api/build-queue'),
        ])
        if (approvalsRes.ok) {
          const data = await approvalsRes.json()
          setPendingApprovals(data.pendingCount || 0)
        }
        if (buildRes.ok) {
          const data = await buildRes.json()
          setBuildQueueBadge(data.badgeCount || 0)
        }
      } catch { /* silent */ }
    }
    fetchCounts()
    const interval = setInterval(fetchCounts, 10_000)
    return () => clearInterval(interval)
  }, [])

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
      {/* Sidebar - Hidden on mobile */}
      <aside className="w-72 gradient-dark text-white flex-col shadow-large border-r border-slate-700/50 hidden md:flex">
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
          <NavLink href="/admin/payouts" icon={<Wallet size={20} />}>
            Payouts
          </NavLink>
          <NavLink href="/admin/messages" icon={<MessageSquare size={20} />}>
            Messages
          </NavLink>
          <NavLink href="/admin/approvals" icon={<ShieldCheck size={20} />} badge={pendingApprovals}>
            Approvals
          </NavLink>
          <NavLink href="/admin/build-queue" icon={<Hammer size={20} />} badge={buildQueueBadge}>
            Build Queue
          </NavLink>
          <NavLink href="/admin/outbound" icon={<Target size={20} />}>
            Sales Rep Tracker
          </NavLink>
          <NavLink href="/admin/instantly" icon={<Mail size={20} />}>
            Instantly Campaigns
          </NavLink>
          <NavLink href="/admin/dialer-monitor" icon={<Radio size={20} />}>
            Live Dialer
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
            href="/admin/reps"
            className="flex items-center gap-2 text-sm text-slate-300 hover:text-white w-full transition-colors px-3 py-2 rounded-lg hover:bg-slate-700/50"
          >
            <Users size={18} />
            Sales Team
          </Link>
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

      <BriefingModal />
    </div>
  )
}

function NavLink({
  href,
  icon,
  children,
  badge,
}: {
  href: string
  icon: React.ReactNode
  children: React.ReactNode
  badge?: number
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-300 rounded-lg hover:bg-slate-700/50 hover:text-white transition-all duration-200"
    >
      {icon}
      <span className="flex-1">{children}</span>
      {badge != null && badge > 0 && (
        <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
          {badge}
        </span>
      )}
    </Link>
  )
}
