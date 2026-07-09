import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { getApiUrl } from "@/lib/query-client";
import { registerExpoPushToken } from "@/lib/pushNotifications";
import { clearHistory, store } from "@/store";

WebBrowser.maybeCompleteAuthSession();

interface User {
  id: string;
  email: string;
  userId: string;
  emailVerified: boolean;
  credits: number;
  subscriptionStatus: string;
  subscriptionPlan: string | null;
  subscriptionExpiresAt?: string;
  adsWatchedToday?: number;
  referralCode?: string;
}

interface OAuthConfig {
  enabled: boolean;
  googleWebClientId?: string;
  googleIosClientId?: string;
  googleAndroidClientId?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isEmailVerified: boolean;
  isGoogleAuthEnabled: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, referralCode?: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateCredits: (newBalance: number) => void;
  verifyEmail: (code: string) => Promise<{ success: boolean; error?: string }>;
  resendVerification: () => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_TOKEN_KEY = "@ai_storiz_auth_token";
const OAUTH_CONFIG_CACHE_KEY = "@ai_storiz_oauth_config";
const OAUTH_CONFIG_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/** Allow slow cold starts / DNS failover; production API can exceed 10s on first connect. */
const AUTH_FETCH_TIMEOUT_MS = 30000;

type ParseJsonResult<T> = { ok: true; data: T } | { ok: false; error: string };

async function parseJsonResponse<T = Record<string, unknown>>(
  response: Response,
): Promise<ParseJsonResult<T>> {
  const text = await response.text();
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      ok: false,
      error:
        "Empty response from the API. Run the backend (npm run server:dev on port 5000). On a phone, use the same Wi‑Fi and ensure the app reaches your computer’s IP, not only localhost.",
    };
  }
  try {
    return { ok: true, data: JSON.parse(trimmed) as T };
  } catch {
    return {
      ok: false,
      error: `Invalid response from server (HTTP ${response.status}). The API may be down or the wrong URL is configured.`,
    };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [oauthConfig, setOauthConfig] = useState<OAuthConfig>({ enabled: false });
  const [oauthConfigLoaded, setOauthConfigLoaded] = useState(false);
  const promptAsyncRef = React.useRef<(() => Promise<any>) | null>(null);

  useEffect(() => {
    loadStoredAuth();
    loadOAuthConfig();
  }, []);

  async function loadOAuthConfig() {
    // Serve from cache first so the login screen is never blocked by this fetch
    try {
      const cached = await AsyncStorage.getItem(OAUTH_CONFIG_CACHE_KEY);
      if (cached) {
        const { data, ts } = JSON.parse(cached) as { data: OAuthConfig; ts: number };
        if (Date.now() - ts < OAUTH_CONFIG_CACHE_TTL_MS) {
          setOauthConfig(data);
          setOauthConfigLoaded(true);
          // Refresh in background without blocking
          refreshOAuthConfigInBackground();
          return;
        }
      }
    } catch {
      // ignore cache read errors
    }

    await refreshOAuthConfigInBackground();
  }

  async function refreshOAuthConfigInBackground() {
    try {
      const controller = new AbortController();
      const timerId = setTimeout(() => controller.abort(), AUTH_FETCH_TIMEOUT_MS);
      const response = await fetch(new URL("/api/oauth-config", getApiUrl()).toString(), {
        signal: controller.signal,
      });
      clearTimeout(timerId);
      if (response.ok) {
        const parsed = await parseJsonResponse<OAuthConfig>(response);
        if (parsed.ok) {
          setOauthConfig(parsed.data);
          await AsyncStorage.setItem(
            OAUTH_CONFIG_CACHE_KEY,
            JSON.stringify({ data: parsed.data, ts: Date.now() }),
          ).catch(() => {});
        }
      }
    } catch (error) {
      if (__DEV__) {
        console.warn(
          `[Auth] OAuth config unavailable (${getApiUrl()}). Start the API with npm run server:dev, or set EXPO_PUBLIC_API_URL to your deployed API.`,
          error,
        );
      }
    } finally {
      setOauthConfigLoaded(true);
    }
  }

  async function loadStoredAuth() {
    try {
      const storedToken = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      if (storedToken) {
        setToken(storedToken);
        await fetchUser(storedToken);
      }
    } catch (error) {
      console.error("Failed to load stored auth:", error);
    } finally {
      setIsLoading(false);
    }
  }

  const fetchUser = useCallback(async (authToken: string) => {
    try {
      const response = await fetch(new URL("/api/auth/me", getApiUrl()).toString(), {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      
      if (response.ok) {
        const parsed = await parseJsonResponse<User>(response);
        if (parsed.ok) {
          setUser(parsed.data);
        }
      } else {
        await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
        setToken(null);
        setUser(null);
      }
    } catch (error) {
      console.error("Failed to fetch user:", error);
    }
  }, []);

  const registerPushToken = useCallback(async (authToken: string) => {
    try {
      const registration = await registerExpoPushToken();
      if (!registration) {
        return;
      }

      await fetch(new URL("/api/notifications/register-token", getApiUrl()).toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          token: registration.token,
          platform: registration.platform,
        }),
      });
    } catch (error) {
      if (__DEV__) {
        console.warn("Failed to register push token:", error);
      }
    }
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const controller = new AbortController();
      const timerId = setTimeout(() => controller.abort(), AUTH_FETCH_TIMEOUT_MS);
      let response: Response;
      try {
        response = await fetch(new URL("/api/auth/login", getApiUrl()).toString(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timerId);
      }

      const parsed = await parseJsonResponse<{
        token?: string;
        user?: User;
        error?: string;
      }>(response);
      if (!parsed.ok) {
        return { success: false, error: parsed.error };
      }
      const data = parsed.data;

      if (response.ok) {
        if (!data.token || !data.user) {
          return {
            success: false,
            error: "Invalid login response from server (missing token or user).",
          };
        }
        await AsyncStorage.setItem(AUTH_TOKEN_KEY, data.token);
        setToken(data.token);
        setUser(data.user);
        registerPushToken(data.token);
        return { success: true };
      } else {
        return { success: false, error: data.error || "Login failed" };
      }
    } catch (error: any) {
      if (error?.name === "AbortError") {
        return { success: false, error: "Request timed out. Please check your connection and try again." };
      }
      return { success: false, error: error.message || "Network error" };
    }
  }, [registerPushToken]);

  const register = useCallback(async (email: string, password: string, referralCode?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const controller = new AbortController();
      const timerId = setTimeout(() => controller.abort(), AUTH_FETCH_TIMEOUT_MS);
      let response: Response;
      try {
        response = await fetch(new URL("/api/auth/register", getApiUrl()).toString(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, referralCode: referralCode?.trim() || undefined }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timerId);
      }

      const parsed = await parseJsonResponse<{
        token?: string;
        user?: User;
        error?: string;
      }>(response);
      if (!parsed.ok) {
        return { success: false, error: parsed.error };
      }
      const data = parsed.data;

      if (response.ok) {
        if (!data.token || !data.user) {
          return {
            success: false,
            error: "Invalid registration response from server (missing token or user).",
          };
        }
        await AsyncStorage.setItem(AUTH_TOKEN_KEY, data.token);
        setToken(data.token);
        setUser(data.user);
        registerPushToken(data.token);
        return { success: true };
      } else {
        return { success: false, error: data.error || "Registration failed" };
      }
    } catch (error: any) {
      if (error?.name === "AbortError") {
        return { success: false, error: "Request timed out. Please check your connection and try again." };
      }
      return { success: false, error: error.message || "Network error" };
    }
  }, [registerPushToken]);

  const loginWithGoogle = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!oauthConfig.enabled) {
        return { success: false, error: "Google Sign-In is not configured" };
      }

      if (!promptAsyncRef.current) {
        return { success: false, error: "Google Sign-In is still loading. Please try again." };
      }
      const result = await promptAsyncRef.current();
      
      if (result?.type !== "success") {
        return { success: false, error: result?.type === "cancel" ? "Login cancelled" : "Google login failed" };
      }
      
      const { id_token, access_token } = result.params;
      
      // Send token to backend for verification
      const response = await fetch(new URL("/api/auth/google", getApiUrl()).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          idToken: id_token,
          accessToken: access_token 
        }),
      });

      const parsed = await parseJsonResponse<{
        token?: string;
        user?: User;
        error?: string;
      }>(response);
      if (!parsed.ok) {
        return { success: false, error: parsed.error };
      }
      const data = parsed.data;

      if (response.ok) {
        if (!data.token || !data.user) {
          return {
            success: false,
            error: "Invalid Google sign-in response from server.",
          };
        }
        await AsyncStorage.setItem(AUTH_TOKEN_KEY, data.token);
        setToken(data.token);
        setUser(data.user);
        registerPushToken(data.token);
        return { success: true };
      } else {
        return { success: false, error: data.error || "Google login failed" };
      }
    } catch (error: any) {
      console.error("Google login error:", error);
      return { success: false, error: error.message || "Google login failed" };
    }
  }, [registerPushToken, oauthConfig]);

  const logout = useCallback(async () => {
    try {
      if (token) {
        await fetch(new URL("/api/auth/logout", getApiUrl()).toString(), {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch (error) {
      console.error("Logout request failed:", error);
    }
    
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    setToken(null);
    setUser(null);
    store.dispatch(clearHistory());
  }, [token]);

  const refreshUser = useCallback(async () => {
    const active = token ?? (await AsyncStorage.getItem(AUTH_TOKEN_KEY));
    if (active) {
      await fetchUser(active);
    }
  }, [token, fetchUser]);

  const updateCredits = useCallback((newBalance: number) => {
    setUser((prev) => (prev ? { ...prev, credits: newBalance } : null));
  }, []);

  const verifyEmail = useCallback(async (code: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const url = new URL("/api/auth/verify-email", getApiUrl()).toString();
      
      // Get token from storage to avoid stale closure issues
      const currentToken = token || await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      
      if (!currentToken) {
        return { success: false, error: "Not authenticated. Please log in again." };
      }
      
      const response = await fetch(url, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify({ code }),
      });

      const parsed = await parseJsonResponse<{ error?: string }>(response);
      if (!parsed.ok) {
        return { success: false, error: parsed.error };
      }
      const data = parsed.data;

      if (response.ok) {
        await fetchUser(currentToken);
        return { success: true };
      } else {
        return { success: false, error: data.error || "Verification failed" };
      }
    } catch (error: any) {
      console.error("Verify email error:", error);
      return { success: false, error: "Unable to connect to server. Please check your internet connection." };
    }
  }, [token, fetchUser]);

  const resendVerification = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      // Get token from storage to avoid stale closure issues
      const currentToken = token || await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      
      if (!currentToken) {
        return { success: false, error: "Not authenticated. Please log in again." };
      }
      
      const response = await fetch(new URL("/api/auth/resend-verification", getApiUrl()).toString(), {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`,
        },
      });

      const parsed = await parseJsonResponse<{ error?: string }>(response);
      if (!parsed.ok) {
        return { success: false, error: parsed.error };
      }
      const data = parsed.data;

      if (response.ok) {
        return { success: true };
      } else {
        return { success: false, error: data.error || "Failed to resend code" };
      }
    } catch (error: any) {
      return { success: false, error: error.message || "Network error" };
    }
  }, [token]);

  const isGoogleAuthEnabled = useMemo(() => {
    if (!oauthConfig.enabled) return false;
    if (Platform.OS === "android") return !!oauthConfig.googleAndroidClientId;
    if (Platform.OS === "ios") return !!oauthConfig.googleIosClientId;
    return !!oauthConfig.googleWebClientId;
  }, [
    oauthConfig.enabled,
    oauthConfig.googleAndroidClientId,
    oauthConfig.googleIosClientId,
    oauthConfig.googleWebClientId,
  ]);

  const authValue = useMemo(
    () => ({
      user,
      token,
      isLoading,
      isAuthenticated: !!user,
      isEmailVerified: user?.emailVerified ?? false,
      isGoogleAuthEnabled,
      login,
      register,
      loginWithGoogle,
      logout,
      refreshUser,
      updateCredits,
      verifyEmail,
      resendVerification,
    }),
    [
      user,
      token,
      isLoading,
      isGoogleAuthEnabled,
      user?.emailVerified,
      login,
      register,
      loginWithGoogle,
      logout,
      refreshUser,
      updateCredits,
      verifyEmail,
      resendVerification,
    ]
  );

  return (
    <AuthContext.Provider value={authValue}>
      {oauthConfigLoaded && isGoogleAuthEnabled ? (
        <GoogleAuthInitializer
          config={{
            webClientId: oauthConfig.googleWebClientId || "",
            iosClientId: oauthConfig.googleIosClientId || undefined,
            androidClientId: oauthConfig.googleAndroidClientId || undefined,
          }}
          promptAsyncRef={promptAsyncRef}
        />
      ) : null}
      {children}
    </AuthContext.Provider>
  );
}

function GoogleAuthInitializer({ config, promptAsyncRef }: {
  config: { webClientId: string; iosClientId?: string; androidClientId?: string };
  promptAsyncRef: React.MutableRefObject<(() => Promise<any>) | null>;
}) {
  const [, , promptAsync] = Google.useAuthRequest(config);

  useEffect(() => {
    promptAsyncRef.current = promptAsync;
    return () => { promptAsyncRef.current = null; };
  }, [promptAsync, promptAsyncRef]);

  return null;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
