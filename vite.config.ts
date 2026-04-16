import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: { overlay: false },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // --- AUGMENTATION DE LA LIMITE DE CACHE ---
        // On passe la limite à 5 Mo (5000000 octets) pour accepter votre fichier de 2.7 Mo
        maximumFileSizeToCacheInBytes: 5000000, 
        
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
        ],
      },
      manifest: {
        name: 'MUCODEC Espace Entreprise',
        short_name: 'MUCODEC',
        description: 'Logiciel de gestion des flux de paie',
        theme_color: '#00204E',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
  optimizeDeps: {
    include: ["@tanstack/react-query", "framer-motion"],
  },
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 3000, // Augmente aussi la limite d'alerte de Vite
  },
}));
