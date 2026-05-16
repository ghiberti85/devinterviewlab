import { describe, it, expect } from 'vitest'
import { ndjsonStream, readNdjsonStream } from '@/lib/api/stream'

// ─── ndjsonStream ─────────────────────────────────────────────────────────────

async function collectLines(response: Response): Promise<unknown[]> {
  const text = await response.text()
  return text
    .split('\n')
    .filter(Boolean)
    .map(l => JSON.parse(l))
}

describe('ndjsonStream', () => {
  it('returns a Response with NDJSON content type', async () => {
    const res = ndjsonStream(async (emit) => { emit({ status: 'thinking' }) })
    expect(res.headers.get('Content-Type')).toContain('application/x-ndjson')
  })

  it('emits a thinking event', async () => {
    const res = ndjsonStream(async (emit) => { emit({ status: 'thinking' }) })
    const lines = await collectLines(res)
    expect(lines[0]).toEqual({ status: 'thinking' })
  })

  it('emits a complete event with data', async () => {
    const res = ndjsonStream(async (emit) => {
      emit({ status: 'complete', data: { score: 90 } })
    })
    const lines = await collectLines(res)
    expect(lines[0]).toEqual({ status: 'complete', data: { score: 90 } })
  })

  it('emits multiple events in order', async () => {
    const res = ndjsonStream(async (emit) => {
      emit({ status: 'thinking' })
      emit({ status: 'complete', data: 'done' })
    })
    const lines = await collectLines(res)
    expect(lines).toHaveLength(2)
    expect(lines[0]).toEqual({ status: 'thinking' })
    expect(lines[1]).toEqual({ status: 'complete', data: 'done' })
  })

  it('emits an error event', async () => {
    const res = ndjsonStream(async (emit) => {
      emit({ status: 'error', error: 'something went wrong' })
    })
    const lines = await collectLines(res)
    expect(lines[0]).toEqual({ status: 'error', error: 'something went wrong' })
  })

  it('closes the stream even when the handler throws', async () => {
    const res = ndjsonStream(async () => { throw new Error('boom') })
    // Should resolve (stream closed in finally) without hanging
    const text = await res.text()
    expect(text).toBe('')
  })

  it('includes Cache-Control and X-Accel-Buffering headers', () => {
    const res = ndjsonStream(async () => {})
    expect(res.headers.get('Cache-Control')).toBe('no-cache')
    expect(res.headers.get('X-Accel-Buffering')).toBe('no')
  })
})

// ─── readNdjsonStream ─────────────────────────────────────────────────────────

// Builds a mock Response whose body emits the given NDJSON lines.
function makeResponse(lines: string[]): Response {
  const body = lines.join('\n') + '\n'
  return new Response(body, {
    headers: { 'Content-Type': 'application/x-ndjson' },
  })
}

describe('readNdjsonStream', () => {
  it('resolves with data from a complete event', async () => {
    const res = makeResponse([
      JSON.stringify({ status: 'thinking' }),
      JSON.stringify({ status: 'complete', data: { score: 87 } }),
    ])
    const result = await readNdjsonStream<{ score: number }>(res)
    expect(result).toEqual({ score: 87 })
  })

  it('resolves even when complete event is the only line', async () => {
    const res = makeResponse([JSON.stringify({ status: 'complete', data: 'ok' })])
    expect(await readNdjsonStream<string>(res)).toBe('ok')
  })

  it('throws when the stream contains an error event', async () => {
    const res = makeResponse([
      JSON.stringify({ status: 'thinking' }),
      JSON.stringify({ status: 'error', error: 'AI quota exceeded' }),
    ])
    await expect(readNdjsonStream(res)).rejects.toThrow('AI quota exceeded')
  })

  it('throws when the stream ends without a complete event', async () => {
    const res = makeResponse([JSON.stringify({ status: 'thinking' })])
    await expect(readNdjsonStream(res)).rejects.toThrow('Stream ended without a result')
  })

  it('throws when the response has no body', async () => {
    const res = { body: null } as unknown as Response
    await expect(readNdjsonStream(res)).rejects.toThrow('Response has no body')
  })

  it('ignores thinking events and still resolves', async () => {
    const res = makeResponse([
      JSON.stringify({ status: 'thinking' }),
      JSON.stringify({ status: 'thinking' }),
      JSON.stringify({ status: 'thinking' }),
      JSON.stringify({ status: 'complete', data: [1, 2, 3] }),
    ])
    expect(await readNdjsonStream<number[]>(res)).toEqual([1, 2, 3])
  })

  it('resolves with a complex nested object', async () => {
    const data = { score: 92, feedback: { strengths: ['good'], gaps: [] } }
    const res = makeResponse([JSON.stringify({ status: 'complete', data })])
    expect(await readNdjsonStream(res)).toEqual(data)
  })

  it('resolves when the last chunk has no trailing newline (residual buffer flush)', async () => {
    const body = JSON.stringify({ status: 'complete', data: 'flush' }) // no trailing \n
    const res = new Response(body, { headers: { 'Content-Type': 'application/x-ndjson' } })
    expect(await readNdjsonStream<string>(res)).toBe('flush')
  })

  it('handles empty lines between events gracefully', async () => {
    const body = [
      JSON.stringify({ status: 'thinking' }),
      '',
      JSON.stringify({ status: 'complete', data: 'done' }),
      '',
    ].join('\n')
    const res = new Response(body)
    expect(await readNdjsonStream<string>(res)).toBe('done')
  })
})
