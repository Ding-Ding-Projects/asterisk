#define NOMINMAX
#include <windows.h>
#include <string>
#include <iostream>

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

extern "C" __declspec(dllexport) HANDLE CreateNoFollowTemp(const HANDLE parent, const wchar_t* fullPath) {
  if (!parent || parent == INVALID_HANDLE_VALUE || !fullPath) return INVALID_HANDLE_VALUE;
  return CreateFileW(fullPath, GENERIC_WRITE, FILE_SHARE_READ, nullptr, CREATE_NEW, FILE_ATTRIBUTE_TEMPORARY | FILE_FLAG_OPEN_REPARSE_POINT | FILE_FLAG_WRITE_THROUGH, nullptr);
}

int main(int argc, char** argv) {
  if (argc != 4 || std::string(argv[1]) != "--create") {
    std::cout << R"({"accepted":false,"code":"SECURE_TEMP_ARGUMENTS"})" << std::endl;
    return 2;
  }
  const int parentLength = MultiByteToWideChar(CP_UTF8, 0, argv[2], -1, nullptr, 0);
  const int tempLength = MultiByteToWideChar(CP_UTF8, 0, argv[3], -1, nullptr, 0);
  std::wstring parentPath(static_cast<std::size_t>(parentLength), L'\0');
  std::wstring tempPath(static_cast<std::size_t>(tempLength), L'\0');
  MultiByteToWideChar(CP_UTF8, 0, argv[2], -1, parentPath.data(), parentLength);
  MultiByteToWideChar(CP_UTF8, 0, argv[3], -1, tempPath.data(), tempLength);
  const HANDLE parent = OpenVerifiedDirectory(parentPath.c_str());
  if (parent == INVALID_HANDLE_VALUE) {
    std::cout << R"({"accepted":false,"code":"SECURE_TEMP_PARENT_REPARSE"})" << std::endl;
    return 1;
  }
  const HANDLE child = CreateNoFollowTemp(parent, tempPath.c_str());
  CloseHandle(parent);
  if (child == INVALID_HANDLE_VALUE) {
    std::cout << R"({"accepted":false,"code":"SECURE_TEMP_CREATE_FAILED"})" << std::endl;
    return 1;
  }
  CloseHandle(child);
  std::cout << R"({"accepted":true,"code":"SECURE_TEMP_CREATED"})" << std::endl;
  return 0;
}
