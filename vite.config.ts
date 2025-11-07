import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import type { Plugin } from "vite";

// Import server handlers for dev-time API routing
import { onRequest as imf3Handler } from "./server/api/imf3";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file - pass empty string as prefix to load ALL variables (not just VITE_)
  const env = loadEnv(mode, process.cwd(), '');
  
  // Make CHART_API_KEY and IMF_API_KEY available to server-side handlers
  if (env.CHART_API_KEY) process.env.CHART_API_KEY = env.CHART_API_KEY;
  if (env.IMF_API_KEY) process.env.IMF_API_KEY = env.IMF_API_KEY;
  if (env.LLM_API_KEY) process.env.LLM_API_KEY = env.LLM_API_KEY;
  
  return {
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    // Dev-only local API router so fetch('/api/...') returns JSON instead of index.html
    ((mode === "development") ? ({
      name: "local-api-router",
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          const url = req.url || "";
          
          if (!url.startsWith("/api/imf3")) return next();

          try {
            const fullUrl = `http://localhost:${server.config.server.port}${url}`;
            const request = new Request(fullUrl, { method: req.method, headers: req.headers as any });
            const response = await imf3Handler(request);
            res.statusCode = response.status;
            response.headers.forEach((value, key) => res.setHeader(key, value));
            const body = await response.arrayBuffer();
            res.end(Buffer.from(body));
          } catch (e: any) {
            res.statusCode = 500;
            res.setHeader("content-type", "application/json");
            res.end(JSON.stringify({ error: e?.message || "Internal error" }));
          }
        });
      },
    } as Plugin) : undefined),
  ].filter(Boolean) as Plugin[],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}});
