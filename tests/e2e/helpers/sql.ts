import { createHash } from 'crypto'
import { execFileSync } from 'child_process'
import { writeFileSync } from 'fs'
import { DatabaseSync } from 'node:sqlite'
import os from 'os'
import path from 'path'

const localDbPath = process.env.E2E_SQLITE_PATH
  ?? path.resolve(process.cwd(), 'src/Backend/NovaResidence.Api/data/novaresidence.dev.db')

const kuduCommandUrl = 'https://novaresidence-api.scm.azurewebsites.net/api/command'
const kuduScriptUrl = 'https://novaresidence-api.scm.azurewebsites.net/api/vfs/data/e2e-sql.py'
const remoteScriptPath = 'D:\\home\\data\\e2e-sql.py'
const azPython = process.env.AZ_PYTHON || 'C:\\Program Files\\Microsoft SDKs\\Azure\\CLI2\\python.exe'
const curlCommand = process.env.CURL_EXE || 'C:\\Windows\\System32\\curl.exe'

let localDb: DatabaseSync | undefined
let remoteScriptReady = false
let cachedAzureToken = ''
let azureTokenExpiresAt = 0

export function isRemoteDatabase(): boolean {
  return process.env.E2E_TARGET === 'azure'
}

export function escapeSqlLiteral(value: string): string {
  return value.replace(/'/g, "''")
}

export function computeTokenHash(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex').toUpperCase()
}

function sqliteUtc(date = new Date()): string {
  const pad = (value: number, width = 2) => String(value).padStart(width, '0')
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}.${pad(date.getUTCMilliseconds(), 3)}0000`
}

function getLocalDb(): DatabaseSync {
  if (!localDb) {
    localDb = new DatabaseSync(localDbPath, { timeout: 10000 })
    localDb.exec('PRAGMA busy_timeout = 10000')
  }

  return localDb
}

function azureToken(): string {
  if (cachedAzureToken && Date.now() < azureTokenExpiresAt) return cachedAzureToken

  const raw = execFileSync(azPython, [
    '-IBm', 'azure.cli',
    'account', 'get-access-token',
    '--resource', 'https://management.azure.com/',
    '-o', 'json'
  ], { encoding: 'utf8' })
  const parsed = JSON.parse(raw) as { accessToken?: string; expiresOn?: string }
  if (!parsed.accessToken) throw new Error('No se pudo obtener el token de Azure para consultar SQLite')

  cachedAzureToken = parsed.accessToken
  const expiresAt = parsed.expiresOn ? Date.parse(parsed.expiresOn) : Date.now() + 20 * 60 * 1000
  azureTokenExpiresAt = Number.isNaN(expiresAt) ? Date.now() + 20 * 60 * 1000 : expiresAt - 60_000
  return cachedAzureToken
}

function ensureRemoteScript() {
  if (remoteScriptReady) return

  const scriptPath = path.resolve(process.cwd(), 'tests/e2e/helpers/e2e-remote-sql.py')
  execFileSync(curlCommand, [
    '-sS', '-f', '-X', 'PUT',
    '-H', `Authorization: Bearer ${azureToken()}`,
    '-H', 'If-Match: *',
    '--data-binary', `@${scriptPath}`,
    kuduScriptUrl
  ], { encoding: 'utf8' })
  remoteScriptReady = true
}

function remoteExecute(sql: string, params: Array<string | number | null>): string {
  ensureRemoteScript()
  const payload = Buffer.from(JSON.stringify({ sql, params }), 'utf8').toString('base64')
  const bodyPath = path.join(os.tmpdir(), `novaresidence-kudu-${process.pid}.json`)
  writeFileSync(bodyPath, JSON.stringify({
    command: `C:\\Python27\\python.exe ${remoteScriptPath} ${payload}`,
    dir: 'D:\\home'
  }))

  const raw = execFileSync(curlCommand, [
    '-sS', '-X', 'POST',
    '-H', `Authorization: Bearer ${azureToken()}`,
    '-H', 'Content-Type: application/json',
    '--data-binary', `@${bodyPath}`,
    kuduCommandUrl
  ], { encoding: 'utf8' })

  const parsed = JSON.parse(raw) as { ExitCode?: number; Error?: string; Output?: string }
  if (parsed.ExitCode !== 0) {
    throw new Error(parsed.Error || parsed.Output || 'No se pudo consultar SQLite en Azure')
  }

  return String(parsed.Output ?? '').replace(/\r/g, '').trim()
}

function queryScalar(sql: string, params: Array<string | number | null> = []): string {
  if (isRemoteDatabase()) return remoteExecute(sql, params)

  const row = getLocalDb().prepare(sql).get(...params) as Record<string, unknown> | undefined
  if (!row) return ''
  const value = Object.values(row)[0]
  return value == null ? '' : String(value)
}

function execute(sql: string, params: Array<string | number | null> = []) {
  if (isRemoteDatabase()) {
    remoteExecute(sql, params)
    return
  }

  getLocalDb().prepare(sql).run(...params)
}

export function runSql(_query: string): string {
  throw new Error('runSql de SQL Server ya no aplica. Usa las funciones de tests/e2e/helpers/sql.ts sobre SQLite.')
}

export function getUserIdByEmail(email: string): string {
  return queryScalar('SELECT Id FROM Users WHERE UPPER(Email) = UPPER(?) LIMIT 1', [email])
}

export async function waitForUserIdByEmail(email: string): Promise<string> {
  const timeoutMs = isRemoteDatabase() ? 60000 : 8000
  const intervalMs = isRemoteDatabase() ? 3000 : 200
  const deadline = Date.now() + timeoutMs

  while (Date.now() <= deadline) {
    const userId = getUserIdByEmail(email)
    if (userId) return userId
    await new Promise(resolve => setTimeout(resolve, intervalMs))
  }

  throw new Error(`No se encontró el usuario ${email}`)
}

export async function confirmUserEmailByEmail(email: string): Promise<string> {
  const userId = await waitForUserIdByEmail(email)
  execute(`
    UPDATE Users
    SET IsEmailConfirmed = 1,
        EmailConfirmationTokenHash = NULL,
        EmailConfirmationTokenExpiresAt = NULL,
        UpdatedAt = ?
    WHERE UPPER(Id) = UPPER(?)
  `, [sqliteUtc(), userId])
  return userId
}

export function getPasswordResetHash(userId: string): string {
  return queryScalar(`SELECT IFNULL(PasswordResetTokenHash, '') FROM Users WHERE UPPER(Id) = UPPER(?)`, [userId])
}

export function seedEmailConfirmationToken(userId: string, token: string) {
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000)
  execute(`
    UPDATE Users
    SET EmailConfirmationTokenHash = ?,
        EmailConfirmationTokenExpiresAt = ?,
        UpdatedAt = ?
    WHERE UPPER(Id) = UPPER(?)
  `, [computeTokenHash(token), sqliteUtc(expiresAt), sqliteUtc(), userId])
}

export function seedPasswordResetToken(userId: string, token: string) {
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000)
  execute(`
    UPDATE Users
    SET PasswordResetTokenHash = ?,
        PasswordResetTokenExpiresAt = ?,
        UpdatedAt = ?
    WHERE UPPER(Id) = UPPER(?)
  `, [computeTokenHash(token), sqliteUtc(expiresAt), sqliteUtc(), userId])
}

export function expireResidentInvitation(token: string) {
  const sentAt = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
  execute(`
    UPDATE Residents
    SET InvitationSentAt = ?,
        UpdatedAt = ?
    WHERE InvitationToken = ?
  `, [sqliteUtc(sentAt), sqliteUtc(), token])
}

export function ensureCondominiumRole(userId: string, condominiumId: string, role: number) {
  const canonicalUserId = queryScalar('SELECT Id FROM Users WHERE UPPER(Id) = UPPER(?)', [userId]) || userId
  const canonicalCondominiumId = queryScalar('SELECT Id FROM Condominiums WHERE UPPER(Id) = UPPER(?)', [condominiumId]) || condominiumId
  execute(`
    INSERT INTO UserCondominiumRoles (CondominiumId, Role, AssignedAt, UserId)
    SELECT ?, ?, ?, ?
    WHERE NOT EXISTS (
      SELECT 1
      FROM UserCondominiumRoles
      WHERE UPPER(UserId) = UPPER(?)
        AND UPPER(CondominiumId) = UPPER(?)
        AND Role = ?
    )
  `, [canonicalCondominiumId, role, sqliteUtc(), canonicalUserId, canonicalUserId, canonicalCondominiumId, role])
}
