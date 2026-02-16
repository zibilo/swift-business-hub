import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from 'vite-plugin-pwa'; // Importation du moteur hors-ligne

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    
    // CONFIGURATION HORS-LIGNE (PWA)
    VitePWA({
      registerType: 'autoUpdate', // Met à jour l'app automatiquement quand elle est rouverte
      workbox: {
        // C'est ici que l'on définit ce qui doit fonctionner sans internet
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'], // Cache tout le design
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        // Stratégie pour les images (Logo MUCODEC, etc.)
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst', // Utilise le cache d'abord, ne télécharge que si absent
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 jours
              },
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
        display: 'standalone', // Supprime les barres de navigation du téléphone
        orientation: 'portrait',
      },
    }),
  ].filter(Boolean),
  
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
  
  optimizeDeps: {
    include: ["@tanstack/react-query", "framer-motion"],
  },

  // OPTIMISATION POUR ELECTRON / ANDROID
  build: {
    sourcemap: false, // Allège le poids de l'application
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'framer-motion'], // Sépare les grosses libs pour un cache plus efficace
        },
      },
    },
  },
}));
