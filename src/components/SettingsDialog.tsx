import * as Dialog from '@radix-ui/react-dialog'
import { Check, Eye, EyeOff, KeyRound, ShieldCheck, X } from 'lucide-react'
import { useState } from 'react'
import type { AiSettings, Provider } from '../types'
import { defaultModels } from '../types'

const providerLabels: Record<Provider, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  gemini: 'Google Gemini',
}

export default function SettingsDialog({ open, onOpenChange, settings, onChange }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  settings: AiSettings
  onChange: (next: AiSettings) => void
}) {
  const [showKey, setShowKey] = useState(false)

  function selectProvider(provider: Provider) {
    onChange({ ...settings, provider, model: defaultModels[provider], apiKey: '' })
  }

  return <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <Dialog.Portal>
      <Dialog.Overlay className="dialog-overlay" />
      <Dialog.Content className="dialog-content settings-dialog">
        <div className="dialog-topline"><div className="dialog-icon"><KeyRound size={21} /></div><Dialog.Close className="icon-button" aria-label="닫기"><X size={20} /></Dialog.Close></div>
        <Dialog.Title>AI 연결 설정</Dialog.Title>
        <Dialog.Description>사용할 AI 서비스를 선택하고 본인의 API 키를 입력해주세요.</Dialog.Description>

        <div className="settings-label">AI 제공자</div>
        <div className="provider-options">
          {(Object.keys(providerLabels) as Provider[]).map((provider) => <button key={provider} className={settings.provider === provider ? 'provider-option selected' : 'provider-option'} onClick={() => selectProvider(provider)}>
            <span>{providerLabels[provider]}</span>{settings.provider === provider && <Check size={16} />}
          </button>)}
        </div>

        <label className="settings-field"><span>모델</span><input value={settings.model} onChange={(event) => onChange({ ...settings, model: event.target.value })} placeholder="모델 이름" /></label>
        <label className="settings-field"><span>API 키</span><div className="key-input-wrap"><input type={showKey ? 'text' : 'password'} value={settings.apiKey} onChange={(event) => onChange({ ...settings, apiKey: event.target.value })} placeholder="API 키를 입력해주세요" autoComplete="off" /><button type="button" className="icon-button" aria-label={showKey ? 'API 키 숨기기' : 'API 키 보기'} onClick={() => setShowKey((value) => !value)}>{showKey ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>

        <div className="settings-security"><ShieldCheck size={18} /><span>키는 이 브라우저 화면의 메모리에만 보관됩니다. 새로고침하면 지워지며, 요청 시 로컬 중계 서버를 거쳐 선택한 AI 제공자에게 전달됩니다.</span></div>
        <button className="dialog-primary" onClick={() => onOpenChange(false)}>설정 완료</button>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
}
