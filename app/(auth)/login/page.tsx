import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; redirect?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  const { error, message, redirect: redirectPath } = await searchParams

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-primary">DevInterviewLab</h1>
          <p className="text-muted-foreground text-sm mt-1">Pratique. Aprenda. Seja contratado.</p>
        </div>
        <div className="border rounded-lg p-6 space-y-4 bg-card">
          <h2 className="font-semibold text-lg">Entrar</h2>

          {error && (
            <div role="alert" className="text-sm bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-200 rounded-md px-3 py-2">
              {decodeURIComponent(error)}
            </div>
          )}
          {message && (
            <div role="status" className="text-sm bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-200 rounded-md px-3 py-2">
              {decodeURIComponent(message)}
            </div>
          )}

          <form action="/api/auth/signin" method="post" className="space-y-3">
            {redirectPath && (
              <input type="hidden" name="redirect" value={redirectPath} />
            )}
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
                id="password" name="password" type="password" required
                autoComplete="current-password"
                className="mt-1 w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-primary text-primary-foreground rounded-md py-2 text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Entrar
            </button>
          </form>
          <p className="text-center text-sm text-muted-foreground">
            Sem conta?{' '}
            <Link href="/register" className="text-primary hover:underline">Criar conta</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
