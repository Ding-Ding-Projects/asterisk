param(
  [string]$OutputPath = (Join-Path $PSScriptRoot 'Ding-PBX-Console-NativeMessagingHost.exe')
)

$ErrorActionPreference = 'Stop'
$compiler = Get-Command cl.exe -ErrorAction SilentlyContinue
$source = Join-Path $PSScriptRoot 'Ding-PBX-Console-NativeMessagingHost.cpp'
$helperSource = Join-Path $PSScriptRoot 'secure-temp-helper.cpp'
$output = [IO.Path]::GetFullPath($OutputPath)
$secureOutput = Join-Path (Split-Path -Parent $output) 'Ding-PBX-Console-SecureTempHelper.exe'
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $output) | Out-Null
$compilerKind = 'MSVC'
if ($compiler) {
  & $compiler.Source /nologo /std:c++17 /EHsc /O2 /DUNICODE /D_UNICODE $source /Fe:$output /link /SUBSYSTEM:CONSOLE
  & $compiler.Source /nologo /std:c++17 /EHsc /O2 /DUNICODE /D_UNICODE $helperSource /Fe:$secureOutput /link /SUBSYSTEM:CONSOLE
} else {
  $compiler = Get-Command g++.exe -ErrorAction SilentlyContinue
  if (-not $compiler) { throw 'Neither the supported MSVC cl.exe nor the supported MinGW g++.exe compiler was found. Native host packaging is unavailable until the project toolchain is bootstrapped.' }
  $compilerKind = 'MinGW'
  & $compiler.Source -std=c++17 -O2 $source -o $output
  & $compiler.Source -std=c++17 -O2 $helperSource -o $secureOutput
}
if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $output -PathType Leaf) -or -not (Test-Path -LiteralPath $secureOutput -PathType Leaf)) { throw 'The native messaging host or secure temp helper executable was not produced.' }
$digest = (Get-FileHash -LiteralPath $output -Algorithm SHA256).Hash.ToLowerInvariant()
Set-Content -LiteralPath "$output.sha256" -Value "$digest  $(Split-Path -Leaf $output)" -Encoding ASCII
$secureDigest = (Get-FileHash -LiteralPath $secureOutput -Algorithm SHA256).Hash.ToLowerInvariant()
Set-Content -LiteralPath "$secureOutput.sha256" -Value "$secureDigest  $(Split-Path -Leaf $secureOutput)" -Encoding ASCII
Write-Output "Built the native messaging host at $output with $compilerKind and SHA-256 $digest"
Write-Output "Built the secure temp helper at $secureOutput with $compilerKind and SHA-256 $secureDigest"
