import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        globals: true,
        include: ["src/test/**/*.test.ts"],
        exclude: ["build/**", "node_modules/**"]
    }
});
