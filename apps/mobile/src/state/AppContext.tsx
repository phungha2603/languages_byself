import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import type { AuthResult } from "../api/client";
import { ApiClient, ApiError } from "../api/client";

const STORAGE_KEYS = {
  apiBaseUrl: "englishcoach.apiBaseUrl",
  userId: "englishcoach.userId",
  accessToken: "englishcoach.accessToken",
  stageId: "englishcoach.stageId",
};

/**
 * In a browser, default to the API living on the same origin (`/api`) —
 * true once deployed, since the backend serves the web build itself (see
 * apps/api's Dockerfile + public/ static root). On `localhost` specifically
 * we're almost certainly in local dev with Metro and the API as two
 * separate processes on different ports, so keep pointing at :3000 there.
 * Native builds (no `window`) fall back to the same local-dev default;
 * Settings lets you override it either way.
 */
function resolveDefaultApiBaseUrl(): string {
  if (typeof window !== "undefined" && window.location?.hostname && window.location.hostname !== "localhost") {
    return `${window.location.origin}/api`;
  }
  return "http://localhost:3000/api";
}

const DEFAULT_API_BASE_URL = resolveDefaultApiBaseUrl();

interface AppContextValue {
  ready: boolean;
  apiBaseUrl: string;
  setApiBaseUrl: (url: string) => Promise<void>;
  userId: string | null;
  accessToken: string | null;
  /** Stores the session returned by POST /users or POST /auth/google. */
  login: (auth: AuthResult) => Promise<void>;
  logout: () => Promise<void>;
  stageId: string;
  setStageId: (id: string) => Promise<void>;
  api: ApiClient;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false);
  const [apiBaseUrl, setApiBaseUrlState] = useState(DEFAULT_API_BASE_URL);
  const [userId, setUserIdState] = useState<string | null>(null);
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [stageId, setStageIdState] = useState("foundation");

  useEffect(() => {
    (async () => {
      const [storedUrl, storedUserId, storedToken, storedStage] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.apiBaseUrl),
        AsyncStorage.getItem(STORAGE_KEYS.userId),
        AsyncStorage.getItem(STORAGE_KEYS.accessToken),
        AsyncStorage.getItem(STORAGE_KEYS.stageId),
      ]);
      const baseUrl = storedUrl || DEFAULT_API_BASE_URL;
      if (storedUrl) setApiBaseUrlState(storedUrl);
      if (storedStage) setStageIdState(storedStage);

      if (storedUserId && storedToken) {
        // A stored session token can go stale (expired, or revoked by a password change) between
        // app launches. Check it here rather than discovering it mid-session — an invalid token
        // clears the stored session so Settings falls back to the login/register screen instead
        // of silently sitting in a broken "logged in" state with every request failing.
        try {
          await new ApiClient(baseUrl, storedToken).getUser(storedUserId);
          setUserIdState(storedUserId);
          setAccessTokenState(storedToken);
        } catch (err) {
          const status = err instanceof ApiError ? err.status : null;
          if (status === 401 || status === 403) {
            await Promise.all([AsyncStorage.removeItem(STORAGE_KEYS.userId), AsyncStorage.removeItem(STORAGE_KEYS.accessToken)]);
          } else {
            // Network/server hiccup, not an invalid token — keep the session for when it's back.
            setUserIdState(storedUserId);
            setAccessTokenState(storedToken);
          }
        }
      }
      setReady(true);
    })();
  }, []);

  const setApiBaseUrl = useCallback(async (url: string) => {
    setApiBaseUrlState(url);
    await AsyncStorage.setItem(STORAGE_KEYS.apiBaseUrl, url);
  }, []);

  const login = useCallback(async (auth: AuthResult) => {
    setUserIdState(auth.user.id);
    setAccessTokenState(auth.accessToken);
    setStageIdState(auth.user.currentStageId);
    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEYS.userId, auth.user.id),
      AsyncStorage.setItem(STORAGE_KEYS.accessToken, auth.accessToken),
      AsyncStorage.setItem(STORAGE_KEYS.stageId, auth.user.currentStageId),
    ]);
  }, []);

  const logout = useCallback(async () => {
    setUserIdState(null);
    setAccessTokenState(null);
    await Promise.all([AsyncStorage.removeItem(STORAGE_KEYS.userId), AsyncStorage.removeItem(STORAGE_KEYS.accessToken)]);
  }, []);

  const setStageId = useCallback(async (id: string) => {
    setStageIdState(id);
    await AsyncStorage.setItem(STORAGE_KEYS.stageId, id);
  }, []);

  const api = useMemo(() => new ApiClient(apiBaseUrl, accessToken), [apiBaseUrl, accessToken]);

  const value = useMemo(
    () => ({ ready, apiBaseUrl, setApiBaseUrl, userId, accessToken, login, logout, stageId, setStageId, api }),
    [ready, apiBaseUrl, setApiBaseUrl, userId, accessToken, login, logout, stageId, setStageId, api],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
