'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  UserCircle,
  DollarSign,
  MessageSquare,
  Send,
  Settings,
  LogOut,
  GitBranch,
  Users2,
  Share2,
} from 'lucide-react'
import { BriefingModal } from '@/components/admin/BriefingModal'
import { ThemeProvider, useTheme } from '@/components/theme/ThemeProvider'
import { ThemeToggle } from '@/components/theme/ThemeToggle'

export const dynamic = 'force-dynamic'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ThemeProvider>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </ThemeProvider>
  )
}

function AdminLayoutInner({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { resolvedTheme } = useTheme()
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
          setBuildQueueBadge((data.badgeCount || 0) + (data.editBadgeCount || 0))
        }
      } catch (err) { console.warn('[AdminLayout] Badge count fetch failed:', err) }
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

  const isDark = resolvedTheme === 'dark'

  const pipelineBadge = pendingApprovals + buildQueueBadge

  const navItems = [
    { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/admin/leads', icon: Users, label: 'Leads' },
    { href: '/admin/clients', icon: UserCircle, label: 'Clients' },
    { href: '/admin/finance', icon: DollarSign, label: 'Finance' },
    { href: '/admin/messages', icon: MessageSquare, label: 'Messages' },
    { href: '/admin/messages-v2', icon: MessageSquare, label: 'Messages V2' },
    { href: '/admin/campaigns', icon: Send, label: 'Campaigns' },
    { href: '/admin/social-enrichment', icon: Users2, label: 'Social Enrichment' },
    { href: '/admin/social', icon: Share2, label: 'Social Outreach' },
    { href: '/admin/pipeline', icon: GitBranch, label: 'Pipeline', badge: pipelineBadge },
    { href: '/admin/settings', icon: Settings, label: 'Settings' },
  ]

  const mobileNavItems = [
    { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard', exact: true },
    { href: '/admin/leads', icon: Users, label: 'Leads' },
    { href: '/admin/pipeline', icon: GitBranch, label: 'Pipeline' },
    { href: '/admin/campaigns', icon: Send, label: 'Campaigns' },
    { href: '/admin/settings', icon: Settings, label: 'Settings' },
  ]

  return (
    <div className={`flex h-screen ${isDark ? 'dark bg-background' : 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50'}`}>
      {/* Sidebar - Hidden on mobile */}
      <aside className="w-72 gradient-dark text-white flex-col shadow-large border-r border-slate-700/50 hidden md:flex overflow-hidden">
        <div className="p-6 border-b border-white/10 flex-shrink-0">
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

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-thin">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/admin/dashboard' && pathname.startsWith(item.href))
            return (
              <NavLink key={item.href} href={item.href} icon={<item.icon size={20} />} badge={item.badge} active={isActive}>
                {item.label}
              </NavLink>
            )
          })}
        </nav>

        <div className="p-4 border-t border-slate-700 space-y-2 flex-shrink-0">
          <ThemeToggle />
          <Link
            href="/admin/reps"
            className={`flex items-center gap-2 text-sm w-full transition-colors px-3 py-2 rounded-lg ${
              pathname.startsWith('/admin/reps')
                ? 'bg-slate-700/60 text-white'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
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
      <main className="flex-1 overflow-auto pb-16 md:pb-0">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700 shadow-lg">
        <div className="flex items-center justify-around h-16">
          {mobileNavItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                  isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                <item.icon size={20} />
                <span className="text-[10px] font-semibold">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      <BriefingModal />
    </div>
  )
}

function NavLink({
  href,
  icon,
  children,
  badge,
  active,
}: {
  href: string
  icon: React.ReactNode
  children: React.ReactNode
  badge?: number
  active?: boolean
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
        active
          ? 'bg-slate-700/60 text-white'
          : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
      }`}
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
