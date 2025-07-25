import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    tailwindcss(),
    reactRouter(),
    tsconfigPaths(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "masked-icon.svg"],
      injectRegister: "auto",
      manifest: {
        name: "tuan-chat",
        short_name: "tuan-chat",
        description: "tuan-chat",
        theme_color: "#0042ff",
        icons: [{
          src: "/android-chrome-192x192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "favicon",
        }, {
          src: "/android-chrome-512x512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "favicon",
        }, {
          src: "/apple-touch-icon.png",
          sizes: "180x180",
          type: "image/png",
          purpose: "apple touch icon",
        }],
        background_color: "#f0e7db",
        display: "standalone",
        scope: "/",
        start_url: "/",
        orientation: "portrait",
      },
    }),
  ],
  base: "/",
  resolve: {
    alias: [
      {
        find: "@",
        replacement: resolve(__dirname, "app"),
      },
    ],
  },
  server: {
    port: 5177,
    host: "0.0.0.0",
  },

});
