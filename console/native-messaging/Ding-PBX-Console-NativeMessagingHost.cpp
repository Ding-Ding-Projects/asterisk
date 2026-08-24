#define NOMINMAX
#include <windows.h>
#include <algorithm>
#include <cstdint>
#include <iostream>
#include <fstream>
#include <cstdlib>
#include <iterator>
#include <regex>
#include <string>

namespace {
constexpr char kExtensionId[] = "dnpkplcgjmipnndmghkhljjoefjhidab";
constexpr std::uint32_t kMaxMessageBytes = 128u * 1024u;

bool readExact(void* target, std::size_t bytes, ULONGLONG deadlineMs) {
  const HANDLE input = GetStdHandle(STD_INPUT_HANDLE);
  auto* output = static_cast<char*>(target);
  std::size_t offset = 0;
  while (offset < bytes) {
    DWORD available = 0;
    if (!PeekNamedPipe(input, nullptr, 0, nullptr, &available, nullptr)) return false;
    if (available == 0) {
      if (GetTickCount64() >= deadlineMs) return false;
      Sleep(10);
      continue;
    }
    DWORD read = 0;
    const DWORD requested = static_cast<DWORD>(std::min<std::size_t>(bytes - offset, available));
    if (!ReadFile(input, output + offset, requested, &read, nullptr) || read == 0) return false;
    offset += read;
  }
  return true;
}

void writeMessage(const std::string& body) {
  const auto size = static_cast<std::uint32_t>(body.size());
  std::cout.write(reinterpret_cast<const char*>(&size), sizeof(size));
  std::cout.write(body.data(), static_cast<std::streamsize>(body.size()));
  std::cout.flush();
}

bool containsExactIdentity(const std::string& body) {
  return body.find("\"type\"") != std::string::npos
      && body.find("download-handoff") != std::string::npos
      && body.find(kExtensionId) != std::string::npos
      && body.find("\"handoff\"") != std::string::npos;
}

std::string expandConfigPath() {
  char* localAppData = nullptr;
  std::size_t size = 0;
  _dupenv_s(&localAppData, &size, "LOCALAPPDATA");
  const std::string root = localAppData ? localAppData : "";
  if (localAppData) free(localAppData);
  return root + "\\Ding-Ding-Projects\\Asterisk\\native-messaging\\ingress-config.json";
}

bool readConfig(std::string& pipe, std::string& challenge) {
  std::ifstream file(expandConfigPath(), std::ios::binary);
  if (!file) return false;
  const std::string json((std::istreambuf_iterator<char>(file)), std::istreambuf_iterator<char>());
  std::smatch match;
  if (!std::regex_search(json, match, std::regex("\\\"pipeName\\\"\\s*:\\s*\\\"([^\\\"]+)\\\""))) return false;
  pipe = match[1].str();
  if (!std::regex_search(json, match, std::regex("\\\"challenge\\\"\\s*:\\s*\\\"([0-9a-f]{64})\\\""))) return false;
  challenge = match[1].str();
  return true;
}
}

int main() {
  std::uint32_t size = 0;
  if (!readExact(&size, sizeof(size), GetTickCount64() + 15'000) || size == 0 || size > kMaxMessageBytes) {
    writeMessage(R"({"accepted":false,"detail":"The native message size was refused."})");
    return 1;
  }
  std::string body(size, '\0');
  if (!readExact(body.data(), body.size(), GetTickCount64() + 30'000) || !containsExactIdentity(body)) {
    writeMessage(R"({"accepted":false,"detail":"The extension identity or handoff shape was refused."})");
    return 1;
  }

  std::string pipeName;
  std::string challenge;
  if (!readConfig(pipeName, challenge)) {
    writeMessage(R"({"accepted":false,"detail":"The native ingress installation challenge was unavailable."})");
    return 1;
  }
  const std::wstring pipeWide(pipeName.begin(), pipeName.end());
  if (!WaitNamedPipeW(pipeWide.c_str(), 15'000)) {
    writeMessage(R"({"accepted":false,"detail":"The desktop native ingress pipe was unavailable."})");
    return 1;
  }
  const HANDLE pipe = CreateFileW(pipeWide.c_str(), GENERIC_READ | GENERIC_WRITE, 0, nullptr, OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL, nullptr);
  if (pipe == INVALID_HANDLE_VALUE) {
    writeMessage(R"({"accepted":false,"detail":"The desktop native ingress pipe was unavailable."})");
    return 1;
  }
  const std::string line = "{\"challenge\":\"" + challenge + "\",\"payload\":" + body + "}\n";
  DWORD written = 0;
  if (!WriteFile(pipe, line.data(), static_cast<DWORD>(line.size()), &written, nullptr)) {
    CloseHandle(pipe);
    writeMessage(R"({"accepted":false,"detail":"The desktop native ingress rejected the handoff."})");
    return 1;
  }
  std::string response;
  char buffer[4096];
  DWORD read = 0;
  const auto responseDeadline = GetTickCount64() + 15'000;
  while (GetTickCount64() < responseDeadline) {
    DWORD available = 0;
    if (!PeekNamedPipe(pipe, nullptr, 0, nullptr, &available, nullptr)) break;
    if (available == 0) { Sleep(10); continue; }
    if (!ReadFile(pipe, buffer, sizeof(buffer), &read, nullptr) || read == 0) break;
    response.append(buffer, buffer + read);
    if (response.find('\n') != std::string::npos || response.size() > kMaxMessageBytes) break;
  }
  CloseHandle(pipe);
  if (response.empty() || response.size() > kMaxMessageBytes) {
    writeMessage(R"({"accepted":false,"detail":"The desktop native ingress returned no bounded receipt."})");
    return 1;
  }
  const auto newline = response.find('\n');
  if (newline == std::string::npos) {
    writeMessage(R"({"accepted":false,"detail":"The desktop native ingress receipt was not framed."})");
    return 1;
  }
  response.resize(newline);
  writeMessage(response);
  return 0;
}
