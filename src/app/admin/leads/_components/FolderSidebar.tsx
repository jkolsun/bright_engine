'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import Link from 'next/link'
import {
  Filter, LayoutGrid, List,
} from 'lucide-react'

export interface FolderSidebarProps {
  leads: any[]
  folders: any[]
  viewMode: 'folders' | 'leads'
  onViewModeChange: (mode: 'folders' | 'leads') => void
  onResetFilters: () => void
}

export default function FolderSidebar({
  leads,
  folders,
  viewMode,
  onViewModeChange,
  onResetFilters,
}: FolderSidebarProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-gray-500 dark:text-gray-400">{leads.length} total leads in {folders.length} folders</p>
      </div>
      <div className="flex gap-3">
        {/* View Mode Toggle */}
        <div className="flex rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
          <button
            onClick={() => onViewModeChange('folders')}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-slate-700"
          >
            <LayoutGrid size={16} /> Folders
          </button>
          <button
            onClick={() => { onViewModeChange('leads'); onResetFilters() }}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
          >
            <List size={16} /> All Leads
          </button>
        </div>
        <Link href="/admin/leads?tab=import">
          <Button variant="outline">
            <Filter size={18} className="mr-2" />
            Import
          </Button>
        </Link>
      </div>
    </div>
  )
}

// ─── StatCard ───

export interface StatCardProps {
  label: string
  value: string | number
  variant?: 'default' | 'primary' | 'success' | 'danger' | 'warning'
  onClick?: () => void
  active?: boolean
}

export function StatCard({
  label,
  value,
  variant = 'default',
  onClick,
  active
}: StatCardProps) {
  const colors = {
    default: 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700',
    primary: 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800',
    success: 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200 dark:border-green-800',
    danger: 'bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-950/30 dark:to-pink-950/30 border-red-200 dark:border-red-800',
    warning: 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200 dark:border-amber-800'
  }

  return (
    <Card
      className={`p-6 cursor-pointer transition-all ${colors[variant]} ${active ? 'ring-2 ring-blue-500' : ''}`}
      onClick={onClick}
    >
      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">{label}</div>
      <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</div>
    </Card>
  )
}
