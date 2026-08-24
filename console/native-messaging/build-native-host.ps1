param(
  [string]$OutputPath = (Join-Path $PSScriptRoot 'Ding-PBX-Console-NativeMessagingHost.exe')
)

$ErrorActionPreference = 'Stop'
$compiler = Get-Command cl.exe -ErrorAction SilentlyContinue
$source = Join-Path $PSScriptRoot 'Ding-PBX-Console-NativeMessagingHost.cpp'
$output = [IO.Path]::GetFullPath($OutputPath)
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $output) | Out-Null
$compilerKind = 'MSVC'
if ($compiler) {
  & $compiler.Source /nologo /std:c++17 /EHsc /O2 /DUNICODE /D_UNICODE $source /Fe:$output /link /SUBSYSTEM:CONSOLE
} else {
  $compiler = Get-Command g++.exe -ErrorAction SilentlyContinue
  if (-not $compiler) { throw 'Neither the supported MSVC cl.exe nor the supported MinGW g++.exe compiler was found. Native host packaging is unavailable until the project toolchain is bootstrapped.' }
  $compilerKind = 'MinGW'
  & $compiler.Source -std=c++17 -O2 $source -o $output
}
if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $output -PathType Leaf)) { throw 'The native messaging host executable was not produced.' }
$digest = (Get-FileHash -LiteralPath $output -Algorithm SHA256).Hash.ToLowerInvariant()
Set-Content -LiteralPath "$output.sha256" -Value "$digest  $(Split-Path -Leaf $output)" -Encoding ASCII
Write-Output "Built the native messaging host at $output with $compilerKind and SHA-256 $digest"
