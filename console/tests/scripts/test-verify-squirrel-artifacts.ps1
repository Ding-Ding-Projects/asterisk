$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$root = Join-Path ([IO.Path]::GetTempPath()) ('material-asterisk-squirrel-verifier-test-' + [Guid]::NewGuid().ToString('N'))
$artifacts = Join-Path $root 'artifacts'
$packageRoot = Join-Path $root 'package'
New-Item -ItemType Directory -Path $artifacts,$packageRoot,(Join-Path $packageRoot 'lib/net45/resources') -Force | Out-Null

try {
  $setup = Join-Path $artifacts 'Material-Asterisk-Setup.exe'
  Add-Type -TypeDefinition 'public static class Program { public static void Main() {} }' -OutputAssembly $setup
  if ((Get-AuthenticodeSignature -LiteralPath $setup).Status -ne 'NotSigned') { throw 'test compiler did not produce an unsigned executable' }

  @'
<?xml version="1.0"?>
<package><metadata><id>ding-pbx-console</id><version>0.1.0</version><authors>Material Asterisk</authors><description>Fixture</description></metadata></package>
'@ | Set-Content -LiteralPath (Join-Path $packageRoot 'ding-pbx-console.nuspec') -Encoding utf8
  Set-Content -LiteralPath (Join-Path $packageRoot 'lib/net45/resources/app.asar') -Value 'fixture' -Encoding utf8
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $nupkg = Join-Path $artifacts 'ding-pbx-console-0.1.0-full.nupkg'
  [IO.Compression.ZipFile]::CreateFromDirectory($packageRoot, $nupkg)
  $sha1 = (Get-FileHash -LiteralPath $nupkg -Algorithm SHA1).Hash.ToLowerInvariant()
  $size = (Get-Item -LiteralPath $nupkg).Length
  Set-Content -LiteralPath (Join-Path $artifacts 'RELEASES') -Value "$sha1 ding-pbx-console-0.1.0-full.nupkg $size" -Encoding ascii

  $buildLog = Join-Path $root 'build.log'
  Set-Content -LiteralPath $buildLog -Value 'fixture build completed without signer process' -Encoding utf8
  $provenance = [ordered]@{
    version = 1
    sourceCommit = ('a' * 40)
    builtAt = [DateTimeOffset]::UtcNow.ToString('o')
    packagingCommand = 'build-installer.bat /s'
    cleanOutput = $true
    package = [ordered]@{ id = 'ding-pbx-console'; version = '0.1.0'; architecture = 'x64' }
    buildLog = [ordered]@{ path = 'build.log'; sha256 = (Get-FileHash -LiteralPath $buildLog -Algorithm SHA256).Hash.ToLowerInvariant() }
    signing = [ordered]@{
      inputsCleared = $true
      certificateAutoDiscoveryDisabled = $true
      processAuditComplete = $true
      signerInvocationCount = 0
      observedSignerInvocations = @()
      controls = [ordered]@{ forceCodeSigning = $false; signExecutable = $false; signAndEditExecutable = $false }
    }
  }
  $provenancePath = Join-Path $root 'provenance.json'
  $provenance | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $provenancePath -Encoding utf8
  $verifier = Join-Path $PSScriptRoot '..\..\scripts\verify-squirrel-artifacts.ps1'
  $receipt = Join-Path $root 'receipt.json'
  & $verifier -ArtifactDirectory $artifacts -ProvenancePath $provenancePath -ExpectedCommit ('a' * 40) -SetupFile 'Material-Asterisk-Setup.exe' -ExpectedPackageId 'ding-pbx-console' -ExpectedVersion '0.1.0' -ExpectedArchitecture x64 -RequiredPackageEntry '*app.asar' -OutputPath $receipt | Out-Null
  if (-not (Test-Path -LiteralPath $receipt)) { throw 'positive receipt was not created' }

  Set-Content -LiteralPath (Join-Path $artifacts 'RELEASES') -Value "$sha1 ding-pbx-console-0.1.0-full.nupkg 1" -Encoding ascii
  $negativeFailed = $false
  try {
    & $verifier -ArtifactDirectory $artifacts -ProvenancePath $provenancePath -ExpectedCommit ('a' * 40) -SetupFile 'Material-Asterisk-Setup.exe' -ExpectedPackageId 'ding-pbx-console' -ExpectedVersion '0.1.0' -ExpectedArchitecture x64 -RequiredPackageEntry '*app.asar' -OutputPath (Join-Path $root 'bad-receipt.json') | Out-Null
  } catch { $negativeFailed = $_.Exception.Message -match 'size mismatch' }
  if (-not $negativeFailed) { throw 'negative RELEASES size check did not fail' }
  Write-Output 'PASS Material Asterisk Squirrel artifact verifier positive and negative checks'
} finally {
  Remove-Item -LiteralPath $root -Recurse -Force -ErrorAction SilentlyContinue
}
