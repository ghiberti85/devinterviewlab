import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface UserDocument {
  id: string
  name: string
  doc_type: 'cv' | 'other'
  file_size: number | null
  keep_stored: boolean
  created_at: string
  updated_at?: string
}

export interface DocumentWithText extends UserDocument {
  text_content: string
  chars: number
}

export function useDocuments() {
  return useQuery({
    queryKey: ['documents'],
    queryFn: async () => {
      const res = await fetch('/api/documents')
      if (!res.ok) throw new Error('Failed to fetch documents')
      return res.json() as Promise<UserDocument[]>
    },
  })
}

export function useSavedCV() {
  return useQuery({
    queryKey: ['documents', 'cv'],
    queryFn: async () => {
      const res = await fetch('/api/documents/cv')
      if (res.status === 404) return null
      if (!res.ok) throw new Error('Failed to fetch CV')
      return res.json() as Promise<DocumentWithText>
    },
  })
}

export function useUploadDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      file: File
      docType: 'cv' | 'other'
      keepStored?: boolean
    }) => {
      const fd = new FormData()
      fd.append('file', body.file)
      fd.append('doc_type', body.docType)
      fd.append('keep_stored', String(body.keepStored ?? false))

      const res = await fetch('/api/documents', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Upload failed')
      return data as DocumentWithText
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents'] })
    },
  })
}

export function useDeleteDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/documents/${id}`, { method: 'DELETE' })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  })
}

export function useUpdateDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, keepStored }: { id: string; keepStored: boolean }) => {
      const res = await fetch(`/api/documents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keep_stored: keepStored }),
      })
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  })
}

export function formatFileSize(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
