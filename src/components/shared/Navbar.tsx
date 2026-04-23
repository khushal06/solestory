'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

export function Navbar() {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl"
    >
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-lg font-bold tracking-tight">
            <span className="gradient-text-gold">Sole</span>
            <span className="text-foreground">Story</span>
          </span>
        </Link>

        <Link
          href="/scan"
          className="rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 hover:scale-105 active:scale-95"
        >
          Scan a Shoe
        </Link>
      </nav>
    </motion.header>
  )
}
