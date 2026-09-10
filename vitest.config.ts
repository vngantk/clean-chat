import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    include: [
      "packages/application/test/**/*.test.ts",
      "packages/infrastructure/test/**/*.test.ts",
      "packages/client/test/**/*.test.ts",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: ["packages/*/src/**/*.ts"],
    },
  },
  resolve: {
    alias: {
      "@clean-chat/core/use-cases": path.join(
        root,
        "packages/core/src/use-cases/index.ts",
      ),
      "@clean-chat/core/domain": path.join(
        root,
        "packages/core/src/domain/index.ts",
      ),
      "@clean-chat/core": path.join(root, "packages/core/src/index.ts"),
      "@clean-chat/application": path.join(
        root,
        "packages/application/src/index.ts",
      ),
      "@clean-chat/infrastructure": path.join(
        root,
        "packages/infrastructure/src/index.ts",
      ),
      "@clean-chat/client/http": path.join(
        root,
        "packages/client/src/http/index.ts",
      ),
      "@clean-chat/client": path.join(root, "packages/client/src/index.ts"),
    },
  },
});
