import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })

export const metadata: Metadata = {
  title: 'Construction ERP',
  description: 'Enterprise Resource Planning for Construction Companies',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="h-full bg-slate-50 font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
