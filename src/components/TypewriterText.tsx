import { useEffect, useRef, useState } from 'react'
import { animate } from 'motion'
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

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Progressive Markdown typewriter for AI chat messages.
 * Preserves live ReactMarkdown formatting while typing and allows click-to-complete.
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
  const [charCount, setCharCount] = useState(() => (active && !prefersReducedMotion() ? 0 : text.length))
  const [isTyping, setIsTyping] = useState(() => active && !prefersReducedMotion() && text.length > 0)
  const onProgressRef = useRef(onProgress)
  const onCompleteRef = useRef(onComplete)
  onProgressRef.current = onProgress
  onCompleteRef.current = onComplete

  useEffect(() => {
    if (!active || prefersReducedMotion() || text.length === 0) {
      setCharCount(text.length)
      setIsTyping(false)
      if (active) onCompleteRef.current?.()
      return
    }

    setCharCount(1)
    setIsTyping(true)
    let lastScrollTick = 0

    // Scale duration so short messages feel natural (~18ms/char) and long messages finish within ~2.6s
    const duration = Math.min(2.6, Math.max(0.65, text.length * 0.017))
    const controls = animate(1, text.length, {
      duration,
      ease: 'linear',
      onUpdate: (latest) => {
        const nextCount = Math.min(text.length, Math.max(1, Math.round(latest)))
        setCharCount(nextCount)
        const now = performance.now()
        if (now - lastScrollTick > 110) {
          lastScrollTick = now
          onProgressRef.current?.()
        }
      },
      onComplete: () => {
        setCharCount(text.length)
        setIsTyping(false)
        onProgressRef.current?.()
        onCompleteRef.current?.()
      },
    })

    return () => {
      controls.stop()
    }
  }, [active, text])

  function finishImmediately() {
    if (!isTyping) return
    setCharCount(text.length)
    setIsTyping(false)
    onProgressRef.current?.()
    onCompleteRef.current?.()
  }

  const visibleText = isTyping ? text.slice(0, charCount) : text

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
    text.trim().length > 0 &&
    !prefersReducedMotion(),
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
        cursor={true}
        speed={{ type: 'keyStrokeDelayInMs', value: Math.min(28, Math.max(10, Math.round(900 / Math.max(text.length, 1)))) }}
      />
    </span>
  )
}

/**
 * Welcome Hero Title with subtle one-time typing animation via react-type-animation.
 */
export function WelcomeTypedHeading() {
  const [done, setDone] = useState(() => prefersReducedMotion())

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
        speed={{ type: 'keyStrokeDelayInMs', value: 42 }}
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
    if (hasInput || prefersReducedMotion()) {
      element.setAttribute('placeholder', examples[0])
      return
    }

    const typed = new Typed(element, {
      strings: examples,
      typeSpeed: 28,
      backSpeed: 14,
      backDelay: 2400,
      startDelay: 250,
      loop: true,
      smartBackspace: true,
      attr: 'placeholder',
      bindInputFocusEvents: true,
      showCursor: false,
    })

    return () => {
      typed.destroy()
      element.setAttribute('placeholder', examples[0])
    }
  }, [textareaRef, complaintType, hasInput])
}
