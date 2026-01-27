#!/usr/bin/env pwsh
<#
.SYNOPSIS
Download and install azd on the local machine.

.DESCRIPTION
Downloads and installs azd on the local machine. Includes ability to configure
download and install locations.

.PARAMETER BaseUrl
Specifies the base URL to use when downloading. Default is
https://azuresdkartifacts.z5.web.core.windows.net/azd/standalone/release

.PARAMETER Version
Specifies the version to use. Default is `latest`. Valid values include a
SemVer version number (e.g. 1.0.0 or 1.1.0-beta.1), `latest`, `daily`

.PARAMETER DryRun
Print the download URL and quit. Does not download or install.

.PARAMETER InstallFolder
Location to install azd.

.PARAMETER SymlinkFolder
(Mac/Linux only) Folder to symlink 

.PARAMETER DownloadTimeoutSeconds
Download timeout in seconds. Default is 120 (2 minutes).

.PARAMETER SkipVerify
Skips verification of the downloaded file.

.PARAMETER InstallShScriptUrl
(Mac/Linux only) URL to the install-azd.sh script. Default is https://aka.ms/install-azd.sh

.EXAMPLE
powershell -ex AllSigned -c "Invoke-RestMethod 'https://aka.ms/install-azd.ps1' | Invoke-Expression"

Install the azd CLI from a Windows shell

The use of `-ex AllSigned` is intended to handle the scenario where a machine's
default execution policy is restricted such that modules used by
`install-azd.ps1` cannot be loaded. Because this syntax is piping output from
`Invoke-RestMethod` to `Invoke-Expression` there is no direct valication of the
`install-azd.ps1` script's signature. Validation of the script can be
accomplished by downloading the script to a file and executing the script file.

.EXAMPLE
Invoke-RestMethod 'https://aka.ms/install-azd.ps1' -OutFile 'install-azd.ps1'
PS > ./install-azd.ps1

Download the installer and execute from PowerShell

.EXAMPLE
Invoke-RestMethod 'https://aka.ms/install-azd.ps1' -OutFile 'install-azd.ps1'
PS > ./install-azd.ps1 -Version daily

Download the installer and install the "daily" build
#>

param(
    [string] $BaseUrl = "https://azuresdkartifacts.z5.web.core.windows.net/azd/standalone/release",
    [string] $Version = "stable",
    [switch] $DryRun,
    [string] $InstallFolder,
    [string] $SymlinkFolder,
    [switch] $SkipVerify,
    [int] $DownloadTimeoutSeconds = 120,
    [switch] $NoTelemetry,
    [string] $InstallShScriptUrl = "https://aka.ms/install-azd.sh"
)

function isLinuxOrMac {
    return $IsLinux -or $IsMacOS
}

# Does some very basic parsing of /etc/os-release to output the value present in
# the file. Since only lines that start with '#' are to be treated as comments
# according to `man os-release` there is no additional parsing of comments
# Options like:
# bash -c "set -o allexport; source /etc/os-release;set +o allexport; echo $VERSION_ID"
# were considered but it's possible that bash is not installed on the system and
# these commands would not be available.
function getOsReleaseValue($key) {
    $value = $null
    foreach ($line in Get-Content '/etc/os-release') {
        if ($line -like "$key=*") {
            # 'ID="value" -> @('ID', '"value"')
            $splitLine = $line.Split('=', 2)

            # Remove surrounding whitespaces and quotes
            # ` "value" ` -> `value`
            # `'value'` -> `value`
            $value = $splitLine[1].Trim().Trim(@("`"", "'"))
        }
    }
    return $value
}

function getOs {
    $os = [Environment]::OSVersion.Platform.ToString()
    try {
        if (isLinuxOrMac) {
            if ($IsLinux) {
                $os = getOsReleaseValue 'ID'
            } elseif ($IsMacOs) {
                $os = sw_vers -productName
            }
        }
    } catch {
        Write-Error "Error getting OS name $_"
        $os = "error"
    }
    return $os
}

function getOsVersion {
    $version = [Environment]::OSVersion.Version.ToString()
    try {
        if (isLinuxOrMac) {
            if ($IsLinux) {
                $version = getOsReleaseValue 'VERSION_ID'
            } elseif ($IsMacOS) {
                $version = sw_vers -productVersion
            }
        }
    } catch {
        Write-Error "Error getting OS version $_"
        $version = "error"
    }
    return $version
}

function isWsl {
    $isWsl = $false
    if ($IsLinux) {
        $kernelRelease = uname --kernel-release
        if ($kernelRelease -like '*wsl*') {
            $isWsl = $true
        }
    }
    return $isWsl
}

function getTerminal {
    return (Get-Process -Id $PID).ProcessName
}

function getExecutionEnvironment {
    $executionEnvironment = 'Desktop'
    if ($env:GITHUB_ACTIONS) {
        $executionEnvironment = 'GitHub Actions'
    } elseif ($env:SYSTEM_TEAMPROJECTID) {
        $executionEnvironment = 'Azure DevOps'
    }
    return $executionEnvironment
}

function promptForTelemetry {
    # UserInteractive may return $false if the session is not interactive
    # but this does not work in 100% of cases. For example, running:
    # "powershell -NonInteractive -c '[Environment]::UserInteractive'"
    # results in output of "True" even though the shell is not interactive.
    if (![Environment]::UserInteractive) {
        return $false
    }

    Write-Host "Answering 'yes' below will send data to Microsoft. To learn more about data collection see:"
    Write-Host "https://go.microsoft.com/fwlink/?LinkId=521839"
    Write-Host ""
    Write-Host "You can also file an issue at https://github.com/Azure/azure-dev/issues/new?assignees=&labels=&template=issue_report.md&title=%5BIssue%5D"

    try {
        $yes = New-Object System.Management.Automation.Host.ChoiceDescription `
            "&Yes", `
            "Sends failure report to Microsoft"
        $no = New-Object System.Management.Automation.Host.ChoiceDescription `
            "&No", `
            "Exits the script without sending a failure report to Microsoft (Default)"
        $options = [System.Management.Automation.Host.ChoiceDescription[]]($yes, $no)
        $decision = $Host.UI.PromptForChoice( `
            'Confirm issue report', `
            'Do you want to send diagnostic data about the failure to Microsoft?', `
            $options, `
            1 `                     # Default is 'No'
        )

        # Return $true if user consents
        return $decision -eq 0
    } catch {
        # Failure to prompt generally indicates that the environment is not
        # interactive and the default resposne can be assumed.
        return $false
    }
}

function reportTelemetryIfEnabled($eventName, $reason='', $additionalProperties = @{}) {
    if ($NoTelemetry -or $env:AZURE_DEV_COLLECT_TELEMETRY -eq 'no') {
        Write-Verbose "Telemetry disabled. No telemetry reported." -Verbose:$Verbose
        return
    }

    $IKEY = 'a9e6fa10-a9ac-4525-8388-22d39336ecc2'

    $telemetryObject = @{
        iKey = $IKEY;
        name = "Microsoft.ApplicationInsights.$($IKEY.Replace('-', '')).Event";
        time = (Get-Date).ToUniversalTime().ToString('o');
        data = @{
            baseType = 'EventData';
            baseData = @{
                ver = 2;
                name = $eventName;
                properties = @{
                    installVersion = $Version;
                    reason = $reason;
                    os = getOs;
                    osVersion = getOsVersion;
                    isWsl = isWsl;
                    terminal = getTerminal;
                    executionEnvironment = getExecutionEnvironment;
                };
            }
        }
    }

    # Add entries from $additionalProperties. These may overwrite existing
    # entries in the properties field.
    if ($additionalProperties -and $additionalProperties.Count) {
        foreach ($entry in $additionalProperties.GetEnumerator()) {
            $telemetryObject.data.baseData.properties[$entry.Name] = $entry.Value
        }
    }

    Write-Host "An error was encountered during install: $reason"
    Write-Host "Error data collected:"
    $telemetryDataTable = $telemetryObject.data.baseData.properties | Format-Table | Out-String
    Write-Host $telemetryDataTable
    if (!(promptForTelemetry)) {
        # The user responded 'no' to the telemetry prompt or is in a
        # non-interactive session. Do not send telemetry.
        return
    }

    try {
        Invoke-RestMethod `
            -Uri 'https://centralus-2.in.applicationinsights.azure.com/v2/track' `
            -ContentType 'application/json' `
            -Method Post `
            -Body (ConvertTo-Json -InputObject $telemetryObject -Depth 100 -Compress) | Out-Null
        Write-Verbose -Verbose:$Verbose "Telemetry posted"
    } catch {
        Write-Host $_
        Write-Verbose -Verbose:$Verbose "Telemetry post failed"
    }
}

if (isLinuxOrMac) {
    if (!(Get-Command curl)) { 
        Write-Error "Command could not be found: curl."
        exit 1
    }
    if (!(Get-Command bash)) { 
        Write-Error "Command could not be found: bash."
        exit 1
    }

    $params = @(
        '--base-url', "'$BaseUrl'", 
        '--version', "'$Version'"
    )

    if ($InstallFolder) {
        $params += '--install-folder', "'$InstallFolder'"
    }

    if ($SymlinkFolder) {
        $params += '--symlink-folder', "'$SymlinkFolder'"
    }

    if ($SkipVerify) { 
        $params += '--skip-verify'
    }

    if ($DryRun) {
        $params += '--dry-run'
    }

    if ($NoTelemetry) {
        $params += '--no-telemetry'
    }

    if ($VerbosePreference -eq 'Continue') {
        $params += '--verbose'
    }

    $bashParameters = $params -join ' '
    Write-Verbose "Running: curl -fsSL $InstallShScriptUrl | bash -s -- $bashParameters" -Verbose:$Verbose
    bash -c "curl -fsSL $InstallShScriptUrl | bash -s -- $bashParameters"
    exit $LASTEXITCODE
}

try {
    $packageFilename = "azd-windows-amd64.msi"

    $downloadUrl = "$BaseUrl/$packageFilename"
    if ($Version) {
        $downloadUrl = "$BaseUrl/$Version/$packageFilename"
    }

    if ($DryRun) {
        Write-Host $downloadUrl
        exit 0
    }

    $tempFolder = "$([System.IO.Path]::GetTempPath())$([System.IO.Path]::GetRandomFileName())"
    Write-Verbose "Creating temporary folder for downloading package: $tempFolder"
    New-Item -ItemType Directory -Path $tempFolder | Out-Null

    Write-Verbose "Downloading build from $downloadUrl" -Verbose:$Verbose
    $releaseArtifactFilename = Join-Path $tempFolder $packageFilename
    try {
        $global:LASTEXITCODE = 0
        Invoke-WebRequest -Uri $downloadUrl -OutFile $releaseArtifactFilename -TimeoutSec $DownloadTimeoutSeconds
        if ($LASTEXITCODE) {
            throw "Invoke-WebRequest failed with nonzero exit code: $LASTEXITCODE"
        }
    } catch {
        Write-Error -ErrorRecord $_
        reportTelemetryIfEnabled 'InstallFailed' 'DownloadFailed' @{ downloadUrl = $downloadUrl }
        exit 1
    }
   

    try {
        if (!$SkipVerify) {
            try {
                Write-Verbose "Verifying signature of $releaseArtifactFilename" -Verbose:$Verbose
                $signature = Get-AuthenticodeSignature $releaseArtifactFilename
                if ($signature.Status -ne 'Valid') {
                    Write-Error "Signature of $releaseArtifactFilename is not valid"
                    reportTelemetryIfEnabled 'InstallFailed' 'SignatureVerificationFailed'
                    exit 1
                }
            } catch {
                Write-Error -ErrorRecord $_
                reportTelemetryIfEnabled 'InstallFailed' 'SignatureVerificationFailed'
                exit 1
            }
        }

        Write-Verbose "Installing MSI" -Verbose:$Verbose
        $MSIEXEC = "${env:SystemRoot}\System32\msiexec.exe"
        $installProcess = Start-Process $MSIEXEC `
            -ArgumentList @("/i", "`"$releaseArtifactFilename`"", "/qn", "INSTALLDIR=`"$InstallFolder`"", "INSTALLEDBY=`"install-azd.ps1`"") `
            -PassThru `
            -Wait

        if ($installProcess.ExitCode) {
            if ($installProcess.ExitCode -eq 1603) {
                Write-Host "A later version of Azure Developer CLI may already be installed. Use 'Add or remove programs' to uninstall that version and try again."
            }

            Write-Error "Could not install MSI at $releaseArtifactFilename. msiexec.exe returned exit code: $($installProcess.ExitCode)"

            reportTelemetryIfEnabled 'InstallFailed' 'MsiFailure' @{ msiExitCode = $installProcess.ExitCode }
            exit 1
        }
    } catch {
        Write-Error -ErrorRecord $_
        reportTelemetryIfEnabled 'InstallFailed' 'GeneralInstallFailure'
        exit 1
    }

    Write-Verbose "Cleaning temporary install directory: $tempFolder" -Verbose:$Verbose
    Remove-Item $tempFolder -Recurse -Force | Out-Null

    if (!(isLinuxOrMac)) {
        # Installed on Windows
        Write-Host "Successfully installed azd"
        Write-Host "Azure Developer CLI (azd) installed successfully. You may need to restart running programs for installation to take effect."
        Write-Host "- For Windows Terminal, start a new Windows Terminal instance."
        Write-Host "- For VSCode, close all instances of VSCode and then restart it."
    }
    Write-Host ""
    Write-Host "The Azure Developer CLI collects usage data and sends that usage data to Microsoft in order to help us improve your experience."
    Write-Host "You can opt-out of telemetry by setting the AZURE_DEV_COLLECT_TELEMETRY environment variable to 'no' in the shell you use."
    Write-Host ""
    Write-Host "Read more about Azure Developer CLI telemetry: https://github.com/Azure/azure-dev#data-collection"

    exit 0
} catch {
    Write-Error -ErrorRecord $_
    reportTelemetryIfEnabled 'InstallFailed' 'UnhandledError' @{ exceptionName = $_.Exception.GetType().Name; }
    exit 1
}
# SIG # Begin signature block
# MIIoKgYJKoZIhvcNAQcCoIIoGzCCKBcCAQExDzANBglghkgBZQMEAgEFADB5Bgor
# BgEEAYI3AgEEoGswaTA0BgorBgEEAYI3AgEeMCYCAwEAAAQQH8w7YFlLCE63JNLG
# KX7zUQIBAAIBAAIBAAIBAAIBADAxMA0GCWCGSAFlAwQCAQUABCAutMpvjwitgD44
# E4w0c9iW/e2w2w1pD89LokaHWMUJwqCCDXYwggX0MIID3KADAgECAhMzAAAEhV6Z
# 7A5ZL83XAAAAAASFMA0GCSqGSIb3DQEBCwUAMH4xCzAJBgNVBAYTAlVTMRMwEQYD
# VQQIEwpXYXNoaW5ndG9uMRAwDgYDVQQHEwdSZWRtb25kMR4wHAYDVQQKExVNaWNy
# b3NvZnQgQ29ycG9yYXRpb24xKDAmBgNVBAMTH01pY3Jvc29mdCBDb2RlIFNpZ25p
# bmcgUENBIDIwMTEwHhcNMjUwNjE5MTgyMTM3WhcNMjYwNjE3MTgyMTM3WjB0MQsw
# CQYDVQQGEwJVUzETMBEGA1UECBMKV2FzaGluZ3RvbjEQMA4GA1UEBxMHUmVkbW9u
# ZDEeMBwGA1UEChMVTWljcm9zb2Z0IENvcnBvcmF0aW9uMR4wHAYDVQQDExVNaWNy
# b3NvZnQgQ29ycG9yYXRpb24wggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIB
# AQDASkh1cpvuUqfbqxele7LCSHEamVNBfFE4uY1FkGsAdUF/vnjpE1dnAD9vMOqy
# 5ZO49ILhP4jiP/P2Pn9ao+5TDtKmcQ+pZdzbG7t43yRXJC3nXvTGQroodPi9USQi
# 9rI+0gwuXRKBII7L+k3kMkKLmFrsWUjzgXVCLYa6ZH7BCALAcJWZTwWPoiT4HpqQ
# hJcYLB7pfetAVCeBEVZD8itKQ6QA5/LQR+9X6dlSj4Vxta4JnpxvgSrkjXCz+tlJ
# 67ABZ551lw23RWU1uyfgCfEFhBfiyPR2WSjskPl9ap6qrf8fNQ1sGYun2p4JdXxe
# UAKf1hVa/3TQXjvPTiRXCnJPAgMBAAGjggFzMIIBbzAfBgNVHSUEGDAWBgorBgEE
# AYI3TAgBBggrBgEFBQcDAzAdBgNVHQ4EFgQUuCZyGiCuLYE0aU7j5TFqY05kko0w
# RQYDVR0RBD4wPKQ6MDgxHjAcBgNVBAsTFU1pY3Jvc29mdCBDb3Jwb3JhdGlvbjEW
# MBQGA1UEBRMNMjMwMDEyKzUwNTM1OTAfBgNVHSMEGDAWgBRIbmTlUAXTgqoXNzci
# tW2oynUClTBUBgNVHR8ETTBLMEmgR6BFhkNodHRwOi8vd3d3Lm1pY3Jvc29mdC5j
# b20vcGtpb3BzL2NybC9NaWNDb2RTaWdQQ0EyMDExXzIwMTEtMDctMDguY3JsMGEG
# CCsGAQUFBwEBBFUwUzBRBggrBgEFBQcwAoZFaHR0cDovL3d3dy5taWNyb3NvZnQu
# Y29tL3BraW9wcy9jZXJ0cy9NaWNDb2RTaWdQQ0EyMDExXzIwMTEtMDctMDguY3J0
# MAwGA1UdEwEB/wQCMAAwDQYJKoZIhvcNAQELBQADggIBACjmqAp2Ci4sTHZci+qk
# tEAKsFk5HNVGKyWR2rFGXsd7cggZ04H5U4SV0fAL6fOE9dLvt4I7HBHLhpGdE5Uj
# Ly4NxLTG2bDAkeAVmxmd2uKWVGKym1aarDxXfv3GCN4mRX+Pn4c+py3S/6Kkt5eS
# DAIIsrzKw3Kh2SW1hCwXX/k1v4b+NH1Fjl+i/xPJspXCFuZB4aC5FLT5fgbRKqns
# WeAdn8DsrYQhT3QXLt6Nv3/dMzv7G/Cdpbdcoul8FYl+t3dmXM+SIClC3l2ae0wO
# lNrQ42yQEycuPU5OoqLT85jsZ7+4CaScfFINlO7l7Y7r/xauqHbSPQ1r3oIC+e71
# 5s2G3ClZa3y99aYx2lnXYe1srcrIx8NAXTViiypXVn9ZGmEkfNcfDiqGQwkml5z9
# nm3pWiBZ69adaBBbAFEjyJG4y0a76bel/4sDCVvaZzLM3TFbxVO9BQrjZRtbJZbk
# C3XArpLqZSfx53SuYdddxPX8pvcqFuEu8wcUeD05t9xNbJ4TtdAECJlEi0vvBxlm
# M5tzFXy2qZeqPMXHSQYqPgZ9jvScZ6NwznFD0+33kbzyhOSz/WuGbAu4cHZG8gKn
# lQVT4uA2Diex9DMs2WHiokNknYlLoUeWXW1QrJLpqO82TLyKTbBM/oZHAdIc0kzo
# STro9b3+vjn2809D0+SOOCVZMIIHejCCBWKgAwIBAgIKYQ6Q0gAAAAAAAzANBgkq
# hkiG9w0BAQsFADCBiDELMAkGA1UEBhMCVVMxEzARBgNVBAgTCldhc2hpbmd0b24x
# EDAOBgNVBAcTB1JlZG1vbmQxHjAcBgNVBAoTFU1pY3Jvc29mdCBDb3Jwb3JhdGlv
# bjEyMDAGA1UEAxMpTWljcm9zb2Z0IFJvb3QgQ2VydGlmaWNhdGUgQXV0aG9yaXR5
# IDIwMTEwHhcNMTEwNzA4MjA1OTA5WhcNMjYwNzA4MjEwOTA5WjB+MQswCQYDVQQG
# EwJVUzETMBEGA1UECBMKV2FzaGluZ3RvbjEQMA4GA1UEBxMHUmVkbW9uZDEeMBwG
# A1UEChMVTWljcm9zb2Z0IENvcnBvcmF0aW9uMSgwJgYDVQQDEx9NaWNyb3NvZnQg
# Q29kZSBTaWduaW5nIFBDQSAyMDExMIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIIC
# CgKCAgEAq/D6chAcLq3YbqqCEE00uvK2WCGfQhsqa+laUKq4BjgaBEm6f8MMHt03
# a8YS2AvwOMKZBrDIOdUBFDFC04kNeWSHfpRgJGyvnkmc6Whe0t+bU7IKLMOv2akr
# rnoJr9eWWcpgGgXpZnboMlImEi/nqwhQz7NEt13YxC4Ddato88tt8zpcoRb0Rrrg
# OGSsbmQ1eKagYw8t00CT+OPeBw3VXHmlSSnnDb6gE3e+lD3v++MrWhAfTVYoonpy
# 4BI6t0le2O3tQ5GD2Xuye4Yb2T6xjF3oiU+EGvKhL1nkkDstrjNYxbc+/jLTswM9
# sbKvkjh+0p2ALPVOVpEhNSXDOW5kf1O6nA+tGSOEy/S6A4aN91/w0FK/jJSHvMAh
# dCVfGCi2zCcoOCWYOUo2z3yxkq4cI6epZuxhH2rhKEmdX4jiJV3TIUs+UsS1Vz8k
# A/DRelsv1SPjcF0PUUZ3s/gA4bysAoJf28AVs70b1FVL5zmhD+kjSbwYuER8ReTB
# w3J64HLnJN+/RpnF78IcV9uDjexNSTCnq47f7Fufr/zdsGbiwZeBe+3W7UvnSSmn
# Eyimp31ngOaKYnhfsi+E11ecXL93KCjx7W3DKI8sj0A3T8HhhUSJxAlMxdSlQy90
# lfdu+HggWCwTXWCVmj5PM4TasIgX3p5O9JawvEagbJjS4NaIjAsCAwEAAaOCAe0w
# ggHpMBAGCSsGAQQBgjcVAQQDAgEAMB0GA1UdDgQWBBRIbmTlUAXTgqoXNzcitW2o
# ynUClTAZBgkrBgEEAYI3FAIEDB4KAFMAdQBiAEMAQTALBgNVHQ8EBAMCAYYwDwYD
# VR0TAQH/BAUwAwEB/zAfBgNVHSMEGDAWgBRyLToCMZBDuRQFTuHqp8cx0SOJNDBa
# BgNVHR8EUzBRME+gTaBLhklodHRwOi8vY3JsLm1pY3Jvc29mdC5jb20vcGtpL2Ny
# bC9wcm9kdWN0cy9NaWNSb29DZXJBdXQyMDExXzIwMTFfMDNfMjIuY3JsMF4GCCsG
# AQUFBwEBBFIwUDBOBggrBgEFBQcwAoZCaHR0cDovL3d3dy5taWNyb3NvZnQuY29t
# L3BraS9jZXJ0cy9NaWNSb29DZXJBdXQyMDExXzIwMTFfMDNfMjIuY3J0MIGfBgNV
# HSAEgZcwgZQwgZEGCSsGAQQBgjcuAzCBgzA/BggrBgEFBQcCARYzaHR0cDovL3d3
# dy5taWNyb3NvZnQuY29tL3BraW9wcy9kb2NzL3ByaW1hcnljcHMuaHRtMEAGCCsG
# AQUFBwICMDQeMiAdAEwAZQBnAGEAbABfAHAAbwBsAGkAYwB5AF8AcwB0AGEAdABl
# AG0AZQBuAHQALiAdMA0GCSqGSIb3DQEBCwUAA4ICAQBn8oalmOBUeRou09h0ZyKb
# C5YR4WOSmUKWfdJ5DJDBZV8uLD74w3LRbYP+vj/oCso7v0epo/Np22O/IjWll11l
# hJB9i0ZQVdgMknzSGksc8zxCi1LQsP1r4z4HLimb5j0bpdS1HXeUOeLpZMlEPXh6
# I/MTfaaQdION9MsmAkYqwooQu6SpBQyb7Wj6aC6VoCo/KmtYSWMfCWluWpiW5IP0
# wI/zRive/DvQvTXvbiWu5a8n7dDd8w6vmSiXmE0OPQvyCInWH8MyGOLwxS3OW560
# STkKxgrCxq2u5bLZ2xWIUUVYODJxJxp/sfQn+N4sOiBpmLJZiWhub6e3dMNABQam
# ASooPoI/E01mC8CzTfXhj38cbxV9Rad25UAqZaPDXVJihsMdYzaXht/a8/jyFqGa
# J+HNpZfQ7l1jQeNbB5yHPgZ3BtEGsXUfFL5hYbXw3MYbBL7fQccOKO7eZS/sl/ah
# XJbYANahRr1Z85elCUtIEJmAH9AAKcWxm6U/RXceNcbSoqKfenoi+kiVH6v7RyOA
# 9Z74v2u3S5fi63V4GuzqN5l5GEv/1rMjaHXmr/r8i+sLgOppO6/8MO0ETI7f33Vt
# Y5E90Z1WTk+/gFcioXgRMiF670EKsT/7qMykXcGhiJtXcVZOSEXAQsmbdlsKgEhr
# /Xmfwb1tbWrJUnMTDXpQzTGCGgowghoGAgEBMIGVMH4xCzAJBgNVBAYTAlVTMRMw
# EQYDVQQIEwpXYXNoaW5ndG9uMRAwDgYDVQQHEwdSZWRtb25kMR4wHAYDVQQKExVN
# aWNyb3NvZnQgQ29ycG9yYXRpb24xKDAmBgNVBAMTH01pY3Jvc29mdCBDb2RlIFNp
# Z25pbmcgUENBIDIwMTECEzMAAASFXpnsDlkvzdcAAAAABIUwDQYJYIZIAWUDBAIB
# BQCgga4wGQYJKoZIhvcNAQkDMQwGCisGAQQBgjcCAQQwHAYKKwYBBAGCNwIBCzEO
# MAwGCisGAQQBgjcCARUwLwYJKoZIhvcNAQkEMSIEICwOWJggeUVjb/JkwUiJ+q6G
# ODLHl06vGaZsBDoUAcjxMEIGCisGAQQBgjcCAQwxNDAyoBSAEgBNAGkAYwByAG8A
# cwBvAGYAdKEagBhodHRwOi8vd3d3Lm1pY3Jvc29mdC5jb20wDQYJKoZIhvcNAQEB
# BQAEggEAmiHsqVj3OEfP+aWpTPu2FlJkWHpCg14o+b6Twvym9JaRDwhxbR7vwuDP
# jr2Kg84SUagwHSCGkkWIQXfISiuqyErT2URniqLFZrzo0YS22zdHmKvWbQW/drf+
# 0iZ1UjI4YR2GchMHVbef9ifNM00w80MSVD77IrOqrmYVzJZRi1/nlTTTdySAVMQB
# 8vuc0S8fTSZR4ySMShCGCexlzt+dASyi9LsnniOhB5UKHGGy5yeBjOX+Y7qO3JGY
# bBUrpff0mURTgfXOdfVnLcSP4nMp2X1UPtAlqyk8LqQoEOP/uuZ+WJtO4iKY+1oL
# owvnuIgc/SWpa47VRyXF4zBsYq9056GCF5QwgheQBgorBgEEAYI3AwMBMYIXgDCC
# F3wGCSqGSIb3DQEHAqCCF20wghdpAgEDMQ8wDQYJYIZIAWUDBAIBBQAwggFSBgsq
# hkiG9w0BCRABBKCCAUEEggE9MIIBOQIBAQYKKwYBBAGEWQoDATAxMA0GCWCGSAFl
# AwQCAQUABCBMw+Z3JuQPlmxrVQMBvcrTpghgcm2aCI0flo6vhPxfBQIGaWj08LiJ
# GBMyMDI2MDEyMzIwMzAzMi41NjRaMASAAgH0oIHRpIHOMIHLMQswCQYDVQQGEwJV
# UzETMBEGA1UECBMKV2FzaGluZ3RvbjEQMA4GA1UEBxMHUmVkbW9uZDEeMBwGA1UE
# ChMVTWljcm9zb2Z0IENvcnBvcmF0aW9uMSUwIwYDVQQLExxNaWNyb3NvZnQgQW1l
# cmljYSBPcGVyYXRpb25zMScwJQYDVQQLEx5uU2hpZWxkIFRTUyBFU046REMwMC0w
# NUUwLUQ5NDcxJTAjBgNVBAMTHE1pY3Jvc29mdCBUaW1lLVN0YW1wIFNlcnZpY2Wg
# ghHqMIIHIDCCBQigAwIBAgITMwAAAgO7HlwAOGx0ygABAAACAzANBgkqhkiG9w0B
# AQsFADB8MQswCQYDVQQGEwJVUzETMBEGA1UECBMKV2FzaGluZ3RvbjEQMA4GA1UE
# BxMHUmVkbW9uZDEeMBwGA1UEChMVTWljcm9zb2Z0IENvcnBvcmF0aW9uMSYwJAYD
# VQQDEx1NaWNyb3NvZnQgVGltZS1TdGFtcCBQQ0EgMjAxMDAeFw0yNTAxMzAxOTQy
# NDZaFw0yNjA0MjIxOTQyNDZaMIHLMQswCQYDVQQGEwJVUzETMBEGA1UECBMKV2Fz
# aGluZ3RvbjEQMA4GA1UEBxMHUmVkbW9uZDEeMBwGA1UEChMVTWljcm9zb2Z0IENv
# cnBvcmF0aW9uMSUwIwYDVQQLExxNaWNyb3NvZnQgQW1lcmljYSBPcGVyYXRpb25z
# MScwJQYDVQQLEx5uU2hpZWxkIFRTUyBFU046REMwMC0wNUUwLUQ5NDcxJTAjBgNV
# BAMTHE1pY3Jvc29mdCBUaW1lLVN0YW1wIFNlcnZpY2UwggIiMA0GCSqGSIb3DQEB
# AQUAA4ICDwAwggIKAoICAQChl0MH5wAnOx8Uh8RtidF0J0yaFDHJYHTpPvRR16X1
# KxGDYfT8PrcGjCLCiaOu3K1DmUIU4Rc5olndjappNuOgzwUoj43VbbJx5PFTY/a1
# Z80tpqVP0OoKJlUkfDPSBLFgXWj6VgayRCINtLsUasy0w5gysD7ILPZuiQjace5K
# xASjKf2MVX1qfEzYBbTGNEijSQCKwwyc0eavr4Fo3X/+sCuuAtkTWissU64k8rK6
# 0jsGRApiESdfuHr0yWAmc7jTOPNeGAx6KCL2ktpnGegLDd1IlE6Bu6BSwAIFHr7z
# OwIlFqyQuCe0SQALCbJhsT9y9iy61RJAXsU0u0TC5YYmTSbEI7g10dYx8Uj+vh9I
# nLoKYC5DpKb311bYVd0bytbzlfTRslRTJgotnfCAIGMLqEqk9/2VRGu9klJi1j9n
# VfqyYHYrMPOBXcrQYW0jmKNjOL47CaEArNzhDBia1wXdJANKqMvJ8pQe2m8/ciby
# DM+1BVZquNAov9N4tJF4ACtjX0jjXNDUMtSZoVFQH+FkWdfPWx1uBIkc97R+xRLu
# PjUypHZ5A3AALSke4TaRBvbvTBYyW2HenOT7nYLKTO4jw5Qq6cw3Z9zTKSPQ6D5l
# yiYpes5RR2MdMvJS4fCcPJFeaVOvuWFSQ/EGtVBShhmLB+5ewzFzdpf1UuJmuOQT
# TwIDAQABo4IBSTCCAUUwHQYDVR0OBBYEFLIpWUB+EeeQ29sWe0VdzxWQGJJ9MB8G
# A1UdIwQYMBaAFJ+nFV0AXmJdg/Tl0mWnG1M1GelyMF8GA1UdHwRYMFYwVKBSoFCG
# Tmh0dHA6Ly93d3cubWljcm9zb2Z0LmNvbS9wa2lvcHMvY3JsL01pY3Jvc29mdCUy
# MFRpbWUtU3RhbXAlMjBQQ0ElMjAyMDEwKDEpLmNybDBsBggrBgEFBQcBAQRgMF4w
# XAYIKwYBBQUHMAKGUGh0dHA6Ly93d3cubWljcm9zb2Z0LmNvbS9wa2lvcHMvY2Vy
# dHMvTWljcm9zb2Z0JTIwVGltZS1TdGFtcCUyMFBDQSUyMDIwMTAoMSkuY3J0MAwG
# A1UdEwEB/wQCMAAwFgYDVR0lAQH/BAwwCgYIKwYBBQUHAwgwDgYDVR0PAQH/BAQD
# AgeAMA0GCSqGSIb3DQEBCwUAA4ICAQCQEMbesD6TC08R0oYCdSC452AQrGf/O89G
# Q54CtgEsbxzwGDVUcmjXFcnaJSTNedBKVXkBgawRonP1LgxH4bzzVj2eWNmzGIwO
# 1FlhldAPOHAzLBEHRoSZ4pddFtaQxoabU/N1vWyICiN60It85gnF5JD4MMXyd6pS
# 8eADIi6TtjfgKPoumWa0BFQ/aEzjUrfPN1r7crK+qkmLztw/ENS7zemfyx4kGRgw
# Y1WBfFqm/nFlJDPQBicqeU3dOp9hj7WqD0Rc+/4VZ6wQjesIyCkv5uhUNy2LhNDi
# 2leYtAiIFpmjfNk4GngLvC2Tj9IrOMv20Srym5J/Fh7yWAiPeGs3yA3QapjZTtfr
# 7NfzpBIJQ4xT/ic4WGWqhGlRlVBI5u6Ojw3ZxSZCLg3vRC4KYypkh8FdIWoKirji
# dEGlXsNOo+UP/YG5KhebiudTBxGecfJCuuUspIdRhStHAQsjv/dAqWBLlhorq2OC
# aP+wFhE3WPgnnx5pflvlujocPgsN24++ddHrl3O1FFabW8m0UkDHSKCh8QTwTkYO
# wu99iExBVWlbYZRz2qOIBjL/ozEhtCB0auKhfTLLeuNGBUaBz+oZZ+X9UAECoMhk
# ETjb6YfNaI1T7vVAaiuhBoV/JCOQT+RYZrgykyPpzpmwMNFBD1vdW/29q9nkTWoE
# hcEOO0L9NzCCB3EwggVZoAMCAQICEzMAAAAVxedrngKbSZkAAAAAABUwDQYJKoZI
# hvcNAQELBQAwgYgxCzAJBgNVBAYTAlVTMRMwEQYDVQQIEwpXYXNoaW5ndG9uMRAw
# DgYDVQQHEwdSZWRtb25kMR4wHAYDVQQKExVNaWNyb3NvZnQgQ29ycG9yYXRpb24x
# MjAwBgNVBAMTKU1pY3Jvc29mdCBSb290IENlcnRpZmljYXRlIEF1dGhvcml0eSAy
# MDEwMB4XDTIxMDkzMDE4MjIyNVoXDTMwMDkzMDE4MzIyNVowfDELMAkGA1UEBhMC
# VVMxEzARBgNVBAgTCldhc2hpbmd0b24xEDAOBgNVBAcTB1JlZG1vbmQxHjAcBgNV
# BAoTFU1pY3Jvc29mdCBDb3Jwb3JhdGlvbjEmMCQGA1UEAxMdTWljcm9zb2Z0IFRp
# bWUtU3RhbXAgUENBIDIwMTAwggIiMA0GCSqGSIb3DQEBAQUAA4ICDwAwggIKAoIC
# AQDk4aZM57RyIQt5osvXJHm9DtWC0/3unAcH0qlsTnXIyjVX9gF/bErg4r25Phdg
# M/9cT8dm95VTcVrifkpa/rg2Z4VGIwy1jRPPdzLAEBjoYH1qUoNEt6aORmsHFPPF
# dvWGUNzBRMhxXFExN6AKOG6N7dcP2CZTfDlhAnrEqv1yaa8dq6z2Nr41JmTamDu6
# GnszrYBbfowQHJ1S/rboYiXcag/PXfT+jlPP1uyFVk3v3byNpOORj7I5LFGc6XBp
# Dco2LXCOMcg1KL3jtIckw+DJj361VI/c+gVVmG1oO5pGve2krnopN6zL64NF50Zu
# yjLVwIYwXE8s4mKyzbnijYjklqwBSru+cakXW2dg3viSkR4dPf0gz3N9QZpGdc3E
# XzTdEonW/aUgfX782Z5F37ZyL9t9X4C626p+Nuw2TPYrbqgSUei/BQOj0XOmTTd0
# lBw0gg/wEPK3Rxjtp+iZfD9M269ewvPV2HM9Q07BMzlMjgK8QmguEOqEUUbi0b1q
# GFphAXPKZ6Je1yh2AuIzGHLXpyDwwvoSCtdjbwzJNmSLW6CmgyFdXzB0kZSU2LlQ
# +QuJYfM2BjUYhEfb3BvR/bLUHMVr9lxSUV0S2yW6r1AFemzFER1y7435UsSFF5PA
# PBXbGjfHCBUYP3irRbb1Hode2o+eFnJpxq57t7c+auIurQIDAQABo4IB3TCCAdkw
# EgYJKwYBBAGCNxUBBAUCAwEAATAjBgkrBgEEAYI3FQIEFgQUKqdS/mTEmr6CkTxG
# NSnPEP8vBO4wHQYDVR0OBBYEFJ+nFV0AXmJdg/Tl0mWnG1M1GelyMFwGA1UdIARV
# MFMwUQYMKwYBBAGCN0yDfQEBMEEwPwYIKwYBBQUHAgEWM2h0dHA6Ly93d3cubWlj
# cm9zb2Z0LmNvbS9wa2lvcHMvRG9jcy9SZXBvc2l0b3J5Lmh0bTATBgNVHSUEDDAK
# BggrBgEFBQcDCDAZBgkrBgEEAYI3FAIEDB4KAFMAdQBiAEMAQTALBgNVHQ8EBAMC
# AYYwDwYDVR0TAQH/BAUwAwEB/zAfBgNVHSMEGDAWgBTV9lbLj+iiXGJo0T2UkFvX
# zpoYxDBWBgNVHR8ETzBNMEugSaBHhkVodHRwOi8vY3JsLm1pY3Jvc29mdC5jb20v
# cGtpL2NybC9wcm9kdWN0cy9NaWNSb29DZXJBdXRfMjAxMC0wNi0yMy5jcmwwWgYI
# KwYBBQUHAQEETjBMMEoGCCsGAQUFBzAChj5odHRwOi8vd3d3Lm1pY3Jvc29mdC5j
# b20vcGtpL2NlcnRzL01pY1Jvb0NlckF1dF8yMDEwLTA2LTIzLmNydDANBgkqhkiG
# 9w0BAQsFAAOCAgEAnVV9/Cqt4SwfZwExJFvhnnJL/Klv6lwUtj5OR2R4sQaTlz0x
# M7U518JxNj/aZGx80HU5bbsPMeTCj/ts0aGUGCLu6WZnOlNN3Zi6th542DYunKmC
# VgADsAW+iehp4LoJ7nvfam++Kctu2D9IdQHZGN5tggz1bSNU5HhTdSRXud2f8449
# xvNo32X2pFaq95W2KFUn0CS9QKC/GbYSEhFdPSfgQJY4rPf5KYnDvBewVIVCs/wM
# nosZiefwC2qBwoEZQhlSdYo2wh3DYXMuLGt7bj8sCXgU6ZGyqVvfSaN0DLzskYDS
# PeZKPmY7T7uG+jIa2Zb0j/aRAfbOxnT99kxybxCrdTDFNLB62FD+CljdQDzHVG2d
# Y3RILLFORy3BFARxv2T5JL5zbcqOCb2zAVdJVGTZc9d/HltEAY5aGZFrDZ+kKNxn
# GSgkujhLmm77IVRrakURR6nxt67I6IleT53S0Ex2tVdUCbFpAUR+fKFhbHP+Crvs
# QWY9af3LwUFJfn6Tvsv4O+S3Fb+0zj6lMVGEvL8CwYKiexcdFYmNcP7ntdAoGokL
# jzbaukz5m/8K6TT4JDVnK+ANuOaMmdbhIurwJ0I9JZTmdHRbatGePu1+oDEzfbzL
# 6Xu/OHBE0ZDxyKs6ijoIYn/ZcGNTTY3ugm2lBRDBcQZqELQdVTNYs6FwZvKhggNN
# MIICNQIBATCB+aGB0aSBzjCByzELMAkGA1UEBhMCVVMxEzARBgNVBAgTCldhc2hp
# bmd0b24xEDAOBgNVBAcTB1JlZG1vbmQxHjAcBgNVBAoTFU1pY3Jvc29mdCBDb3Jw
# b3JhdGlvbjElMCMGA1UECxMcTWljcm9zb2Z0IEFtZXJpY2EgT3BlcmF0aW9uczEn
# MCUGA1UECxMeblNoaWVsZCBUU1MgRVNOOkRDMDAtMDVFMC1EOTQ3MSUwIwYDVQQD
# ExxNaWNyb3NvZnQgVGltZS1TdGFtcCBTZXJ2aWNloiMKAQEwBwYFKw4DAhoDFQDN
# rxRX/iz6ss1lBCXG8P1LFxD0e6CBgzCBgKR+MHwxCzAJBgNVBAYTAlVTMRMwEQYD
# VQQIEwpXYXNoaW5ndG9uMRAwDgYDVQQHEwdSZWRtb25kMR4wHAYDVQQKExVNaWNy
# b3NvZnQgQ29ycG9yYXRpb24xJjAkBgNVBAMTHU1pY3Jvc29mdCBUaW1lLVN0YW1w
# IFBDQSAyMDEwMA0GCSqGSIb3DQEBCwUAAgUA7R39zjAiGA8yMDI2MDEyMzE0MDE1
# MFoYDzIwMjYwMTI0MTQwMTUwWjB0MDoGCisGAQQBhFkKBAExLDAqMAoCBQDtHf3O
# AgEAMAcCAQACAgcXMAcCAQACAhLCMAoCBQDtH09OAgEAMDYGCisGAQQBhFkKBAIx
# KDAmMAwGCisGAQQBhFkKAwKgCjAIAgEAAgMHoSChCjAIAgEAAgMBhqAwDQYJKoZI
# hvcNAQELBQADggEBAF6XJwgC+l6r0MR1Am7CTM7WoCAnyN8cvNNzeL9smrPXTwWQ
# UsbnABK0lUU+etDbpGwlvQ/1ZVa33FKL5nqlA3WCh5WJvVrAAGAoZSmr2u9q8jjk
# ExYyObNKPdB7JYwEU6E8L3zdYb75sqKzZ3RLydYH9bJ1PUxb283eTXBmvf84maLK
# r7auUmGIYuu/a98X3I5ZnOSD6PIW+kcLYOk6UbFMoYAEJTJvlSncsKDzq7SjeOXR
# Zkdr/SdrDDsSMz8PVEnV7psL25Qp78//RXN+3AZYYwhfbkyVYUSqR146OLMQgWoG
# gBs2esjOhf/NoVqrJVFGkFpfzEcSODl8fLL7NmoxggQNMIIECQIBATCBkzB8MQsw
# CQYDVQQGEwJVUzETMBEGA1UECBMKV2FzaGluZ3RvbjEQMA4GA1UEBxMHUmVkbW9u
# ZDEeMBwGA1UEChMVTWljcm9zb2Z0IENvcnBvcmF0aW9uMSYwJAYDVQQDEx1NaWNy
# b3NvZnQgVGltZS1TdGFtcCBQQ0EgMjAxMAITMwAAAgO7HlwAOGx0ygABAAACAzAN
# BglghkgBZQMEAgEFAKCCAUowGgYJKoZIhvcNAQkDMQ0GCyqGSIb3DQEJEAEEMC8G
# CSqGSIb3DQEJBDEiBCDR5fYG+tYh2bUQtmlQ0BO6Ixn72aEYYWxxoEkeuqrCOTCB
# +gYLKoZIhvcNAQkQAi8xgeowgecwgeQwgb0EIEsD3RtxlvaTxFOZZnpQw0DksPmV
# duo5SyK9h9w++hMtMIGYMIGApH4wfDELMAkGA1UEBhMCVVMxEzARBgNVBAgTCldh
# c2hpbmd0b24xEDAOBgNVBAcTB1JlZG1vbmQxHjAcBgNVBAoTFU1pY3Jvc29mdCBD
# b3Jwb3JhdGlvbjEmMCQGA1UEAxMdTWljcm9zb2Z0IFRpbWUtU3RhbXAgUENBIDIw
# MTACEzMAAAIDux5cADhsdMoAAQAAAgMwIgQgbLkI34ZMZK1T1koL/SZZKOZD9HFz
# xMnrqI29e2lr4j8wDQYJKoZIhvcNAQELBQAEggIAgvFB8JOd4ouuG2VHP+8927KB
# V2pkHqfyjAzcmp+YHqOg3s/4qJJ4qY2sutTsWW3jOyoAd3m/FNDNMlAmXDs5ZJ4w
# 7Ywafy98kgtxhhmmEhC5Cq15ALT/oneACRh0pw+ytno0MYvu3yF+3QlQj9JaUHnK
# VEK7nK25B3a6rCmzmCx48y4YdEqGy4GeuraRPKBMaQc5r5xi7fpn+SYT+7krXgUA
# 7abAGEEVCT0gwLvAAfL0sYtDuU2EttOvRisxtK6WyS2kbOHld2v61OoX3HvbVsv7
# x3V/ZStG7ccrTGo/kZnXWTe1FMuVXGg7YklcggUTCh4e0TaMS0m/tu7I5rnZ44qI
# YBUdK/VgOfL4/fi2xt/JwBP0I+WjL04HUc/TNwdtkOVgQM/uk4eGaTTzWCwJW1RZ
# 6b1P+GIVRuDSjq927BZXEIhusEpOb6exwN3mDB9/LKKDjLsCDcfEw2fHkKVW+kW+
# NeHnLlH4lRRoWgOhSgujrk8InVCEOqF+j6lwJoekLgY57aou9Y6ntfk7ucqwVDOn
# vgp3DFZPN6GDhygoWLHFBiNQOqLr2VzBR1aEDNqE1I3qsXKC1cNa0LgsUc64FOO0
# 224iFq3kw/9xCUBC5h08d87XHZ511oEf/8HKYPniKlFg9jo+p021z2zHt+V+yVmZ
# vKPO3m6BShxI2yMvxaA=
# SIG # End signature block
