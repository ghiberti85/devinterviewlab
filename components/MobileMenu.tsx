'use client'

import { useState } from 'react'
import { Menu, X, LogOut } from 'lucide-react'
import { NavLinks } from './NavLinks'
import { ThemeToggle } from './ThemeToggle'
import { LanguageSelector } from './LanguageSelector'
import { useT } from '@/lib/i18n/useT'

export function MobileMenu() {
  const [open, setOpen] = useState(false)
  const t = useT()

  return (
    <>
      {/* Fixed top bar — mobile only */}
      <div className="fixed top-0 left-0 right-0 h-14 bg-background border-b flex items-center justify-between px-4 z-40 md:hidden">
        <span className="font-bold text-primary text-base">DevInterviewLab</span>
        <button
          onClick={() => setOpen(true)}
          className="p-2 rounded-md hover:bg-accent transition-colors"
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>
      </div>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-50 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Slide-in drawer */}
      <div
        className={`fixed top-0 left-0 h-full w-64 bg-background border-r z-50 flex flex-col transition-transform duration-200 ease-in-out md:hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-5 border-b flex items-center justify-between">
          <span className="font-bold text-primary text-lg">DevInterviewLab</span>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-md hover:bg-accent transition-colors"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav links — close drawer on navigation */}
        <nav className="flex-1 p-3 overflow-y-auto" onClick={() => setOpen(false)}>
          <NavLinks />
        </nav>

        <div className="p-3 border-t space-y-1">
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
