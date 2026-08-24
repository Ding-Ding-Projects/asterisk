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
  const uint CREATE_SUSPENDED=0x4, EXTENDED_STARTUPINFO_PRESENT=0x80000, CREATE_UNICODE_ENVIRONMENT=0x400, STARTF_USESTDHANDLES=0x100, INFINITE=0xffffffff, HANDLE_FLAG_INHERIT=1;
  const uint PROCESS_MEMORY=0x100, KILL_ON_CLOSE=0x2000;
  const uint SE_FILE_OBJECT=1, DACL_SECURITY_INFORMATION=4, GENERIC_READ=0x80000000, GENERIC_EXECUTE=0x20000000, OBJECT_INHERIT=1, CONTAINER_INHERIT=2, SET_ACCESS=2;
  [StructLayout(LayoutKind.Sequential)] struct SECURITY_CAPABILITIES { public IntPtr AppContainerSid; public IntPtr Capabilities; public uint CapabilityCount; public uint Reserved; }
  [StructLayout(LayoutKind.Sequential)] struct STARTUPINFO { public uint cb; public string lpReserved; public string lpDesktop; public string lpTitle; public uint dwX; public uint dwY; public uint dwXSize; public uint dwYSize; public uint dwXCountChars; public uint dwYCountChars; public uint dwFillAttribute; public uint dwFlags; public IntPtr hStdInput; public IntPtr hStdOutput; public IntPtr hStdError; }
  [StructLayout(LayoutKind.Sequential)] struct STARTUPINFOEX { public STARTUPINFO StartupInfo; public IntPtr lpAttributeList; }
  [StructLayout(LayoutKind.Sequential)] struct PROCESS_INFORMATION { public IntPtr hProcess; public IntPtr hThread; public uint dwProcessId; public uint dwThreadId; }
  [StructLayout(LayoutKind.Sequential)] struct BASIC_LIMITS { public uint LimitFlags; public UIntPtr MinWorkingSet; public UIntPtr MaxWorkingSet; public uint ActiveProcessLimit; public UIntPtr Affinity; public uint Priority; public uint SchedulingClass; }
  [StructLayout(LayoutKind.Sequential)] struct IO_LIMITS { public UIntPtr Read; public UIntPtr Write; public UIntPtr Other; }
  [StructLayout(LayoutKind.Sequential)] struct JOB_LIMITS { public BASIC_LIMITS Basic; public IO_LIMITS Io; public UIntPtr ProcessMemoryLimit; public UIntPtr JobMemoryLimit; public UIntPtr PeakProcessMemoryUsed; public UIntPtr PeakJobMemoryUsed; }
  [StructLayout(LayoutKind.Sequential)] struct TRUSTEE { public IntPtr MultipleTrustee; public int MultipleTrusteeOperation; public int TrusteeForm; public int TrusteeType; public IntPtr TrusteeName; }
  [StructLayout(LayoutKind.Sequential)] struct EXPLICIT_ACCESS { public uint AccessPermissions; public int AccessMode; public uint Inheritance; public TRUSTEE Trustee; }
  [DllImport("userenv.dll", CharSet=CharSet.Unicode)] static extern int CreateAppContainerProfile(string name,string display,string description,IntPtr capabilities,uint count,out IntPtr sid);
  [DllImport("userenv.dll")] static extern int DeleteAppContainerProfile(string name);
  [DllImport("kernel32.dll",SetLastError=true)] static extern IntPtr CreateJobObject(IntPtr attributes,string name);
  [DllImport("kernel32.dll",SetLastError=true)] static extern bool SetInformationJobObject(IntPtr job,int infoClass,ref JOB_LIMITS limits,uint length);
  [DllImport("kernel32.dll",SetLastError=true)] static extern bool AssignProcessToJobObject(IntPtr job,IntPtr process);
  [DllImport("kernel32.dll",SetLastError=true)] static extern bool InitializeProcThreadAttributeList(IntPtr list,int count,int flags,ref IntPtr size);
  [DllImport("kernel32.dll",SetLastError=true)] static extern bool UpdateProcThreadAttribute(IntPtr list,uint flags,IntPtr attribute,ref SECURITY_CAPABILITIES value,IntPtr size,IntPtr previous,IntPtr returnSize);
  [DllImport("kernel32.dll",SetLastError=true)] static extern bool UpdateProcThreadAttribute(IntPtr list,uint flags,IntPtr attribute,IntPtr value,IntPtr size,IntPtr previous,IntPtr returnSize);
  [DllImport("kernel32.dll")] static extern bool DeleteProcThreadAttributeList(IntPtr list);
  [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern bool CreateProcess(string application,StringBuilder command,IntPtr processAttributes,IntPtr threadAttributes,bool inheritHandles,uint flags,IntPtr environment,string directory,ref STARTUPINFOEX startup,out PROCESS_INFORMATION processInfo);
  [DllImport("kernel32.dll")] static extern uint ResumeThread(IntPtr thread);
  [DllImport("kernel32.dll")] static extern uint WaitForSingleObject(IntPtr handle,uint milliseconds);
  [DllImport("kernel32.dll")] static extern bool GetExitCodeProcess(IntPtr handle,out uint code);
  [DllImport("kernel32.dll",SetLastError=true)] static extern bool TerminateProcess(IntPtr handle,uint code);
  [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr handle);
  [DllImport("kernel32.dll")] static extern IntPtr GetStdHandle(int handle);
  [DllImport("kernel32.dll",SetLastError=true)] static extern bool GetHandleInformation(IntPtr handle,out uint flags);
  [DllImport("advapi32.dll",CharSet=CharSet.Unicode)] static extern uint GetNamedSecurityInfo(string path,uint objectType,uint securityInfo,out IntPtr owner,out IntPtr group,out IntPtr dacl,out IntPtr sacl,out IntPtr descriptor);
  [DllImport("advapi32.dll",SetLastError=true)] static extern uint SetEntriesInAcl(uint count,ref EXPLICIT_ACCESS entries,IntPtr oldAcl,out IntPtr newAcl);
  [DllImport("advapi32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern uint SetNamedSecurityInfo(string path,uint objectType,uint securityInfo,IntPtr owner,IntPtr group,IntPtr dacl,IntPtr sacl);
  [DllImport("kernel32.dll")] static extern IntPtr LocalFree(IntPtr memory);
  static string Quote(string value){return "\""+value.Replace("\"","\\\"")+"\"";}
  static void GrantResourceReadExecute(string path,IntPtr sid,out IntPtr descriptor,out IntPtr originalDacl,out IntPtr addedDacl){
    IntPtr owner,group,sacl; var result=GetNamedSecurityInfo(path,SE_FILE_OBJECT,DACL_SECURITY_INFORMATION,out owner,out group,out originalDacl,out sacl,out descriptor); if(result!=0) throw new Win32Exception((int)result,"GetNamedSecurityInfo failed");
    var entry=new EXPLICIT_ACCESS{AccessPermissions=GENERIC_READ|GENERIC_EXECUTE,AccessMode=(int)SET_ACCESS,Inheritance=OBJECT_INHERIT|CONTAINER_INHERIT,Trustee=new TRUSTEE{TrusteeForm=0,TrusteeName=sid}};
    result=SetEntriesInAcl(1,ref entry,originalDacl,out addedDacl); if(result!=0) throw new Win32Exception((int)result,"SetEntriesInAcl failed");
    result=SetNamedSecurityInfo(path,SE_FILE_OBJECT,DACL_SECURITY_INFORMATION,IntPtr.Zero,IntPtr.Zero,addedDacl,IntPtr.Zero); if(result!=0) throw new Win32Exception((int)result,"SetNamedSecurityInfo failed");
  }
  static void RestoreResourceDacl(string path,IntPtr originalDacl){ var result=SetNamedSecurityInfo(path,SE_FILE_OBJECT,DACL_SECURITY_INFORMATION,IntPtr.Zero,IntPtr.Zero,originalDacl,IntPtr.Zero); if(result!=0) throw new Win32Exception((int)result,"Restoring decoder resource ACL failed"); }
  public static int Run(string node,string worker,long memoryBytes){
    var profile="DingLogoDecoder_"+Guid.NewGuid().ToString("N"); IntPtr sid=IntPtr.Zero,job=IntPtr.Zero,attributes=IntPtr.Zero,resourceDescriptor=IntPtr.Zero,addedDacl=IntPtr.Zero,originalDacl=IntPtr.Zero,nodeDescriptor=IntPtr.Zero,nodeAddedDacl=IntPtr.Zero,nodeOriginalDacl=IntPtr.Zero; var resourceRoot=System.IO.Path.GetDirectoryName(System.IO.Path.GetFullPath(worker)); if(String.IsNullOrEmpty(resourceRoot)) throw new InvalidOperationException("The decoder resource directory is unavailable"); PROCESS_INFORMATION pi=new PROCESS_INFORMATION();
    try{
      var hr=CreateAppContainerProfile(profile,profile,"Ding PBX Console local logo decoder",IntPtr.Zero,0,out sid);
      if(hr!=0 && hr!=unchecked((int)0x800700B7)) throw new Win32Exception(hr,"CreateAppContainerProfile failed");
      job=CreateJobObject(IntPtr.Zero,null); if(job==IntPtr.Zero) throw new Win32Exception(Marshal.GetLastWin32Error(),"CreateJobObject failed");
      var limits=new JOB_LIMITS(); limits.Basic.LimitFlags=PROCESS_MEMORY|KILL_ON_CLOSE; limits.ProcessMemoryLimit=new UIntPtr((ulong)memoryBytes);
      if(!SetInformationJobObject(job,9,ref limits,(uint)Marshal.SizeOf<JOB_LIMITS>())) throw new Win32Exception(Marshal.GetLastWin32Error(),"SetInformationJobObject failed");
      IntPtr size=IntPtr.Zero; InitializeProcThreadAttributeList(IntPtr.Zero,2,0,ref size); attributes=Marshal.AllocHGlobal(size);
      if(!InitializeProcThreadAttributeList(attributes,2,0,ref size)) throw new Win32Exception(Marshal.GetLastWin32Error(),"InitializeProcThreadAttributeList failed");
      var capabilities=new SECURITY_CAPABILITIES{AppContainerSid=sid,Capabilities=IntPtr.Zero,CapabilityCount=0,Reserved=0};
      if(!UpdateProcThreadAttribute(attributes,0,(IntPtr)0x00020009,ref capabilities,(IntPtr)Marshal.SizeOf<SECURITY_CAPABILITIES>(),IntPtr.Zero,IntPtr.Zero)) throw new Win32Exception(Marshal.GetLastWin32Error(),"UpdateProcThreadAttribute failed");
      GrantResourceReadExecute(resourceRoot,sid,out resourceDescriptor,out originalDacl,out addedDacl);
      GrantResourceReadExecute(System.IO.Path.GetFullPath(node),sid,out nodeDescriptor,out nodeOriginalDacl,out nodeAddedDacl);
      var startup=new STARTUPINFOEX(); startup.StartupInfo.cb=(uint)Marshal.SizeOf<STARTUPINFOEX>(); startup.StartupInfo.dwFlags=STARTF_USESTDHANDLES; startup.StartupInfo.hStdInput=GetStdHandle(-10); startup.StartupInfo.hStdOutput=GetStdHandle(-11); startup.StartupInfo.hStdError=GetStdHandle(-12); startup.lpAttributeList=attributes;
      if(startup.StartupInfo.hStdInput==IntPtr.Zero || startup.StartupInfo.hStdOutput==IntPtr.Zero || startup.StartupInfo.hStdError==IntPtr.Zero) throw new InvalidOperationException("The decoder pipe handles are unavailable");
      uint inputFlags,outputFlags,errorFlags; if(!GetHandleInformation(startup.StartupInfo.hStdInput,out inputFlags) || !GetHandleInformation(startup.StartupInfo.hStdOutput,out outputFlags) || !GetHandleInformation(startup.StartupInfo.hStdError,out errorFlags) || (inputFlags&HANDLE_FLAG_INHERIT)==0 || (outputFlags&HANDLE_FLAG_INHERIT)==0 || (errorFlags&HANDLE_FLAG_INHERIT)==0) throw new InvalidOperationException("The decoder pipe handles are not inheritable");
      var handles = new[] { startup.StartupInfo.hStdInput, startup.StartupInfo.hStdOutput, startup.StartupInfo.hStdError }; var pinnedHandles = GCHandle.Alloc(handles, GCHandleType.Pinned);
      try { if(!UpdateProcThreadAttribute(attributes,0,(IntPtr)0x00020002,pinnedHandles.AddrOfPinnedObject(),(IntPtr)(IntPtr.Size*handles.Length),IntPtr.Zero,IntPtr.Zero)) throw new Win32Exception(Marshal.GetLastWin32Error(),"UpdateProcThreadAttribute handle list failed"); } finally { pinnedHandles.Free(); }
      var command=new StringBuilder(Quote(node)+" --max-old-space-size=64 "+Quote(worker)+" --no-network");
      if(!CreateProcess(null,command,IntPtr.Zero,IntPtr.Zero,true,CREATE_SUSPENDED|EXTENDED_STARTUPINFO_PRESENT|CREATE_UNICODE_ENVIRONMENT,IntPtr.Zero,null,ref startup,out pi)) throw new Win32Exception(Marshal.GetLastWin32Error(),"CreateProcess AppContainer worker failed");
      if(!AssignProcessToJobObject(job,pi.hProcess)) throw new Win32Exception(Marshal.GetLastWin32Error(),"AssignProcessToJobObject failed");
      if(ResumeThread(pi.hThread)==unchecked((uint)-1)) throw new Win32Exception(Marshal.GetLastWin32Error(),"ResumeThread failed");
      Console.Out.WriteLine("READY"); Console.Out.WriteLine("WORKER_PID:"+pi.dwProcessId); Console.Out.Flush(); WaitForSingleObject(pi.hProcess,INFINITE); uint exit; if(!GetExitCodeProcess(pi.hProcess,out exit)) throw new Win32Exception(Marshal.GetLastWin32Error(),"GetExitCodeProcess failed"); return (int)exit;
    }finally{if(pi.hProcess!=IntPtr.Zero){uint current; if(GetExitCodeProcess(pi.hProcess,out current) && current==259) TerminateProcess(pi.hProcess,1); CloseHandle(pi.hProcess);}if(pi.hThread!=IntPtr.Zero)CloseHandle(pi.hThread);if(attributes!=IntPtr.Zero){DeleteProcThreadAttributeList(attributes);Marshal.FreeHGlobal(attributes);}if(nodeDescriptor!=IntPtr.Zero)RestoreResourceDacl(System.IO.Path.GetFullPath(node),nodeOriginalDacl);if(nodeAddedDacl!=IntPtr.Zero)LocalFree(nodeAddedDacl);if(nodeDescriptor!=IntPtr.Zero)LocalFree(nodeDescriptor);if(resourceDescriptor!=IntPtr.Zero)RestoreResourceDacl(resourceRoot,originalDacl);if(addedDacl!=IntPtr.Zero)LocalFree(addedDacl);if(resourceDescriptor!=IntPtr.Zero)LocalFree(resourceDescriptor);if(job!=IntPtr.Zero)CloseHandle(job);if(sid!=IntPtr.Zero)DeleteAppContainerProfile(profile);}
  }
}
"@

$exitCode = [LogoWorkerAppContainerLauncher]::Run($NodePath, $WorkerPath, $MemoryBytes)
exit $exitCode
