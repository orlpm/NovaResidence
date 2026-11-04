<#
.SYNOPSIS
  Guarda la cadena de conexión de Neon sin mostrarla.

.DESCRIPTION
  Pide la cadena con entrada oculta, comprueba que sea de Neon y la guarda en
  Azure (ConnectionStrings__Neon) y en los user-secrets locales del API.
  La aplicación usa esa cadena cuando existe ConnectionStrings:Postgres o
  ConnectionStrings:Neon. No guarda la cadena en el repositorio.

  En el panel de Neon copia la cadena pooled (el host lleva -pooler). Esa es
  la que usa la aplicación. La directa, sin -pooler, queda aparte para migraciones.

.EXAMPLE
  ./scripts/set-neon-connection.ps1
#>
param(
    [string]$ResourceGroup = 'NovaResidence-RG',
    [string]$AppName = 'novaresidence-api',
    [string]$ApiProject = 'src/Backend/NovaResidence.Api/NovaResidence.Api.csproj'
)

$ErrorActionPreference = 'Stop'

function Read-HiddenValue([string]$Prompt) {
    $secure = Read-Host -Prompt $Prompt -AsSecureString
    return [System.Net.NetworkCredential]::new('', $secure).Password.Trim()
}

function Get-NeonConnectionInfo([string]$Value) {
    if ([string]::IsNullOrWhiteSpace($Value)) {
        return $null
    }

    $hostName = $null
    $database = $null

    if ($Value -match '^(?i)postgres(ql)?://') {
        $uri = [Uri]$Value
        $hostName = $uri.Host
        $database = $uri.AbsolutePath.Trim('/')
    } else {
        foreach ($part in $Value.Split(';')) {
            $pair = $part.Split('=', 2)
            if ($pair.Length -ne 2) { continue }
            switch ($pair[0].Trim().ToLowerInvariant()) {
                'host' { $hostName = $pair[1].Trim() }
                'server' { $hostName = $pair[1].Trim() }
                'database' { $database = $pair[1].Trim() }
            }
        }
    }

    if ([string]::IsNullOrWhiteSpace($hostName) -or $hostName -notmatch '\.neon\.tech$') {
        throw 'La cadena debe ser de Neon: un host que termine en .neon.tech.'
    }

    [pscustomobject]@{
        Host = $hostName
        Database = $database
        Pooled = $hostName -match '-pooler'
    }
}

$pooledValue = Read-HiddenValue 'Pega la cadena pooled de Neon (el host lleva -pooler; no se mostrará)'
$pooled = Get-NeonConnectionInfo $pooledValue
if (-not $pooled.Pooled) {
    throw 'Esa cadena es directa. En Neon elige la pooled, la que tiene -pooler en el host.'
}

$directValue = Read-HiddenValue 'Pega la cadena directa, sin -pooler (Enter si todavía no la tienes)'
$direct = Get-NeonConnectionInfo $directValue
if ($null -ne $direct -and $direct.Pooled) {
    throw 'La segunda cadena también es pooled. La directa no lleva -pooler.'
}

Write-Host "Cadena pooled aceptada. Host: $($pooled.Host). Base: $($pooled.Database)." -ForegroundColor Green
if ($null -ne $direct) {
    Write-Host "Cadena directa aceptada. Host: $($direct.Host)." -ForegroundColor Green
}

$settingsFile = [System.IO.Path]::GetTempFileName()
try {
    $settings = @(
        @{ name = 'ConnectionStrings__Neon'; value = $pooledValue; slotSetting = $false }
    )
    if ($null -ne $direct) {
        $settings += @{ name = 'ConnectionStrings__NeonDirect'; value = $directValue; slotSetting = $false }
    }

    $settings | ConvertTo-Json | Set-Content -Path $settingsFile -Encoding utf8
    az webapp config appsettings set --resource-group $ResourceGroup --name $AppName --settings "@$settingsFile" --output none
    if ($LASTEXITCODE -ne 0) { throw 'az no pudo guardar la cadena en Azure.' }
    Write-Host "Guardada en ${AppName} como ConnectionStrings__Neon. La app sigue en SQLite." -ForegroundColor Green
} finally {
    Remove-Item -Path $settingsFile -Force -ErrorAction SilentlyContinue
}

Push-Location (Resolve-Path (Join-Path $PSScriptRoot '..'))
try {
    dotnet user-secrets set 'ConnectionStrings:Neon' $pooledValue --project $ApiProject | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'dotnet user-secrets no pudo guardar la cadena pooled.' }
    if ($null -ne $direct) {
        dotnet user-secrets set 'ConnectionStrings:NeonDirect' $directValue --project $ApiProject | Out-Null
        if ($LASTEXITCODE -ne 0) { throw 'dotnet user-secrets no pudo guardar la cadena directa.' }
    }
    Write-Host 'Guardada también en user-secrets locales del API.' -ForegroundColor Green
} finally {
    Pop-Location
}

$pooledValue = $null
$directValue = $null
