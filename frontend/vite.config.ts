import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 백엔드(Spring Boot, WESS 파일럿)는 11.11.11.99:8080 에서 /api/ 경로로 서비스됨.
// 로컬 개발 시 VITE_API_PROXY_TARGET 으로 대상 서버를 바꿀 수 있음.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true,
    proxy: {
      "/api": {
        target: process.env.VITE_API_PROXY_TARGET || "http://11.11.11.99:8080",
        changeOrigin: true,
      },
    },
  },
});
