import { spawn } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

const workspaceRoot = process.cwd()
const testResultsDir = path.join(workspaceRoot, 'test-results')
const lastRunPath = path.join(testResultsDir, '.last-run.json')

function walkFiles(dirPath, matcher, results = []) {
  if (!existsSync(dirPath)) return results

  for (const entry of readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name)
    if (entry.isDirectory()) {
      walkFiles(fullPath, matcher, results)
      continue
    }

    if (matcher(fullPath)) results.push(fullPath)
  }

  return results
}

function truncate(text, maxLength = 1600) {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength)}\n... [truncated]`
}

function getLatestErrorContexts() {
  return walkFiles(testResultsDir, filePath => filePath.endsWith('error-context.md'))
    .map(filePath => ({ filePath, modifiedAt: statSync(filePath).mtimeMs }))
    .sort((left, right) => right.modifiedAt - left.modifiedAt)
    .slice(0, 3)
}

function getLastRun() {
  if (!existsSync(lastRunPath)) return null

  try {
    return JSON.parse(readFileSync(lastRunPath, 'utf8'))
  } catch {
    return null
  }
}

function detectIssues(output) {
  const heuristics = [
    {
      label: 'Backend/frontend no levantaron o endpoint incorrecto',
      pattern: /ECONNREFUSED|fetch failed|net::ERR_CONNECTION_REFUSED|waiting for .*localhost/i,
      advice: 'Valida que Playwright use http://localhost:3001 y http://localhost:5001, y que ambos procesos respondan antes de correr la spec.'
    },
    {
      label: 'Error interno de backend o esquema de base de datos',
      pattern: /status\)\)\.toBe\(201\)[\s\S]*Received: 500|Internal server error|SqlException|DbUpdateException|Invalid column name/i,
      advice: 'Revisa la excepción interna del API; suele ser migración faltante, DTO fuera de sync o una regla de dominio rompiendo persistencia.'
    },
    {
      label: 'Selector ambiguo o frágil',
      pattern: /strict mode violation|resolved to \d+ elements/i,
      advice: 'Aísla el selector al contenedor correcto o usa roles/textos más específicos para evitar coincidencias múltiples.'
    },
    {
      label: 'Sesión, navegación o espera asincrónica incompleta',
      pattern: /toBeVisible\(\) failed|waiting for getByText|waiting for locator|Timeout .* exceeded/i,
      advice: 'Confirma el rol autenticado antes de validar la pantalla y espera una señal determinística de UI o API antes de afirmar estado.'
    },
    {
      label: 'Asunción de negocio incorrecta en la prueba',
      pattern: /Expected: .*\n\s*Received:/i,
      advice: 'La app respondió, pero el estado real no coincide con la expectativa; compara el detalle API y la transición de negocio que la spec asume.'
    },
    {
      label: 'Import incompatible con runtime de Playwright',
      pattern: /exports is not defined in ES module scope|No tests found/i,
      advice: 'Evita importar módulos del frontend que dependan de Vite/Zustand dentro de specs Node puros; define enums/helpers localmente o usa un helper neutro.'
    }
  ]

  return heuristics.filter(item => item.pattern.test(output))
}

function printFailureAnalysis(output) {
  const lastRun = getLastRun()
  const issues = detectIssues(output)
  const contexts = getLatestErrorContexts()

  console.error('\n===== Failure Analysis =====')

  if (lastRun?.failedTests?.length) {
    console.error('Failed tests:')
    for (const testName of lastRun.failedTests) {
      console.error(`- ${testName}`)
    }
  }

  if (issues.length > 0) {
    console.error('\nLikely causes:')
    for (const issue of issues) {
      console.error(`- ${issue.label}`)
      console.error(`  ${issue.advice}`)
    }
  } else {
    console.error('\nLikely causes:')
    console.error('- No heuristic matched cleanly. Review the raw output and newest error-context artifact.')
  }

  if (contexts.length > 0) {
    console.error('\nNewest Playwright error contexts:')
    for (const context of contexts) {
      const content = readFileSync(context.filePath, 'utf8')
      console.error(`\n--- ${path.relative(workspaceRoot, context.filePath)} ---`)
      console.error(truncate(content))
    }
  }

  console.error('\n===== End Analysis =====\n')
}

const userArgs = process.argv.slice(2)
const hasReporterArg = userArgs.some(arg => arg === '--reporter' || arg.startsWith('--reporter='))
const playwrightArgs = ['playwright', 'test', ...userArgs]

if (!hasReporterArg) {
  playwrightArgs.push('--reporter=line')
}

const env = {
  ...process.env,
  PLAYWRIGHT_HTML_OPEN: 'never'
}

let combinedOutput = ''

const child = process.platform === 'win32'
  ? spawn(`npx ${playwrightArgs.join(' ')}`, {
      cwd: workspaceRoot,
      env,
      shell: true,
      stdio: ['inherit', 'pipe', 'pipe']
    })
  : spawn('npx', playwrightArgs, {
      cwd: workspaceRoot,
      env,
      stdio: ['inherit', 'pipe', 'pipe']
    })

child.stdout.on('data', chunk => {
  const text = chunk.toString()
  combinedOutput += text
  process.stdout.write(text)
})

child.stderr.on('data', chunk => {
  const text = chunk.toString()
  combinedOutput += text
  process.stderr.write(text)
})

child.on('close', code => {
  if ((code ?? 1) !== 0) {
    printFailureAnalysis(combinedOutput)
  }

  process.exit(code ?? 1)
})
