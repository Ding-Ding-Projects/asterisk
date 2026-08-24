import type { ProcessExecutor } from './executor.js';

/** A narrow OS-backed credential seam used only by the history manager. */
export interface CredentialVault {
  get(account: string): Promise<string | undefined>;
  set(account: string, secret: string): Promise<void>;
  remove(account: string): Promise<void>;
}

const POWERSHELL = String.raw`
$inputObject = [Console]::In.ReadToEnd() | ConvertFrom-Json
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class NativeVault {
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)] public struct CREDENTIAL {
    public int Flags; public int Type; public string TargetName; public string Comment; public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
    public int CredentialBlobSize; public IntPtr CredentialBlob; public int Persist; public int AttributeCount; public IntPtr Attributes; public string TargetAlias; public string UserName;
  }
  [DllImport("advapi32.dll", CharSet=CharSet.Unicode, SetLastError=true)] public static extern bool CredWrite(ref CREDENTIAL credential, int flags);
  [DllImport("advapi32.dll", CharSet=CharSet.Unicode, SetLastError=true)] public static extern bool CredRead(string target, int type, int flags, out IntPtr credential);
  [DllImport("advapi32.dll", CharSet=CharSet.Unicode, SetLastError=true)] public static extern bool CredDelete(string target, int type, int flags);
  [DllImport("advapi32.dll")] public static extern void CredFree(IntPtr credential);
}
'@
$target = 'DingPbxConsole.History.' + [string]$inputObject.account
$type = 1
if ($inputObject.operation -eq 'set') {
  $bytes = [Text.Encoding]::UTF8.GetBytes([string]$inputObject.secret)
  $ptr = [Runtime.InteropServices.Marshal]::AllocHGlobal($bytes.Length)
  try {
    [Runtime.InteropServices.Marshal]::Copy($bytes, 0, $ptr, $bytes.Length)
    $credential = New-Object -TypeName 'NativeVault+CREDENTIAL'
    $credential.Type = $type; $credential.TargetName = $target; $credential.UserName = 'DingPbxConsole'; $credential.CredentialBlob = $ptr; $credential.CredentialBlobSize = $bytes.Length; $credential.Persist = 2
    if (-not [NativeVault]::CredWrite([ref]$credential, 0)) { throw [ComponentModel.Win32Exception]::new([Runtime.InteropServices.Marshal]::GetLastWin32Error()) }
    '{"ok":true}'
  } finally { [Runtime.InteropServices.Marshal]::FreeHGlobal($ptr) }
} elseif ($inputObject.operation -eq 'get') {
  $ptr = [IntPtr]::Zero
  if (-not [NativeVault]::CredRead($target, $type, 0, [ref]$ptr)) { '{"ok":false}' } else {
    try {
      $credential = [Runtime.InteropServices.Marshal]::PtrToStructure($ptr, [NativeVault+CREDENTIAL])
      $bytes = New-Object byte[] $credential.CredentialBlobSize; [Runtime.InteropServices.Marshal]::Copy($credential.CredentialBlob, $bytes, 0, $bytes.Length)
      @{ ok = $true; secret = [Text.Encoding]::UTF8.GetString($bytes) } | ConvertTo-Json -Compress
    } finally { [NativeVault]::CredFree($ptr) }
  }
} elseif ($inputObject.operation -eq 'remove') {
  [void][NativeVault]::CredDelete($target, $type, 0); '{"ok":true}'
} else { throw 'Unsupported vault operation.' }
`;

export class WindowsCredentialVault implements CredentialVault {
  constructor(private readonly executor: ProcessExecutor) {}

  private async run(operation: string, account: string, secret?: string): Promise<Record<string, unknown>> {
    const result = await this.executor.execute({
      executable: 'powershell.exe',
      args: ['-NoProfile', '-NonInteractive', '-Command', POWERSHELL],
      input: JSON.stringify({ operation, account, ...(secret === undefined ? {} : { secret }) }),
      timeoutMs: 10_000,
      maxOutputBytes: 256 * 1024,
    });
    if (result.status !== 'succeeded') throw new Error(result.stderr.trim() || 'The operating-system credential vault did not answer.');
    const parsed = JSON.parse(result.stdout.trim() || '{"ok":false}') as Record<string, unknown>;
    if (parsed.ok !== true && operation !== 'get') throw new Error('The operating-system credential vault rejected the history manager credential.');
    return parsed;
  }

  async get(account: string): Promise<string | undefined> {
    const result = await this.run('get', account);
    return typeof result.secret === 'string' ? result.secret : undefined;
  }

  async set(account: string, secret: string): Promise<void> {
    if (secret.length < 8 || secret.length > 256) throw new Error('The history manager credential must be 8 to 256 characters.');
    await this.run('set', account, secret);
  }

  async remove(account: string): Promise<void> { await this.run('remove', account); }
}
