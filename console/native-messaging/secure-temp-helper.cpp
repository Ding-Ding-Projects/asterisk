#define NOMINMAX
#include <windows.h>
#include <string>

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
