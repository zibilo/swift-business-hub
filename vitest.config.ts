import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// Configuration pour les tests unitaires (Vitest)
export default defineConfig({
  plugins: [react()],
  test: {
    // Simule un navigateur pour tester les composants React
    environment: "jsdom", 
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // Désactive le multithreading si vous avez des problèmes de mémoire sur GitHub Actions
    threads: true, 
  },
  resolve: {
    alias: {
      // Assure que les imports avec "@" fonctionnent aussi dans les tests
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
