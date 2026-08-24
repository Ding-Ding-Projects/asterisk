param(
  [Parameter(Mandatory = $true)][string]$InstallRoot,
  [ValidateSet('chrome', 'edge', 'all')][string]$Browser = 'all'
)

$ErrorActionPreference = 'Stop'
$hostName = 'com.dingdingprojects.asterisk.downloads'
$manifestSource = Join-Path $InstallRoot 'resources\native-messaging\com.dingdingprojects.asterisk.downloads.json'
$hostPath = Join-Path $InstallRoot 'resources\native-messaging\Ding-PBX-Console-NativeMessagingHost.exe'
$digestPath = Join-Path $InstallRoot 'resources\native-messaging\Ding-PBX-Console-NativeMessagingHost.exe.sha256'
$manifestRoot = Join-Path $env:LOCALAPPDATA 'Ding-Ding-Projects\Asterisk\native-messaging'
$manifestPath = Join-Path $manifestRoot "$hostName.json"
$configPath = Join-Path $manifestRoot 'ingress-config.json'
function Write-AtomicUtf8([string]$Path, [string]$Text) {
  $temporary = "$Path.$([guid]::NewGuid().ToString('N')).tmp"
  [IO.File]::WriteAllText($temporary, $Text, [Text.UTF8Encoding]::new($false))
  Move-Item -LiteralPath $temporary -Destination $Path -Force
}
if (-not (Test-Path -LiteralPath $manifestSource -PathType Leaf)) { throw "The packaged native-messaging manifest is missing: $manifestSource" }
if (-not (Test-Path -LiteralPath $hostPath -PathType Leaf)) { throw "The packaged native host executable is missing: $hostPath" }
if ((Get-Item -LiteralPath $hostPath).PSIsContainer) { throw "The native host path is not a regular file: $hostPath" }
if (-not (Test-Path -LiteralPath $digestPath -PathType Leaf)) { throw "The packaged native host digest is missing: $digestPath" }
$expectedDigest = ((Get-Content -LiteralPath $digestPath -Raw).Trim() -split '\s+')[0].ToLowerInvariant()
$actualDigest = (Get-FileHash -LiteralPath $hostPath -Algorithm SHA256).Hash.ToLowerInvariant()
if ($expectedDigest -notmatch '^[0-9a-f]{64}$' -or $expectedDigest -ne $actualDigest) { throw "The packaged native host digest did not match the recorded digest." }
New-Item -ItemType Directory -Force -Path $manifestRoot | Out-Null
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$challengeBytes = New-Object byte[] 32
$rng.GetBytes($challengeBytes)
$rng.Dispose()
$challenge = ([BitConverter]::ToString($challengeBytes) -replace '-', '').ToLowerInvariant()
$pipeBytes = New-Object byte[] 16
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($pipeBytes)
$rng.Dispose()
$pipeSuffix = ([BitConverter]::ToString($pipeBytes) -replace '-', '').ToLowerInvariant()
$pipeName = "\\.\pipe\ding-pbx-download-$pipeSuffix"
$config = @{ schemaVersion = 1; pipeName = $pipeName; challenge = $challenge; extensionId = 'dnpkplcgjmipnndmghkhljjoefjhidab'; executablePath = $hostPath; executableSha256 = $actualDigest }
Write-AtomicUtf8 $configPath ($config | ConvertTo-Json -Compress)
$acl = Get-Acl -LiteralPath $manifestRoot
$acl.SetAccessRuleProtection($true, $false)
$identity = [System.Security.Principal.WindowsIdentity]::GetCurrent().User
$rule = New-Object System.Security.AccessControl.FileSystemAccessRule($identity, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow')
$acl.SetAccessRule($rule)
Set-Acl -LiteralPath $manifestRoot -AclObject $acl
$manifest = Get-Content -LiteralPath $manifestSource -Raw | ConvertFrom-Json
$manifest.path = Join-Path $InstallRoot 'resources\native-messaging\Ding-PBX-Console-NativeMessagingHost.exe'
$manifestText = $manifest | ConvertTo-Json -Depth 8
Write-AtomicUtf8 $manifestPath $manifestText
$browsers = if ($Browser -eq 'all') { @('chrome', 'edge') } else { @($Browser) }
$registered = @()
foreach ($browserName in $browsers) {
  $registryPath = if ($browserName -eq 'edge') { 'HKCU:\Software\Microsoft\Edge\NativeMessagingHosts' } else { 'HKCU:\Software\Google\Chrome\NativeMessagingHosts' }
  New-Item -ItemType Directory -Force -Path (Join-Path $registryPath $hostName) | Out-Null
  New-ItemProperty -LiteralPath (Join-Path $registryPath $hostName) -Name '(default)' -Value $manifestPath -PropertyType String -Force | Out-Null
  if ((Get-ItemProperty -LiteralPath (Join-Path $registryPath $hostName) -Name '(default)').'(default)' -ne $manifestPath) { throw "The $browserName native host registry entry could not be verified." }
  $registered += $browserName
}
if (-not (Test-Path -LiteralPath $configPath -PathType Leaf)) { throw 'The ingress configuration was not written.' }
$configAcl = Get-Acl -LiteralPath $configPath
if ($configAcl.Owner -ne $identity.Translate([System.Security.Principal.NTAccount]).Value) { throw 'The ingress configuration owner could not be verified.' }
$manifestAcl = Get-Acl -LiteralPath $manifestPath
if ($manifestAcl.Owner -ne $identity.Translate([System.Security.Principal.NTAccount]).Value) { throw 'The native host manifest owner could not be verified.' }
$allowedIdentities = @($identity.Translate([System.Security.Principal.NTAccount]).Value, 'NT AUTHORITY\SYSTEM')
foreach ($ruleCheck in @($configAcl.Access) + @($manifestAcl.Access)) {
  if ($allowedIdentities -notcontains $ruleCheck.IdentityReference.Value) { throw "An unexpected identity is present on the native ingress registration files: $($ruleCheck.IdentityReference.Value)" }
}
@{ accepted = $true; hostName = $hostName; extensionId = $manifest.allowed_origins[0].Split('/')[2]; manifestPath = $manifestPath; executablePath = $hostPath; executableSha256 = $actualDigest; browsers = $registered; challengeConfigured = $true } | ConvertTo-Json -Compress
