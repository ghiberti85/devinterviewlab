'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { useT } from '@/lib/i18n/useT'

export function ExportPdfButton() {
  const t = useT()
  const [loading, setLoading] = useState(false)

  async function handleExport() {
    setLoading(true)
    try {
      const element = document.getElementById('score-card-export')
      if (!element) return

      const [html2canvas, { jsPDF }] = await Promise.all([
        import('html2canvas').then(m => m.default),
        import('jspdf'),
      ])

      const canvas = await html2canvas(element, { scale: 2, useCORS: true })
      const imgData = canvas.toDataURL('image/png')

      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const ratio = canvas.height / canvas.width
      const imgWidth = pageWidth
      const imgHeight = pageWidth * ratio

      const x = 0
      const y = imgHeight < pageHeight ? (pageHeight - imgHeight) / 2 : 0

      pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight)
      pdf.save(`score-card-${Date.now()}.pdf`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="flex items-center gap-2 border px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors disabled:opacity-50"
    >
      <Download size={14} />
      {loading ? t.scoreCard.exporting : t.scoreCard.export}
    </button>
  )
}
