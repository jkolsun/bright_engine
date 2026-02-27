'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown } from 'lucide-react'

interface BulkSelectDropdownProps {
  pageItemIds: string[]
  selectedIds: Set<string>
  onSelectionChange: (newSelection: Set<string>) => void
}

export function BulkSelectDropdown({ pageItemIds, selectedIds, onSelectionChange }: BulkSelectDropdownProps) {
  const [open, setOpen] = useState(false)
  const [selectCount, setSelectCount] = useState('25')
  const checkboxRef = useRef<HTMLInputElement>(null)
  const chevronRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  const allSelected = pageItemIds.length > 0 && pageItemIds.every(id => selectedIds.has(id))
  const someSelected = pageItemIds.some(id => selectedIds.has(id))

  // Indeterminate state
  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = someSelected && !allSelected
    }
  }, [someSelected, allSelected])

  // Position dropdown via portal
  const updatePosition = useCallback(() => {
    if (chevronRef.current) {
      const rect = chevronRef.current.getBoundingClientRect()
      setPos({ top: rect.bottom + 4, left: rect.left })
    }
  }, [])

  useEffect(() => {
    if (!open) return
    updatePosition()
    const onScroll = () => updatePosition()
    window.addEventListener('scroll', onScroll, true)
    return () => window.removeEventListener('scroll', onScroll, true)
  }, [open, updatePosition])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        chevronRef.current && !chevronRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  const handleCheckboxClick = () => {
    if (allSelected) {
      onSelectionChange(new Set())
    } else {
      const next = new Set(selectedIds)
      pageItemIds.forEach(id => next.add(id))
      onSelectionChange(next)
    }
  }

  const handleSelectNumber = () => {
    const n = Math.max(1, Math.min(pageItemIds.length, parseInt(selectCount) || 0))
    const next = new Set(selectedIds)
    pageItemIds.slice(0, n).forEach(id => next.add(id))
    onSelectionChange(next)
    setOpen(false)
  }

  const handleSelectPage = () => {
    const next = new Set(selectedIds)
    pageItemIds.forEach(id => next.add(id))
    onSelectionChange(next)
    setOpen(false)
  }

  const handleDeselectAll = () => {
    onSelectionChange(new Set())
    setOpen(false)
  }

  return (
    <div className="flex items-center gap-0.5">
      <input
        ref={checkboxRef}
        type="checkbox"
        checked={allSelected}
        onChange={handleCheckboxClick}
        className="w-4 h-4 cursor-pointer rounded border-gray-300"
      />
      <button
        ref={chevronRef}
        onClick={() => setOpen(!open)}
        className="p-0.5 rounded hover:bg-gray-200 transition-colors"
        aria-label="Selection options"
      >
        <ChevronDown size={12} className="text-gray-400" />
      </button>
      {open && pos && createPortal(
        <div
          ref={dropdownRef}
          className="bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-[9999] w-56"
          style={{ position: 'fixed', top: pos.top, left: pos.left }}
        >
          {/* Select number */}
          <div className="px-3 py-2 hover:bg-gray-50">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">Select</span>
              <input
                type="number"
                value={selectCount}
                onChange={e => setSelectCount(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSelectNumber() }}
                min={1}
                max={pageItemIds.length}
                className="w-16 border border-gray-300 rounded px-2 py-1 text-sm"
              />
              <button
                onClick={handleSelectNumber}
                className="bg-blue-600 text-white rounded px-3 py-1 text-sm hover:bg-blue-700 transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
          {/* Select this page */}
          <button
            onClick={handleSelectPage}
            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Select this page [{pageItemIds.length}]
          </button>
          {/* Deselect all */}
          {selectedIds.size > 0 && (
            <button
              onClick={handleDeselectAll}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-100"
            >
              Deselect all
            </button>
          )}
        </div>,
        document.body
      )}
    </div>
  )
}
