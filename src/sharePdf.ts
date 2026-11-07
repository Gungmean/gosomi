import type { ComplaintDraft } from './types'
import { complaintPdfFilename } from './shareCodec'

const pageWidth = 1819
const pageHeight = 2570
const fontFamily = '"Malgun Gothic", "맑은 고딕", sans-serif'

function makePage() {
  const canvas = document.createElement('canvas')
  canvas.width = pageWidth
  canvas.height = pageHeight
  const context = canvas.getContext('2d')!
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, pageWidth, pageHeight)
  return { canvas, context }
}

function wrapText(context: CanvasRenderingContext2D, text: string, width: number) {
  const lines: string[] = []
  for (const paragraph of text.replace(/\r/g, '').split('\n')) {
    let line = ''
    for (const character of paragraph) {
      if (line && context.measureText(line + character).width > width) {
        lines.push(line)
        line = ''
      }
      line += character
    }
    lines.push(line)
  }
  return lines
}

/** Render the original image and its percentage coordinates directly. A DOM
 * screenshot engine changes font baselines and CSS page breaks on some devices. */
function renderOfficialPage(element: HTMLElement) {
  const { canvas, context } = makePage()
  context.drawImage(element.querySelector<HTMLImageElement>('img')!, 0, 0, pageWidth, pageHeight)
  for (const value of element.querySelectorAll<HTMLElement>('.official-value:not(.is-empty)')) {
    const x = parseFloat(value.style.left) / 100 * pageWidth
    const y = parseFloat(value.style.top) / 100 * pageHeight
    const width = parseFloat(value.style.width) / 100 * pageWidth
    const height = parseFloat(value.style.height) / 100 * pageHeight
    const size = parseFloat(value.style.fontSize) / 100 * pageWidth
    context.fillStyle = '#ffffff'
    context.fillRect(x, y, width, height)
    context.fillStyle = '#172019'
    context.font = `${size}px ${fontFamily}`
    context.textBaseline = 'top'
    context.textAlign = 'left'
    const lines = wrapText(context, value.textContent || '', width - 4)
    lines.forEach((line, index) => context.fillText(line, x + 2, y + index * size * 1.25))
  }
  context.font = `${pageWidth * .02}px ${fontFamily}`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillStyle = '#111111'
  for (const mark of element.querySelectorAll<HTMLElement>('.official-checkmark')) {
    const x = (parseFloat(mark.style.left) + parseFloat(mark.style.width) / 2) / 100 * pageWidth
    const y = (parseFloat(mark.style.top) + parseFloat(mark.style.height) / 2) / 100 * pageHeight
    context.fillText('✓', x, y)
  }
  return canvas
}

/** Flow complete supplemental text at line boundaries, without truncation. */
function renderTextPages(article: HTMLElement, append: (canvas: HTMLCanvasElement) => void) {
  const margin = 156, right = pageWidth - margin, bottom = pageHeight - margin
  let page = makePage(), y = margin, hasContent = false
  const fontSize = 29, lineHeight = 45
  function nextPage() {
    if (hasContent) append(page.canvas)
    page = makePage(); y = margin; hasContent = false
  }
  function draw(text: string, size = fontSize, bold = false, centered = false) {
    page.context.font = `${bold ? '700 ' : ''}${size}px ${fontFamily}`
    const lines = wrapText(page.context, text, right - margin)
    for (const line of lines) {
      if (y + lineHeight > bottom) nextPage()
      page.context.font = `${bold ? '700 ' : ''}${size}px ${fontFamily}`
      page.context.fillStyle = '#172019'
      page.context.textBaseline = 'top'
      page.context.textAlign = centered ? 'center' : 'left'
      page.context.fillText(line, centered ? pageWidth / 2 : margin, y)
      y += lineHeight
      hasContent = true
    }
    y += 18
  }
  function drawRow(label: string, text: string) {
    const labelWidth = 390, contentX = margin + labelWidth + 20
    page.context.font = `700 ${fontSize}px ${fontFamily}`
    const labels = wrapText(page.context, label, labelWidth)
    page.context.font = `${fontSize}px ${fontFamily}`
    const values = wrapText(page.context, text, right - contentX)
    const count = Math.max(labels.length, values.length)
    if (count * lineHeight + 18 <= bottom - margin && y + count * lineHeight + 18 > bottom) nextPage()
    for (let index = 0; index < count; index++) {
      if (y + lineHeight > bottom) nextPage()
      page.context.fillStyle = '#172019'
      page.context.textBaseline = 'top'
      page.context.textAlign = 'left'
      page.context.font = `700 ${fontSize}px ${fontFamily}`
      page.context.fillText(labels[index] || '', margin, y)
      page.context.font = `${fontSize}px ${fontFamily}`
      page.context.fillText(values[index] || '', contentX, y)
      y += lineHeight
      hasContent = true
    }
    y += 18
  }
  const blocks = article.querySelectorAll<HTMLElement>('h1, h2, .paper-subtitle, .document-note, .document-row, .document-paragraph, .supplemental-full-entry > p, .document-declaration, .document-signature, .document-recipient')
  for (const block of blocks) {
    if (block.matches('h1')) { draw(block.textContent || '', 42, true, true); y += 20 }
    else if (block.matches('h2')) draw(block.textContent || '', 33, true)
    else if (block.matches('.document-row')) {
      const label = block.querySelector('.document-row-label')?.textContent || ''
      const text = block.querySelector('.document-row-content')?.textContent || ''
      drawRow(label, text)
    } else if (block.matches('.supplemental-full-entry > p')) {
      drawRow(block.querySelector('strong')?.textContent || '', block.querySelector('span')?.textContent || '')
    } else draw(block.textContent || '', block.matches('.document-note') ? 25 : fontSize)
  }
  if (hasContent) append(page.canvas)
}

export async function downloadComplaintPdf(draft: ComplaintDraft, element: HTMLElement) {
  await document.fonts.ready
  await Promise.all(Array.from(element.querySelectorAll('img')).map((image) => image.decode()))
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true })
  let pageCount = 0
  function append(canvas: HTMLCanvasElement) {
    if (pageCount++) pdf.addPage()
    pdf.addImage(canvas.toDataURL('image/jpeg', .98), 'JPEG', 0, 0, 210, 297)
  }
  for (const section of Array.from(element.children)) {
    if (!(section instanceof HTMLElement)) continue
    if (section.matches('.official-page')) append(renderOfficialPage(section))
    else if (section.matches('.paper')) renderTextPages(section, append)
  }
  if (!pageCount) throw new Error('PDF에 넣을 고소장 내용을 찾지 못했습니다.')
  pdf.save(complaintPdfFilename(draft.complainantName))
}
