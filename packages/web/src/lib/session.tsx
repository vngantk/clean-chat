import type { User } from "@clean-chat/core/domain";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useClient } from "@/lib/client-context";
import { BEARER_STORAGE_KEY } from "@/lib/token-store";

/**
 * Session still resolving is `undefined`; signed out is `null`.
 */
export type Viewer = User | null | undefined;

type SessionValue = {
  viewer: Viewer;
  setViewer: (user: User | null) => void;
};

const SessionContext = createContext<SessionValue | null>(null);

/**
 * Resolve the current user once, then keep it in React state.
 * Another tab’s sign-out (`storage` on the bearer key) returns this tab
 * to the auth card.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const client = useClient();
  const [viewer, setViewerState] = useState<Viewer>(undefined);

  const refresh = useCallback(async () => {
    try {
      const user = await client.getCurrentUser.execute();
      setViewerState(user);
    } catch {
      setViewerState(null);
    }
  }, [client]);

  useEffect(() => {
    void refresh();
    function onStorage(event: StorageEvent) {
      if (event.key === BEARER_STORAGE_KEY) {
        void refresh();
      }
    }
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
    };
  }, [refresh]);

  const setViewer = useCallback((user: User | null) => {
    setViewerState(user);
  }, []);

  const value = useMemo(
    () => ({ viewer, setViewer }),
    [viewer, setViewer],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

/**
 * Current session from {@link SessionProvider}.
 */
export function useSession(): SessionValue {
  const session = useContext(SessionContext);
  if (session === null) {
    throw new Error("useSession must be used within SessionProvider");
  }
  return session;
}
