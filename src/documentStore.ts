import type { PDFPageProxy } from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import type { DocumentImage, DocumentInput, ReceivedDocument } from './types'

async function loadPdfjs() {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl
  return pdfjs
}

const DB_NAME = 'gosomi.received-documents.v1'
const STORE_NAME = 'files'
export const MAX_DOCUMENT_PAGES = 12
const MAX_REQUEST_IMAGE_CHARS = 2_700_000

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(new Error('브라우저 파일 저장소를 열지 못했습니다.'))
  })
}

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore, resolve: (value: T) => void, reject: (error: Error) => void) => void): Promise<T> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode)
    let value: T
    transaction.oncomplete = () => { db.close(); resolve(value) }
    transaction.onerror = () => { db.close(); reject(new Error('문서 파일 저장에 실패했습니다.')) }
    transaction.onabort = transaction.onerror
    run(transaction.objectStore(STORE_NAME), (result) => { value = result }, reject)
  })
}

export function saveDocumentFile(id: string, file: File): Promise<void> {
  return withStore<void>('readwrite', (store, resolve, reject) => {
    const request = store.put(file, id)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(new Error('문서 파일을 저장하지 못했습니다.'))
  })
}

export function loadDocumentFile(id: string): Promise<Blob | undefined> {
  return withStore<Blob | undefined>('readonly', (store, resolve, reject) => {
    const request = store.get(id)
    request.onsuccess = () => resolve(request.result as Blob | undefined)
    request.onerror = () => reject(new Error('저장된 문서 파일을 읽지 못했습니다.'))
  })
}

export function deleteDocumentFile(id: string): Promise<void> {
  return withStore<void>('readwrite', (store, resolve, reject) => {
    const request = store.delete(id)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(new Error('문서 파일을 삭제하지 못했습니다.'))
  })
}

export function isSupportedDocument(file: File): boolean {
  return /\.(pdf|png|jpe?g|webp)$/i.test(file.name)
}

export async function getDocumentPageCount(file: File): Promise<number> {
  if (!/\.pdf$/i.test(file.name)) return 1
  const pdfjs = await loadPdfjs()
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) })
  const pdf = await loadingTask.promise
  const count = pdf.numPages
  await loadingTask.destroy()
  return count
}

function canvasImage(canvas: HTMLCanvasElement): DocumentImage['data'] {
  return canvas.toDataURL('image/jpeg', 0.76).split(',')[1]
}

async function imageToJpeg(blob: Blob): Promise<string> {
  const bitmap = await createImageBitmap(blob)
  try {
    const scale = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('이미지를 처리하지 못했습니다.')
    context.fillStyle = '#fff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    return canvasImage(canvas)
  } finally {
    bitmap.close()
  }
}

async function pdfPageToJpeg(page: PDFPageProxy): Promise<string> {
  const base = page.getViewport({ scale: 1 })
  const viewport = page.getViewport({ scale: 1400 / Math.max(base.width, base.height) })
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(viewport.width)
  canvas.height = Math.round(viewport.height)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('PDF 페이지를 그리지 못했습니다.')
  context.fillStyle = '#fff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  await page.render({ canvasContext: context, canvas, viewport }).promise
  return canvasImage(canvas)
}

export async function prepareDocumentInput(documents: ReceivedDocument[]): Promise<DocumentInput> {
  const textParts: string[] = []
  const images: DocumentImage[] = []
  let imageChars = 0
  for (const item of documents) {
    const blob = await loadDocumentFile(item.id)
    if (!blob) throw new Error(`${item.name} 원본을 찾지 못했습니다. 파일을 다시 첨부해주세요.`)
    if (/\.pdf$/i.test(item.name)) {
      const pdfjs = await loadPdfjs()
      const loadingTask = pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) })
      const pdf = await loadingTask.promise
      try {
        for (let index = 1; index <= pdf.numPages; index += 1) {
          const page = await pdf.getPage(index)
          const content = await page.getTextContent()
          const pageText = content.items.map((part) => 'str' in part ? part.str : '').join(' ').trim()
          if (pageText.length >= 80) {
            textParts.push(`[${item.name} ${index}/${pdf.numPages}쪽]\n${pageText.slice(0, 5000)}`)
          } else {
            const data = await pdfPageToJpeg(page)
            imageChars += data.length
            images.push({ name: `${item.name} ${index}/${pdf.numPages}쪽`, mimeType: 'image/jpeg', data })
          }
          page.cleanup()
        }
      } finally {
        await loadingTask.destroy()
      }
    } else {
      const data = await imageToJpeg(blob)
      imageChars += data.length
      images.push({ name: item.name, mimeType: 'image/jpeg', data })
    }
    if (imageChars > MAX_REQUEST_IMAGE_CHARS) throw new Error('첨부한 페이지의 이미지 용량이 너무 큽니다. 일부 파일을 나눠서 분석해주세요.')
  }
  return { text: textParts.join('\n\n').slice(0, 30000), images }
}
