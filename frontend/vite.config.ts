import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";

// Detect if running inside Docker
const isDocker = fs.existsSync("/.dockerenv");
const targetUrl = process.env.BACKEND_URL || (isDocker ? "http://backend:8000" : "http://localhost:8000");

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      "/api": {
        target: targetUrl,
        changeOrigin: true
      }
    }
  }
});

