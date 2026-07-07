#include <node_api.h>
#include <string>

#ifdef _WIN32
#include <windows.h>

struct SearchState { HWND workerw = nullptr; HWND defviewParent = nullptr; };

static BOOL CALLBACK EnumWorkerW(HWND hwnd, LPARAM lparam) {
  auto* state = reinterpret_cast<SearchState*>(lparam);
  HWND defview = FindWindowExW(hwnd, nullptr, L"SHELLDLL_DefView", nullptr);
  if (defview) {
    state->defviewParent = hwnd;
    state->workerw = FindWindowExW(nullptr, hwnd, L"WorkerW", nullptr);
  }
  return TRUE;
}

static void SetString(napi_env env, napi_value object, const char* key, const std::string& value) {
  napi_value jsValue;
  napi_create_string_utf8(env, value.c_str(), value.size(), &jsValue);
  napi_set_named_property(env, object, key, jsValue);
}

static void SetBool(napi_env env, napi_value object, const char* key, bool value) {
  napi_value jsValue;
  napi_get_boolean(env, value, &jsValue);
  napi_set_named_property(env, object, key, jsValue);
}

static napi_value Attach(napi_env env, napi_callback_info info) {
  napi_value result;
  napi_create_object(env, &result);
  size_t argc = 1;
  napi_value args[1];
  napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
  if (argc < 1) { SetBool(env, result, "ok", false); SetString(env, result, "reason", "missing Electron HWND buffer"); return result; }
  void* data = nullptr; size_t len = 0;
  if (napi_get_buffer_info(env, args[0], &data, &len) != napi_ok || len < sizeof(HWND)) {
    SetBool(env, result, "ok", false); SetString(env, result, "reason", "invalid Electron HWND buffer"); return result;
  }
  HWND electronHwnd = *reinterpret_cast<HWND*>(data);
  if (!IsWindow(electronHwnd)) { SetBool(env, result, "ok", false); SetString(env, result, "reason", "Electron HWND is not a valid window"); return result; }

  HWND progman = FindWindowW(L"Progman", nullptr);
  if (!progman) { SetBool(env, result, "ok", false); SetString(env, result, "reason", "Progman window not found"); return result; }
  DWORD_PTR unused = 0;
  SendMessageTimeoutW(progman, 0x052C, 0, 0, SMTO_NORMAL, 1000, &unused);
  SendMessageTimeoutW(progman, 0x052C, 0xD, 0, SMTO_NORMAL, 1000, &unused);

  SearchState state;
  EnumWindows(EnumWorkerW, reinterpret_cast<LPARAM>(&state));
  HWND target = state.workerw ? state.workerw : progman;
  if (!target) { SetBool(env, result, "ok", false); SetString(env, result, "reason", "WorkerW target not found"); return result; }

  LONG_PTR ex = GetWindowLongPtrW(electronHwnd, GWL_EXSTYLE);
  ex |= WS_EX_TRANSPARENT | WS_EX_NOACTIVATE | WS_EX_TOOLWINDOW;
  ex &= ~WS_EX_APPWINDOW;
  SetWindowLongPtrW(electronHwnd, GWL_EXSTYLE, ex);
  if (!SetParent(electronHwnd, target)) { SetBool(env, result, "ok", false); SetString(env, result, "reason", "SetParent failed: " + std::to_string(GetLastError())); return result; }
  SetWindowPos(electronHwnd, HWND_BOTTOM, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE | SWP_FRAMECHANGED | SWP_SHOWWINDOW);
  SetBool(env, result, "ok", true); SetString(env, result, "reason", state.workerw ? "attached to WorkerW" : "attached to Progman fallback"); return result;
}
#else
static napi_value Attach(napi_env env, napi_callback_info) { napi_value result, ok, reason; napi_create_object(env, &result); napi_get_boolean(env, false, &ok); napi_set_named_property(env, result, "ok", ok); napi_create_string_utf8(env, "WorkerW is only available on Windows", NAPI_AUTO_LENGTH, &reason); napi_set_named_property(env, result, "reason", reason); return result; }
#endif

static napi_value Init(napi_env env, napi_value exports) {
  napi_value fn;
  napi_create_function(env, "attach", NAPI_AUTO_LENGTH, Attach, nullptr, &fn);
  napi_set_named_property(env, exports, "attach", fn);
  return exports;
}
NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)
