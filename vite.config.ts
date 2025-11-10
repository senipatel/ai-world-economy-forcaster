import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import type { Plugin } from "vite";

// Import server handlers for dev-time API routing
import { onRequest as imf3Handler } from "./server/api/imf3";
import { handler as llmChatHandler } from "./server/chat/LLMChat";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file - pass empty string as prefix to load ALL variables (not just VITE_)
  const env = loadEnv(mode, process.cwd(), '');
  
  // Make CHART_API_KEY and IMF_API_KEY available to server-side handlers
  if (env.CHART_API_KEY) process.env.CHART_API_KEY = env.CHART_API_KEY;
  if (env.IMF_API_KEY) process.env.IMF_API_KEY = env.IMF_API_KEY;
  if (env.LLM_API_KEY) {
    process.env.LLM_API_KEY = env.LLM_API_KEY;
    console.log('[vite-config] LLM_API_KEY loaded:', env.LLM_API_KEY.substring(0, 10) + '...');
  }
  
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
          
          // Route for IMF API
          if (url.startsWith("/api/imf3")) {
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
            return;
          }
          
          // Route for LLM Chat API
          if (url.startsWith("/api/chat/llm")) {
            try {
              console.log('[vite-middleware] LLM Chat request received');
              
              // Read request body for POST requests
              let bodyBuffer: Buffer | undefined;
              if (req.method === 'POST') {
                const chunks: Buffer[] = [];
                for await (const chunk of req) {
                  chunks.push(chunk);
                }
                bodyBuffer = Buffer.concat(chunks);
                console.log('[vite-middleware] Request body received, size:', bodyBuffer.length);
              }
              
              const fullUrl = `http://localhost:${server.config.server.port}${url}`;
              
              // Create a custom Request-like object that can properly handle .json()
              const requestInit: any = { 
                method: req.method, 
                headers: req.headers as any,
              };
              
              if (bodyBuffer) {
                requestInit.body = bodyBuffer;
              }
              
              const request = new Request(fullUrl, requestInit);
              
              console.log('[vite-middleware] Calling LLM handler...');
              const response = await llmChatHandler(request);
              console.log('[vite-middleware] LLM handler returned status:', response.status);
              
              res.statusCode = response.status;
              response.headers.forEach((value, key) => res.setHeader(key, value));
              const responseBody = await response.arrayBuffer();
              res.end(Buffer.from(responseBody));
            } catch (e: any) {
              console.error('[vite-middleware] LLM Chat error:', e.message);
              console.error('[vite-middleware] Stack trace:', e.stack);
              res.statusCode = 500;
              res.setHeader("content-type", "application/json");
              res.end(JSON.stringify({ error: e?.message || "Internal error" }));
            }
            return;
          }
          
          next();
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
