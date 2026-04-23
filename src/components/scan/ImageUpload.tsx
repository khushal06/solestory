'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, Upload, X, Loader2, ScanLine } from 'lucide-react'
import Image from 'next/image'
import { compressImage } from '@/lib/image/compress'
import type { ScanResult } from '@/types'

interface Props {
  onResult: (result: ScanResult) => void
}

type Phase = 'idle' | 'uploading' | 'analyzing' | 'fetching_prices' | 'fetching_stores'

const PHASE_MESSAGES: Record<Phase, string> = {
  idle: '',
  uploading: 'Uploading image…',
  analyzing: 'AI is identifying your shoe…',
  fetching_prices: 'Finding best prices…',
  fetching_stores: 'Locating nearby stores…',
}

const PHASE_PROGRESS: Record<Phase, number> = {
  idle: 0,
  uploading: 20,
  analyzing: 55,
  fetching_prices: 80,
  fetching_stores: 95,
}

export function ImageUpload({ onResult }: Props) {
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith('image/')) {
      setError('Please select an image file.')
      return
    }
    // 50MB raw limit — we compress before uploading
    if (f.size > 50 * 1024 * 1024) {
      setError('Image must be under 50MB.')
      return
    }
    setError(null)
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const f = e.dataTransfer.files[0]
      if (f) handleFile(f)
    },
    [handleFile]
  )

  const getUserLocation = (): Promise<{ lat: number; lon: number } | null> =>
    new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null)
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => resolve(null),
        { timeout: 8000 }
      )
    })

  const handleScan = async () => {
    if (!file) return
    setError(null)

    try {
      // Step 1: Compress + upload image
      setPhase('uploading')
      const compressed = await compressImage(file)
      const formData = new FormData()
      formData.append('file', compressed)
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData })
      const uploadData = await uploadRes.json()
      if (!uploadRes.ok) throw new Error(uploadData.error ?? 'Upload failed')
      const imageUrl: string = uploadData.url
      const scanId: string | null = uploadData.scan_id ?? null

      // Step 2: AI Recognition
      setPhase('analyzing')
      const recognizeRes = await fetch('/api/recognize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: imageUrl, scan_id: scanId }),
      })
      const recognizeData = await recognizeRes.json()
      if (!recognizeRes.ok) throw new Error(recognizeData.error ?? 'Recognition failed')

      // Step 3: Prices
      setPhase('fetching_prices')
      const shoe = recognizeData.shoe
      const priceRes = await fetch(
        `/api/prices?shoe_id=${shoe.id}&retail_price=${shoe.retail_price}&name=${encodeURIComponent(shoe.name)}&colorway=${encodeURIComponent(shoe.colorway ?? '')}`
      )
      const priceData = priceRes.ok ? await priceRes.json() : null

      // Step 4: Nearby stores
      setPhase('fetching_stores')
      const location = await getUserLocation()
      let storeData = { stores: [] }
      if (location) {
        const storeRes = await fetch(
          `/api/nearby-stores?lat=${location.lat}&lon=${location.lon}`
        )
        if (storeRes.ok) storeData = await storeRes.json()
      }

      onResult({
        image_url: imageUrl,
        recognition: recognizeData,
        prices: priceData,
        nearby_stores: storeData.stores,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      setError(message)
      setPhase('idle')
    }
  }

  const isProcessing = phase !== 'idle'
  const progress = PHASE_PROGRESS[phase]

  return (
    <div className="mx-auto w-full max-w-md space-y-4">
      {/* Drop zone */}
      <AnimatePresence mode="wait">
        {!preview ? (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            className={`relative flex flex-col items-center justify-center rounded-3xl border-2 border-dashed p-12 transition-all cursor-pointer
              ${isDragging ? 'border-primary bg-primary/10' : 'border-border bg-surface hover:border-border/80 hover:bg-surface/80'}`}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="mb-4 rounded-2xl bg-surface-2 p-5">
              <Upload className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="mb-1 font-semibold text-foreground">Drop your shoe photo here</p>
            <p className="text-sm text-muted-foreground">or tap to browse</p>
            <p className="mt-3 text-xs text-muted-foreground">JPG, PNG, WebP · max 10MB</p>
          </motion.div>
        ) : (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className="relative overflow-hidden rounded-3xl border border-border bg-surface"
          >
            <Image
              src={preview}
              alt="Shoe preview"
              width={400}
              height={300}
              className="h-64 w-full object-cover"
            />
            {/* Scan overlay */}
            {isProcessing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/70 backdrop-blur-sm">
                <div className="relative mb-4 h-20 w-20">
                  {/* Pulse rings */}
                  <div className="pulse-ring absolute inset-0 rounded-full border-2 border-primary" />
                  <div className="pulse-ring absolute inset-0 rounded-full border-2 border-primary [animation-delay:0.5s]" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <ScanLine className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <p className="font-medium text-foreground">{PHASE_MESSAGES[phase]}</p>
                {/* Progress bar */}
                <div className="mt-4 h-1 w-48 overflow-hidden rounded-full bg-border">
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            )}
            {/* Remove button */}
            {!isProcessing && (
              <button
                onClick={() => { setPreview(null); setFile(null) }}
                className="absolute right-3 top-3 rounded-full bg-background/80 p-1.5 backdrop-blur-sm transition-all hover:bg-background"
              >
                <X className="h-4 w-4 text-foreground" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      {error && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-sm text-destructive"
        >
          {error}
        </motion.p>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => cameraInputRef.current?.click()}
          disabled={isProcessing}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-border bg-surface py-3.5 text-sm font-medium text-foreground transition-all hover:bg-surface-2 disabled:opacity-50"
        >
          <Camera className="h-4 w-4" />
          Camera
        </button>
        <button
          onClick={preview ? handleScan : () => fileInputRef.current?.click()}
          disabled={isProcessing}
          className="flex flex-[2] items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyzing…
            </>
          ) : preview ? (
            <>
              <ScanLine className="h-4 w-4" />
              Identify Shoe
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Upload Photo
            </>
          )}
        </button>
      </div>

      {/* Hidden inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />
    </div>
  )
}
