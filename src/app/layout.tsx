import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { Navbar } from '@/components/shared/Navbar'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'SoleStory — Identify Any Shoe Instantly',
  description:
    'AI-powered shoe recognition. Point your camera at any sneaker and instantly discover its name, history, price, and where to buy nearby.',
  keywords: ['shoe identifier', 'sneaker recognition', 'shoe price', 'sneaker app', 'AI shoes'],
  openGraph: {
    title: 'SoleStory — Identify Any Shoe Instantly',
    description: 'AI-powered shoe recognition. Find the name, price, and story behind any sneaker.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Navbar />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  )
}
