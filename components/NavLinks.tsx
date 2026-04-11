'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, BookOpen, Dumbbell, MessageSquare, Network, BarChart2, Sparkles } from 'lucide-react'
import { useT } from '@/lib/i18n/useT'
import { cn } from '@/lib/utils'

export function NavLinks() {
  const t = useT()
  const pathname = usePathname()

  const NAV = [
    { href: '/dashboard',     icon: LayoutDashboard, label: t.nav.dashboard },
    { href: '/questions',     icon: BookOpen,         label: t.nav.questions },
    { href: '/generate',      icon: Sparkles,         label: t.nav.generate },
    { href: '/practice',      icon: Dumbbell,         label: t.nav.practice },
    { href: '/interview',     icon: MessageSquare,    label: t.nav.interview },
    { href: '/concept-graph', icon: Network,          label: t.nav.concepts },
    { href: '/stats',         icon: BarChart2,         label: t.nav.stats },
  ]

  return (
    <ul className="space-y-1">
      {NAV.map(({ href, icon: Icon, label }) => (
        <li key={href}>
          <Link
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
              pathname === href || pathname.startsWith(href + '/')
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            )}
          >
            <Icon size={16} />
            {label}
          </Link>
        </li>
      ))}
    </ul>
  )
}
