import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'Construction ERP',
  description: 'Enterprise Resource Planning for Construction Companies',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="h-full bg-slate-50 font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
