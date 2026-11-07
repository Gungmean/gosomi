import type { ComplaintDraft } from './types'
import { normalizeSupplementalData } from '../shared/draftData.mjs'

const sharePrefix = 'gosomi-share='
const publicAppOrigin = 'https://gosomi-orpin.vercel.app'
const allowedTypes = new Set(['fraud', 'defamation', 'assault', 'general'])

function toBase64Url(bytes: Uint8Array) {
  let binary = ''
  const chunkSize = 0x8000
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize))
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function fromBase64Url(value: string) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - base64.length % 4) % 4)
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0))
}

export async function createShareUrl(draft: ComplaintDraft) {
  if (!('CompressionStream' in window)) throw new Error('이 브라우저에서는 QR 다운로드를 지원하지 않습니다.')

  const shareDraft = draft
  const stream = new Blob([JSON.stringify(shareDraft)]).stream().pipeThrough(new CompressionStream('gzip'))
  const compressed = new Uint8Array(await new Response(stream).arrayBuffer())
  const isLocalHost = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname)
  const url = new URL(isLocalHost ? `${publicAppOrigin}${window.location.pathname}${window.location.search}` : window.location.href)
  url.hash = `${sharePrefix}${toBase64Url(compressed)}`
  return url.toString()
}

export function readSharePayload(hash: string): string | null {
  return hash.startsWith(`#${sharePrefix}`) ? hash.slice(sharePrefix.length + 1) : null
}

export async function decodeShareDraft(payload: string): Promise<ComplaintDraft> {
  if (!('DecompressionStream' in window)) throw new Error('이 브라우저에서는 QR 다운로드를 지원하지 않습니다.')
  if (payload.length > 4000) throw new Error('QR에 담긴 문서 정보가 너무 큽니다. 고소미에서 새 QR을 만들어 주세요.')

  const compressed = fromBase64Url(payload)
  const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'))
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  let decodedSize = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    decodedSize += value.byteLength
    if (decodedSize > 512_000) {
      await reader.cancel()
      throw new Error('QR 문서 크기가 제한을 초과했습니다.')
    }
    chunks.push(value)
  }
  const decoded = new Uint8Array(decodedSize)
  let offset = 0
  for (const chunk of chunks) { decoded.set(chunk, offset); offset += chunk.byteLength }
  const parsed: unknown = JSON.parse(new TextDecoder().decode(decoded))
  if (!parsed || typeof parsed !== 'object' || !('type' in parsed) || !allowedTypes.has(String(parsed.type))) {
    throw new Error('QR의 문서 정보를 읽을 수 없습니다.')
  }

  const draft = parsed as ComplaintDraft
  const textFields = [
    'complainantName', 'complainantBirth', 'complainantAddress', 'complainantPhone',
    'accusedName', 'accusedAddress', 'accusedPhone', 'accusedOnlineId', 'accusedAccount',
    'incidentDate', 'incidentTime', 'incidentPlace', 'incidentSummary', 'damage', 'reason',
    'evidence', 'request', 'relatedCase',
  ] as const
  const cleanDraft = { ...draft, ...normalizeSupplementalData(draft), selections: {} as Record<string, string>, documentDetails: {} as Record<string, string> }
  for (const key of textFields) cleanDraft[key] = typeof draft[key] === 'string' ? draft[key] : ''
  if (draft.selections && typeof draft.selections === 'object') {
    cleanDraft.selections = Object.fromEntries(Object.entries(draft.selections)
      .filter(([key, value]) => /^[a-zA-Z0-9_-]{1,64}$/.test(key) && typeof value === 'string')
      .map(([key, value]) => [key, value]))
  }
  if (draft.documentDetails && typeof draft.documentDetails === 'object') {
    cleanDraft.documentDetails = Object.fromEntries(Object.entries(draft.documentDetails)
      .filter(([key, value]) => /^[a-zA-Z0-9_-]{1,64}$/.test(key) && typeof value === 'string')
      .map(([key, value]) => [key, value]))
  }
  return cleanDraft
}

export function complaintPdfFilename(name: string) {
  const safeName = name.trim().replace(/[\\/:*?"<>|\u0000-\u001f]/g, '').slice(0, 80) || '고소인'
  return `${safeName}의 고소장.pdf`
}
