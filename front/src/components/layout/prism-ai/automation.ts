import type { UserCommandStep } from '@/core/commands/userCommandsSchema'

export type PrismAiAutomationStep = Extract<
  UserCommandStep,
  { kind: 'chat.newConversation' | 'chat.insert' | 'chat.focus' }
>

interface PrismAiAutomationController {
  executeStep: (step: PrismAiAutomationStep) => void
}

let activeController: PrismAiAutomationController | null = null
let queuedSteps: PrismAiAutomationStep[] = []

export function registerPrismAiAutomationController(controller: PrismAiAutomationController): void {
  activeController = controller
  if (queuedSteps.length === 0) return
  const pending = [...queuedSteps]
  queuedSteps = []
  for (const step of pending) {
    queueMicrotask(() => controller.executeStep(step))
  }
}

export function unregisterPrismAiAutomationController(controller: PrismAiAutomationController): void {
  if (activeController === controller) {
    activeController = null
  }
}

export function dispatchPrismAiAutomationSteps(steps: PrismAiAutomationStep[]): void {
  if (steps.length === 0) return
  if (!activeController) {
    queuedSteps.push(...steps)
    return
  }
  for (const step of steps) {
    activeController.executeStep(step)
  }
}
