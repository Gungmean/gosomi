import * as Dialog from '@radix-ui/react-dialog'
import { ArrowUpRight, BookOpen, ExternalLink, LoaderCircle, Search, X } from 'lucide-react'
import { useState } from 'react'
import { searchPrecedents } from '../api'
import type { Precedent } from '../types'

export default function PrecedentDialog({ open, onOpenChange, precedents, onResults }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  precedents: Precedent[]
  onResults: (results: Precedent[]) => void
}) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sampleKey, setSampleKey] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [searchResults, setSearchResults] = useState<Precedent[]>([])
  const visibleResults = hasSearched ? searchResults : precedents

  async function search() {
    if (query.trim().length < 2 || loading) return
    setLoading(true)
    setError('')
    setHasSearched(true)
    setSearchResults([])
    setSampleKey(false)
    try {
      const result = await searchPrecedents(query.trim())
      setSearchResults(result.results)
      onResults(result.results)
      setSampleKey(result.sampleKey)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '판례 검색에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <Dialog.Portal>
      <Dialog.Overlay className="dialog-overlay" />
      <Dialog.Content className="dialog-content precedent-dialog">
        <div className="dialog-topline"><div className="dialog-icon"><BookOpen size={21} /></div><Dialog.Close className="icon-button" aria-label="닫기"><X size={20} /></Dialog.Close></div>
        <Dialog.Title>판례 찾아보기</Dialog.Title>
        <Dialog.Description>국가법령정보센터에서 공개된 형사 판례를 검색합니다. 이름이나 연락처 대신 사건의 쟁점을 입력해주세요.</Dialog.Description>
        <form className="precedent-search" onSubmit={(event) => { event.preventDefault(); search() }}>
          <Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="예: 중고거래 사기, 온라인 모욕" autoFocus /><button type="submit" disabled={loading || query.trim().length < 2}>{loading ? <LoaderCircle size={17} className="spin" /> : '검색'}</button>
        </form>
        {error && <div className="inline-error">{error}</div>}
        {sampleKey && <p className="sample-key-note">현재 공식 API의 예제 인증값으로 조회 중입니다. 배포 시 발급받은 인증값을 연결해야 합니다.</p>}
        {hasSearched && !loading && !error && <p className="precedent-result-count">검색 결과 {visibleResults.length}건</p>}
        <div className="precedent-list">
          {!visibleResults.length && !loading && !hasSearched && <div className="empty-precedents"><BookOpen size={28} /><strong>검색한 판례가 여기에 표시됩니다</strong><span>원문이 확인된 판례만 답변의 근거로 사용할 수 있어요.</span></div>}
          {!visibleResults.length && !loading && hasSearched && !error && <div className="empty-precedents"><BookOpen size={28} /><strong>검색 결과가 없습니다</strong><span>죄명만 입력하거나 표현을 짧게 바꿔 다시 검색해보세요.</span></div>}
          {visibleResults.map((item) => <article className="precedent-card" key={item.id}>
            <div className="precedent-meta">{item.court || '법원 정보 확인'} <span>·</span> {item.decidedAt || '선고일 확인'} <span>·</span> {item.caseNumber}</div>
            <h3>{item.title}</h3>
            <p>{item.summary ? <><strong>{item.summaryKind === 'excerpt' ? '원문 발췌 · ' : '판결 요지 · '}</strong>{item.summary}</> : '판결 요지를 가져오지 못했습니다. 원문에서 내용을 확인해주세요.'}</p>
            <a href={item.url} target="_blank" rel="noreferrer">공식 원문 보기 <ArrowUpRight size={15} /></a>
          </article>)}
        </div>
        <div className="precedent-bottom"><a href="https://www.law.go.kr/precSc.do" target="_blank" rel="noreferrer">국가법령정보센터 직접 열기 <ExternalLink size={14} /></a><span>판례는 사건별 사실관계에 따라 다르게 적용될 수 있습니다.</span></div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
}
