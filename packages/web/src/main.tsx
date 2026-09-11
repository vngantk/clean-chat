import { createHttpClient } from "@clean-chat/client";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { ClientProvider } from "@/lib/client-context";
import { SessionProvider } from "@/lib/session";
import { createLocalStorageTokenStore } from "@/lib/token-store";
import "./index.css";

/**
 * Origin of the Express composition root.
 * Vite `dev` defaults to `http://127.0.0.1:3000`. Production builds
 * default to same-origin so Express can serve this SPA. Override with
 * `VITE_API_URL` (no trailing slash required) for a split UI origin.
 */
const apiUrl =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.PROD ? "" : "http://127.0.0.1:3000");

const client = createHttpClient({
  baseUrl: apiUrl,
  tokenStore: createLocalStorageTokenStore(),
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ClientProvider client={client}>
      <SessionProvider>
        <App />
      </SessionProvider>
    </ClientProvider>
  </StrictMode>,
);
