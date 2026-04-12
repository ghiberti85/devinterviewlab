import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'
import { LanguageSelector } from '@/components/LanguageSelector'
import { NavLinks } from '@/components/NavLinks'
import { MobileMenu } from '@/components/MobileMenu'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop sidebar — hidden on mobile */}
      <aside className="hidden md:flex w-56 border-r flex-col shrink-0">
        <div className="p-5 border-b">
          <span className="font-bold text-primary text-lg">DevInterviewLab</span>
        </div>
        <nav className="flex-1 p-3 overflow-y-auto">
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
              <span>Sign out</span>
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile top bar + slide drawer */}
      <MobileMenu />

      {/* Main content — offset by top bar on mobile */}
      <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
        <div className="max-w-6xl mx-auto p-4 md:p-6">{children}</div>
      </main>
    </div>
  )
}
