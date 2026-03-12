'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Plus, UserMinus, Users, FolderOpen, FolderPlus,
} from 'lucide-react'

// ─── New Folder Dialog ───

export interface NewFolderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  folderName: string
  onFolderNameChange: (name: string) => void
  creating: boolean
  onCreateFolder: () => void
}

export function NewFolderDialog({
  open, onOpenChange, folderName, onFolderNameChange, creating, onCreateFolder,
}: NewFolderDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <FolderPlus size={18} className="mr-2" />
          New Folder
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Create New Folder</DialogTitle>
          <DialogDescription>
            Organize your leads into folders for easy management.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Folder Name</label>
            <Input
              placeholder="e.g., January Import, Texas Leads..."
              value={folderName}
              onChange={(e) => onFolderNameChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onCreateFolder()}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onCreateFolder} disabled={creating || !folderName.trim()}>
            {creating ? 'Creating...' : 'Create Folder'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Edit Folder Dialog ───

export interface EditFolderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  folderName: string
  onFolderNameChange: (name: string) => void
  onEditFolder: () => void
  onCloseFolderMenu: () => void
}

export function EditFolderDialog({
  open, onOpenChange, folderName, onFolderNameChange, onEditFolder, onCloseFolderMenu,
}: EditFolderDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) onCloseFolderMenu() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Folder</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <label className="text-sm font-medium">Folder Name</label>
          <Input
            className="mt-2"
            value={folderName}
            onChange={(e) => onFolderNameChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onEditFolder()}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onEditFolder} disabled={!folderName.trim()}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Add Lead Dialog ───

export interface AddLeadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  formData: {
    firstName: string
    lastName: string
    companyName: string
    phone: string
    email: string
    city: string
    state: string
    industry: string
    source: string
  }
  onFormDataChange: (data: any) => void
  creating: boolean
  onSubmit: (e: React.FormEvent) => void
}

export function AddLeadDialog({
  open, onOpenChange, formData, onFormDataChange, creating, onSubmit,
}: AddLeadDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus size={18} className="mr-2" />
          Add Lead
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Add New Lead</DialogTitle>
            <DialogDescription>
              Manually add a new lead to your pipeline.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="firstName" className="text-sm font-medium">
                  First Name *
                </label>
                <Input
                  id="firstName"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={(e) => onFormDataChange({ ...formData, firstName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="lastName" className="text-sm font-medium">
                  Last Name *
                </label>
                <Input
                  id="lastName"
                  placeholder="Smith"
                  value={formData.lastName}
                  onChange={(e) => onFormDataChange({ ...formData, lastName: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="company" className="text-sm font-medium">
                Company Name *
              </label>
              <Input
                id="company"
                placeholder="ABC Roofing"
                value={formData.companyName}
                onChange={(e) => onFormDataChange({ ...formData, companyName: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="phone" className="text-sm font-medium">
                Phone *
              </label>
              <Input
                id="phone"
                placeholder="+1 (555) 123-4567"
                value={formData.phone}
                onChange={(e) => onFormDataChange({ ...formData, phone: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="john@abcroofing.com"
                value={formData.email}
                onChange={(e) => onFormDataChange({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="city" className="text-sm font-medium">
                  City
                </label>
                <Input
                  id="city"
                  placeholder="Dallas"
                  value={formData.city}
                  onChange={(e) => onFormDataChange({ ...formData, city: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="state" className="text-sm font-medium">
                  State
                </label>
                <Input
                  id="state"
                  placeholder="TX"
                  maxLength={2}
                  value={formData.state}
                  onChange={(e) => onFormDataChange({ ...formData, state: e.target.value.toUpperCase() })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={creating}>
              {creating ? 'Creating...' : 'Create Lead'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Assign to Rep Dialog ───

export interface AssignDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedCount: number
  activeReps: any[]
  assigning: boolean
  onBulkAssign: (repId: string | null) => void
  onResetDestination: () => void
}

export function AssignDialog({
  open, onOpenChange, selectedCount, activeReps, assigning, onBulkAssign, onResetDestination,
}: AssignDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) onResetDestination() }}>
      <DialogContent className="sm:max-w-[450px]">
          <>
            <DialogHeader>
              <DialogTitle>Assign to Sales Rep</DialogTitle>
              <DialogDescription>
                Choose a sales rep to assign {selectedCount} lead{selectedCount !== 1 ? 's' : ''} to.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-2 max-h-[400px] overflow-y-auto">
              {/* Unassign option */}
              <button
                onClick={() => onBulkAssign(null)}
                disabled={assigning}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors text-left disabled:opacity-50"
              >
                <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
                  <UserMinus size={18} className="text-gray-500 dark:text-gray-400" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-gray-100">Unassign</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Remove rep assignment</div>
                </div>
              </button>

              {/* Rep options */}
              {activeReps.map((rep) => (
                <button
                  key={rep.id}
                  onClick={() => onBulkAssign(rep.id)}
                  disabled={assigning}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:border-blue-300 dark:hover:border-blue-700 transition-colors text-left disabled:opacity-50"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                    <span className="text-blue-700 dark:text-blue-400 font-semibold text-sm">
                      {rep.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || '?'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {rep.name}
                      {rep.portalType === 'PART_TIME' && (
                        <Badge variant="secondary" className="ml-2 text-xs">Part-Time</Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{rep.stats?.assignedLeads || 0} leads assigned</div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {rep.stats?.monthActivity?.closes || 0} closes
                  </Badge>
                </button>
              ))}

              {activeReps.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Users size={32} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                  <p>No active reps found.</p>
                  <p className="text-sm">Create reps in Settings first.</p>
                </div>
              )}
            </div>
          </>
      </DialogContent>
    </Dialog>
  )
}

// ─── Folder Assign Dialog ───

export interface FolderAssignDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedCount: number
  leads: any[]
  folders: any[]
  assigningFolder: boolean
  onAssignToFolder: (folderId: string | null) => void
}

export function FolderAssignDialog({
  open, onOpenChange, selectedCount, leads, folders, assigningFolder, onAssignToFolder,
}: FolderAssignDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Move {selectedCount} Lead{selectedCount !== 1 ? 's' : ''} to Folder</DialogTitle>
          <DialogDescription>
            Choose a folder to organize the selected leads.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-2 max-h-[400px] overflow-y-auto">
          {/* Remove from folder option */}
          <button
            onClick={() => onAssignToFolder(null)}
            disabled={assigningFolder}
            className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors text-left disabled:opacity-50"
          >
            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
              <FolderOpen size={18} className="text-gray-400 dark:text-gray-500" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-gray-900 dark:text-gray-100">Remove from Folder</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Move to Unorganized</div>
            </div>
          </button>

          {folders.map((folder) => {
            const count = leads.filter(l => l.folderId === folder.id).length
            return (
              <button
                key={folder.id}
                onClick={() => onAssignToFolder(folder.id)}
                disabled={assigningFolder}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:border-blue-300 dark:hover:border-blue-700 transition-colors text-left disabled:opacity-50"
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: folder.color + '20' }}>
                  <FolderOpen size={18} style={{ color: folder.color }} />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-gray-100">{folder.name}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{count} leads</div>
                </div>
              </button>
            )
          })}

          {folders.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <FolderOpen size={32} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
              <p>No folders yet.</p>
              <p className="text-sm">Create a folder from the Folders view first.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Edit Lead Dialog ───

export interface EditLeadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editLeadForm: any
  onEditLeadFormChange: (form: any) => void
  saving: boolean
  onSave: () => void
}

export function EditLeadDialog({
  open, onOpenChange, editLeadForm, onEditLeadFormChange, saving, onSave,
}: EditLeadDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Lead</DialogTitle>
          <DialogDescription>Update lead information.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">First Name</label>
              <Input value={editLeadForm.firstName || ''} onChange={(e) => onEditLeadFormChange({ ...editLeadForm, firstName: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Last Name</label>
              <Input value={editLeadForm.lastName || ''} onChange={(e) => onEditLeadFormChange({ ...editLeadForm, lastName: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Company</label>
            <Input value={editLeadForm.companyName || ''} onChange={(e) => onEditLeadFormChange({ ...editLeadForm, companyName: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Phone</label>
              <Input value={editLeadForm.phone || ''} onChange={(e) => onEditLeadFormChange({ ...editLeadForm, phone: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Email</label>
              <Input value={editLeadForm.email || ''} onChange={(e) => onEditLeadFormChange({ ...editLeadForm, email: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">City</label>
              <Input value={editLeadForm.city || ''} onChange={(e) => onEditLeadFormChange({ ...editLeadForm, city: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">State</label>
              <Input value={editLeadForm.state || ''} maxLength={2} onChange={(e) => onEditLeadFormChange({ ...editLeadForm, state: e.target.value.toUpperCase() })} />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Status</label>
            <select
              value={editLeadForm.status || 'NEW'}
              onChange={(e) => onEditLeadFormChange({ ...editLeadForm, status: e.target.value })}
              className="w-full h-10 px-3 rounded-md border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="NEW">New</option>
              <option value="HOT_LEAD">Hot Lead</option>
              <option value="QUALIFIED">Qualified</option>
              <option value="BUILDING">Building</option>
              <option value="PAID">Paid</option>
              <option value="CLOSED_LOST">Closed Lost</option>
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
