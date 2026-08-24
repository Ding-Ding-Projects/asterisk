param(
  [string]$OutputPath = (Join-Path $PSScriptRoot 'Ding-PBX-Console-NativeMessagingHost.exe')
)

$ErrorActionPreference = 'Stop'
$compiler = Get-Command cl.exe -ErrorAction SilentlyContinue
if (-not $compiler) { throw 'The supported MSVC cl.exe compiler was not found. Native host packaging is unavailable until the project toolchain is bootstrapped.' }
$source = Join-Path $PSScriptRoot 'Ding-PBX-Console-NativeMessagingHost.cpp'
$output = [IO.Path]::GetFullPath($OutputPath)
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $output) | Out-Null
& $compiler.Source /nologo /std:c++17 /EHsc /O2 /DUNICODE /D_UNICODE $source /Fe:$output /link /SUBSYSTEM:CONSOLE
if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $output -PathType Leaf)) { throw 'The native messaging host executable was not produced.' }
Write-Output "Built the native messaging host at $output"
