import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

const devApiTarget = process.env.VITE_DEV_API_TARGET || "http://localhost:4000";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Use absolute base so assets resolve from domain root on deep links
  base: mode === 'production' ? '/' : '/',
  server: {
    host: true,
    port: 8080,
    proxy: {
      '/api': {
        target: devApiTarget,
        changeOrigin: true,
        secure: false,
      },
      '/master': {
        target: `${devApiTarget}/api`,
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/master/, '')
      }
    }
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
