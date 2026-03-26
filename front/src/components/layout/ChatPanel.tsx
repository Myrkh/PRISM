import { createPortal } from 'react-dom'
import { PrismAiShell } from './prism-ai/PrismAiShell'

interface ChatPanelProps {
  onClose: () => void
}

export function ChatPanel({ onClose }: ChatPanelProps) {
  return createPortal(<PrismAiShell onClose={onClose} />, document.body)
}
