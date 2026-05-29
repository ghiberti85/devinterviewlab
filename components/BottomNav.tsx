'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Map, Layers, Swords, BarChart2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useT } from '@/lib/i18n/useT'

const TABS = [
  { href: '/plano',   icon: Map,       labelKey: 'plan'     as const },
  { href: '/revisar', icon: Layers,    labelKey: 'review'   as const },
  { href: '/simular', icon: Swords,    labelKey: 'simulate' as const },
  { href: '/stats',   icon: BarChart2, labelKey: 'stats'    as const },
]

export function BottomNav() {
  const t = useT()
  const pathname = usePathname()

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/')

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t md:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {TABS.map(({ href, icon: Icon, labelKey }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl min-w-0 flex-1 transition-colors',
              isActive(href) ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <Icon size={22} strokeWidth={isActive(href) ? 2.5 : 1.8} />
            <span className="text-[10px] font-medium truncate">{t.nav[labelKey]}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}
