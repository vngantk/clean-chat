import type { Client } from "@clean-chat/client";
import { createContext, useContext, type ReactNode } from "react";

const ClientContext = createContext<Client | null>(null);

/**
 * Provide the driving {@link Client} to hooks and screens.
 */
export function ClientProvider({
  client,
  children,
}: {
  client: Client;
  children: ReactNode;
}) {
  return (
    <ClientContext.Provider value={client}>{children}</ClientContext.Provider>
  );
}

/**
 * Driving chat API from {@link ClientProvider}.
 */
export function useClient(): Client {
  const client = useContext(ClientContext);
  if (client === null) {
    throw new Error("useClient must be used within ClientProvider");
  }
  return client;
}
