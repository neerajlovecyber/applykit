import { resolve } from "path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";

// Shared alias configuration
const aliases = {
  "@/app": resolve(__dirname, "app"),
  "@/lib": resolve(__dirname, "lib"),
  "@/resources": resolve(__dirname, "resources"),
};

export default defineConfig({
  main: {
    build: {
      lib: {
        entry: resolve(__dirname, "lib/main/main.ts"),
        formats: ["cjs"],
        fileName: () => "main.js",
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
