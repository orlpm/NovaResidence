import { createHash } from 'crypto'
import { execFileSync } from 'child_process'
import { expect } from '@playwright/test'

const DB_SERVER = '(localdb)\\mssqllocaldb'
const DB_NAME = 'NovaResidenceDb_Dev'

export function escapeSqlLiteral(value: string): string {
  return value.replace(/'/g, "''")
}

export function computeTokenHash(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex').toUpperCase()
}

export function runSql(query: string): string {
  const normalizedQuery = [
    'SET ANSI_NULLS ON',
    'SET ANSI_PADDING ON',
    'SET ANSI_WARNINGS ON',
    'SET ARITHABORT ON',
    'SET CONCAT_NULL_YIELDS_NULL ON',
    'SET QUOTED_IDENTIFIER ON',
    'SET NUMERIC_ROUNDABORT OFF',
    query.trim()
  ].join('; ')

  return execFileSync(
    'sqlcmd',
    ['-S', DB_SERVER, '-d', DB_NAME, '-E', '-W', '-h', '-1', '-Q', normalizedQuery, '-b'],
    { encoding: 'utf8' }
  ).trim()
}

export function getUserIdByEmail(email: string): string {
  return runSql(`SET NOCOUNT ON; SELECT TOP 1 CONVERT(varchar(36), [Id]) FROM [auth].[Users] WHERE [Email] = N'${escapeSqlLiteral(email)}';`)
}

export async function waitForUserIdByEmail(email: string): Promise<string> {
  await expect.poll(() => getUserIdByEmail(email), { timeout: 5000 }).not.toBe('')
  return getUserIdByEmail(email)
}

export async function confirmUserEmailByEmail(email: string): Promise<string> {
  const userId = await waitForUserIdByEmail(email)
  runSql(`SET NOCOUNT ON; UPDATE [auth].[Users] SET [IsEmailConfirmed] = 1, [EmailConfirmationTokenHash] = NULL, [EmailConfirmationTokenExpiresAt] = NULL, [UpdatedAt] = SYSUTCDATETIME() WHERE [Id] = '${userId}';`)
  return userId
}

export function getPasswordResetHash(userId: string): string {
  return runSql(`SET NOCOUNT ON; SELECT ISNULL(CONVERT(varchar(128), [PasswordResetTokenHash]), '') FROM [auth].[Users] WHERE [Id] = '${userId}';`)
}

export function seedEmailConfirmationToken(userId: string, token: string) {
  const hash = computeTokenHash(token)
  runSql(`SET NOCOUNT ON; UPDATE [auth].[Users] SET [EmailConfirmationTokenHash] = '${hash}', [EmailConfirmationTokenExpiresAt] = DATEADD(HOUR, 1, SYSUTCDATETIME()), [UpdatedAt] = SYSUTCDATETIME() WHERE [Id] = '${userId}';`)
}

export function seedPasswordResetToken(userId: string, token: string) {
  const hash = computeTokenHash(token)
  runSql(`SET NOCOUNT ON; UPDATE [auth].[Users] SET [PasswordResetTokenHash] = '${hash}', [PasswordResetTokenExpiresAt] = DATEADD(HOUR, 1, SYSUTCDATETIME()), [UpdatedAt] = SYSUTCDATETIME() WHERE [Id] = '${userId}';`)
}

export function expireResidentInvitation(token: string) {
  runSql(`SET NOCOUNT ON; UPDATE [condo].[Residents] SET [InvitationSentAt] = DATEADD(DAY, -8, SYSUTCDATETIME()), [UpdatedAt] = SYSUTCDATETIME() WHERE [InvitationToken] = N'${escapeSqlLiteral(token)}';`)
}