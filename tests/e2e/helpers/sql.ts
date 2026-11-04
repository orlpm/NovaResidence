import { createHash } from 'crypto'
import { readFileSync } from 'fs'
import os from 'os'
import path from 'path'
import { Client } from 'pg'

const secretsPath = path.join(
  os.homedir(),
  'AppData',
  'Roaming',
  'Microsoft',
  'UserSecrets',
  'novaresidence-api-secrets',
  'secrets.json'
)

let client: Client | undefined

export function isRemoteDatabase(): boolean {
  return process.env.E2E_TARGET === 'azure'
}

export function escapeSqlLiteral(value: string): string {
  return value.replace(/'/g, "''")
}

export function computeTokenHash(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex').toUpperCase()
}

function connectionString(): string {
  if (process.env.E2E_POSTGRES_URL) return process.env.E2E_POSTGRES_URL

  const secrets = JSON.parse(readFileSync(secretsPath, 'utf8').replace(/^\uFEFF/, '')) as Record<string, string>
  const value = secrets['ConnectionStrings:PostgresDirect']
    || secrets['ConnectionStrings:NeonDirect']
    || secrets['ConnectionStrings:Postgres']
    || secrets['ConnectionStrings:Neon']

  if (!value) throw new Error('No hay cadena de Postgres para las pruebas. Ejecuta scripts/set-neon-connection.ps1.')
  return value.replace(/sslmode=require/ig, 'sslmode=verify-full')
}

function expiryReadAsUtc(hoursAhead: number): Date {
  // Npgsql con EnableLegacyTimestampBehavior lee timestamptz como reloj local
  // y la API lo compara con DateTime.UtcNow. Se adelanta el instante para que
  // ese reloj local siga en el futuro.
  const offsetMs = new Date().getTimezoneOffset() * 60 * 1000
  return new Date(Date.now() + hoursAhead * 60 * 60 * 1000 + offsetMs)
}

async function getClient(): Promise<Client> {
  if (!client) {
    client = new Client({ connectionString: connectionString() })
    await client.connect()
  }

  return client
}

async function queryScalar(sql: string, params: unknown[] = []): Promise<string> {
  if (isRemoteDatabase()) {
    throw new Error('Las pruebas de base se corren en local contra Postgres, no contra App Service.')
  }

  const result = await getClient().then(db => db.query(sql, params))
  const value = result.rows[0] ? Object.values(result.rows[0])[0] : null
  return value == null ? '' : String(value)
}

async function execute(sql: string, params: unknown[] = []): Promise<void> {
  if (isRemoteDatabase()) {
    throw new Error('Las pruebas de base se corren en local contra Postgres, no contra App Service.')
  }

  await getClient().then(db => db.query(sql, params))
}

export function runSql(_query: string): string {
  throw new Error('runSql de SQL Server ya no aplica. Las pruebas locales usan Postgres.')
}

export async function getUserIdByEmail(email: string): Promise<string> {
  return queryScalar('SELECT "Id"::text FROM auth."Users" WHERE lower("Email") = lower($1) LIMIT 1', [email])
}

export async function waitForUserIdByEmail(email: string): Promise<string> {
  const deadline = Date.now() + 15000
  while (Date.now() <= deadline) {
    const userId = await getUserIdByEmail(email)
    if (userId) return userId
    await new Promise(resolve => setTimeout(resolve, 200))
  }

  throw new Error(`No se encontró el usuario ${email}`)
}

export async function confirmUserEmailByEmail(email: string): Promise<string> {
  const userId = await waitForUserIdByEmail(email)
  await execute(`
    UPDATE auth."Users"
    SET "IsEmailConfirmed" = true,
        "EmailConfirmationTokenHash" = NULL,
        "EmailConfirmationTokenExpiresAt" = NULL,
        "UpdatedAt" = $1
    WHERE "Id" = $2::uuid
  `, [new Date(), userId])
  return userId
}

export async function getPasswordResetHash(userId: string): Promise<string> {
  return queryScalar(
    'SELECT COALESCE("PasswordResetTokenHash", \'\') FROM auth."Users" WHERE "Id" = $1::uuid',
    [userId]
  )
}

export async function seedEmailConfirmationToken(userId: string, token: string): Promise<void> {
  await execute(`
    UPDATE auth."Users"
    SET "EmailConfirmationTokenHash" = $1,
        "EmailConfirmationTokenExpiresAt" = $2,
        "UpdatedAt" = $3
    WHERE "Id" = $4::uuid
  `, [computeTokenHash(token), expiryReadAsUtc(2), new Date(), userId])
}

export async function seedPasswordResetToken(userId: string, token: string): Promise<void> {
  await execute(`
    UPDATE auth."Users"
    SET "PasswordResetTokenHash" = $1,
        "PasswordResetTokenExpiresAt" = $2,
        "UpdatedAt" = $3
    WHERE "Id" = $4::uuid
  `, [computeTokenHash(token), expiryReadAsUtc(2), new Date(), userId])
}

export async function expireResidentInvitation(token: string): Promise<void> {
  const sentAt = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
  await execute(`
    UPDATE condo."Residents"
    SET "InvitationSentAt" = $1,
        "UpdatedAt" = $2
    WHERE "InvitationToken" = $3
  `, [sentAt, new Date(), token])
}

export async function ensureCondominiumRole(userId: string, condominiumId: string, role: number): Promise<void> {
  await execute(`
    INSERT INTO auth."UserCondominiumRoles" ("CondominiumId", "Role", "AssignedAt", "UserId")
    SELECT $1::uuid, $2, $3, $4::uuid
    WHERE NOT EXISTS (
      SELECT 1
      FROM auth."UserCondominiumRoles"
      WHERE "UserId" = $4::uuid
        AND "CondominiumId" = $1::uuid
        AND "Role" = $2
    )
  `, [condominiumId, role, new Date(), userId])
}
