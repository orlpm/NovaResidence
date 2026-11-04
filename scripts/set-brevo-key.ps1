<#
.SYNOPSIS
  Carga la API key de Brevo en el Web App de Azure y activa el envío de correo.

.DESCRIPTION
  Pide la llave con entrada oculta, la valida contra la API de Brevo, revisa que el
  dominio del remitente esté autenticado y la guarda en las App Settings sin mostrarla.
  Requiere la CLI de Azure con sesión iniciada (az login).

.EXAMPLE
  ./scripts/set-brevo-key.ps1
  ./scripts/set-brevo-key.ps1 -TestRecipient contacto@domuscond.com
#>
param(
    [string]$ResourceGroup = 'NovaResidence-RG',
    [string]$AppName = 'novaresidence-api',
    [string]$FromEmail = 'contacto@domuscond.com',
    [string]$FromName = 'DomusCond',
    [string]$TestRecipient
)

$ErrorActionPreference = 'Stop'

$secure = Read-Host -Prompt 'Pega la API key de Brevo (no se mostrará)' -AsSecureString
$apiKey = [System.Net.NetworkCredential]::new('', $secure).Password.Trim()

if (-not $apiKey.StartsWith('xkeysib-')) {
    throw 'La llave debe ser una API key de Brevo (empieza con xkeysib-), no una llave SMTP.'
}

$headers = @{ 'api-key' = $apiKey; 'accept' = 'application/json' }

try {
    $account = Invoke-RestMethod -Uri 'https://api.brevo.com/v3/account' -Headers $headers
    Write-Host "Llave válida. Cuenta Brevo: $($account.email)" -ForegroundColor Green
} catch {
    throw "Brevo rechazó la llave: $($_.Exception.Message)"
}

$senderDomain = $FromEmail.Split('@')[1]
try {
    $domains = Invoke-RestMethod -Uri 'https://api.brevo.com/v3/senders/domains' -Headers $headers
    $domain = $domains.domains | Where-Object { $_.domain_name -eq $senderDomain }
    if (-not $domain) {
        Write-Warning "El dominio $senderDomain no aparece en Brevo. Los envíos desde $FromEmail van a fallar."
    } elseif (-not $domain.authenticated) {
        Write-Warning "El dominio $senderDomain existe en Brevo pero no está autenticado."
    } else {
        Write-Host "Dominio $senderDomain autenticado en Brevo." -ForegroundColor Green
    }
} catch {
    Write-Warning "No se pudo consultar los dominios de Brevo: $($_.Exception.Message)"
}

$settingsFile = [System.IO.Path]::GetTempFileName()
try {
    @(
        @{ name = 'Email__BrevoApiKey'; value = $apiKey; slotSetting = $false },
        @{ name = 'Email__FromEmail'; value = $FromEmail; slotSetting = $false },
        @{ name = 'Email__FromName'; value = $FromName; slotSetting = $false },
        @{ name = 'Email__DisableSending'; value = 'false'; slotSetting = $false }
    ) | ConvertTo-Json | Set-Content -Path $settingsFile -Encoding utf8

    az webapp config appsettings set --resource-group $ResourceGroup --name $AppName --settings "@$settingsFile" --output none
    if ($LASTEXITCODE -ne 0) { throw 'az no pudo guardar las App Settings.' }
    Write-Host "Llave guardada en $AppName y envío de correo activado. El sitio se reinicia solo." -ForegroundColor Green
} finally {
    Remove-Item -Path $settingsFile -Force -ErrorAction SilentlyContinue
}

if ($TestRecipient) {
    $body = @{
        sender = @{ email = $FromEmail; name = $FromName }
        to = @(@{ email = $TestRecipient })
        subject = 'Prueba de correo de DomusCond'
        htmlContent = '<p>Si recibes este mensaje, el envío de correo de DomusCond con Brevo funciona.</p>'
    } | ConvertTo-Json -Depth 4
    $result = Invoke-RestMethod -Uri 'https://api.brevo.com/v3/smtp/email' -Method Post -Headers $headers -ContentType 'application/json' -Body $body
    Write-Host "Correo de prueba enviado a $TestRecipient (messageId $($result.messageId))." -ForegroundColor Green
}

$apiKey = $null
$headers = $null
