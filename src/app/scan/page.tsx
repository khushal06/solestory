'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ImageUpload } from '@/components/scan/ImageUpload'
import { ScanResults } from '@/components/scan/ScanResults'
import type { ScanResult } from '@/types'

export default function ScanPage() {
  const [result, setResult] = useState<ScanResult | null>(null)

  return (
    <div className="min-h-[calc(100vh-56px)]">
      <AnimatePresence mode="wait">
        {!result ? (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="px-4 py-10"
          >
            <div className="mx-auto mb-8 max-w-md text-center">
              <h1 className="mb-2 text-2xl font-bold">
                Identify Your <span className="gradient-text-gold">Shoe</span>
              </h1>
              <p className="text-sm text-muted-foreground">
                Upload a photo or take a picture — our AI will do the rest.
              </p>
            </div>
            <ImageUpload onResult={setResult} />
          </motion.div>
        ) : (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <ScanResults result={result} onReset={() => setResult(null)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
