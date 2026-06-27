'use client'

import { useEffect } from 'react'

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4 space-y-4">
      <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive text-xl">
        ✕
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Something went wrong</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          An unexpected error occurred. Your data is safe — try refreshing the page.
        </p>
      </div>
      <button
        onClick={reset}
        className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-md hover:opacity-90 transition-opacity"
      >
        Try again
      </button>
    </div>
  )
}
