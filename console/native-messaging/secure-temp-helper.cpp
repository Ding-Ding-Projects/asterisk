#define NOMINMAX
#include <windows.h>
#include <string>
#include <iostream>

struct NativeUnicodeString { USHORT Length; USHORT MaximumLength; PWSTR Buffer; };
struct NativeObjectAttributes { ULONG Length; HANDLE RootDirectory; NativeUnicodeString* ObjectName; ULONG Attributes; PVOID SecurityDescriptor; PVOID SecurityQualityOfService; };
struct NativeIoStatusBlock { union { NTSTATUS Status; PVOID Pointer; }; ULONG_PTR Information; };

using NativeNtCreateFile = NTSTATUS (NTAPI*)(PHANDLE, ACCESS_MASK, NativeObjectAttributes*, NativeIoStatusBlock*, PLARGE_INTEGER, ULONG, ULONG, ULONG, ULONG, PVOID, ULONG);

HANDLE CreateRelativeNoFollow(HANDLE parent, const wchar_t* childName, bool resume) {
  const std::wstring name(childName ? childName : L"");
  if (name.empty() || name.find_first_of(L"\\/") != std::wstring::npos) return INVALID_HANDLE_VALUE;
  auto* createFile = reinterpret_cast<NativeNtCreateFile>(GetProcAddress(GetModuleHandleW(L"ntdll.dll"), "NtCreateFile"));
  if (!createFile) return INVALID_HANDLE_VALUE;
  NativeUnicodeString unicode{ static_cast<USHORT>(name.size() * sizeof(wchar_t)), static_cast<USHORT>(name.size() * sizeof(wchar_t)), const_cast<PWSTR>(name.c_str()) };
  NativeObjectAttributes attributes{ sizeof(attributes), parent, &unicode, 0x40u, nullptr, nullptr };
  NativeIoStatusBlock status{};
  HANDLE child = INVALID_HANDLE_VALUE;
  constexpr ULONG fileNonDirectory = 0x00000040u;
  constexpr ULONG fileSynchronousIoNonAlert = 0x00000020u;
  constexpr ULONG fileOpenReparsePoint = 0x00200000u;
  constexpr ULONG fileCreate = 0x00000002u;
  const NTSTATUS result = createFile(&child, GENERIC_WRITE | SYNCHRONIZE, &attributes, &status, nullptr, FILE_ATTRIBUTE_TEMPORARY, FILE_SHARE_READ, resume ? 0x00000001u : fileCreate, fileNonDirectory | fileSynchronousIoNonAlert | fileOpenReparsePoint, nullptr, 0);
  return result == 0 ? child : INVALID_HANDLE_VALUE;
}

// Native helper contract for the Deen No destination path. The parent handle is
// opened without FILE_SHARE_DELETE and with FILE_FLAG_OPEN_REPARSE_POINT, so a
// checked directory cannot be swapped while the relative child is created.
extern "C" __declspec(dllexport) HANDLE OpenVerifiedDirectory(const wchar_t* directory) {
  if (!directory) return INVALID_HANDLE_VALUE;
  const HANDLE parent = CreateFileW(directory, FILE_LIST_DIRECTORY | GENERIC_READ, FILE_SHARE_READ | FILE_SHARE_WRITE, nullptr, OPEN_EXISTING, FILE_FLAG_BACKUP_SEMANTICS | FILE_FLAG_OPEN_REPARSE_POINT, nullptr);
  if (parent == INVALID_HANDLE_VALUE) return parent;
  FILE_ATTRIBUTE_TAG_INFO info{};
  if (!GetFileInformationByHandleEx(parent, FileAttributeTagInfo, &info, sizeof(info)) || (info.FileAttributes & FILE_ATTRIBUTE_REPARSE_POINT) != 0 || info.ReparseTag != 0) {
    CloseHandle(parent);
    return INVALID_HANDLE_VALUE;
  }
  return parent;
}

extern "C" __declspec(dllexport) HANDLE CreateNoFollowTemp(const HANDLE parent, const wchar_t* childName, bool resume) {
  if (!parent || parent == INVALID_HANDLE_VALUE || !childName) return INVALID_HANDLE_VALUE;
  return CreateRelativeNoFollow(parent, childName, resume);
}

int main(int argc, char** argv) {
  if (argc != 4 || (std::string(argv[1]) != "--create" && std::string(argv[1]) != "--stream" && std::string(argv[1]) != "--resume-stream")) {
    std::cout << R"({"accepted":false,"code":"SECURE_TEMP_ARGUMENTS"})" << std::endl;
    return 2;
  }
  const int parentLength = MultiByteToWideChar(CP_UTF8, 0, argv[2], -1, nullptr, 0);
  const int tempLength = MultiByteToWideChar(CP_UTF8, 0, argv[3], -1, nullptr, 0);
  std::wstring parentPath(static_cast<std::size_t>(parentLength), L'\0');
  std::wstring childName(static_cast<std::size_t>(tempLength), L'\0');
  MultiByteToWideChar(CP_UTF8, 0, argv[2], -1, parentPath.data(), parentLength);
  MultiByteToWideChar(CP_UTF8, 0, argv[3], -1, childName.data(), tempLength);
  const HANDLE parent = OpenVerifiedDirectory(parentPath.c_str());
  if (parent == INVALID_HANDLE_VALUE) {
    std::cout << R"({"accepted":false,"code":"SECURE_TEMP_PARENT_REPARSE"})" << std::endl;
    return 1;
  }
  const bool resume = std::string(argv[1]) == "--resume-stream";
  const HANDLE child = CreateNoFollowTemp(parent, childName.c_str(), resume);
  if (std::string(argv[1]) == "--stream" || resume) {
    if (child == INVALID_HANDLE_VALUE) { CloseHandle(parent); std::cout << R"({"accepted":false,"code":"SECURE_TEMP_CREATE_FAILED"})" << std::endl; return 1; }
    char buffer[64 * 1024];
    DWORD read = 0;
    while (ReadFile(GetStdHandle(STD_INPUT_HANDLE), buffer, sizeof(buffer), &read, nullptr) && read != 0) {
      DWORD written = 0;
      if (!WriteFile(child, buffer, read, &written, nullptr) || written != read) { CloseHandle(child); CloseHandle(parent); std::cout << R"({"accepted":false,"code":"SECURE_TEMP_WRITE_FAILED"})" << std::endl; return 1; }
    }
  }
  CloseHandle(parent);
  if (child == INVALID_HANDLE_VALUE) {
    std::cout << R"({"accepted":false,"code":"SECURE_TEMP_CREATE_FAILED"})" << std::endl;
    return 1;
  }
  CloseHandle(child);
  if (std::string(argv[1]) == "--stream" || resume) std::cout << R"({"accepted":true,"code":"SECURE_TEMP_STREAMED"})" << std::endl;
  else std::cout << R"({"accepted":true,"code":"SECURE_TEMP_CREATED"})" << std::endl;
  return 0;
}
