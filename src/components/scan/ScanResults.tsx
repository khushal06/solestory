'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import {
  ArrowLeft, CheckCircle2, ExternalLink, MapPin, Calendar,
  Tag, BookOpen, Layers, TrendingDown, Star
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { ScanResult } from '@/types'

interface Props {
  result: ScanResult
  onReset: () => void
}

export function ScanResults({ result, onReset }: Props) {
  const { recognition, prices, nearby_stores, image_url } = result
  const shoe = recognition?.shoe

  if (!shoe) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <p className="mb-2 text-lg font-semibold">Shoe not identified</p>
        <p className="mb-6 text-sm text-muted-foreground">
          Try a clearer photo with good lighting and the full shoe visible.
        </p>
        <button onClick={onReset} className="rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground">
          Try Again
        </button>
      </div>
    )
  }

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } }
  const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }

  return (
    <motion.div
      className="mx-auto max-w-2xl space-y-6 px-4 py-6"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* Back */}
      <motion.button
        variants={item}
        onClick={onReset}
        className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Scan another shoe
      </motion.button>

      {/* Hero card */}
      <motion.div variants={item} className="overflow-hidden rounded-3xl border border-border bg-surface">
        <div className="relative h-60 w-full bg-surface-2">
          <Image
            src={shoe.image_url || image_url}
            alt={shoe.name}
            fill
            className="object-contain p-6"
            onError={(e) => {
              const t = e.target as HTMLImageElement
              t.src = image_url
            }}
          />
          {/* Confidence badge */}
          <div className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full bg-background/80 px-3 py-1.5 text-xs font-semibold backdrop-blur-sm">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
            {recognition.confidence}% match
          </div>
        </div>

        <div className="p-5">
          <div className="mb-1 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {shoe.brand}
              </p>
              <h1 className="mt-0.5 text-xl font-bold leading-tight text-foreground">
                {shoe.name}
              </h1>
              {shoe.colorway && (
                <p className="mt-0.5 text-sm text-muted-foreground">{shoe.colorway}</p>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-muted-foreground">Retail</p>
              <p className="text-lg font-bold text-foreground">${shoe.retail_price}</p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {shoe.release_year}
            </span>
            {shoe.tags?.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs capitalize">{tag}</Badge>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Story */}
      <motion.div variants={item} className="rounded-3xl border border-border bg-surface p-5">
        <div className="mb-3 flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-accent" />
          <h2 className="font-semibold text-foreground">The Story</h2>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">{shoe.story}</p>
      </motion.div>

      {/* Product details */}
      {shoe.details && (
        <motion.div variants={item} className="rounded-3xl border border-border bg-surface p-5">
          <div className="mb-3 flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-foreground">Product Details</h2>
          </div>
          <div className="space-y-2.5">
            {Object.entries(shoe.details)
              .filter(([, v]) => v)
              .map(([key, value]) => (
                <div key={key} className="flex justify-between gap-4">
                  <span className="text-xs capitalize text-muted-foreground">
                    {key.replace(/_/g, ' ')}
                  </span>
                  <span className="text-right text-xs font-medium text-foreground max-w-[60%]">
                    {value as string}
                  </span>
                </div>
              ))}
          </div>
        </motion.div>
      )}

      {/* Prices */}
      {prices && (
        <motion.div variants={item} className="rounded-3xl border border-border bg-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-green-400" />
              <h2 className="font-semibold text-foreground">Market Prices</h2>
            </div>
            <span className="text-xs text-muted-foreground">Estimated · updated now</span>
          </div>

          {/* Best deal highlight */}
          <div className="mb-4 flex items-center justify-between rounded-2xl bg-green-400/10 border border-green-400/20 px-4 py-3">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-green-400" />
              <div>
                <p className="text-xs text-muted-foreground">Best price</p>
                <p className="font-bold text-green-400">${prices.cheapest.price}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">{prices.cheapest.platform}</p>
              <a
                href={prices.cheapest.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-green-400 underline-offset-2 hover:underline"
              >
                View <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          <div className="space-y-2">
            {prices.prices.map((p, i) => (
              <div
                key={p.platform}
                className={`flex items-center justify-between rounded-xl px-3 py-2.5 transition-all ${
                  i === 0 ? 'bg-surface-2 ring-1 ring-green-400/20' : 'bg-surface-2/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  {i === 0 && <Star className="h-3 w-3 text-green-400 fill-green-400" />}
                  <span className="text-sm font-medium text-foreground">{p.platform}</span>
                  <Badge variant="outline" className="text-[10px] capitalize">{p.condition}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-bold ${i === 0 ? 'text-green-400' : 'text-foreground'}`}>
                    ${p.price}
                  </span>
                  <a href={p.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Nearby stores */}
      <motion.div variants={item} className="rounded-3xl border border-border bg-surface p-5">
        <div className="mb-4 flex items-center gap-2">
          <MapPin className="h-4 w-4 text-purple-400" />
          <h2 className="font-semibold text-foreground">Nearby Stores</h2>
        </div>

        {nearby_stores.length > 0 ? (
          <div className="space-y-2">
            {nearby_stores.slice(0, 6).map((store) => (
              <a
                key={store.id}
                href={store.maps_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2.5 transition-all hover:bg-surface"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{store.name}</p>
                  <p className="text-xs text-muted-foreground">{store.address}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs font-medium text-purple-400">{store.distance_km} km</span>
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="rounded-xl bg-surface-2 p-4 text-center">
            <p className="text-sm text-muted-foreground">
              No nearby stores found, or location access was denied.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Enable location to find stores near you.
            </p>
          </div>
        )}
      </motion.div>

      {/* Scan again */}
      <motion.div variants={item} className="pb-8 text-center">
        <button
          onClick={onReset}
          className="rounded-full border border-border px-8 py-3 text-sm font-medium text-foreground transition-all hover:bg-surface"
        >
          Scan Another Shoe
        </button>
      </motion.div>
    </motion.div>
  )
}
