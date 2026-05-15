import { describe, it, expect } from 'vitest'
import { readNdjsonStream } from '@/lib/api/stream'

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
