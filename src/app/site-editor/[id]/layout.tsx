import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Site Editor | Bright Engine',
}

export default function SiteEditorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen w-screen overflow-hidden bg-[#1e1e1e]">
      {children}
    </div>
  )
}
