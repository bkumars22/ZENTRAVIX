import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ZENTRAVIX — Organisation Intelligence Platform',
  description: 'Real-time organisation intelligence for every role',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
