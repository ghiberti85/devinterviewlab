'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Dumbbell, MessageSquare, BookMarked,
  Grid3x3, X, LogOut,
  BookOpen, Sparkles, ClipboardList, PieChart, Map, Code2, Network, BarChart2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useT } from '@/lib/i18n/useT'
import { ThemeToggle } from './ThemeToggle'
import { LanguageSelector } from './LanguageSelector'

const PRIMARY_TABS = [
  { href: '/dashboard', icon: LayoutDashboard, labelKey: 'dashboard' as const },
  { href: '/practice',  icon: Dumbbell,        labelKey: 'practice'  as const },
  { href: '/interview', icon: MessageSquare,    labelKey: 'interview' as const },
  { href: '/topics',    icon: BookMarked,       labelKey: 'topics'    as const },
]

const MORE_ITEMS = [
  { href: '/questions',     icon: BookOpen,      labelKey: 'questions'  as const },
  { href: '/generate',      icon: Sparkles,      labelKey: 'generate'   as const },
  { href: '/history',       icon: ClipboardList, labelKey: 'history'    as const },
  { href: '/score-cards',   icon: PieChart,      labelKey: 'scoreCards' as const },
  { href: '/roadmap',       icon: Map,           labelKey: 'roadmap'    as const },
  { href: '/live-coding',   icon: Code2,         labelKey: 'liveCoding' as const },
  { href: '/concept-graph', icon: Network,       labelKey: 'concepts'   as const },
  { href: '/stats',         icon: BarChart2,     labelKey: 'stats'      as const },
]

export function BottomNav() {
  const t = useT()
  const pathname = usePathname()
  const [sheetOpen, setSheetOpen] = useState(false)

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/')

  const moreIsActive = MORE_ITEMS.some(item => isActive(item.href))

  return (
    <>
      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t md:hidden safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          {PRIMARY_TABS.map(({ href, icon: Icon, labelKey }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl min-w-0 flex-1 transition-colors',
                isActive(href)
                  ? 'text-primary'
                  : 'text-muted-foreground'
              )}
            >
              <Icon size={22} strokeWidth={isActive(href) ? 2.5 : 1.8} />
              <span className="text-[10px] font-medium truncate">{t.nav[labelKey]}</span>
            </Link>
          ))}

          {/* More button */}
          <button
            onClick={() => setSheetOpen(true)}
            className={cn(
              'flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl min-w-0 flex-1 transition-colors',
              moreIsActive ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <Grid3x3 size={22} strokeWidth={moreIsActive ? 2.5 : 1.8} />
            <span className="text-[10px] font-medium">{t.nav.more}</span>
          </button>
        </div>
      </nav>

      {/* Bottom sheet backdrop */}
      {sheetOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 md:hidden"
          onClick={() => setSheetOpen(false)}
        />
      )}

      {/* Bottom sheet */}
      <div
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-2xl border-t md:hidden transition-transform duration-300 ease-out safe-area-bottom',
          sheetOpen ? 'translate-y-0' : 'translate-y-full'
        )}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3">
          <span className="font-semibold text-sm">{t.nav.allSections}</span>
          <button
            onClick={() => setSheetOpen(false)}
            className="p-1.5 rounded-full hover:bg-muted transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Grid of nav items */}
        <div className="grid grid-cols-4 gap-1 px-4 pb-4">
          {MORE_ITEMS.map(({ href, icon: Icon, labelKey }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setSheetOpen(false)}
              className={cn(
                'flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl transition-colors text-center',
                isActive(href)
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted'
              )}
            >
              <Icon size={22} strokeWidth={isActive(href) ? 2.5 : 1.8} />
              <span className="text-[10px] font-medium leading-tight">{t.nav[labelKey]}</span>
            </Link>
          ))}
        </div>

        {/* Settings row */}
        <div className="flex items-center gap-2 px-4 py-3 border-t">
          <ThemeToggle />
          <LanguageSelector />
          <form action="/api/auth/signout" method="post" className="ml-auto">
            <button
              type="submit"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <LogOut size={14} />
              {t.nav.signOut}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
