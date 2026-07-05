import { describe, it, expect } from 'vitest'
import { detectContentLanguage, hasLanguageMismatch } from '@/lib/utils/topic-language'

describe('detectContentLanguage', () => {
  it('detects English prose', () => {
    const text = 'The Event Loop is the mechanism that allows Node.js to perform non-blocking I/O. This is why it matters when you build servers.'
    expect(detectContentLanguage(text)).toBe('en')
  })

  it('detects Portuguese prose via accented characters', () => {
    const text = 'O Event Loop é o mecanismo que permite ao Node.js realizar operações não bloqueantes. Isso é importante quando você constrói servidores.'
    expect(detectContentLanguage(text)).toBe('pt')
  })

  it('detects Portuguese prose that keeps English technical terms verbatim', () => {
    const text = 'A Promise representa uma operação assíncrona que ainda não terminou. Quando ela é resolvida, o callback é chamado. Isso não bloqueia o Event Loop.'
    expect(detectContentLanguage(text)).toBe('pt')
  })

  it('detects Portuguese via stopwords when no accented characters are present', () => {
    const text = 'para com uma isto ser ter fazer este essa pelo pela dos das seu sua'
    expect(detectContentLanguage(text)).toBe('pt')
  })

  it('falls back to English when there is no Portuguese signal', () => {
    expect(detectContentLanguage('A short generic string with no strong signal')).toBe('en')
  })
})

describe('hasLanguageMismatch', () => {
  it('returns false when tagged en and content is English', () => {
    const topic = {
      language: 'en',
      title: 'Event Loop',
      summary: 'The Event Loop is the mechanism that allows Node.js to perform non-blocking I/O and handle concurrency without threads.',
      when_to_use: 'Use it when building highly concurrent I/O-bound servers.',
    }
    expect(hasLanguageMismatch(topic)).toBe(false)
  })

  it('returns false when tagged pt and content is Portuguese', () => {
    const topic = {
      language: 'pt',
      title: 'Fila de Eventos',
      summary: 'O Event Loop é o mecanismo que permite ao Node.js executar operações não bloqueantes e lidar com concorrência sem threads.',
      when_to_use: 'Use quando estiver construindo servidores com alta concorrência de I/O.',
    }
    expect(hasLanguageMismatch(topic)).toBe(false)
  })

  it('returns true when tagged en but content is actually Portuguese', () => {
    const topic = {
      language: 'en',
      title: 'Fila de Eventos',
      summary: 'O Event Loop é o mecanismo que permite ao Node.js executar operações não bloqueantes e lidar com concorrência sem threads.',
      when_to_use: 'Use quando estiver construindo servidores com alta concorrência de I/O.',
    }
    expect(hasLanguageMismatch(topic)).toBe(true)
  })

  it('returns true when tagged pt but content is actually English', () => {
    const topic = {
      language: 'pt',
      title: 'Event Loop',
      summary: 'The Event Loop is the mechanism that allows Node.js to perform non-blocking I/O and handle concurrency without threads.',
      when_to_use: 'Use it when building highly concurrent I/O-bound servers.',
    }
    expect(hasLanguageMismatch(topic)).toBe(true)
  })

  it('handles a null when_to_use without throwing', () => {
    const topic = {
      language: 'en',
      title: 'Closures',
      summary: 'A closure is a function bundled with references to its surrounding state, giving it access to variables from an enclosing scope.',
      when_to_use: null,
    }
    expect(() => hasLanguageMismatch(topic)).not.toThrow()
    expect(hasLanguageMismatch(topic)).toBe(false)
  })
})
