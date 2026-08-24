param(
  [Parameter(Mandatory = $true)][string]$NodePath,
  [Parameter(Mandatory = $true)][string]$WorkerPath,
  [Parameter(Mandatory = $true)][long]$MemoryBytes
)

Add-Type @"
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;
using System.Text;
public static class LogoWorkerAppContainerLauncher {
  const uint CREATE_SUSPENDED=0x4, EXTENDED_STARTUPINFO_PRESENT=0x80000, CREATE_UNICODE_ENVIRONMENT=0x400, STARTF_USESTDHANDLES=0x100, INFINITE=0xffffffff;
  const uint PROCESS_MEMORY=0x100, KILL_ON_CLOSE=0x2000;
  [StructLayout(LayoutKind.Sequential)] struct SECURITY_CAPABILITIES { public IntPtr AppContainerSid; public IntPtr Capabilities; public uint CapabilityCount; public uint Reserved; }
  [StructLayout(LayoutKind.Sequential)] struct STARTUPINFO { public uint cb; public string lpReserved; public string lpDesktop; public string lpTitle; public uint dwX; public uint dwY; public uint dwXSize; public uint dwYSize; public uint dwXCountChars; public uint dwYCountChars; public uint dwFillAttribute; public uint dwFlags; public IntPtr hStdInput; public IntPtr hStdOutput; public IntPtr hStdError; }
  [StructLayout(LayoutKind.Sequential)] struct STARTUPINFOEX { public STARTUPINFO StartupInfo; public IntPtr lpAttributeList; }
  [StructLayout(LayoutKind.Sequential)] struct PROCESS_INFORMATION { public IntPtr hProcess; public IntPtr hThread; public uint dwProcessId; public uint dwThreadId; }
  [StructLayout(LayoutKind.Sequential)] struct BASIC_LIMITS { public uint LimitFlags; public UIntPtr MinWorkingSet; public UIntPtr MaxWorkingSet; public uint ActiveProcessLimit; public UIntPtr Affinity; public uint Priority; public uint SchedulingClass; }
  [StructLayout(LayoutKind.Sequential)] struct IO_LIMITS { public UIntPtr Read; public UIntPtr Write; public UIntPtr Other; }
  [StructLayout(LayoutKind.Sequential)] struct JOB_LIMITS { public BASIC_LIMITS Basic; public IO_LIMITS Io; public UIntPtr ProcessMemoryLimit; public UIntPtr JobMemoryLimit; public UIntPtr PeakProcessMemoryUsed; public UIntPtr PeakJobMemoryUsed; }
  [DllImport("userenv.dll", CharSet=CharSet.Unicode)] static extern int CreateAppContainerProfile(string name,string display,string description,IntPtr capabilities,uint count,out IntPtr sid);
  [DllImport("userenv.dll")] static extern int DeleteAppContainerProfile(string name);
  [DllImport("kernel32.dll",SetLastError=true)] static extern IntPtr CreateJobObject(IntPtr attributes,string name);
  [DllImport("kernel32.dll",SetLastError=true)] static extern bool SetInformationJobObject(IntPtr job,int infoClass,ref JOB_LIMITS limits,uint length);
  [DllImport("kernel32.dll",SetLastError=true)] static extern bool AssignProcessToJobObject(IntPtr job,IntPtr process);
  [DllImport("kernel32.dll",SetLastError=true)] static extern bool InitializeProcThreadAttributeList(IntPtr list,int count,int flags,ref IntPtr size);
  [DllImport("kernel32.dll",SetLastError=true)] static extern bool UpdateProcThreadAttribute(IntPtr list,uint flags,IntPtr attribute,ref SECURITY_CAPABILITIES value,IntPtr size,IntPtr previous,IntPtr returnSize);
  [DllImport("kernel32.dll")] static extern bool DeleteProcThreadAttributeList(IntPtr list);
  [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern bool CreateProcess(string application,StringBuilder command,IntPtr processAttributes,IntPtr threadAttributes,bool inheritHandles,uint flags,IntPtr environment,string directory,ref STARTUPINFOEX startup,out PROCESS_INFORMATION processInfo);
  [DllImport("kernel32.dll")] static extern uint ResumeThread(IntPtr thread);
  [DllImport("kernel32.dll")] static extern uint WaitForSingleObject(IntPtr handle,uint milliseconds);
  [DllImport("kernel32.dll")] static extern bool GetExitCodeProcess(IntPtr handle,out uint code);
  [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr handle);
  [DllImport("kernel32.dll")] static extern IntPtr GetStdHandle(int handle);
  static string Quote(string value){return "\""+value.Replace("\"","\\\"")+"\"";}
  public static int Run(string node,string worker,long memoryBytes){
    var profile="DingLogoDecoder_"+Guid.NewGuid().ToString("N"); IntPtr sid=IntPtr.Zero,job=IntPtr.Zero,attributes=IntPtr.Zero; PROCESS_INFORMATION pi=new PROCESS_INFORMATION();
    try{
      var hr=CreateAppContainerProfile(profile,profile,"Ding PBX Console local logo decoder",IntPtr.Zero,0,out sid);
      if(hr!=0 && hr!=unchecked((int)0x800700B7)) throw new Win32Exception(hr,"CreateAppContainerProfile failed");
      job=CreateJobObject(IntPtr.Zero,null); if(job==IntPtr.Zero) throw new Win32Exception(Marshal.GetLastWin32Error(),"CreateJobObject failed");
      var limits=new JOB_LIMITS(); limits.Basic.LimitFlags=PROCESS_MEMORY|KILL_ON_CLOSE; limits.ProcessMemoryLimit=new UIntPtr((ulong)memoryBytes);
      if(!SetInformationJobObject(job,9,ref limits,(uint)Marshal.SizeOf<JOB_LIMITS>())) throw new Win32Exception(Marshal.GetLastWin32Error(),"SetInformationJobObject failed");
      IntPtr size=IntPtr.Zero; InitializeProcThreadAttributeList(IntPtr.Zero,1,0,ref size); attributes=Marshal.AllocHGlobal(size);
      if(!InitializeProcThreadAttributeList(attributes,1,0,ref size)) throw new Win32Exception(Marshal.GetLastWin32Error(),"InitializeProcThreadAttributeList failed");
      var capabilities=new SECURITY_CAPABILITIES{AppContainerSid=sid,Capabilities=IntPtr.Zero,CapabilityCount=0,Reserved=0};
      if(!UpdateProcThreadAttribute(attributes,0,(IntPtr)0x00020009,ref capabilities,(IntPtr)Marshal.SizeOf<SECURITY_CAPABILITIES>(),IntPtr.Zero,IntPtr.Zero)) throw new Win32Exception(Marshal.GetLastWin32Error(),"UpdateProcThreadAttribute failed");
      var startup=new STARTUPINFOEX(); startup.StartupInfo.cb=(uint)Marshal.SizeOf<STARTUPINFOEX>(); startup.StartupInfo.dwFlags=STARTF_USESTDHANDLES; startup.StartupInfo.hStdInput=GetStdHandle(-10); startup.StartupInfo.hStdOutput=GetStdHandle(-11); startup.StartupInfo.hStdError=GetStdHandle(-12); startup.lpAttributeList=attributes;
      var command=new StringBuilder(Quote(node)+" --max-old-space-size=64 "+Quote(worker)+" --no-network");
      if(!CreateProcess(null,command,IntPtr.Zero,IntPtr.Zero,true,CREATE_SUSPENDED|EXTENDED_STARTUPINFO_PRESENT|CREATE_UNICODE_ENVIRONMENT,IntPtr.Zero,null,ref startup,out pi)) throw new Win32Exception(Marshal.GetLastWin32Error(),"CreateProcess AppContainer worker failed");
      if(!AssignProcessToJobObject(job,pi.hProcess)) throw new Win32Exception(Marshal.GetLastWin32Error(),"AssignProcessToJobObject failed");
      if(ResumeThread(pi.hThread)==unchecked((uint)-1)) throw new Win32Exception(Marshal.GetLastWin32Error(),"ResumeThread failed");
      Console.Out.WriteLine("READY"); Console.Out.Flush(); WaitForSingleObject(pi.hProcess,INFINITE); uint exit; if(!GetExitCodeProcess(pi.hProcess,out exit)) throw new Win32Exception(Marshal.GetLastWin32Error(),"GetExitCodeProcess failed"); return (int)exit;
    }finally{if(pi.hThread!=IntPtr.Zero)CloseHandle(pi.hThread);if(pi.hProcess!=IntPtr.Zero)CloseHandle(pi.hProcess);if(attributes!=IntPtr.Zero){DeleteProcThreadAttributeList(attributes);Marshal.FreeHGlobal(attributes);}if(job!=IntPtr.Zero)CloseHandle(job);if(sid!=IntPtr.Zero)DeleteAppContainerProfile(profile);}
  }
}
"@

$exitCode = [LogoWorkerAppContainerLauncher]::Run($NodePath, $WorkerPath, $MemoryBytes)
exit $exitCode
