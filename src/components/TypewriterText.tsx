import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { TypeAnimation } from 'react-type-animation'
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
 * Progressive Markdown typewriter for AI chat messages.
 * Uses a direct requestAnimationFrame loop so OS reduced-motion settings on Windows PC
 * never skip or disable the typing animation.
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
  const onProgressRef = useRef(onProgress)
  const onCompleteRef = useRef(onComplete)
  onProgressRef.current = onProgress
  onCompleteRef.current = onComplete

  useEffect(() => {
    if (!active || text.length === 0) {
      setCharCount(text.length)
      setIsTyping(false)
      if (active) onCompleteRef.current?.()
      return
    }

    setCharCount(1)
    setIsTyping(true)

    const durationMs = Math.min(2500, Math.max(650, text.length * 16))
    const startTime = performance.now()
    let rafId = 0
    let lastScrollTick = 0

    const step = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(1, elapsed / durationMs)
      const nextCount = Math.min(text.length, Math.max(1, Math.round(progress * text.length)))
      setCharCount(nextCount)

      if (now - lastScrollTick > 80) {
        lastScrollTick = now
        onProgressRef.current?.()
      }

      if (progress < 1) {
        rafId = window.requestAnimationFrame(step)
      } else {
        setCharCount(text.length)
        setIsTyping(false)
        onProgressRef.current?.()
        onCompleteRef.current?.()
      }
    }

    rafId = window.requestAnimationFrame(step)

    return () => {
      window.cancelAnimationFrame(rafId)
    }
  }, [active, text])

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
 * Typewriter component for live Complaint Document fields using react-type-animation.
 */
export function TypedDocumentText({
  text,
  animateKey,
}: {
  text: string
  animateKey?: string
}) {
  const [completedKey, setCompletedKey] = useState<string | null>(null)
  const shouldAnimate = Boolean(
    animateKey &&
    completedKey !== animateKey &&
    text.trim().length > 0,
  )

  if (!shouldAnimate) {
    return <>{text}</>
  }

  return (
    <span className="document-typing-active">
      <TypeAnimation
        key={`${animateKey}-${text}`}
        sequence={[
          text,
          () => setCompletedKey(animateKey || null),
        ]}
        wrapper="span"
        cursor={false}
        speed={{ type: 'keyStrokeDelayInMs', value: Math.min(26, Math.max(10, Math.round(850 / Math.max(text.length, 1)))) }}
      />
    </span>
  )
}

/**
 * Welcome Hero Title with typing animation via react-type-animation.
 */
export function WelcomeTypedHeading() {
  const [done, setDone] = useState(false)

  if (done) {
    return (
      <h1>
        무슨 일이 있었는지
        <br className="welcome-mobile-break" /> 들려주세요.
      </h1>
    )
  }

  return (
    <h1 aria-label="무슨 일이 있었는지 들려주세요.">
      <TypeAnimation
        sequence={[
          '무슨 일이 있었는지 들려주세요.',
          () => setDone(true),
        ]}
        wrapper="span"
        cursor={true}
        speed={{ type: 'keyStrokeDelayInMs', value: 40 }}
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
) {
  useEffect(() => {
    const element = textareaRef.current
    if (!element) return

    const examples = PLACEHOLDER_EXAMPLES[complaintType] || PLACEHOLDER_EXAMPLES.general
    if (hasInput) {
      element.setAttribute('placeholder', examples[0])
      return
    }

    // Clear initial placeholder before initializing Typed.js so it types forward from index 0
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
  }, [textareaRef, complaintType, hasInput])
}
