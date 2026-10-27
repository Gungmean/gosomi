import { useEffect, useRef, useState } from 'react'
import { animate } from 'motion'
import ReactMarkdown from 'react-markdown'

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Stabilizes a partial Markdown slice so unclosed bold (**), italic (*), code (`),
 * or trailing list markers never flash raw syntax or cause horizontal line jumps on PC.
 */
function stabilizeMarkdownSlice(fullText: string, charCount: number): string {
  if (charCount >= fullText.length) return fullText

  let end = charCount
  // Avoid stopping in the middle of a "**" token
  if (fullText[end - 1] === '*' && fullText[end] === '*') {
    end += 1
  }

  let slice = fullText.slice(0, end)

  // Strip trailing standalone markdown prefix tokens on a new line (e.g. "#", "-", "*")
  // before their text has started, preventing block element jumping
  slice = slice.replace(/\n(?:[-*+]|\d+\.|#{1,4})\s*$/, '\n')

  // Balance "**" bold markers
  const boldMatches = slice.match(/\*\*/g)
  if (boldMatches && boldMatches.length % 2 === 1) {
    if (slice.endsWith('**')) {
      slice = slice.slice(0, -2)
    } else {
      slice = `${slice}**`
    }
  }

  // Balance "`" inline code markers
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
 * Preserves live ReactMarkdown formatting while typing without layout shifts,
 * and allows clicking the bubble to complete immediately.
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

    const duration = Math.min(2.4, Math.max(0.55, text.length * 0.015))
    const controls = animate(1, text.length, {
      duration,
      ease: 'linear',
      onUpdate: (latest) => {
        const nextCount = Math.min(text.length, Math.max(1, Math.round(latest)))
        setCharCount(nextCount)
        onProgressRef.current?.()
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
 * Smooth highlight reveal for newly updated fields in the live Complaint Document.
 * Avoids mutating DOM width/height inside absolute-positioned form cells on PC.
 */
export function TypedDocumentText({
  text,
  animateKey,
}: {
  text: string
  animateKey?: string
}) {
  if (!animateKey) {
    return <>{text}</>
  }

  return (
    <span key={`${animateKey}-${text}`} className="document-typing-active">
      {text}
    </span>
  )
}
