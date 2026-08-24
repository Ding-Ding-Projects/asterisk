param(
  [Parameter(Mandatory = $true)][int]$Pid,
  [Parameter(Mandatory = $true)][long]$MemoryBytes
)

Add-Type @"
using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
public static class LogoWorkerJobBoundary {
  [StructLayout(LayoutKind.Sequential)] public struct Basic { public uint LimitFlags; public UIntPtr MinWorkingSet; public UIntPtr MaxWorkingSet; public uint ActiveProcessLimit; public UIntPtr Affinity; public uint Priority; public uint SchedulingClass; }
  [StructLayout(LayoutKind.Sequential)] public struct Io { public UIntPtr Read; public UIntPtr Write; public UIntPtr Other; }
  [StructLayout(LayoutKind.Sequential)] public struct Limits { public Basic BasicLimitInformation; public Io IoInfo; public UIntPtr ProcessMemoryLimit; public UIntPtr JobMemoryLimit; public UIntPtr PeakProcessMemoryUsed; public UIntPtr PeakJobMemoryUsed; }
  [DllImport("kernel32.dll", CharSet=CharSet.Unicode)] static extern IntPtr CreateJobObject(IntPtr attributes, string name);
  [DllImport("kernel32.dll")] static extern bool SetInformationJobObject(IntPtr job, int infoClass, ref Limits limits, uint length);
  [DllImport("kernel32.dll", SetLastError=true)] static extern IntPtr OpenProcess(uint access, bool inherit, int pid);
  [DllImport("kernel32.dll", SetLastError=true)] static extern bool AssignProcessToJobObject(IntPtr job, IntPtr process);
  [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr handle);
  public static void ApplyAndHold(int pid, long memoryBytes) {
    var job = CreateJobObject(IntPtr.Zero, null);
    if (job == IntPtr.Zero) throw new InvalidOperationException("CreateJobObject failed");
    var limits = new Limits();
    limits.BasicLimitInformation.LimitFlags = 0x100u | 0x2000u;
    limits.ProcessMemoryLimit = new UIntPtr((ulong)memoryBytes);
    if (!SetInformationJobObject(job, 9, ref limits, (uint)Marshal.SizeOf<Limits>())) throw new InvalidOperationException("SetInformationJobObject failed");
    var process = OpenProcess(0x1F0FFFu, false, pid);
    if (process == IntPtr.Zero || !AssignProcessToJobObject(job, process)) throw new InvalidOperationException("AssignProcessToJobObject failed");
    CloseHandle(process);
    [Console]::Out.WriteLine('READY');
    [Console]::Out.Flush();
    try { while (true) { try { using (var p = Process.GetProcessById(pid)) { if (p.HasExited) break; } } catch { break; } System.Threading.Thread.Sleep(40); } }
    finally { CloseHandle(job); }
  }
}
"@

[LogoWorkerJobBoundary]::ApplyAndHold($Pid, $MemoryBytes)
