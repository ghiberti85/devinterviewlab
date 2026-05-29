'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ChevronLeft, Settings, X, LogOut } from 'lucide-react'
import { ThemeToggle } from './ThemeToggle'
import { LanguageSelector } from './LanguageSelector'
import { useT } from '@/lib/i18n/useT'

const HUB_ROUTES = new Set(['/plano', '/simular', '/revisar', '/stats'])

const PARENT_ROUTE: Record<string, string> = {
  '/live-coding':    '/simular',
  '/interview':      '/simular',
  '/history':        '/simular',
  '/generate':       '/revisar',
  '/score-cards':    '/plano',
  '/concept-graph':  '/revisar',
  '/questions':      '/plano',
  '/dashboard':      '/plano',
  '/roadmap':        '/plano',
}

function getParentRoute(pathname: string): string | null {
  if (PARENT_ROUTE[pathname]) return PARENT_ROUTE[pathname]
  const base = '/' + pathname.split('/')[1]
  if (PARENT_ROUTE[base]) return PARENT_ROUTE[base]
  return null
}

function SettingsDrawer({ onClose }: { onClose: () => void }) {
  const t = useT()
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-50 md:hidden" onClick={onClose} />
      {/* Drawer from top */}
      <div className="fixed top-0 left-0 right-0 bg-background border-b shadow-lg z-50 md:hidden">
        <div className="flex items-center justify-between px-4 h-14 border-b">
          <span className="font-semibold text-sm">Configurações</span>
          <button onClick={onClose} className="p-2 rounded-md hover:bg-accent transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-3 space-y-1">
          <ThemeToggle />
          <LanguageSelector />
          <form action="/api/auth/signout" method="post">
            <button
              type="submit"
              className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <LogOut size={16} />
              {t.nav.signOut}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}

export function MobileTopBar() {
  const pathname = usePathname()
  const router = useRouter()
  const [settingsOpen, setSettingsOpen] = useState(false)

  const isHub = HUB_ROUTES.has(pathname)
  const parent = !isHub ? getParentRoute(pathname) : null

  return (
    <>
      <div className="fixed top-0 left-0 right-0 h-14 bg-background/80 backdrop-blur-md border-b flex items-center justify-between px-2 z-40 md:hidden">
        <div className="flex items-center">
          {!isHub && (
            <button
              onClick={() => parent ? router.push(parent) : router.back()}
              className="flex items-center gap-1 px-2 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              aria-label="Back"
            >
              <ChevronLeft size={22} />
            </button>
          )}
          {isHub && <div className="w-2" />}
          <span className="font-bold text-primary text-base tracking-tight ml-1">DevInterviewLab</span>
        </div>
        <button
          onClick={() => setSettingsOpen(true)}
          className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors mr-1"
          aria-label="Settings"
        >
          <Settings size={18} />
        </button>
      </div>

      {settingsOpen && <SettingsDrawer onClose={() => setSettingsOpen(false)} />}
    </>
  )
}
