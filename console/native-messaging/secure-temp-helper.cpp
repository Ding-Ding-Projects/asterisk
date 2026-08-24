#define NOMINMAX
#include <windows.h>
#include <bcrypt.h>
#include <cstdint>
#include <string>
#include <iostream>
#include <sstream>
#include <vector>
#include <cstring>

struct NativeUnicodeString { USHORT Length; USHORT MaximumLength; PWSTR Buffer; };
struct NativeObjectAttributes { ULONG Length; HANDLE RootDirectory; NativeUnicodeString* ObjectName; ULONG Attributes; PVOID SecurityDescriptor; PVOID SecurityQualityOfService; };
struct NativeIoStatusBlock { union { NTSTATUS Status; PVOID Pointer; }; ULONG_PTR Information; };
struct NativeFileId128 { BYTE Identifier[16]; };
struct NativeFileIdInfo { ULONGLONG VolumeSerialNumber; NativeFileId128 FileId; };
constexpr FILE_INFO_BY_HANDLE_CLASS kFileIdInfo = static_cast<FILE_INFO_BY_HANDLE_CLASS>(18);
enum class PublishIdentity { Failed, Verified, Ambiguous };

using NativeNtCreateFile = NTSTATUS (NTAPI*)(PHANDLE, ACCESS_MASK, NativeObjectAttributes*, NativeIoStatusBlock*, PLARGE_INTEGER, ULONG, ULONG, ULONG, ULONG, PVOID, ULONG);
using NativeNtSetInformationFile = NTSTATUS (NTAPI*)(HANDLE, NativeIoStatusBlock*, PVOID, ULONG, ULONG);

HANDLE CreateRelativeNoFollow(HANDLE parent, const wchar_t* childName, bool resume, bool publishMode);

struct NativeFileRenameInformation { BOOLEAN ReplaceIfExists; HANDLE RootDirectory; ULONG FileNameLength; WCHAR FileName[1]; };

std::string sha256(HANDLE file, std::uint64_t& bytes) {
  BCRYPT_ALG_HANDLE algorithm = nullptr;
  BCRYPT_HASH_HANDLE hash = nullptr;
  DWORD objectBytes = 0;
  DWORD resultBytes = 0;
  if (BCryptOpenAlgorithmProvider(&algorithm, BCRYPT_SHA256_ALGORITHM, nullptr, 0) != 0 || BCryptGetProperty(algorithm, BCRYPT_OBJECT_LENGTH, reinterpret_cast<PUCHAR>(&objectBytes), sizeof(objectBytes), &resultBytes, 0) != 0) return {};
  std::vector<UCHAR> object(objectBytes);
  if (BCryptCreateHash(algorithm, &hash, object.data(), objectBytes, nullptr, 0, 0) != 0) { BCryptCloseAlgorithmProvider(algorithm, 0); return {}; }
  LARGE_INTEGER origin{};
  SetFilePointerEx(file, origin, nullptr, FILE_BEGIN);
  bytes = 0;
  std::vector<UCHAR> buffer(64 * 1024);
  DWORD read = 0;
  bool ok = true;
  while (ReadFile(file, buffer.data(), static_cast<DWORD>(buffer.size()), &read, nullptr) && read != 0) {
    if (BCryptHashData(hash, buffer.data(), read, 0) != 0) { ok = false; break; }
    bytes += read;
  }
  std::vector<UCHAR> digest(32);
  if (ok && BCryptFinishHash(hash, digest.data(), static_cast<ULONG>(digest.size()), 0) != 0) ok = false;
  BCryptDestroyHash(hash); BCryptCloseAlgorithmProvider(algorithm, 0);
  if (!ok) return {};
  std::ostringstream out;
  out << std::hex;
  for (const auto byte : digest) { if (byte < 16) out << '0'; out << static_cast<unsigned>(byte); }
  return out.str();
}

PublishIdentity publishRelative(HANDLE parent, HANDLE child, const std::wstring& destination, NativeFileIdInfo& before, NativeFileIdInfo& after) {
  auto* setInformation = reinterpret_cast<NativeNtSetInformationFile>(GetProcAddress(GetModuleHandleW(L"ntdll.dll"), "NtSetInformationFile"));
  if (!setInformation || destination.empty() || destination.find_first_of(L"\\/") != std::wstring::npos) return PublishIdentity::Failed;
  const ULONG bytes = static_cast<ULONG>(sizeof(NativeFileRenameInformation) + (destination.size() - 1) * sizeof(wchar_t));
  std::vector<std::byte> storage(bytes);
  auto* rename = reinterpret_cast<NativeFileRenameInformation*>(storage.data());
  rename->ReplaceIfExists = FALSE;
  rename->RootDirectory = parent;
  rename->FileNameLength = static_cast<ULONG>(destination.size() * sizeof(wchar_t));
  std::copy(destination.begin(), destination.end(), rename->FileName);
  NativeIoStatusBlock status{};
  if (setInformation(child, &status, rename, bytes, 10) != 0) return PublishIdentity::Failed;
  if (!GetFileInformationByHandleEx(child, kFileIdInfo, &after, sizeof(after))) return PublishIdentity::Ambiguous;
  if (before.VolumeSerialNumber != after.VolumeSerialNumber || std::memcmp(before.FileId.Identifier, after.FileId.Identifier, sizeof(before.FileId.Identifier)) != 0) return PublishIdentity::Ambiguous;
  return PublishIdentity::Verified;
}

bool verifyDestinationAfterClose(HANDLE parent, const std::wstring& destination, const NativeFileIdInfo& expected) {
  const HANDLE destinationHandle = CreateRelativeNoFollow(parent, destination.c_str(), true, false);
  if (destinationHandle == INVALID_HANDLE_VALUE) return false;
  NativeFileIdInfo destinationId{};
  const bool matches = GetFileInformationByHandleEx(destinationHandle, kFileIdInfo, &destinationId, sizeof(destinationId))
      && destinationId.VolumeSerialNumber == expected.VolumeSerialNumber
      && std::memcmp(destinationId.FileId.Identifier, expected.FileId.Identifier, sizeof(destinationId.FileId.Identifier)) == 0;
  CloseHandle(destinationHandle);
  return matches;
}

HANDLE CreateRelativeNoFollow(HANDLE parent, const wchar_t* childName, bool resume, bool publishMode) {
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
  const NTSTATUS result = createFile(&child, (resume ? (GENERIC_READ | GENERIC_WRITE) : GENERIC_WRITE) | SYNCHRONIZE, &attributes, &status, nullptr, FILE_ATTRIBUTE_TEMPORARY, publishMode ? 0 : (resume ? (FILE_SHARE_READ | FILE_SHARE_WRITE) : FILE_SHARE_READ), resume ? 0x00000001u : fileCreate, fileNonDirectory | fileSynchronousIoNonAlert | fileOpenReparsePoint, nullptr, 0);
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

extern "C" __declspec(dllexport) HANDLE CreateNoFollowTemp(const HANDLE parent, const wchar_t* childName, bool resume, bool publishMode) {
  if (!parent || parent == INVALID_HANDLE_VALUE || !childName) return INVALID_HANDLE_VALUE;
  return CreateRelativeNoFollow(parent, childName, resume, publishMode);
}

int main(int argc, char** argv) {
  const bool publish = std::string(argv[1]) == "--publish";
  if ((publish && argc != 7) || (!publish && argc != 4) || (!publish && std::string(argv[1]) != "--create" && std::string(argv[1]) != "--stream" && std::string(argv[1]) != "--resume-stream")) {
    std::cout << R"({"accepted":false,"code":"SECURE_TEMP_ARGUMENTS"})" << std::endl;
    return 2;
  }
  const int parentLength = MultiByteToWideChar(CP_UTF8, 0, argv[2], -1, nullptr, 0);
  const int tempLength = MultiByteToWideChar(CP_UTF8, 0, argv[3], -1, nullptr, 0);
  const int destinationLength = publish ? MultiByteToWideChar(CP_UTF8, 0, argv[4], -1, nullptr, 0) : 0;
  std::wstring parentPath(static_cast<std::size_t>(parentLength), L'\0');
  std::wstring childName(static_cast<std::size_t>(tempLength), L'\0');
  std::wstring destinationName(static_cast<std::size_t>(destinationLength), L'\0');
  MultiByteToWideChar(CP_UTF8, 0, argv[2], -1, parentPath.data(), parentLength);
  MultiByteToWideChar(CP_UTF8, 0, argv[3], -1, childName.data(), tempLength);
  if (publish) MultiByteToWideChar(CP_UTF8, 0, argv[4], -1, destinationName.data(), destinationLength);
  const HANDLE parent = OpenVerifiedDirectory(parentPath.c_str());
  if (parent == INVALID_HANDLE_VALUE) {
    std::cout << R"({"accepted":false,"code":"SECURE_TEMP_PARENT_REPARSE"})" << std::endl;
    return 1;
  }
  const bool resume = std::string(argv[1]) == "--resume-stream" || publish;
  const HANDLE child = CreateNoFollowTemp(parent, childName.c_str(), resume, publish);
  std::uint64_t acknowledgedBytes = 0;
  if (publish) {
    const std::uint64_t expectedBytes = _strtoui64(argv[5], nullptr, 10);
    const std::string expectedDigest(argv[6]);
    NativeFileIdInfo before{};
    std::uint64_t actualBytes = 0;
    const std::string actualDigest = child != INVALID_HANDLE_VALUE && GetFileInformationByHandleEx(child, kFileIdInfo, &before, sizeof(before)) ? sha256(child, actualBytes) : std::string();
    if (child == INVALID_HANDLE_VALUE || actualBytes != expectedBytes || actualDigest.size() != 64 || (!expectedDigest.empty() && (expectedDigest.size() != 64 || _stricmp(actualDigest.c_str(), expectedDigest.c_str()) != 0)) || !FlushFileBuffers(child)) {
      if (child != INVALID_HANDLE_VALUE) CloseHandle(child);
      CloseHandle(parent);
      std::cout << R"({"accepted":false,"code":"SECURE_TEMP_PUBLISH_INTEGRITY_FAILED"})" << std::endl;
      return 1;
    }
    NativeFileIdInfo after{};
    PublishIdentity identity = publishRelative(parent, child, destinationName, before, after);
    if (identity == PublishIdentity::Ambiguous) {
      CloseHandle(child);
      identity = verifyDestinationAfterClose(parent, destinationName, before) ? PublishIdentity::Verified : PublishIdentity::Ambiguous;
    } else CloseHandle(child);
    CloseHandle(parent);
    if (identity == PublishIdentity::Ambiguous) { std::cout << R"({"accepted":false,"code":"SECURE_TEMP_PUBLISH_AMBIGUOUS"})" << std::endl; return 1; }
    if (identity != PublishIdentity::Verified) { std::cout << R"({"accepted":false,"code":"SECURE_TEMP_PUBLISH_FAILED"})" << std::endl; return 1; }
    std::cout << R"({"accepted":true,"code":"SECURE_TEMP_PUBLISHED","bytes":)" << actualBytes << R"(,"sha256":")" << actualDigest << R"(","destination":")" << std::string(argv[4]) << R"("})" << std::endl;
    return 0;
  }
  if (std::string(argv[1]) == "--stream" || resume) {
    if (child == INVALID_HANDLE_VALUE) { CloseHandle(parent); std::cout << R"({"accepted":false,"code":"SECURE_TEMP_CREATE_FAILED"})" << std::endl; return 1; }
    LARGE_INTEGER size{};
    acknowledgedBytes = GetFileSizeEx(child, &size) ? static_cast<std::uint64_t>(size.QuadPart) : 0;
    std::cout << R"({"accepted":true,"code":"SECURE_TEMP_SIZE_ACK","bytes":)" << acknowledgedBytes << "}\n" << std::flush;
    char buffer[64 * 1024];
    DWORD read = 0;
    while (ReadFile(GetStdHandle(STD_INPUT_HANDLE), buffer, sizeof(buffer), &read, nullptr) && read != 0) {
      DWORD written = 0;
      if (!WriteFile(child, buffer, read, &written, nullptr) || written != read) { CloseHandle(child); CloseHandle(parent); std::cout << R"({"accepted":false,"code":"SECURE_TEMP_WRITE_FAILED"})" << std::endl; return 1; }
      if (!FlushFileBuffers(child)) { CloseHandle(child); CloseHandle(parent); std::cout << R"({"accepted":false,"code":"SECURE_TEMP_FLUSH_FAILED"})" << std::endl; return 1; }
      acknowledgedBytes += written;
      std::cout << R"({"accepted":true,"code":"SECURE_TEMP_WRITE_ACK","bytes":)" << acknowledgedBytes << "}\n" << std::flush;
    }
  }
  CloseHandle(parent);
  if (child == INVALID_HANDLE_VALUE) {
    std::cout << R"({"accepted":false,"code":"SECURE_TEMP_CREATE_FAILED"})" << std::endl;
    return 1;
  }
  CloseHandle(child);
  if (std::string(argv[1]) == "--stream" || resume) std::cout << R"({"accepted":true,"code":"SECURE_TEMP_STREAMED","bytes":)" << acknowledgedBytes << "}" << std::endl;
  else std::cout << R"({"accepted":true,"code":"SECURE_TEMP_CREATED"})" << std::endl;
  return 0;
}
