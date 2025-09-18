import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Use relative base so the app works from any subfolder on cPanel
  // e.g., https://yourdomain.com/app/ without breaking asset paths
  base: "./",
  server: {
    host: true, 
    port: 8080,
    proxy: {
      '/api': {
        target: 'https://tmsapi.xesstechlink.com',
        changeOrigin: true,
        secure: false,
      },
      '/master': {
        target: 'https://tmsapi.xesstechlink.com/api',
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
