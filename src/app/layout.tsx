import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Bright Engine',
  description: 'AI-powered lead management platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head />
      <body>{children}</body>
    </html>
  )
}
