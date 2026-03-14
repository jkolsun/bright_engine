// TEARDOWN: Stub file. Original contained urgency message templates.
// Kept as stub because post-client sequence handlers in worker/index.ts
// dynamically import from this file. Those handlers are inert (Settings keys
// don't exist) but removing this file breaks TypeScript compilation.

type MessageConfig = {
  text: string
  enabled: boolean
  delayHours?: number
}

type AutomatedMessages = Record<string, MessageConfig>

const EMPTY_CONFIG: MessageConfig = { text: '', enabled: false }

export async function getAutomatedMessages(): Promise<AutomatedMessages> {
  // TEARDOWN: Always returns empty proxy — automated_messages Settings key doesn't exist
  return new Proxy({} as AutomatedMessages, {
    get: () => EMPTY_CONFIG,
  })
}

export function fillTemplate(text: string, vars: Record<string, string>): string {
  let result = text
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value)
  }
  return result
}

export function getAutomatedMessage(key: string): MessageConfig {
  return EMPTY_CONFIG
}
