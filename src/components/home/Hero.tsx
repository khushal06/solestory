'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Camera, Upload, Zap } from 'lucide-react'

export function Hero() {
  return (
    <section className="relative flex min-h-[calc(100vh-56px)] flex-col items-center justify-center overflow-hidden px-4 py-16 text-center">
      {/* Background ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute right-1/4 bottom-1/4 h-[300px] w-[300px] rounded-full bg-accent/8 blur-[80px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5 text-xs font-medium text-muted-foreground"
        >
          <Zap className="h-3 w-3 text-accent" />
          AI-Powered Shoe Recognition
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-4 text-5xl font-bold leading-tight tracking-tight sm:text-6xl md:text-7xl"
        >
          Know Every{' '}
          <span className="gradient-text-gold">Shoe</span>
          <br />
          <span className="gradient-text-blue">Instantly</span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-10 mx-auto max-w-xl text-base text-muted-foreground sm:text-lg"
        >
          Snap a photo of any sneaker. Get its full story, original retail price,
          current market prices, and find where to buy nearby — in seconds.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
        >
          <Link
            href="/scan"
            className="glow-blue inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 hover:scale-105 active:scale-95 sm:w-auto"
          >
            <Camera className="h-4 w-4" />
            Take a Picture
          </Link>
          <Link
            href="/scan?mode=upload"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-border bg-surface px-8 py-3.5 text-sm font-semibold text-foreground transition-all hover:bg-surface-2 hover:scale-105 active:scale-95 sm:w-auto"
          >
            <Upload className="h-4 w-4" />
            Upload Image
          </Link>
        </motion.div>

        {/* Social proof */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 text-xs text-muted-foreground"
        >
          Works with Nike, Jordan, Adidas, Yeezy, New Balance, and 200+ more
        </motion.p>
      </div>

      {/* Floating shoe card previews */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.6 }}
        className="relative z-10 mt-16 w-full max-w-sm"
      >
        <div className="rounded-2xl border border-border bg-surface p-4">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-xl bg-surface-2 shimmer" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-32 rounded bg-surface-2 shimmer" />
              <div className="h-2.5 w-20 rounded bg-surface-2 shimmer" />
            </div>
            <div className="rounded-full bg-primary/20 px-2.5 py-1 text-xs font-semibold text-primary">
              98%
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {['StockX', 'GOAT', 'eBay'].map((p) => (
              <div key={p} className="rounded-lg border border-border bg-surface-2 p-2 text-center">
                <p className="text-[10px] text-muted-foreground">{p}</p>
                <div className="mt-1 h-3 w-full rounded bg-surface shimmer" />
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  )
}
