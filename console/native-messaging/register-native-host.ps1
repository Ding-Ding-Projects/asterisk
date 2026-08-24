param(
  [Parameter(Mandatory = $true)][string]$InstallRoot,
  [ValidateSet('chrome', 'edge', 'all')][string]$Browser = 'all'
)

$ErrorActionPreference = 'Stop'
$hostName = 'com.dingdingprojects.asterisk.downloads'
$manifestSource = Join-Path $InstallRoot 'resources\native-messaging\com.dingdingprojects.asterisk.downloads.json'
$manifestRoot = Join-Path $env:LOCALAPPDATA 'Ding-Ding-Projects\Asterisk\native-messaging'
$manifestPath = Join-Path $manifestRoot "$hostName.json"
if (-not (Test-Path -LiteralPath $manifestSource -PathType Leaf)) { throw "The packaged native-messaging manifest is missing: $manifestSource" }
New-Item -ItemType Directory -Force -Path $manifestRoot | Out-Null
$manifest = Get-Content -LiteralPath $manifestSource -Raw | ConvertFrom-Json
$manifest.path = Join-Path $InstallRoot 'resources\native-messaging\Ding-PBX-Console-NativeMessagingHost.exe'
$manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $manifestPath -Encoding UTF8
$browsers = if ($Browser -eq 'all') { @('chrome', 'edge') } else { @($Browser) }
$registered = @()
foreach ($browserName in $browsers) {
  $registryPath = if ($browserName -eq 'edge') { 'HKCU:\Software\Microsoft\Edge\NativeMessagingHosts' } else { 'HKCU:\Software\Google\Chrome\NativeMessagingHosts' }
  New-Item -ItemType Directory -Force -Path (Join-Path $registryPath $hostName) | Out-Null
  New-ItemProperty -LiteralPath (Join-Path $registryPath $hostName) -Name '(default)' -Value $manifestPath -PropertyType String -Force | Out-Null
  $registered += $browserName
}
@{ accepted = $true; hostName = $hostName; extensionId = $manifest.allowed_origins[0].Split('/')[2]; manifestPath = $manifestPath; browsers = $registered } | ConvertTo-Json -Compress
