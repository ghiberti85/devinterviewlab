/**
 * NDJSON streaming utilities.
 *
 * Server: ndjsonStream() wraps a handler and emits { status, data } lines.
 * Client: readNdjsonStream() reads those lines and resolves the final data.
 *
 * Why: AI routes on Vercel Edge Runtime get 30 s (vs 10 s for Node).
 * The immediate "thinking" event keeps the client connection alive while
 * the AI generates. Pre-flight checks (auth, DB) happen before the stream
 * starts so HTTP error codes still work as expected.
 */

export type StreamEvent =
  | { status: 'thinking' }
  | { status: 'complete'; data: unknown }
  | { status: 'error'; error: string }

type EmitFn = (event: StreamEvent) => void

/**
 * Creates a streaming Response with NDJSON content type.
 * Automatically closes the stream when the handler returns or throws.
 */
export function ndjsonStream(handler: (emit: EmitFn) => Promise<void>): Response {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      function emit(event: StreamEvent): void {
        controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'))
      }
      try {
        await handler(emit)
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no', // disable Nginx response buffering
    },
  })
}

/**
 * Reads an NDJSON streaming response and resolves with the complete data.
 * Works in browsers and in Node/Edge (Next.js 15 / Node 18+).
 *
 * Throws if the stream contains an error event or ends without a result.
 */
export async function readNdjsonStream<T>(response: Response): Promise<T> {
  if (!response.body) throw new Error('Response has no body')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        // Flush any remaining content (last line without trailing \n)
        const remaining = buffer.trim()
        if (remaining) {
          const event = JSON.parse(remaining) as StreamEvent
          if (event.status === 'complete') return event.data as T
          if (event.status === 'error') throw new Error(event.error)
        }
        break
      }

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? '' // keep partial line for next chunk

      for (const line of lines) {
        if (!line.trim()) continue
        const event = JSON.parse(line) as StreamEvent
        if (event.status === 'complete') return event.data as T
        if (event.status === 'error') throw new Error(event.error)
        // 'thinking' events keep the connection alive — no action needed
      }
    }
  } finally {
    reader.releaseLock()
  }

  throw new Error('Stream ended without a result')
}
