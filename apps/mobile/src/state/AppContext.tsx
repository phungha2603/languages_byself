import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import type { AuthResult } from "../api/client";
import { ApiClient } from "../api/client";

const STORAGE_KEYS = {
  apiBaseUrl: "englishcoach.apiBaseUrl",
  userId: "englishcoach.userId",
  accessToken: "englishcoach.accessToken",
  stageId: "englishcoach.stageId",
};

const DEFAULT_API_BASE_URL = "http://localhost:3000/api";

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
      if (storedUrl) setApiBaseUrlState(storedUrl);
      if (storedUserId) setUserIdState(storedUserId);
      if (storedToken) setAccessTokenState(storedToken);
      if (storedStage) setStageIdState(storedStage);
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
