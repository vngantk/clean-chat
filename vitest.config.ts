import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    include: [
      "packages/application/test/**/*.test.ts",
      "packages/infrastructure/test/**/*.test.ts",
    ],
  },
  resolve: {
    alias: {
      "@clean-chat/contracts/use-cases": path.join(
        root,
        "packages/contracts/src/use-cases/index.ts",
      ),
      "@clean-chat/contracts": path.join(
        root,
        "packages/contracts/src/index.ts",
      ),
      "@clean-chat/application": path.join(
        root,
        "packages/application/src/index.ts",
      ),
      "@clean-chat/domain": path.join(root, "packages/domain/src/index.ts"),
    },
  },
});
