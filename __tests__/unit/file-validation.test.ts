import { describe, it, expect } from 'vitest'
import { validateFileBuffer, isPDF } from '@/lib/file-validation'

// PDF magic bytes: %PDF
const pdfMagic = Buffer.from([0x25, 0x50, 0x44, 0x46])
const validPDF = Buffer.concat([pdfMagic, Buffer.from('%PDF-1.4 ...')])

// DOCX magic bytes: PK\x03\x04 (ZIP)
const docxMagic = Buffer.from([0x50, 0x4b, 0x03, 0x04])
const validDOCX = Buffer.concat([docxMagic, Buffer.alloc(20)])

// DOC magic bytes: OLE2
const docMagic = Buffer.from([0xd0, 0xcf, 0x11, 0xe0])
const validDOC = Buffer.concat([docMagic, Buffer.alloc(20)])

const MAX = 10 * 1024 * 1024 // 10 MB

describe('validateFileBuffer — PDF', () => {
  it('accepts a valid PDF', () => {
    const result = validateFileBuffer(validPDF, 'application/pdf', MAX)
    expect(result.valid).toBe(true)
    expect(result.mimeType).toBe('application/pdf')
  })

  it('rejects a file masquerading as PDF (wrong magic bytes)', () => {
    const fake = Buffer.from('This is not a real PDF')
    const result = validateFileBuffer(fake, 'application/pdf', MAX)
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/não corresponde/)
  })

  it('accepts MIME type with charset parameter stripped correctly', () => {
    const result = validateFileBuffer(validPDF, 'application/pdf; charset=utf-8', MAX)
    expect(result.valid).toBe(true)
  })
})

describe('validateFileBuffer — size limits', () => {
  it('rejects an empty buffer', () => {
    const result = validateFileBuffer(Buffer.alloc(0), 'application/pdf', MAX)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Arquivo vazio.')
  })

  it('rejects a file that exceeds the size limit', () => {
    const big = Buffer.concat([pdfMagic, Buffer.alloc(MAX)])
    const result = validateFileBuffer(big, 'application/pdf', MAX)
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/10MB/)
  })

  it('accepts a file exactly at the size limit', () => {
    // Build a valid PDF right at the limit
    const content = Buffer.alloc(MAX - pdfMagic.length)
    const atLimit = Buffer.concat([pdfMagic, content])
    const result = validateFileBuffer(atLimit, 'application/pdf', MAX)
    expect(result.valid).toBe(true)
  })
})

describe('validateFileBuffer — MIME whitelist', () => {
  it('rejects a disallowed MIME type', () => {
    const result = validateFileBuffer(validPDF, 'image/png', MAX)
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/não permitido/)
  })

  it('accepts text/plain without magic bytes check', () => {
    const txt = Buffer.from('Hello, world!')
    const result = validateFileBuffer(txt, 'text/plain', MAX)
    expect(result.valid).toBe(true)
    expect(result.mimeType).toBe('text/plain')
  })

  it('accepts a valid DOCX file', () => {
    const result = validateFileBuffer(validDOCX, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', MAX)
    expect(result.valid).toBe(true)
  })

  it('accepts a valid DOC file', () => {
    const result = validateFileBuffer(validDOC, 'application/msword', MAX)
    expect(result.valid).toBe(true)
  })
})

describe('isPDF', () => {
  it('returns true for a buffer starting with %PDF', () => {
    expect(isPDF(validPDF)).toBe(true)
  })

  it('returns false for a non-PDF buffer', () => {
    expect(isPDF(Buffer.from('not a pdf'))).toBe(false)
  })

  it('returns false for a buffer shorter than 4 bytes', () => {
    expect(isPDF(Buffer.from([0x25, 0x50]))).toBe(false)
  })

  it('returns false for an empty buffer', () => {
    expect(isPDF(Buffer.alloc(0))).toBe(false)
  })
})
