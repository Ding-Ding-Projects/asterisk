param(
  [Parameter(Mandatory = $true)][string]$InstallRoot,
  [ValidateSet('chrome', 'edge', 'all')][string]$Browser = 'all'
)

$ErrorActionPreference = 'Stop'
$hostName = 'com.dingdingprojects.asterisk.downloads'
$manifestSource = Join-Path $InstallRoot 'resources\native-messaging\com.dingdingprojects.asterisk.downloads.json'
$packagedHostPath = Join-Path $InstallRoot 'resources\native-messaging\Ding-PBX-Console-NativeMessagingHost.exe'
$digestPath = Join-Path $InstallRoot 'resources\native-messaging\Ding-PBX-Console-NativeMessagingHost.exe.sha256'
$packagedHelperPath = Join-Path $InstallRoot 'resources\native-messaging\Ding-PBX-Console-SecureTempHelper.exe'
$helperDigestPath = Join-Path $InstallRoot 'resources\native-messaging\Ding-PBX-Console-SecureTempHelper.exe.sha256'
$packagedBrokerPath = Join-Path $InstallRoot 'resources\native-messaging\Ding-PBX-Console-NativeIngressBroker.exe'
$brokerDigestPath = Join-Path $InstallRoot 'resources\native-messaging\Ding-PBX-Console-NativeIngressBroker.exe.sha256'
$manifestRoot = Join-Path $env:LOCALAPPDATA 'Ding-Ding-Projects\Asterisk\native-messaging'
$manifestPath = Join-Path $manifestRoot "$hostName.json"
$configPath = Join-Path $manifestRoot 'ingress-config.json'
function Write-AtomicUtf8([string]$Path, [string]$Text) {
  $temporary = "$Path.$([guid]::NewGuid().ToString('N')).tmp"
  [IO.File]::WriteAllText($temporary, $Text, [Text.UTF8Encoding]::new($false))
  Move-Item -LiteralPath $temporary -Destination $Path -Force
}
if (-not (Test-Path -LiteralPath $manifestSource -PathType Leaf)) { throw "The packaged native-messaging manifest is missing: $manifestSource" }
if (-not (Test-Path -LiteralPath $packagedHostPath -PathType Leaf)) { throw "The packaged native host executable is missing: $packagedHostPath" }
if ((Get-Item -LiteralPath $packagedHostPath).PSIsContainer) { throw "The native host path is not a regular file: $packagedHostPath" }
if (-not (Test-Path -LiteralPath $digestPath -PathType Leaf)) { throw "The packaged native host digest is missing: $digestPath" }
$expectedDigest = ((Get-Content -LiteralPath $digestPath -Raw).Trim() -split '\s+')[0].ToLowerInvariant()
$actualDigest = (Get-FileHash -LiteralPath $packagedHostPath -Algorithm SHA256).Hash.ToLowerInvariant()
if ($expectedDigest -notmatch '^[0-9a-f]{64}$' -or $expectedDigest -ne $actualDigest) { throw "The packaged native host digest did not match the recorded digest." }
if (-not (Test-Path -LiteralPath $packagedHelperPath -PathType Leaf) -or (Get-Item -LiteralPath $packagedHelperPath).PSIsContainer) { throw "The packaged secure temp helper is missing or is not a regular file: $packagedHelperPath" }
if (-not (Test-Path -LiteralPath $helperDigestPath -PathType Leaf)) { throw "The packaged secure temp helper digest is missing: $helperDigestPath" }
$expectedHelperDigest = ((Get-Content -LiteralPath $helperDigestPath -Raw).Trim() -split '\s+')[0].ToLowerInvariant()
$actualHelperDigest = (Get-FileHash -LiteralPath $packagedHelperPath -Algorithm SHA256).Hash.ToLowerInvariant()
if ($expectedHelperDigest -notmatch '^[0-9a-f]{64}$' -or $expectedHelperDigest -ne $actualHelperDigest) { throw "The packaged secure temp helper digest did not match the recorded digest." }
if (-not (Test-Path -LiteralPath $packagedBrokerPath -PathType Leaf) -or (Get-Item -LiteralPath $packagedBrokerPath).PSIsContainer) { throw "The packaged native ingress broker is missing or is not a regular file: $packagedBrokerPath" }
if (-not (Test-Path -LiteralPath $brokerDigestPath -PathType Leaf)) { throw "The packaged native ingress broker digest is missing: $brokerDigestPath" }
$expectedBrokerDigest = ((Get-Content -LiteralPath $brokerDigestPath -Raw).Trim() -split '\s+')[0].ToLowerInvariant()
$actualBrokerDigest = (Get-FileHash -LiteralPath $packagedBrokerPath -Algorithm SHA256).Hash.ToLowerInvariant()
if ($expectedBrokerDigest -notmatch '^[0-9a-f]{64}$' -or $expectedBrokerDigest -ne $actualBrokerDigest) { throw "The packaged native ingress broker digest did not match the recorded digest." }
New-Item -ItemType Directory -Force -Path $manifestRoot | Out-Null
$hostPath = Join-Path $manifestRoot 'Ding-PBX-Console-NativeMessagingHost.exe'
$helperPath = Join-Path $manifestRoot 'Ding-PBX-Console-SecureTempHelper.exe'
$brokerPath = Join-Path $manifestRoot 'Ding-PBX-Console-NativeIngressBroker.exe'
Copy-Item -LiteralPath $packagedHostPath -Destination $hostPath -Force
Copy-Item -LiteralPath $packagedHelperPath -Destination $helperPath -Force
Copy-Item -LiteralPath $packagedBrokerPath -Destination $brokerPath -Force
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
$config = @{ schemaVersion = 1; pipeName = $pipeName; challenge = $challenge; extensionId = 'dnpkplcgjmipnndmghkhljjoefjhidab'; executablePath = $hostPath; executableSha256 = $actualDigest; brokerPath = $brokerPath; brokerSha256 = $actualBrokerDigest; secureHelperPath = $helperPath; secureHelperSha256 = $actualHelperDigest; manifestPath = $manifestPath }
Write-AtomicUtf8 $configPath ($config | ConvertTo-Json -Compress)
$identity = [System.Security.Principal.WindowsIdentity]::GetCurrent().User
function Set-RestrictedAcl([string]$Path, [bool]$Directory) {
  $security = New-Object System.Security.AccessControl.DirectorySecurity
  if (-not $Directory) { $security = New-Object System.Security.AccessControl.FileSecurity }
  $security.SetAccessRuleProtection($true, $false)
  $inheritance = if ($Directory) { 'ContainerInherit,ObjectInherit' } else { 'None' }
  foreach ($sid in @($identity, ([System.Security.Principal.SecurityIdentifier]'S-1-5-18'))) {
    $security.AddAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule($sid, 'FullControl', $inheritance, 'None', 'Allow')))
  }
  Set-Acl -LiteralPath $Path -AclObject $security
}
Set-RestrictedAcl $manifestRoot $true
Set-RestrictedAcl $hostPath $false
Set-RestrictedAcl $helperPath $false
Set-RestrictedAcl $brokerPath $false
$manifest = Get-Content -LiteralPath $manifestSource -Raw | ConvertFrom-Json
$manifest.path = $hostPath
$manifestText = $manifest | ConvertTo-Json -Depth 8
Write-AtomicUtf8 $manifestPath $manifestText
Set-RestrictedAcl $configPath $false
Set-RestrictedAcl $manifestPath $false
function Assert-RestrictedAcl([string]$Path, [bool]$Directory) {
  $security = Get-Acl -LiteralPath $Path
  if (-not $security.AreAccessRulesProtected) { throw "ACL inheritance is not protected for $Path" }
  $owner = $identity.Translate([System.Security.Principal.NTAccount]).Value
  if ($security.Owner -ne $owner) { throw "The ACL owner could not be verified for $Path" }
  $expected = @($owner, 'NT AUTHORITY\SYSTEM')
  foreach ($ruleCheck in @($security.Access)) {
    $inheritanceOk = if ($Directory) { $ruleCheck.InheritanceFlags -eq 'ContainerInherit, ObjectInherit' -and $ruleCheck.PropagationFlags -eq 'None' } else { $ruleCheck.InheritanceFlags -eq 'None' -and $ruleCheck.PropagationFlags -eq 'None' }
    if ($expected -notcontains $ruleCheck.IdentityReference.Value -or $ruleCheck.AccessControlType -ne 'Allow' -or ($ruleCheck.FileSystemRights -band [System.Security.AccessControl.FileSystemRights]::FullControl) -ne [System.Security.AccessControl.FileSystemRights]::FullControl -or $ruleCheck.IsInherited -or -not $inheritanceOk) { throw "The effective ACL is not restricted to explicit full-control allow rules for $Path" }
  }
  if (@($security.Access).Count -ne 2) { throw "The effective ACL rule count was not exact for $Path" }
}
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
Assert-RestrictedAcl $manifestRoot $true
foreach ($aclPath in @($configPath, $manifestPath, $hostPath, $helperPath, $brokerPath)) { Assert-RestrictedAcl $aclPath $false }
@{ accepted = $true; hostName = $hostName; extensionId = $manifest.allowed_origins[0].Split('/')[2]; manifestPath = $manifestPath; executablePath = $hostPath; executableSha256 = $actualDigest; brokerPath = $brokerPath; brokerSha256 = $actualBrokerDigest; secureHelperPath = $helperPath; secureHelperSha256 = $actualHelperDigest; browsers = $registered; challengeConfigured = $true } | ConvertTo-Json -Compress
