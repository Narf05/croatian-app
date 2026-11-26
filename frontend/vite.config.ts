import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// On GitHub Pages the app lives under /croatian-app/ (set BASE_PATH in the deploy workflow).
const base = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base,
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["icon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Hrvatski – osobna knjižnica",
        short_name: "Hrvatski",
        description: "Osobna knjižnica za učenje hrvatskog jezika.",
        lang: "hr",
        start_url: ".",
        scope: ".",
        display: "standalone",
        background_color: "#f7f6f2",
        theme_color: "#1f4e79",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png}"],
        navigateFallback: "index.html",
      },
    }),
  ],
});
