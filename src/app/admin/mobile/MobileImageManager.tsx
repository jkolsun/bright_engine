'use client'

import { useState, useMemo } from 'react'
import { ArrowUpDown, Replace, X, Check, Image as ImageIcon } from 'lucide-react'

interface MobileImageManagerProps {
  html: string
  onHtmlChange: (newHtml: string) => void
  onClose: () => void
}

interface ParsedImage {
  src: string
  alt: string
  index: number
  fullTag: string
}

function extractImages(html: string): ParsedImage[] {
  const images: ParsedImage[] = []
  const imgRegex = /<img\s[^>]*?src=["']([^"']+)["'][^>]*?\/?>/gi
  let match: RegExpExecArray | null
  while ((match = imgRegex.exec(html)) !== null) {
    const fullTag = match[0]
    const src = match[1]
    if (
      src.startsWith('data:image/svg') ||
      src.includes('1x1') ||
      src.includes('pixel') ||
      src.includes('favicon')
    ) continue
    const altMatch = fullTag.match(/alt=["']([^"']*)["']/)
    images.push({ src, alt: altMatch?.[1] || '', index: match.index, fullTag })
  }
  return images
}

export default function MobileImageManager({ html, onHtmlChange, onClose }: MobileImageManagerProps) {
  const [swapFrom, setSwapFrom] = useState<number | null>(null)
  const [replaceIdx, setReplaceIdx] = useState<number | null>(null)
  const [replaceUrl, setReplaceUrl] = useState('')
  const [replaceError, setReplaceError] = useState<string | null>(null)

  const images = useMemo(() => extractImages(html), [html])

  function handleSwap(fromIdx: number, toIdx: number) {
    if (fromIdx === toIdx) { setSwapFrom(null); return }
    const imgA = images[fromIdx]
    const imgB = images[toIdx]
    if (!imgA || !imgB) return
    const placeholder = `__SWAP_PLACEHOLDER_${Date.now()}__`
    let newHtml = html
    newHtml = newHtml.replace(imgA.fullTag, imgA.fullTag.replace(imgA.src, placeholder))
    newHtml = newHtml.replace(imgB.fullTag, imgB.fullTag.replace(imgB.src, imgA.src))
    newHtml = newHtml.replace(placeholder, imgB.src)
    onHtmlChange(newHtml)
    setSwapFrom(null)
  }

  function handleReplace(idx: number) {
    const url = replaceUrl.trim()
    if (!url) { setReplaceError('Enter an image URL'); return }
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('/')) {
      setReplaceError('URL must start with http://, https://, or /')
      return
    }
    const img = images[idx]
    if (!img) return
    const newTag = img.fullTag.replace(img.src, url)
    const newHtml = html.replace(img.fullTag, newTag)
    onHtmlChange(newHtml)
    setReplaceIdx(null)
    setReplaceUrl('')
    setReplaceError(null)
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ImageIcon size={16} className="text-blue-400" />
          <span className="text-sm font-medium text-slate-300">Images ({images.length})</span>
        </div>
        <div className="flex items-center gap-2">
          {swapFrom !== null && (
            <button
              onClick={() => setSwapFrom(null)}
              className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded bg-red-900/20"
            >
              Cancel Swap
            </button>
          )}
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700">
            <X size={18} />
          </button>
        </div>
      </div>

      {swapFrom !== null && (
        <p className="text-xs text-blue-400 bg-blue-900/20 px-3 py-2 rounded-lg">
          Tap another image to swap with #{swapFrom + 1}
        </p>
      )}

      {images.length === 0 ? (
        <p className="text-sm text-slate-500 py-4 text-center">No images found in site HTML</p>
      ) : (
        <div className="space-y-3">
          {images.map((img, idx) => (
            <div
              key={`${img.src}-${idx}`}
              className={`rounded-xl border overflow-hidden transition-all ${
                swapFrom === idx
                  ? 'border-blue-500 ring-1 ring-blue-500/50'
                  : swapFrom !== null
                  ? 'border-slate-600 hover:border-blue-400'
                  : 'border-slate-700'
              }`}
              onClick={() => {
                if (swapFrom !== null && swapFrom !== idx) handleSwap(swapFrom, idx)
              }}
            >
              {/* Thumbnail */}
              <div className="relative h-32 bg-slate-900">
                <img
                  src={img.src}
                  alt={img.alt}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
                <span className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded-full font-mono">
                  #{idx + 1}
                </span>
              </div>

              {/* Actions */}
              <div className="p-3 bg-slate-800/50">
                {img.alt && (
                  <p className="text-xs text-slate-400 mb-2 truncate">{img.alt}</p>
                )}

                {replaceIdx === idx ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={replaceUrl}
                      onChange={(e) => { setReplaceUrl(e.target.value); setReplaceError(null) }}
                      placeholder="New image URL..."
                      className="w-full text-sm px-3 py-2.5 rounded-lg bg-slate-900 border border-slate-600 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleReplace(idx)
                        if (e.key === 'Escape') { setReplaceIdx(null); setReplaceUrl(''); setReplaceError(null) }
                      }}
                    />
                    {replaceError && <p className="text-xs text-red-400">{replaceError}</p>}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleReplace(idx)}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
                      >
                        <Check size={14} /> Apply
                      </button>
                      <button
                        onClick={() => { setReplaceIdx(null); setReplaceUrl(''); setReplaceError(null) }}
                        className="bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm py-2.5 px-4 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    {swapFrom === null && (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); setSwapFrom(idx) }}
                          className="flex-1 flex items-center justify-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
                        >
                          <ArrowUpDown size={14} /> Swap
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setReplaceIdx(idx); setReplaceUrl('') }}
                          className="flex-1 flex items-center justify-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
                        >
                          <Replace size={14} /> Replace
                        </button>
                      </>
                    )}
                    {swapFrom === idx && (
                      <span className="text-sm text-blue-400 py-2">Selected — tap another image</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
