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
import { errorMessage } from "@/lib/error-message";
import { BEARER_STORAGE_KEY } from "@/lib/token-store";

/**
 * Session still resolving is `undefined`; signed out is `null`.
 */
export type Viewer = User | null | undefined;

type SessionValue = {
  viewer: Viewer;
  /** Set after a failed `get-current-user` that is not a signed-out response. */
  sessionError: string | undefined;
  setViewer: (user: User | null) => void;
  retry: () => void;
};

const SessionContext = createContext<SessionValue | null>(null);

/**
 * Resolve the current user once, then keep it in React state.
 * Another tab’s sign-out (`storage` on the bearer key) returns this tab
 * to the auth card. Network failures keep the previous viewer (or stay
 * on loading) instead of looking signed out. 401 `Not authenticated`
 * from later requests clears the session via {@link Client.onAuthFailure}.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const client = useClient();
  const [viewer, setViewerState] = useState<Viewer>(undefined);
  const [sessionError, setSessionError] = useState<string | undefined>(
    undefined,
  );

  const refresh = useCallback(async () => {
    try {
      const user = await client.getCurrentUser.execute();
      setViewerState(user);
      setSessionError(undefined);
    } catch (err) {
      setSessionError(errorMessage(err, "Can't reach the server."));
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

  useEffect(() => {
    return client.onAuthFailure(() => {
      setViewerState(null);
      setSessionError(undefined);
    });
  }, [client]);

  const setViewer = useCallback((user: User | null) => {
    setViewerState(user);
    setSessionError(undefined);
  }, []);

  const value = useMemo(
    () => ({ viewer, sessionError, setViewer, retry: () => void refresh() }),
    [viewer, sessionError, setViewer, refresh],
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
