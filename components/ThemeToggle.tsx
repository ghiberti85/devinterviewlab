'use client'

import { useTheme } from 'next-themes'
import { Sun, Moon, Monitor } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useT } from '@/lib/i18n/useT'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const t = useT()

  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  const cycle = () => {
    if (theme === 'system') setTheme('light')
    else if (theme === 'light') setTheme('dark')
    else setTheme('system')
  }

  const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor
  const label = theme === 'dark' ? t.nav.theme.dark : theme === 'light' ? t.nav.theme.light : t.nav.theme.system

  return (
    <button
      onClick={cycle}
      className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
    >
      <Icon size={16} />
      {label}
    </button>
  )
}
