import { getExpoGoProjectConfig } from "expo";
import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { Platform } from "react-native";

function normalizeApiBaseUrl(raw: string): string {
  const url = new URL(raw.trim());
  return url.href.endsWith("/") ? url.href : `${url.href}/`;
}

function isLikelyLocalDevHost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "10.0.2.2" ||
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)
  );
}

/**
 * Base URL for API `fetch` calls.
 *
 * Prefer `EXPO_PUBLIC_API_URL` in `.env` (inlined by Expo). Example:
 * `https://aistorizapi.fiocreatives.com/`
 *
 * If unset, uses dev heuristics (web: localhost / Replit; native: Expo Go host or emulator).
 */
export function getApiUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configured) {
    try {
      return normalizeApiBaseUrl(configured);
    } catch {
      console.warn(
        "[getApiUrl] Invalid EXPO_PUBLIC_API_URL; falling back to dev defaults.",
      );
    }
  }

  if (typeof window !== "undefined" && window.location) {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const currentPort = window.location.port;

    if (currentPort === "5000") {
      return `${window.location.origin}/`;
    }

    if (hostname.includes(".replit.") || hostname.includes(".repl.co")) {
      return `${protocol}//${hostname}:5000/`;
    }

    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return `${protocol}//${hostname}:5000/`;
    }

    return `${window.location.origin}/`;
  }

  const debuggerHost = getExpoGoProjectConfig()?.debuggerHost;
  const hostWithPort = debuggerHost
    ? `${debuggerHost.split(":")[0]}:5000`
    : Platform.OS === "android"
      ? "10.0.2.2:5000"
      : "localhost:5000";

  const hostPart = hostWithPort.split(":")[0] ?? "";
  const proto = isLikelyLocalDevHost(hostPart) ? "http:" : "https:";
  return `${proto}//${hostWithPort}/`;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  route: string,
  data?: unknown | undefined,
): Promise<Response> {
  const baseUrl = getApiUrl();
  const url = new URL(route, baseUrl);

  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const baseUrl = getApiUrl();
    const url = new URL(queryKey.join("/") as string, baseUrl);

    const res = await fetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
