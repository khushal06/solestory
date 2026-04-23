import { Hero } from '@/components/home/Hero'
import { HowItWorks } from '@/components/home/HowItWorks'

export default function HomePage() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        <p>© 2025 SoleStory · AI-powered shoe recognition</p>
      </footer>
    </>
  )
}
