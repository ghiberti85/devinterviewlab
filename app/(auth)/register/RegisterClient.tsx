'use client'

import { useState } from 'react'
import Link from 'next/link'
import { translations } from '@/lib/i18n/translations'

interface RegisterClientProps {
  error?: string
}

export function RegisterClient({ error }: RegisterClientProps) {
  const [lang, setLang] = useState<'en' | 'pt'>('en')
  const t = translations[lang].auth

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">

        {/* Language toggle */}
        <div className="flex justify-end">
          <div className="flex items-center gap-1 bg-muted rounded-full p-1 text-xs font-medium">
            <button
              onClick={() => setLang('en')}
              className={`px-3 py-1 rounded-full transition-colors ${
                lang === 'en'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              aria-pressed={lang === 'en'}
            >
              EN
            </button>
            <button
              onClick={() => setLang('pt')}
              className={`px-3 py-1 rounded-full transition-colors ${
                lang === 'pt'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              aria-pressed={lang === 'pt'}
            >
              PT-BR
            </button>
          </div>
        </div>

        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-primary">DevInterviewLab</h1>
          <p className="text-muted-foreground text-sm mt-1">{t.createTagline}</p>
        </div>

        {/* Card */}
        <div className="border rounded-lg p-6 space-y-4 bg-card">
          <h2 className="font-semibold text-lg">{t.register}</h2>

          {error && (
            <div role="alert" className="text-sm bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-200 rounded-md px-3 py-2">
              {decodeURIComponent(error)}
            </div>
          )}

          <form action="/api/auth/signup" method="post" className="space-y-3">
            <div>
              <label htmlFor="email" className="text-sm font-medium">{t.email}</label>
              <input
                id="email" name="email" type="email" required
                autoComplete="email"
                className="mt-1 w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label htmlFor="password" className="text-sm font-medium">{t.password}</label>
              <input
                id="password" name="password" type="password"
                required minLength={8}
                autoComplete="new-password"
                className="mt-1 w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-xs text-muted-foreground mt-1">{t.minLength}</p>
            </div>
            <button
              type="submit"
              className="w-full bg-primary text-primary-foreground rounded-md py-2 text-sm font-medium hover:opacity-90 transition-opacity"
            >
              {t.createSubmit}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            {t.haveAccount}{' '}
            <Link href="/login" className="text-primary hover:underline">{t.signIn}</Link>
          </p>
        </div>

      </div>
    </div>
  )
}
