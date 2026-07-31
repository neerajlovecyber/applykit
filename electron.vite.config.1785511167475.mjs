// electron.vite.config.ts
import { resolve } from "path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
var __electron_vite_injected_dirname = "D:\\p\\applykit";
var aliases = {
  "@/app": resolve(__electron_vite_injected_dirname, "app"),
  "@/lib": resolve(__electron_vite_injected_dirname, "lib"),
  "@/resources": resolve(__electron_vite_injected_dirname, "resources")
};
var electron_vite_config_default = defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: {
          main: resolve(__electron_vite_injected_dirname, "lib/main/main.ts")
        }
      }
    },
    resolve: {
      alias: aliases
    },
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    build: {
      rollupOptions: {
        input: {
          preload: resolve(__electron_vite_injected_dirname, "lib/preload/preload.ts")
        }
      }
    },
    resolve: {
      alias: aliases
    },
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    root: "./app",
    build: {
      rollupOptions: {
        input: {
          index: resolve(__electron_vite_injected_dirname, "app/index.html")
        }
      }
    },
    resolve: {
      alias: aliases
    },
    plugins: [tailwindcss(), react()]
  }
});
export {
  electron_vite_config_default as default
};
