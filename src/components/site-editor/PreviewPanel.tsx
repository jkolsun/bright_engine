'use client'

import { useState, useEffect, useRef } from 'react'
import { Monitor, Smartphone, Tablet, RotateCcw } from 'lucide-react'

interface PreviewPanelProps {
  html: string
}

type DeviceMode = 'desktop' | 'tablet' | 'mobile'

const deviceWidths: Record<DeviceMode, string> = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
}

export default function PreviewPanel({ html }: PreviewPanelProps) {
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('desktop')
  const [refreshKey, setRefreshKey] = useState(0)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Debounce preview updates (300ms)
  const [debouncedHtml, setDebouncedHtml] = useState(html)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedHtml(html), 300)
    return () => clearTimeout(timer)
  }, [html])

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Preview toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#252526] border-b border-gray-700 flex-shrink-0">
        <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Preview</span>
        <div className="flex items-center gap-1">
          {([
            { mode: 'desktop' as DeviceMode, icon: Monitor, label: 'Desktop' },
            { mode: 'tablet' as DeviceMode, icon: Tablet, label: 'Tablet' },
            { mode: 'mobile' as DeviceMode, icon: Smartphone, label: 'Mobile' },
          ]).map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              onClick={() => setDeviceMode(mode)}
              className={`p-1.5 rounded transition-colors ${
                deviceMode === mode
                  ? 'bg-gray-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
              title={label}
            >
              <Icon size={14} />
            </button>
          ))}
          <div className="w-px h-4 bg-gray-600 mx-1" />
          <button
            onClick={() => setRefreshKey(k => k + 1)}
            className="p-1.5 rounded text-gray-400 hover:text-white transition-colors"
            title="Refresh Preview"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* Iframe container */}
      <div className="flex-1 flex items-start justify-center overflow-auto bg-gray-800 p-2">
        <iframe
          key={refreshKey}
          ref={iframeRef}
          srcDoc={debouncedHtml}
          className="bg-white shadow-2xl transition-all duration-200"
          style={{
            width: deviceWidths[deviceMode],
            maxWidth: '100%',
            height: '100%',
            border: 'none',
          }}
          sandbox="allow-scripts allow-same-origin allow-popups allow-top-navigation-by-user-activation"
          title="Site Preview"
        />
      </div>
    </div>
  )
}
