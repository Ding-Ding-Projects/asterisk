#define NOMINMAX
#include <windows.h>
#include <sddl.h>
#include <aclapi.h>
#include <algorithm>
#include <cstdint>
#include <iostream>
#include <string>
#include <vector>

namespace {
constexpr std::size_t kMaxMessageBytes = 128u * 1024u;
constexpr DWORD kClientTimeoutMs = 15'000;

std::wstring currentUserSid() {
  HANDLE token = nullptr;
  if (!OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &token)) return {};
  DWORD bytes = 0;
  GetTokenInformation(token, TokenUser, nullptr, 0, &bytes);
  std::wstring result;
  if (bytes != 0) {
    std::vector<std::byte> buffer(bytes);
    if (GetTokenInformation(token, TokenUser, buffer.data(), bytes, &bytes)) {
      auto* user = reinterpret_cast<TOKEN_USER*>(buffer.data());
      LPWSTR sid = nullptr;
      if (ConvertSidToStringSidW(user->User.Sid, &sid)) {
        result.assign(sid);
        LocalFree(sid);
      }
    }
  }
  CloseHandle(token);
  return result;
}

HANDLE createPipe(const std::wstring& name, PSECURITY_DESCRIPTOR* descriptor) {
  const auto sid = currentUserSid();
  if (sid.empty()) return INVALID_HANDLE_VALUE;
  const std::wstring sddl = L"D:P(A;;GA;;;SY)(A;;GA;;;" + sid + L")";
  if (!ConvertStringSecurityDescriptorToSecurityDescriptorW(sddl.c_str(), SDDL_REVISION_1, descriptor, nullptr)) {
    return INVALID_HANDLE_VALUE;
  }
  SECURITY_ATTRIBUTES attributes{};
  attributes.nLength = sizeof(attributes);
  attributes.lpSecurityDescriptor = *descriptor;
  attributes.bInheritHandle = FALSE;
  return CreateNamedPipeW(name.c_str(), PIPE_ACCESS_DUPLEX, PIPE_TYPE_BYTE | PIPE_READMODE_BYTE | PIPE_WAIT,
    2, static_cast<DWORD>(kMaxMessageBytes), static_cast<DWORD>(kMaxMessageBytes), kClientTimeoutMs, &attributes);
}

bool verifyPipeSecurity(HANDLE pipe, const std::wstring& sidText) {
  PSECURITY_DESCRIPTOR descriptor = nullptr;
  PSID owner = nullptr;
  PACL dacl = nullptr;
  if (GetSecurityInfo(pipe, SE_KERNEL_OBJECT, OWNER_SECURITY_INFORMATION | DACL_SECURITY_INFORMATION, &owner, nullptr, &dacl, nullptr, &descriptor) != ERROR_SUCCESS || !owner || !dacl) {
    if (descriptor) LocalFree(descriptor);
    return false;
  }
  PSID expectedUser = nullptr;
  PSID expectedSystem = nullptr;
  DWORD sidBytes = 0;
  ConvertStringSidToSidW(sidText.c_str(), &expectedUser);
  ConvertStringSidToSidW(L"S-1-5-18", &expectedSystem);
  const bool ownerOk = expectedUser && EqualSid(owner, expectedUser);
  bool daclOk = dacl->AceCount == 2;
  for (DWORD index = 0; daclOk && index < dacl->AceCount; ++index) {
    void* rawAce = nullptr;
    if (GetAce(dacl, index, &rawAce) == FALSE) { daclOk = false; break; }
    auto* header = static_cast<ACE_HEADER*>(rawAce);
    if (header->AceType != ACCESS_ALLOWED_ACE_TYPE || header->AceFlags != 0) { daclOk = false; break; }
    auto* ace = static_cast<ACCESS_ALLOWED_ACE*>(rawAce);
    PSID aceSid = reinterpret_cast<PSID>(&ace->SidStart);
    const bool identityOk = (expectedUser && EqualSid(aceSid, expectedUser)) || (expectedSystem && EqualSid(aceSid, expectedSystem));
    const bool fullControl = (ace->Mask & GENERIC_ALL) == GENERIC_ALL || (ace->Mask & 0x001f01ffu) == 0x001f01ffu;
    if (!identityOk || !fullControl) { daclOk = false; }
  }
  if (expectedUser) LocalFree(expectedUser);
  if (expectedSystem) LocalFree(expectedSystem);
  LocalFree(descriptor);
  return ownerOk && daclOk;
}

bool readLine(HANDLE pipe, std::string& result) {
  result.clear();
  const ULONGLONG deadline = GetTickCount64() + kClientTimeoutMs;
  char byte = 0;
  while (result.size() <= kMaxMessageBytes && GetTickCount64() < deadline) {
    DWORD available = 0;
    if (!PeekNamedPipe(pipe, nullptr, 0, nullptr, &available, nullptr)) return false;
    if (available == 0) { Sleep(10); continue; }
    DWORD read = 0;
    if (ReadFile(pipe, &byte, 1, &read, nullptr) && read == 1) {
      if (byte == '\n') return true;
      result.push_back(byte);
      continue;
    }
    if (GetLastError() == ERROR_BROKEN_PIPE) return false;
    Sleep(10);
  }
  return false;
}

bool writeLine(HANDLE pipe, const std::string& line) {
  const std::string framed = line + "\n";
  DWORD written = 0;
  return WriteFile(pipe, framed.data(), static_cast<DWORD>(framed.size()), &written, nullptr)
      && written == framed.size();
}
}

int main(int argc, char** argv) {
  if (argc != 3 || std::string(argv[1]) != "--listen") return 2;
  const std::string narrowName(argv[2]);
  const std::wstring pipeName(narrowName.begin(), narrowName.end());
  const auto sid = currentUserSid();
  if (sid.empty()) return 3;
  bool readySent = false;
  for (;;) {
    PSECURITY_DESCRIPTOR descriptor = nullptr;
    const HANDLE pipe = createPipe(pipeName, &descriptor);
    if (pipe == INVALID_HANDLE_VALUE) return 3;
    const bool aclOk = verifyPipeSecurity(pipe, sid);
    LocalFree(descriptor);
    if (!aclOk) { CloseHandle(pipe); return 4; }
    if (!readySent) { std::cout << "READY\n" << std::flush; readySent = true; }
    const BOOL connected = ConnectNamedPipe(pipe, nullptr) ? TRUE : (GetLastError() == ERROR_PIPE_CONNECTED);
    if (!connected) {
      CloseHandle(pipe);
      continue;
    }
    std::string message;
    if (readLine(pipe, message) && !message.empty()) {
      std::cout << message << "\n" << std::flush;
      std::string receipt;
      if (readLine(GetStdHandle(STD_INPUT_HANDLE), receipt) && receipt.size() <= kMaxMessageBytes) {
        writeLine(pipe, receipt);
      }
    }
    FlushFileBuffers(pipe);
    DisconnectNamedPipe(pipe);
    CloseHandle(pipe);
  }
}
