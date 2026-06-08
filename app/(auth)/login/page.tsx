import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LoginClient } from './LoginClient'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; redirect?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/plano')

  const { error, message, redirect: redirectPath } = await searchParams

  return <LoginClient error={error} message={message} redirectPath={redirectPath} />
}
