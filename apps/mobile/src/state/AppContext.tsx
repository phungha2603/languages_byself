import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { ApiClient } from "../api/client";

const STORAGE_KEYS = {
  apiBaseUrl: "englishcoach.apiBaseUrl",
  userId: "englishcoach.userId",
  stageId: "englishcoach.stageId",
};

const DEFAULT_API_BASE_URL = "http://localhost:3000/api";

interface AppContextValue {
  ready: boolean;
  apiBaseUrl: string;
  setApiBaseUrl: (url: string) => Promise<void>;
  userId: string | null;
  setUserId: (id: string | null) => Promise<void>;
  stageId: string;
  setStageId: (id: string) => Promise<void>;
  api: ApiClient;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false);
  const [apiBaseUrl, setApiBaseUrlState] = useState(DEFAULT_API_BASE_URL);
  const [userId, setUserIdState] = useState<string | null>(null);
  const [stageId, setStageIdState] = useState("foundation");

  useEffect(() => {
    (async () => {
      const [storedUrl, storedUserId, storedStage] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.apiBaseUrl),
        AsyncStorage.getItem(STORAGE_KEYS.userId),
        AsyncStorage.getItem(STORAGE_KEYS.stageId),
      ]);
      if (storedUrl) setApiBaseUrlState(storedUrl);
      if (storedUserId) setUserIdState(storedUserId);
      if (storedStage) setStageIdState(storedStage);
      setReady(true);
    })();
  }, []);

  const setApiBaseUrl = useCallback(async (url: string) => {
    setApiBaseUrlState(url);
    await AsyncStorage.setItem(STORAGE_KEYS.apiBaseUrl, url);
  }, []);

  const setUserId = useCallback(async (id: string | null) => {
    setUserIdState(id);
    if (id) await AsyncStorage.setItem(STORAGE_KEYS.userId, id);
    else await AsyncStorage.removeItem(STORAGE_KEYS.userId);
  }, []);

  const setStageId = useCallback(async (id: string) => {
    setStageIdState(id);
    await AsyncStorage.setItem(STORAGE_KEYS.stageId, id);
  }, []);

  const api = useMemo(() => new ApiClient(apiBaseUrl), [apiBaseUrl]);

  const value = useMemo(
    () => ({ ready, apiBaseUrl, setApiBaseUrl, userId, setUserId, stageId, setStageId, api }),
    [ready, apiBaseUrl, setApiBaseUrl, userId, setUserId, stageId, setStageId, api],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
