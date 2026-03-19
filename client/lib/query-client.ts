import { QueryClient, QueryFunction } from "@tanstack/react-query";

/**
 * Gets the base URL for the Express API server (e.g., "http://localhost:3000")
 * @returns {string} The API base URL
 */
export function getApiUrl(): string {
  // On web, we need to determine the correct API URL
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const currentPort = window.location.port;
    
    // If already on port 5000, use same origin (correct server)
    if (currentPort === '5000') {
      return window.location.origin + '/';
    }
    
    // On Replit dev domains not on port 5000, use port 5000
    // External port 5000 maps to Express server directly
    if (hostname.includes('.replit.dev') || hostname.includes('.repl.co')) {
      return `${protocol}//${hostname}:5000/`;
    }
    
    // For localhost development, always use port 5000
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `${protocol}//${hostname}:5000/`;
    }
    
    // For production (deployed), use same origin (Express serves everything)
    return window.location.origin + '/';
  }
  
  // For native apps, use the configured domain with port 5000
  let host = process.env.EXPO_PUBLIC_DOMAIN;

  if (!host) {
    throw new Error("EXPO_PUBLIC_DOMAIN is not set");
  }

  // Ensure port 5000 is used for native apps
  if (!host.includes(':')) {
    host = host + ':5000';
  }
  
  let url = new URL(`https://${host}`);

  return url.href;
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

// Simple event emitter for history refresh
type HistoryRefreshListener = () => void;
const historyRefreshListeners: Set<HistoryRefreshListener> = new Set();

export function onHistoryRefresh(listener: HistoryRefreshListener): () => void {
  historyRefreshListeners.add(listener);
  return () => {
    historyRefreshListeners.delete(listener);
  };
}

export function triggerHistoryRefresh(): void {
  historyRefreshListeners.forEach((listener) => listener());
}
