'use client'

import { usePathname, useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

const HUB_ROUTES = new Set(['/dashboard', '/simular', '/revisar', '/plano'])

// Maps sub-pages to their parent hub for the back button destination
const PARENT_ROUTE: Record<string, string> = {
  '/live-coding':    '/simular',
  '/interview':      '/simular',
  '/history':        '/simular',
  '/generate':       '/simular',
  '/practice':       '/revisar',
  '/topics':         '/revisar',
  '/roadmap':        '/plano',
  '/stats':          '/plano',
  '/score-cards':    '/plano',
  '/concept-graph':  '/revisar',
  '/questions':      '/dashboard',
}

function getParentRoute(pathname: string): string | null {
  // Exact match
  if (PARENT_ROUTE[pathname]) return PARENT_ROUTE[pathname]
  // Nested match: /history/[id] → /history, /questions/[id] → /questions
  const base = '/' + pathname.split('/')[1]
  if (PARENT_ROUTE[base]) return PARENT_ROUTE[base]
  return null
}

export function MobileTopBar() {
  const pathname = usePathname()
  const router = useRouter()

  if (HUB_ROUTES.has(pathname)) {
    return (
      <div className="fixed top-0 left-0 right-0 h-14 bg-background/80 backdrop-blur-md border-b flex items-center px-5 z-40 md:hidden">
        <span className="font-bold text-primary text-base tracking-tight">DevInterviewLab</span>
      </div>
    )
  }

  const parent = getParentRoute(pathname)

  return (
    <div className="fixed top-0 left-0 right-0 h-14 bg-background/80 backdrop-blur-md border-b flex items-center px-2 z-40 md:hidden">
      <button
        onClick={() => parent ? router.push(parent) : router.back()}
        className="flex items-center gap-1 px-2 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        aria-label="Back"
      >
        <ChevronLeft size={22} />
      </button>
      <span className="font-bold text-primary text-base tracking-tight ml-1">DevInterviewLab</span>
    </div>
  )
}
