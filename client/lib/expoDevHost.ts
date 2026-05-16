import Constants from "expo-constants";
import { getExpoGoProjectConfig } from "expo";

/**
 * Metro / dev machine host as seen from Expo Go (e.g. `192.168.100.21:8081`).
 */
export function getMetroDebuggerHost(): string | null {
  const fromNative = getExpoGoProjectConfig()?.debuggerHost;
  if (fromNative) {
    return fromNative;
  }

  const hostUri = Constants.expoConfig?.hostUri;
  if (typeof hostUri === "string" && hostUri.length > 0) {
    return hostUri;
  }

  const manifest = Constants.expoConfig as
    | { debuggerHost?: string; hostUri?: string }
    | undefined;
  if (manifest?.debuggerHost) {
    return manifest.debuggerHost;
  }

  return null;
}

export function getMetroLanHostname(): string | null {
  const debuggerHost = getMetroDebuggerHost();
  if (!debuggerHost) {
    return null;
  }
  return debuggerHost.split(":")[0] ?? null;
}
