'use client'

import { motion } from 'framer-motion'
import { Camera, Cpu, Tag, MapPin } from 'lucide-react'

const steps = [
  {
    icon: Camera,
    number: '01',
    title: 'Snap or Upload',
    description: 'Take a photo with your camera or upload an existing image of any sneaker.',
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
  {
    icon: Cpu,
    number: '02',
    title: 'AI Analysis',
    description: 'Our open-source AI models identify the shoe model, brand, colorway, and full history.',
    color: 'text-accent',
    bg: 'bg-accent/10',
  },
  {
    icon: Tag,
    number: '03',
    title: 'Price Intelligence',
    description: 'See current market prices across StockX, GOAT, eBay, and more. Best price highlighted.',
    color: 'text-green-400',
    bg: 'bg-green-400/10',
  },
  {
    icon: MapPin,
    number: '04',
    title: 'Find Nearby',
    description: 'Uses your location to show the closest shoe stores so you can buy today.',
    color: 'text-purple-400',
    bg: 'bg-purple-400/10',
  },
]

export function HowItWorks() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mb-12 text-center"
      >
        <p className="mb-3 text-sm font-medium uppercase tracking-widest text-muted-foreground">
          How It Works
        </p>
        <h2 className="text-3xl font-bold sm:text-4xl">
          From photo to answer{' '}
          <span className="gradient-text-blue">in seconds</span>
        </h2>
      </motion.div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, i) => (
          <motion.div
            key={step.number}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="group relative rounded-2xl border border-border bg-surface p-6 transition-all hover:border-border/80 hover:bg-surface/80"
          >
            <span className="mb-4 block text-4xl font-bold text-border group-hover:text-border/60 transition-colors">
              {step.number}
            </span>
            <div className={`mb-4 inline-flex rounded-xl ${step.bg} p-3`}>
              <step.icon className={`h-5 w-5 ${step.color}`} />
            </div>
            <h3 className="mb-2 font-semibold text-foreground">{step.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
