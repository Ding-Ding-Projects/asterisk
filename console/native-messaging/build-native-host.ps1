param(
  [string]$OutputPath = (Join-Path $PSScriptRoot 'Ding-PBX-Console-NativeMessagingHost.exe')
)

$ErrorActionPreference = 'Stop'
$compiler = Get-Command cl.exe -ErrorAction SilentlyContinue
$source = Join-Path $PSScriptRoot 'Ding-PBX-Console-NativeMessagingHost.cpp'
$helperSource = Join-Path $PSScriptRoot 'secure-temp-helper.cpp'
$brokerSource = Join-Path $PSScriptRoot 'Ding-PBX-Console-NativeIngressBroker.cpp'
$output = [IO.Path]::GetFullPath($OutputPath)
$secureOutput = Join-Path (Split-Path -Parent $output) 'Ding-PBX-Console-SecureTempHelper.exe'
$brokerOutput = Join-Path (Split-Path -Parent $output) 'Ding-PBX-Console-NativeIngressBroker.exe'
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $output) | Out-Null
Remove-Item -LiteralPath $output, "$output.sha256", $secureOutput, "$secureOutput.sha256", $brokerOutput, "$brokerOutput.sha256" -Force -ErrorAction SilentlyContinue
$compilerKind = 'MSVC'
$hostExit = 0
$helperExit = 0
$brokerExit = 0
if ($compiler) {
  & $compiler.Source /nologo /std:c++17 /EHsc /O2 /DUNICODE /D_UNICODE $source /Fe:$output /link /SUBSYSTEM:CONSOLE
  $hostExit = $LASTEXITCODE
  & $compiler.Source /nologo /std:c++17 /EHsc /O2 /DUNICODE /D_UNICODE $helperSource /Fe:$secureOutput /link /SUBSYSTEM:CONSOLE bcrypt.lib
  $helperExit = $LASTEXITCODE
  & $compiler.Source /nologo /std:c++17 /EHsc /O2 /DUNICODE /D_UNICODE $brokerSource /Fe:$brokerOutput /link /SUBSYSTEM:CONSOLE advapi32.lib
  $brokerExit = $LASTEXITCODE
} else {
  $compiler = Get-Command g++.exe -ErrorAction SilentlyContinue
  if (-not $compiler) { throw 'Neither the supported MSVC cl.exe nor the supported MinGW g++.exe compiler was found. Native host packaging is unavailable until the project toolchain is bootstrapped.' }
  $compilerKind = 'MinGW'
  & $compiler.Source -std=c++17 -O2 $source -o $output
  $hostExit = $LASTEXITCODE
  & $compiler.Source -std=c++17 -O2 $helperSource -lbcrypt -o $secureOutput
  $helperExit = $LASTEXITCODE
  & $compiler.Source -std=c++17 -O2 $brokerSource -ladvapi32 -o $brokerOutput
  $brokerExit = $LASTEXITCODE
}
if ($hostExit -ne 0 -or $helperExit -ne 0 -or $brokerExit -ne 0) { throw "Native compilation failed, host=$hostExit helper=$helperExit broker=$brokerExit." }
Write-Output "Native compiler exits: host=$hostExit helper=$helperExit broker=$brokerExit"
if (-not (Test-Path -LiteralPath $output -PathType Leaf) -or -not (Test-Path -LiteralPath $secureOutput -PathType Leaf) -or -not (Test-Path -LiteralPath $brokerOutput -PathType Leaf)) { throw 'A fresh native messaging host, secure temp helper, or pipe broker executable was not produced.' }
$digest = (Get-FileHash -LiteralPath $output -Algorithm SHA256).Hash.ToLowerInvariant()
Set-Content -LiteralPath "$output.sha256" -Value "$digest  $(Split-Path -Leaf $output)" -Encoding ASCII
$secureDigest = (Get-FileHash -LiteralPath $secureOutput -Algorithm SHA256).Hash.ToLowerInvariant()
Set-Content -LiteralPath "$secureOutput.sha256" -Value "$secureDigest  $(Split-Path -Leaf $secureOutput)" -Encoding ASCII
$brokerDigest = (Get-FileHash -LiteralPath $brokerOutput -Algorithm SHA256).Hash.ToLowerInvariant()
Set-Content -LiteralPath "$brokerOutput.sha256" -Value "$brokerDigest  $(Split-Path -Leaf $brokerOutput)" -Encoding ASCII
Write-Output "Built the native messaging host at $output with $compilerKind and SHA-256 $digest"
Write-Output "Built the secure temp helper at $secureOutput with $compilerKind and SHA-256 $secureDigest"
Write-Output "Built the native ingress broker at $brokerOutput with $compilerKind and SHA-256 $brokerDigest"
