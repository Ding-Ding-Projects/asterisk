param(
  [Parameter(Mandatory = $true)][string]$InstallRoot,
  [string]$Browser = 'chrome'
)

$ErrorActionPreference = 'Stop'
$hostName = 'com.dingdingprojects.asterisk.downloads'
$manifestSource = Join-Path $InstallRoot 'resources\native-messaging\com.dingdingprojects.asterisk.downloads.json'
$manifestRoot = Join-Path $env:LOCALAPPDATA 'Ding-Ding-Projects\Asterisk\native-messaging'
$manifestPath = Join-Path $manifestRoot "$hostName.json"
if (-not (Test-Path -LiteralPath $manifestSource -PathType Leaf)) { throw "The packaged native-messaging manifest is missing: $manifestSource" }
New-Item -ItemType Directory -Force -Path $manifestRoot | Out-Null
$manifest = Get-Content -LiteralPath $manifestSource -Raw | ConvertFrom-Json
$manifest.path = Join-Path $InstallRoot 'resources\native-messaging\Ding-PBX-Console-NativeMessagingHost.cmd'
$manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $manifestPath -Encoding UTF8
$registryPath = if ($Browser -eq 'edge') { 'HKCU:\Software\Microsoft\Edge\NativeMessagingHosts' } else { 'HKCU:\Software\Google\Chrome\NativeMessagingHosts' }
New-Item -ItemType Directory -Force -Path (Join-Path $registryPath $hostName) | Out-Null
New-ItemProperty -LiteralPath (Join-Path $registryPath $hostName) -Name '(default)' -Value $manifestPath -PropertyType String -Force | Out-Null
Write-Output "Registered the submission-only native download host for $Browser at $manifestPath"
