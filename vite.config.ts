import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";

// Rewrites dist/sw.js's __BUILD_ID__ marker on every build so the service worker
// file actually changes byte-for-byte each release. Without this, browsers
// keep the old SW (identical bytes) and never reload users to the new build.
function swBuildIdPlugin() {
  return {
    name: "sw-build-id",
    apply: "build" as const,
    closeBundle() {
      const out = path.resolve(__dirname, "dist/sw.js");
      try {
        if (!fs.existsSync(out)) return;
        const txt = fs.readFileSync(out, "utf8");
        const stamped = txt.replace(/__BUILD_ID__/g, String(Date.now()));
        fs.writeFileSync(out, stamped);
      } catch {}
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), swBuildIdPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    force: true,
    exclude: ['@capacitor-community/background-geolocation'],
  },
  build: {
    rollupOptions: {
      external: ['@capacitor-community/background-geolocation'],
    },
  },
}));
