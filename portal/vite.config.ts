import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  return {
    // App läuft ausschließlich unter Root (/)
    base: "/",

    server: {
      host: "::",
      port: 8080,
      proxy: {
        "/kubiverse/api": {
          target: "http://localhost:8080",
          changeOrigin: true,
        },
      },
    },

    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean) as any,

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
