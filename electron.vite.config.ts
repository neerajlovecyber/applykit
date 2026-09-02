import { resolve } from "path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";

// Shared alias configuration
const aliases = {
  "@": resolve(__dirname, "."),
  "@/app": resolve(__dirname, "app"),
  "@/components": resolve(__dirname, "components"),
  "@/lib": resolve(__dirname, "lib"),
  "@/resources": resolve(__dirname, "resources"),
};

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, "lib/main/main.ts"),
          "automation-worker": resolve(__dirname, "lib/workers/automation-worker.ts"),
        },
        output: {
          entryFileNames: "[name].js",
          format: "cjs",
        },
        external: [
          "electron",
          /^electron\/.*/,
          "electron-updater",
          "better-sqlite3",
          /^puppeteer-extra/,
          /^playwright/,
        ],
      },
    },
    resolve: {
      alias: aliases,
    },
    plugins: [externalizeDepsPlugin()],
  },
  preload: {
    build: {
      lib: {
        entry: resolve(__dirname, "lib/preload/preload.ts"),
        formats: ["cjs"],
        fileName: () => "preload.js",
      },
    },
    resolve: {
      alias: aliases,
    },
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    root: "./app",
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, "app/index.html"),
        },
      },
    },
    resolve: {
      alias: aliases,
    },
    plugins: [tailwindcss(), react()],
  },
});
