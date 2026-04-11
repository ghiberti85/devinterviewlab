import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  const { error } = await searchParams

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-primary">DevInterviewLab</h1>
          <p className="text-muted-foreground text-sm mt-1">Crie sua conta</p>
        </div>
        <div className="border rounded-lg p-6 space-y-4 bg-card">
          <h2 className="font-semibold text-lg">Registrar</h2>

          {error && (
            <div role="alert" className="text-sm bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-200 rounded-md px-3 py-2">
              {decodeURIComponent(error)}
            </div>
          )}

          <form action="/api/auth/signup" method="post" className="space-y-3">
            <div>
              <label htmlFor="email" className="text-sm font-medium">E-mail</label>
              <input
                id="email" name="email" type="email" required
                autoComplete="email"
                className="mt-1 w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label htmlFor="password" className="text-sm font-medium">Senha</label>
              <input
                id="password" name="password" type="password"
                required minLength={8}
                autoComplete="new-password"
                className="mt-1 w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-xs text-muted-foreground mt-1">Mínimo 8 caracteres</p>
            </div>
            <button
              type="submit"
              className="w-full bg-primary text-primary-foreground rounded-md py-2 text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Criar conta
            </button>
          </form>
          <p className="text-center text-sm text-muted-foreground">
            Já tem conta?{' '}
            <Link href="/login" className="text-primary hover:underline">Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
