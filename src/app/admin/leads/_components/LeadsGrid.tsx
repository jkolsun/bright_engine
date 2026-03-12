'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import Link from 'next/link'
import {
  FolderOpen, FolderPlus, MoreVertical, Pencil, Trash2, UserPlus,
} from 'lucide-react'

export interface LeadsGridProps {
  loading: boolean
  leads: any[]
  folders: any[]
  unfolderedCount: number
  folderMenuOpen: string | null
  onFolderMenuToggle: (folderId: string | null) => void
  onFolderClick: (folderId: string) => void
  onUnfolderedClick: () => void
  onEditFolder: (folderId: string, folderName: string) => void
  onAssignFolder: (folderId: string) => void
  onDeleteFolder: (folderId: string, folderName: string) => void
  onNewFolderClick: () => void
}

export default function LeadsGrid({
  loading,
  leads,
  folders,
  unfolderedCount,
  folderMenuOpen,
  onFolderMenuToggle,
  onFolderClick,
  onUnfolderedClick,
  onEditFolder,
  onAssignFolder,
  onDeleteFolder,
  onNewFolderClick,
}: LeadsGridProps) {
  if (loading) {
    return <div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading...</div>
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {folders.map((folder) => {
        const folderLeads = leads.filter(l => l.folderId === folder.id)
        const newCount = folderLeads.filter(l => l.status === 'NEW').length
        const hotCount = folderLeads.filter(l => l.status === 'HOT_LEAD').length

        return (
          <Card
            key={folder.id}
            className="p-6 cursor-pointer hover:shadow-md transition-all hover:border-blue-300 relative"
            onClick={() => onFolderClick(folder.id)}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: folder.color + '20' }}>
                <FolderOpen size={22} style={{ color: folder.color }} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">{folder.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{folder._count?.leads || 0} leads</p>
                <div className="flex gap-2 mt-2">
                  {newCount > 0 && <Badge variant="secondary" className="text-xs">{newCount} new</Badge>}
                  {hotCount > 0 && <Badge variant="destructive" className="text-xs">{hotCount} hot</Badge>}
                </div>
              </div>
              {/* Three-dot menu */}
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); onFolderMenuToggle(folderMenuOpen === folder.id ? null : folder.id) }}
                  className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
                >
                  <MoreVertical size={18} />
                </button>
                {folderMenuOpen === folder.id && (
                  <div className="absolute right-0 top-8 z-50 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg py-1 w-40" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                      onClick={() => onEditFolder(folder.id, folder.name)}
                    >
                      <Pencil size={14} /> Edit
                    </button>
                    <button
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                      onClick={() => onAssignFolder(folder.id)}
                    >
                      <UserPlus size={14} /> Assign Leads
                    </button>
                    <button
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                      onClick={() => onDeleteFolder(folder.id, folder.name)}
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )
      })}

      {/* Unfoldered leads */}
      {unfolderedCount > 0 && (
        <Card
          className="p-6 cursor-pointer hover:shadow-md transition-all hover:border-gray-400 border-dashed"
          onClick={onUnfolderedClick}
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
              <FolderOpen size={22} className="text-gray-400 dark:text-gray-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-700 dark:text-gray-300">Unorganized</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{unfolderedCount} leads not in any folder</p>
            </div>
          </div>
        </Card>
      )}

      {folders.length === 0 && unfolderedCount === 0 && (
        <div className="col-span-full text-center py-12">
          <FolderOpen size={48} className="text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No folders yet</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Create a folder or import leads to get started</p>
          <div className="flex gap-3 justify-center">
            <Button onClick={onNewFolderClick}>
              <FolderPlus size={18} className="mr-2" />
              New Folder
            </Button>
            <Link href="/admin/leads?tab=import">
              <Button variant="outline">Import Leads</Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
