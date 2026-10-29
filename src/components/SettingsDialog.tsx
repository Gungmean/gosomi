import * as Dialog from '@radix-ui/react-dialog'
import { Check, Eye, EyeOff, KeyRound, ShieldCheck, X } from 'lucide-react'
import { useState } from 'react'
import type { AiSettings, Provider } from '../types'
import { defaultModels, modelPresets } from '../types'

const providerLabels: Record<Provider, string> = {
  gemini: 'Google Gemini',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
}

export default function SettingsDialog({ open, onOpenChange, settings, onChange }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  settings: AiSettings
  onChange: (next: AiSettings) => void
}) {
  const [showKey, setShowKey] = useState(false)

  function selectProvider(provider: Provider) {
    if (provider === settings.provider) return
    onChange({
      ...settings,
      provider,
      model: defaultModels[provider],
    })
  }

  function handleModelChange(rawModel: string) {
    const trimmed = rawModel.trim().toLowerCase()
    if (/^(?:models\/)?(?:gemini|제미나이|3\.[15678])/.test(trimmed) && settings.provider !== 'gemini') {
      onChange({ ...settings, provider: 'gemini', model: rawModel })
      return
    }
    if (trimmed.startsWith('claude') && settings.provider !== 'anthropic') {
      onChange({ ...settings, provider: 'anthropic', model: rawModel })
      return
    }
    if ((trimmed.startsWith('gpt-') || trimmed.startsWith('o1') || trimmed.startsWith('o3') || trimmed.startsWith('o4')) && settings.provider !== 'openai') {
      onChange({ ...settings, provider: 'openai', model: rawModel })
      return
    }
    onChange({ ...settings, model: rawModel })
  }

  function handleKeyChange(rawKey: string) {
    const trimmed = rawKey.trim()
    if (trimmed.startsWith('AIza') && settings.provider !== 'gemini') {
      onChange({
        ...settings,
        provider: 'gemini',
        model: settings.model.startsWith('gemini') ? settings.model : defaultModels.gemini,
        apiKey: rawKey,
      })
      return
    }
    if (trimmed.startsWith('sk-ant-') && settings.provider !== 'anthropic') {
      onChange({
        ...settings,
        provider: 'anthropic',
        model: settings.model.startsWith('claude') ? settings.model : defaultModels.anthropic,
        apiKey: rawKey,
      })
      return
    }
    onChange({ ...settings, apiKey: rawKey })
  }

  const presets = modelPresets[settings.provider] || []
  const trimmedKey = settings.apiKey.trim()
  const hasNonAsciiKey = Boolean(trimmedKey) && !/^[\x21-\x7E\s]+$/.test(trimmedKey)

  return <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <Dialog.Portal>
      <Dialog.Overlay className="dialog-overlay" />
      <Dialog.Content className="dialog-content settings-dialog">
        <div className="dialog-topline"><div className="dialog-icon"><KeyRound size={21} /></div><Dialog.Close className="icon-button" aria-label="닫기"><X size={20} /></Dialog.Close></div>
        <Dialog.Title>AI 연결 설정</Dialog.Title>
        <Dialog.Description>사용할 AI 서비스를 선택하고 본인의 API 키를 입력해주세요.</Dialog.Description>

        <div className="settings-label">AI 제공자</div>
        <div className="provider-options">
          {(Object.keys(providerLabels) as Provider[]).map((provider) => <button key={provider} type="button" className={settings.provider === provider ? 'provider-option selected' : 'provider-option'} onClick={() => selectProvider(provider)}>
            <span>{providerLabels[provider]}</span>{settings.provider === provider && <Check size={16} />}
          </button>)}
        </div>

        <div className="settings-field">
          <span>모델</span>
          {presets.length > 0 && <div className="model-presets" role="group" aria-label="추천 모델 선택">
            {presets.map((preset) => <button
              key={preset.value}
              type="button"
              className={settings.model.trim() === preset.value ? 'model-preset selected' : 'model-preset'}
              onClick={() => onChange({ ...settings, model: preset.value })}
            >{preset.label}</button>)}
          </div>}
          <input aria-label="모델" value={settings.model} onChange={(event) => handleModelChange(event.target.value)} placeholder="모델 이름 (예: gemini-3.8-flash, gemini-3.6-flash)" />
        </div>
        <label className="settings-field">
          <span>API 키</span>
          <div className="key-input-wrap">
            <input type={showKey || hasNonAsciiKey ? 'text' : 'password'} value={settings.apiKey} onChange={(event) => handleKeyChange(event.target.value)} placeholder="영문·숫자로 된 API 키 입력 (예: AIzaSy...)" autoComplete="off" />
            <button type="button" className="icon-button" aria-label={showKey ? 'API 키 숨기기' : 'API 키 보기'} onClick={() => setShowKey((value) => !value)}>{showKey ? <EyeOff size={18} /> : <Eye size={18} />}</button>
          </div>
          {hasNonAsciiKey && <small style={{ color: '#c83a32', fontWeight: 600 }}>API 키 입력란에 한글이 입력되었습니다. 대화 내용이 아닌 영문·숫자 API 키(예: AIza...)를 붙여넣어 주세요.</small>}
        </label>

        <div className="settings-security"><ShieldCheck size={18} /><span>API 키는 새로고침 뒤에도 유지되도록 이 브라우저의 로컬 저장소에 저장됩니다. 암호화 저장은 아니므로 공유 기기에서는 사용 후 키를 지우고, 요청 시 선택한 AI 제공자에게 전송됩니다.</span></div>
        <button className="dialog-primary" type="button" disabled={hasNonAsciiKey} onClick={() => onOpenChange(false)}>설정 완료</button>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
}
