import * as Dialog from '@radix-ui/react-dialog'
import { Play, X } from 'lucide-react'
import { demoScenarios, type DemoScenario } from '../demoScenarios'

export default function DemoScenarioDialog({ open, onOpenChange, onSelect }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (scenario: DemoScenario) => void
}) {
  return <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <Dialog.Portal>
      <Dialog.Overlay className="dialog-overlay" />
      <Dialog.Content className="dialog-content demo-dialog">
        <div className="dialog-topline"><div className="dialog-icon"><Play size={20} /></div><Dialog.Close className="icon-button" aria-label="닫기"><X size={20} /></Dialog.Close></div>
        <Dialog.Title>가상 사례로 빠르게 체험</Dialog.Title>
        <Dialog.Description>사례를 고르면 새 대화의 입력창에 문장이 채워집니다. 전송 전에 내용을 고칠 수 있어요.</Dialog.Description>
        <div className="demo-dialog-list">
          {demoScenarios.map((scenario) => <button key={scenario.id} type="button" onClick={() => onSelect(scenario)}>
            <strong>{scenario.label}</strong>
            <span>{scenario.mode === 'respondent' ? '고소장 수령 대응' : '고소장 작성'}</span>
          </button>)}
        </div>
        <p className="demo-dialog-note">인물과 사건은 모두 가상입니다. 전송할 때는 설정한 AI API 키가 사용됩니다.</p>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
}
