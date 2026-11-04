import { readdirSync, readFileSync, existsSync } from 'fs'
import path from 'path'

export interface CapturedEmail {
  to: string
  subject: string
  body: string
  createdAt: string
}

const outboxDir = path.resolve(process.cwd(), 'src/Backend/NovaResidence.Api/data/email-outbox')

export async function waitForCapturedEmail(to: string, subjectIncludes: string, timeoutMs = 20000): Promise<CapturedEmail> {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    const match = latestMatch(to, subjectIncludes)
    if (match) return match
    await new Promise(resolve => setTimeout(resolve, 300))
  }

  throw new Error(`No se capturó el correo "${subjectIncludes}" para ${to}`)
}

export function emailLink(body: string): string {
  const match = body.match(/href="([^"]+)"/)
  if (!match) throw new Error('El correo no trae un enlace')
  return match[1].replace(/&amp;/g, '&')
}

function latestMatch(to: string, subjectIncludes: string): CapturedEmail | undefined {
  if (!existsSync(outboxDir)) return undefined

  const messages = readdirSync(outboxDir)
    .filter(file => file.endsWith('.json'))
    .map(file => JSON.parse(readFileSync(path.join(outboxDir, file), 'utf8')) as CapturedEmail)
    .filter(message => message.to === to && message.subject.includes(subjectIncludes))
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))

  return messages.at(-1)
}
