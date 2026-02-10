import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  base: './', // <--- AJOUTEZ CETTE LIGNE (très important pour Capacitor)
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  // ... reste du fichier
