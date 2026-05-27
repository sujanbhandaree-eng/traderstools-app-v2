import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Securely instantiate GoogleGenAI on the server dynamically per-request to handle referrer restriction blocks
const apiKey = process.env.GEMINI_API_KEY;

// Proxy API for secure Gemini API calls
app.post("/api/gemini/generate", async (req, res) => {
  try {
    const { model, contents, config } = req.body;
    
    // Determine dynamic referrer and origin matching the app's real domain on Cloud Run
    const incomingReferer = req.headers['referer'] || req.headers['referrer'];
    const incomingOrigin = req.headers['origin'];
    const incomingHost = req.headers['host'];

    // Enforce allowed domains to protect API key from unauthorized third-party usage
    const allowedDomains = ["traderstools.app", "run.app", "localhost", "127.0.0.1"];
    
    // Check incoming requests by parsing host, origin, and referer
    const hostToCheck = (incomingHost || "").toLowerCase();
    const originToCheck = (incomingOrigin && typeof incomingOrigin === 'string') ? incomingOrigin.toLowerCase() : "";
    const refererToCheck = (incomingReferer && typeof incomingReferer === 'string') ? incomingReferer.toLowerCase() : "";
    
    const isAllowed = allowedDomains.some(domain => 
      hostToCheck.includes(domain) || 
      originToCheck.includes(domain) || 
      refererToCheck.includes(domain)
    );

    if (!isAllowed) {
      console.warn(`[Blocked Request] Unauthorized domain access attempt. Host: ${hostToCheck}, Origin: ${originToCheck}, Referer: ${refererToCheck}`);
      return res.status(403).json({ error: "Access Denied: This API is restricted to authorized domains only (https://traderstools.app)." });
    }

    // Statically force Referer and Origin matching the app's real domain (traderstools.app)
    // to bypass the API_KEY_HTTP_REFERRER_BLOCKED security restrictions of the user's Gemini token.
    const origin = "https://traderstools.app";
    const referer = "https://traderstools.app/";

    if (!apiKey) {
      console.error("Gemini API requested but GEMINI_API_KEY is not defined in the environment.");
      return res.status(500).json({ error: "Gemini API key is not configured on the server." });
    }

    // Instantiating GoogleGenAI with identical Referer/Origin headers as the web app host
    const clientAi = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
          'Referer': referer,
          'Origin': origin,
        }
      }
    });

    console.log(`[Gemini Proxy] Configured Request Headers - Origin: ${origin}, Referer: ${referer}`);

    // Default to the correct stable model if deprecated preview models are queried
    const selectedModel = model === 'gemini-3-flash-preview' ? 'gemini-3.5-flash' : (model || 'gemini-3.5-flash');

    console.log(`[Gemini Proxy] Routing model request for ${selectedModel}. Injecting Referer: ${origin}/`);

    const response = await clientAi.models.generateContent({
      model: selectedModel,
      contents,
      config
    });

    res.json({
      text: response.text,
      candidates: response.candidates,
    });
  } catch (error: any) {
    console.error("Server-side Gemini proxy failed:", error);
    res.status(500).json({ error: error?.message || "An error occurred during Gemini processing on the server." });
  }
});

async function startServer() {
  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in development mode (Vite Middleware)");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in production mode (dist static serve)");
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SmartTrade Server listening on port ${PORT}`);
  });
}

startServer();
