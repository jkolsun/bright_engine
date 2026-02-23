'use client'
import { useState, useEffect } from 'react'
import { useDialer } from './DialerProvider'
import type { UpsellTag, UpsellProduct } from '@/types/dialer'
import { Tag, Plus, X } from 'lucide-react'

export function UpsellTags({ leadId }: { leadId: string }) {
  const { currentCall } = useDialer()
  const [tags, setTags] = useState<UpsellTag[]>([])
  const [products, setProducts] = useState<UpsellProduct[]>([])
  const [showPicker, setShowPicker] = useState(false)

  // Load existing tags when lead changes
  useEffect(() => {
    if (!leadId) { setTags([]); return }
    fetch(`/api/dialer/upsell/tag?leadId=${leadId}`)
      .then(r => r.ok ? r.json() : { tags: [] })
      .then(data => setTags(data.tags || []))
      .catch(() => setTags([]))
  }, [leadId])

  useEffect(() => {
    // Fetch products once
    fetch('/api/upsell-products/pitch-notes').then(r => r.json()).then(d => setProducts(d.products || [])).catch(err => console.warn('[UpsellTags] Pitch notes fetch failed:', err))
  }, [])

  const addTag = async (productId: string) => {
    const res = await fetch('/api/dialer/upsell/tag', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId, productId, callId: currentCall?.id }),
    })
    const tag = await res.json()
    setTags(prev => [...prev, tag])
    setShowPicker(false)
  }

  const removeTag = async (tagId: string) => {
    await fetch(`/api/dialer/upsell/tag/${tagId}`, { method: 'DELETE' })
    setTags(prev => prev.filter(t => t.id !== tagId))
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5" /> Upsells
        </h3>
        <button onClick={() => setShowPicker(!showPicker)} className="text-teal-600 hover:text-teal-700">
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {tags.map(tag => (
          <span key={tag.id} className="inline-flex items-center gap-1 px-2 py-1 bg-teal-50 text-teal-700 rounded-md text-xs">
            {tag.productName} (${tag.productPrice})
            <button onClick={() => removeTag(tag.id)}><X className="w-3 h-3" /></button>
          </span>
        ))}
        {tags.length === 0 && !showPicker && <span className="text-xs text-gray-400">No upsells tagged</span>}
      </div>
      {showPicker && (
        <div className="mt-2 border border-gray-200 rounded-lg p-2 max-h-32 overflow-y-auto">
          {products.map(p => (
            <button key={p.id} onClick={() => addTag(p.id)} className="w-full text-left px-2 py-1.5 text-xs hover:bg-gray-50 rounded">
              {p.name} — ${p.price}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
