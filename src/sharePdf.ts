import type { ComplaintDraft } from './types'
import { complaintPdfFilename } from './shareCodec'

export async function downloadComplaintPdf(draft: ComplaintDraft, element: HTMLElement) {
  const { default: html2pdf } = await import('html2pdf.js')
  const options = {
    margin: 0,
    filename: complaintPdfFilename(draft.complainantName),
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
    pagebreak: { mode: ['css', 'legacy'] },
  }
  await html2pdf().set(options).from(element).save()
}
