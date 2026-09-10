import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

const packagesRoot = fileURLToPath(new URL("..", import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@clean-chat/core/use-cases": path.join(
        packagesRoot,
        "core/src/use-cases/index.ts",
      ),
      "@clean-chat/core/domain": path.join(
        packagesRoot,
        "core/src/domain/index.ts",
      ),
      "@clean-chat/core": path.join(packagesRoot, "core/src/index.ts"),
      "@clean-chat/client/http": path.join(
        packagesRoot,
        "client/src/http/index.ts",
      ),
      "@clean-chat/client": path.join(packagesRoot, "client/src/index.ts"),
    },
  },
  server: {
    port: 5173,
  },
});
