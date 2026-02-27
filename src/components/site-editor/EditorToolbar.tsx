'use client'

import { useState } from 'react'
import { Save, RotateCcw, ArrowLeft, Eye, EyeOff, Loader2, Check, AlertCircle, RefreshCw, Image as ImageIcon } from 'lucide-react'
import Link from 'next/link'

interface EditorToolbarProps {
  companyName: string
  buildStep: string
  leadId: string
  saveStatus: 'saved' | 'unsaved' | 'saving' | 'error'
  lastSavedAt?: string | null
  onSave: () => void
  onReset: () => void
  onRegenerate: () => void
  isRegenerating?: boolean
  onTogglePreview: () => void
  onToggleImages: () => void
  showPreview: boolean
  showImages: boolean
}

const statusConfig = {
  saved: { icon: <Check size={12} />, text: 'Saved', className: 'text-green-400' },
  unsaved: { icon: <AlertCircle size={12} />, text: 'Unsaved changes', className: 'text-amber-400' },
  saving: { icon: <Loader2 size={12} className="animate-spin" />, text: 'Saving...', className: 'text-blue-400' },
  error: { icon: <AlertCircle size={12} />, text: 'Save failed', className: 'text-red-400' },
}

export default function EditorToolbar(props: EditorToolbarProps) {
  const status = statusConfig[props.saveStatus]
  const [approving, setApproving] = useState(false)
  const [approved, setApproved] = useState(false)
  const canApprove = ['QA_REVIEW', 'EDITING'].includes(props.buildStep) && !approved

  const handleApprove = async () => {
    if (props.saveStatus === 'unsaved') props.onSave()
    setApproving(true)
    try {
      const res = await fetch(`/api/build-queue/${props.leadId}/approve`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
      if (res.ok) setApproved(true)
      else {
        const data = await res.json()
        alert(data.error || 'Approve failed')
      }
    } catch { alert('Network error') }
    finally { setApproving(false) }
  }

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-[#333333] border-b border-gray-700 flex-shrink-0">
      {/* Left: Back + Company info */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/build-queue"
          className="p-1.5 rounded hover:bg-gray-600 text-gray-400 hover:text-white transition-colors"
          title="Back to Build Queue"
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="h-5 w-px bg-gray-600" />
        <div>
          <h1 className="text-sm font-semibold text-white leading-tight">{props.companyName}</h1>
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">
            {props.buildStep.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      {/* Center: Save status */}
      <div className="flex items-center gap-2">
        <div className={`flex items-center gap-1.5 text-xs ${status.className}`}>
          {status.icon}
          <span>{status.text}</span>
        </div>
        {props.lastSavedAt && props.saveStatus === 'saved' && (
          <span className="text-[10px] text-gray-500">at {props.lastSavedAt}</span>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={props.onTogglePreview}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded transition-colors ${
            props.showPreview
              ? 'bg-blue-600/20 text-blue-400'
              : 'text-gray-400 hover:text-white hover:bg-gray-600'
          }`}
        >
          {props.showPreview ? <Eye size={14} /> : <EyeOff size={14} />}
          Preview
        </button>
        <button
          onClick={props.onToggleImages}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded transition-colors ${
            props.showImages
              ? 'bg-purple-600/20 text-purple-400'
              : 'text-gray-400 hover:text-white hover:bg-gray-600'
          }`}
        >
          <ImageIcon size={14} />
          Images
        </button>
        <div className="h-5 w-px bg-gray-600" />
        <button
          onClick={props.onRegenerate}
          disabled={props.isRegenerating}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-gray-600 rounded transition-colors disabled:opacity-50"
          title="Regenerate snapshot from template"
        >
          <RefreshCw size={14} className={props.isRegenerating ? 'animate-spin' : ''} />
          {props.isRegenerating ? 'Regenerating...' : 'Regenerate'}
        </button>
        <button
          onClick={props.onReset}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-gray-600 rounded transition-colors"
          title="Reset to Original"
        >
          <RotateCcw size={14} />
          Reset
        </button>
        <button
          onClick={props.onSave}
          className={`flex items-center gap-1.5 px-4 py-1.5 text-xs rounded transition-colors font-medium ${
            props.saveStatus === 'unsaved'
              ? 'bg-blue-600 text-white hover:bg-blue-700 ring-1 ring-blue-400/50'
              : props.saveStatus === 'error'
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          <Save size={14} />
          Save
        </button>
        {canApprove && (
          <button
            onClick={handleApprove}
            disabled={approving}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition-colors font-medium"
          >
            <Check size={14} />
            {approving ? 'Approving...' : 'Approve'}
          </button>
        )}
        {approved && (
          <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-green-400 font-medium">
            <Check size={14} />
            Approved
          </span>
        )}
      </div>
    </div>
  )
}
