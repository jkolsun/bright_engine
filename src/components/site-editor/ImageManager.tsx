'use client'

import { useState, useMemo } from 'react'
import { ArrowUpDown, Replace, X, GripVertical, Image as ImageIcon, Check, ExternalLink } from 'lucide-react'

interface ImageManagerProps {
  html: string
  onHtmlChange: (newHtml: string) => void
}

interface ParsedImage {
  src: string
  alt: string
  index: number // position in the HTML (character index of the <img tag)
  fullTag: string // the complete <img .../> tag
}

/**
 * Extract all <img> tags from HTML with their sources.
 */
function extractImages(html: string): ParsedImage[] {
  const images: ParsedImage[] = []
  const imgRegex = /<img\s[^>]*?src=["']([^"']+)["'][^>]*?\/?>/gi
  let match: RegExpExecArray | null

  while ((match = imgRegex.exec(html)) !== null) {
    const fullTag = match[0]
    const src = match[1]
    // Skip tiny icons, SVG data URIs, and tracking pixels
    if (
      src.startsWith('data:image/svg') ||
      src.includes('1x1') ||
      src.includes('pixel') ||
      src.includes('favicon')
    ) continue

    const altMatch = fullTag.match(/alt=["']([^"']*)["']/)
    images.push({
      src,
      alt: altMatch?.[1] || '',
      index: match.index,
      fullTag,
    })
  }

  return images
}

export default function ImageManager({ html, onHtmlChange }: ImageManagerProps) {
  const [swapMode, setSwapMode] = useState<{ from: number } | null>(null)
  const [replaceMode, setReplaceMode] = useState<number | null>(null)
  const [replaceUrl, setReplaceUrl] = useState('')
  const [replaceError, setReplaceError] = useState<string | null>(null)

  const images = useMemo(() => extractImages(html), [html])

  const handleSwap = (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) {
      setSwapMode(null)
      return
    }

    const imgA = images[fromIdx]
    const imgB = images[toIdx]
    if (!imgA || !imgB) return

    // Swap src attributes using exact character positions to handle duplicate URLs
    const newTagA = imgA.fullTag.replace(imgA.src, imgB.src)
    const newTagB = imgB.fullTag.replace(imgB.src, imgA.src)

    // Replace in reverse order of position so earlier replacements don't shift later indices
    const [first, second] = imgA.index < imgB.index ? [imgA, imgB] : [imgB, imgA]
    const [firstNew, secondNew] = imgA.index < imgB.index ? [newTagA, newTagB] : [newTagB, newTagA]

    let newHtml = html.slice(0, second.index) + secondNew + html.slice(second.index + second.fullTag.length)
    newHtml = newHtml.slice(0, first.index) + firstNew + newHtml.slice(first.index + first.fullTag.length)

    onHtmlChange(newHtml)
    setSwapMode(null)
  }

  const handleReplace = (idx: number) => {
    const url = replaceUrl.trim()
    if (!url) {
      setReplaceError('Please enter an image URL')
      return
    }
    // Basic URL validation
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('/')) {
      setReplaceError('URL must start with http://, https://, or /')
      return
    }

    const img = images[idx]
    if (!img) return

    const newTag = img.fullTag.replace(img.src, url)
    const newHtml = html.slice(0, img.index) + newTag + html.slice(img.index + img.fullTag.length)
    onHtmlChange(newHtml)
    setReplaceMode(null)
    setReplaceUrl('')
    setReplaceError(null)
  }

  if (images.length === 0) {
    return (
      <div className="flex flex-col h-full bg-[#252526]">
        <div className="px-3 py-2 border-b border-gray-700 flex items-center gap-2 flex-shrink-0">
          <ImageIcon size={14} className="text-blue-400" />
          <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Images</span>
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-500 text-xs p-4 text-center">
          No images found in the HTML
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-[#252526]">
      {/* Header */}
      <div className="px-3 py-2 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <ImageIcon size={14} className="text-blue-400" />
          <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">
            Images ({images.length})
          </span>
        </div>
        {swapMode && (
          <button
            onClick={() => setSwapMode(null)}
            className="text-[10px] text-red-400 hover:text-red-300 px-2 py-0.5 rounded bg-red-900/20"
          >
            Cancel Swap
          </button>
        )}
      </div>

      {/* Swap mode instruction */}
      {swapMode && (
        <div className="px-3 py-2 bg-blue-900/20 border-b border-blue-800/30 text-xs text-blue-300">
          Click another image to swap with it
        </div>
      )}

      {/* Image grid */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {images.map((img, idx) => (
          <div
            key={`${img.src}-${idx}`}
            className={`rounded-lg border transition-all ${
              swapMode?.from === idx
                ? 'border-blue-500 bg-blue-900/20 ring-1 ring-blue-500/50'
                : swapMode
                ? 'border-gray-600 hover:border-blue-400 cursor-pointer'
                : 'border-gray-700 bg-[#2d2d2d]'
            }`}
            onClick={() => {
              if (swapMode && swapMode.from !== idx) {
                handleSwap(swapMode.from, idx)
              }
            }}
          >
            {/* Image thumbnail */}
            <div className="relative aspect-[16/9] bg-gray-800 rounded-t-lg overflow-hidden">
              <img
                src={img.src}
                alt={img.alt}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none'
                }}
              />
              <div className="absolute top-1 left-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded font-mono">
                #{idx + 1}
              </div>
            </div>

            {/* Image info + actions */}
            <div className="p-2">
              {img.alt && (
                <p className="text-[10px] text-gray-400 mb-1.5 truncate" title={img.alt}>
                  {img.alt}
                </p>
              )}
              <p className="text-[9px] text-gray-500 mb-2 truncate font-mono" title={img.src}>
                {img.src.length > 50 ? '...' + img.src.slice(-47) : img.src}
              </p>

              {/* Replace mode */}
              {replaceMode === idx ? (
                <div className="space-y-1.5">
                  <input
                    type="text"
                    value={replaceUrl}
                    onChange={(e) => {
                      setReplaceUrl(e.target.value)
                      setReplaceError(null)
                    }}
                    placeholder="New image URL..."
                    className="w-full text-[10px] px-2 py-1.5 rounded bg-gray-700 border border-gray-600 text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-gray-500"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleReplace(idx)
                      if (e.key === 'Escape') {
                        setReplaceMode(null)
                        setReplaceUrl('')
                        setReplaceError(null)
                      }
                    }}
                  />
                  {replaceError && (
                    <p className="text-[9px] text-red-400">{replaceError}</p>
                  )}
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleReplace(idx)}
                      className="flex-1 text-[10px] px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                    >
                      <Check size={10} /> Apply
                    </button>
                    <button
                      onClick={() => {
                        setReplaceMode(null)
                        setReplaceUrl('')
                        setReplaceError(null)
                      }}
                      className="text-[10px] px-2 py-1 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-1">
                  {!swapMode && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSwapMode({ from: idx })
                        }}
                        className="flex-1 text-[10px] px-2 py-1.5 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white transition-colors flex items-center justify-center gap-1"
                        title="Swap this image with another"
                      >
                        <ArrowUpDown size={10} /> Swap
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setReplaceMode(idx)
                          setReplaceUrl('')
                        }}
                        className="flex-1 text-[10px] px-2 py-1.5 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white transition-colors flex items-center justify-center gap-1"
                        title="Replace with a different image URL"
                      >
                        <Replace size={10} /> Replace
                      </button>
                    </>
                  )}
                  {swapMode && swapMode.from === idx && (
                    <span className="text-[10px] text-blue-400 py-1">
                      Selected — click another image
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
