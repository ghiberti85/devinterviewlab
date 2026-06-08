import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { RegisterClient } from './RegisterClient'

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/plano')

  const { error } = await searchParams

  return <RegisterClient error={error} />
}
