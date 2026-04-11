/**
 * Validates file authenticity using magic bytes (file signature).
 * A malicious user can set any MIME type in the Content-Type header —
 * magic bytes check the actual file content.
 */

// File signatures: [offset, bytes]
const MAGIC_BYTES: Record<string, { offset: number; bytes: number[] }[]> = {
  'application/pdf': [
    { offset: 0, bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  ],
  'text/plain': [], // No magic bytes — any text content is valid
  'application/msword': [
    { offset: 0, bytes: [0xD0, 0xCF, 0x11, 0xE0] }, // OLE2 compound doc
  ],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
    { offset: 0, bytes: [0x50, 0x4B, 0x03, 0x04] }, // ZIP (docx is a zip)
  ],
}

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

export interface FileValidationResult {
  valid:   boolean
  error?:  string
  mimeType?: string
}

/**
 * Validate a file buffer against:
 * 1. Allowed MIME type whitelist
 * 2. Magic bytes (actual file content matches declared type)
 * 3. Size limit
 */
export function validateFileBuffer(
  buffer:    Buffer,
  declaredMime: string,
  maxBytes:  number = 10 * 1024 * 1024
): FileValidationResult {
  // 1. Size check
  if (buffer.length === 0) {
    return { valid: false, error: 'Arquivo vazio.' }
  }
  if (buffer.length > maxBytes) {
    const mb = (maxBytes / 1024 / 1024).toFixed(0)
    return { valid: false, error: `Arquivo excede o limite de ${mb}MB.` }
  }

  // 2. MIME type whitelist
  const mime = declaredMime.split(';')[0].trim().toLowerCase()
  if (!ALLOWED_MIME_TYPES.has(mime)) {
    return {
      valid: false,
      error: `Tipo de arquivo não permitido: ${mime}. Apenas PDF, TXT e Word são aceitos.`,
    }
  }

  // 3. Magic bytes check (skip for text/plain — no reliable signature)
  const signatures = MAGIC_BYTES[mime]
  if (signatures && signatures.length > 0) {
    const matchesAny = signatures.some(sig => {
      if (buffer.length < sig.offset + sig.bytes.length) return false
      return sig.bytes.every((byte, i) => buffer[sig.offset + i] === byte)
    })

    if (!matchesAny) {
      return {
        valid: false,
        error: 'O conteúdo do arquivo não corresponde ao tipo declarado. Por favor, envie um arquivo válido.',
      }
    }
  }

  return { valid: true, mimeType: mime }
}

/**
 * Quick check: is this buffer actually a PDF?
 */
export function isPDF(buffer: Buffer): boolean {
  if (buffer.length < 4) return false
  return (
    buffer[0] === 0x25 && // %
    buffer[1] === 0x50 && // P
    buffer[2] === 0x44 && // D
    buffer[3] === 0x46    // F
  )
}
