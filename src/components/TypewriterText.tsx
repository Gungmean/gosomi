import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { useReducedMotion } from 'motion/react'
import Typed from 'typed.js'
import type { ComplaintType } from '../types'

const PLACEHOLDER_EXAMPLES: Record<ComplaintType, string[]> = {
  fraud: [
    '예: 중고거래로 45만 원을 계좌이체했는데 물건을 보내주지 않고 연락을 끊었어요.',
    '예: 원금과 수익을 보장한다며 투자금을 받아간 뒤 약속한 날짜에 돌려주지 않아요.',
    '예: 빌려준 돈을 갚기로 한 날짜가 지났는데 연락처를 바꾸고 잠적했어요.',
  ],
  defamation: [
    '예: 오픈채팅방에서 여러 사람이 보는 가운데 제 실명을 언급하며 욕설과 허위사실을 올렸어요.',
    '예: 인터넷 커뮤니티 게시판에 저를 특정할 수 있는 사진과 함께 모욕적인 글을 게시했어요.',
    '예: 지인들이 있는 단톡방에서 저에 대한 거짓 소문을 퍼뜨려 명예가 훼손되었어요.',
  ],
  assault: [
    '예: 어제 저녁 9시쯤 강남역 인근 길거리에서 시비가 붙어 상대방이 제 멱살을 잡고 밀쳤어요.',
    '예: 주차 문제로 말다툼하던 중 상대방이 주먹으로 제 팔과 얼굴을 때려 병원 진료를 받았어요.',
    '예: 술자리에서 상대방이 물건을 던지고 발로 정강이를 차서 멍이 들었어요.',
  ],
  general: [
    '예: 중고거래 대금을 보냈는데 물건을 받지 못했고, 판매자가 연락을 끊었어요.',
    '예: 온라인에서 제 신상정보와 함께 사실이 아닌 글을 올려 큰 피해를 입었어요.',
    '예: 언제, 어디서, 누구에게 어떤 피해를 입었는지 기억나는 대로 편하게 적어주세요.',
  ],
}

function escapeForTyped(value: string): string {
  return value.replace(/`/g, "'").replace(/\^(\d)/g, ' ^$1')
}

/**
 * Stabilizes a partial Markdown slice so unclosed bold (**), code (`),
 * or trailing list markers never flash raw syntax or cause horizontal line jumps.
 */
function stabilizeMarkdownSlice(fullText: string, charCount: number): string {
  if (charCount >= fullText.length) return fullText

  let end = charCount
  if (fullText[end - 1] === '*' && fullText[end] === '*') {
    end += 1
  }

  let slice = fullText.slice(0, end)
  slice = slice.replace(/\n(?:[-*+]|\d+\.|#{1,4})\s*$/, '\n')

  const boldMatches = slice.match(/\*\*/g)
  if (boldMatches && boldMatches.length % 2 === 1) {
    if (slice.endsWith('**')) {
      slice = slice.slice(0, -2)
    } else {
      slice = `${slice}**`
    }
  }

  const backtickMatches = slice.match(/`/g)
  if (backtickMatches && backtickMatches.length % 2 === 1) {
    if (slice.endsWith('`')) {
      slice = slice.slice(0, -1)
    } else {
      slice = `${slice}\``
    }
  }

  return slice
}

/**
 * Reusable plain-text typewriter span powered by Typed.js.
 */
export function TypedSpan({
  text,
  typeSpeed = 24,
  startDelay = 0,
  showCursor = false,
  cursorChar = '▍',
  onComplete,
}: {
  text: string
  typeSpeed?: number
  startDelay?: number
  showCursor?: boolean
  cursorChar?: string
  onComplete?: () => void
}) {
  const elRef = useRef<HTMLSpanElement>(null)
  const onCompleteRef = useRef(onComplete)
  const reduceMotion = useReducedMotion()
  onCompleteRef.current = onComplete

  useEffect(() => {
    const element = elRef.current
    if (!element || reduceMotion) return
    element.textContent = ''

    const typed = new Typed(element, {
      strings: [escapeForTyped(text)],
      typeSpeed,
      startDelay,
      showCursor,
      cursorChar,
      contentType: 'null',
      onComplete: (self) => {
        if (!showCursor) self.cursor?.remove()
        onCompleteRef.current?.()
      },
    })

    return () => {
      typed.destroy()
    }
  }, [text, typeSpeed, startDelay, showCursor, cursorChar, reduceMotion])

  return reduceMotion ? <span>{text}</span> : <span ref={elRef} />
}

/**
 * Progressive Markdown typewriter for AI chat messages.
 * Driven by Typed.js character progression + ReactMarkdown so Markdown formatting
 * and typing animation work reliably on both PC and mobile.
 */
export function TypewriterMarkdown({
  text,
  active,
  onProgress,
  onComplete,
}: {
  text: string
  active: boolean
  onProgress?: () => void
  onComplete?: () => void
}) {
  const [charCount, setCharCount] = useState(() => (active ? 0 : text.length))
  const [isTyping, setIsTyping] = useState(() => active && text.length > 0)
  const reduceMotion = useReducedMotion()
  const onProgressRef = useRef(onProgress)
  const onCompleteRef = useRef(onComplete)
  onProgressRef.current = onProgress
  onCompleteRef.current = onComplete

  useEffect(() => {
    if (!active || text.length === 0 || reduceMotion) {
      setCharCount(text.length)
      setIsTyping(false)
      if (active) onCompleteRef.current?.()
      return
    }

    setCharCount(1)
    setIsTyping(true)

    const stepMs = Math.min(28, Math.max(12, Math.round(2200 / Math.max(text.length, 1))))
    let current = 1
    let lastScrollTick = 0

    const timer = window.setInterval(() => {
      const increment = text.length > 180 ? 2 : 1
      current = Math.min(text.length, current + increment)
      setCharCount(current)

      const now = performance.now()
      if (now - lastScrollTick > 80) {
        lastScrollTick = now
        onProgressRef.current?.()
      }

      if (current >= text.length) {
        window.clearInterval(timer)
        setIsTyping(false)
        onProgressRef.current?.()
        onCompleteRef.current?.()
      }
    }, stepMs)

    return () => {
      window.clearInterval(timer)
    }
  }, [active, text, reduceMotion])

  function finishImmediately() {
    if (!isTyping) return
    setCharCount(text.length)
    setIsTyping(false)
    onProgressRef.current?.()
    onCompleteRef.current?.()
  }

  const visibleText = isTyping ? stabilizeMarkdownSlice(text, charCount) : text

  return (
    <div
      className={`message-body${isTyping ? ' is-typing' : ''}`}
      onClick={isTyping ? finishImmediately : undefined}
      title={isTyping ? '클릭하면 전체 답변을 바로 표시합니다' : undefined}
    >
      <ReactMarkdown>{visibleText}</ReactMarkdown>
    </div>
  )
}

/**
 * Typewriter component for live Complaint Document fields using Typed.js.
 */
export function TypedDocumentText({
  text,
  animateKey,
}: {
  text: string
  animateKey?: string
}) {
  const [completedKey, setCompletedKey] = useState<string | null>(null)
  const reduceMotion = useReducedMotion()
  const shouldAnimate = Boolean(
    !reduceMotion &&
    animateKey &&
    completedKey !== animateKey &&
    text.trim().length > 0,
  )

  if (!shouldAnimate) {
    return <>{text}</>
  }

  return (
    <span className="document-typing-active">
      <TypedSpan
        key={`${animateKey}-${text}`}
        text={text}
        typeSpeed={Math.min(26, Math.max(10, Math.round(800 / Math.max(text.length, 1))))}
        showCursor={false}
        onComplete={() => setCompletedKey(animateKey || null)}
      />
    </span>
  )
}

/**
 * Welcome Hero Title with typing animation via Typed.js.
 */
export function WelcomeTypedHeading({ respondent = false }: { respondent?: boolean }) {
  const [done, setDone] = useState(false)
  const text = respondent ? '받은 고소장, 함께 살펴봐요.' : '무슨 일이 있었는지 들려주세요.'

  if (done) {
    return (
      <h1>{respondent ? <>받은 고소장,<br className="welcome-mobile-break" /> 함께 살펴봐요.</> : <>무슨 일이 있었는지<br className="welcome-mobile-break" /> 들려주세요.</>}</h1>
    )
  }

  return (
    <h1 aria-label={text}>
      <TypedSpan
        text={text}
        typeSpeed={42}
        showCursor={true}
        cursorChar="▍"
        onComplete={() => setDone(true)}
      />
    </h1>
  )
}

/**
 * Hook that uses typed.js to animate the landing textarea placeholder with category-specific examples.
 */
export function useTypedPlaceholder(
  textareaRef: React.RefObject<HTMLTextAreaElement | null>,
  complaintType: ComplaintType,
  hasInput: boolean,
  isWelcome: boolean,
) {
  const reduceMotion = useReducedMotion()
  useEffect(() => {
    if (!isWelcome) return
    const element = textareaRef.current
    if (!element) return

    const examples = PLACEHOLDER_EXAMPLES[complaintType] || PLACEHOLDER_EXAMPLES.general
    if (hasInput || reduceMotion) {
      element.setAttribute('placeholder', examples[0])
      return
    }

    element.setAttribute('placeholder', '')

    const typed = new Typed(element, {
      strings: examples,
      typeSpeed: 28,
      backSpeed: 14,
      backDelay: 2400,
      startDelay: 150,
      loop: true,
      smartBackspace: true,
      attr: 'placeholder',
      showCursor: false,
    })

    return () => {
      typed.destroy()
      element.setAttribute('placeholder', examples[0])
    }
  }, [textareaRef, complaintType, hasInput, isWelcome, reduceMotion])
}
