import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  root: "app/renderer",
  plugins: [react()],
  server: {
    port: 5175,
    strictPort: true,
    // The renderer imports the console's compiled design shell directly from its own
    // source tree (see DeployerShell.tsx) rather than a copy, so Vite's dev server
    // needs permission to serve files from outside this app's own root.
    fs: { allow: [path.resolve(__dirname), path.resolve(__dirname, "..", "console")] },
  },
  build: { outDir: "../../dist/renderer", emptyOutDir: true },
});
