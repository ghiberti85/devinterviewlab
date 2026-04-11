import { NextRequest, NextResponse } from 'next/server'

const OK = () => new NextResponse(null, { status: 200 })

export async function GET()  { return OK() }
export async function POST(request: NextRequest) {
  const dsn = process.env.SENTRY_DSN
  if (!dsn) return OK()

  try {
    // DSN format: https://PUBLIC_KEY@HOST/PROJECT_ID
    // Envelope endpoint: https://HOST/api/PROJECT_ID/envelope/
    const url       = new URL(dsn)
    const projectId = url.pathname.replace(/^\/+/, '')
    const host      = url.host  // e.g. o123.ingest.sentry.io
    const envelope  = `https://${host}/api/${projectId}/envelope/`

    const body = await request.arrayBuffer()

    // Fire and forget — don't await the response, don't forward errors
    fetch(envelope, {
      method:  'POST',
      body,
      headers: { 'Content-Type': 'application/x-sentry-envelope' },
    }).catch(() => {}) // swallow silently

  } catch {
    // Never fail — always tell the SDK "received"
  }

  return OK()
}
