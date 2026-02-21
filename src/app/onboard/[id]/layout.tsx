import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Build Your Website | Bright Automations',
  description: 'Fill out this quick form so we can build your perfect website.',
}

export default function OnboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {children}
    </div>
  )
}
