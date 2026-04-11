import { redirect } from 'next/navigation'

// This page is only available in development
export default function VoiceTestPage() {
  if (process.env.NODE_ENV === 'production') {
    redirect('/dashboard')
  }

  // Dynamically import the actual test page only in dev
  // In production this redirects before rendering
  return null
}
