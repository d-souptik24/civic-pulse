import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' })); // large enough for base64 images

// CORS only needed in dev; production is same-origin (Express serves the React build)
if (process.env.NODE_ENV !== 'production') {
  app.use(cors());
}

// Global Rate Limiter to prevent API DDoS and Gemini token exhaustion
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window`
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', apiLimiter);

// ── 1. API ROUTES (must come FIRST — before static serving) ──────────────────
import analyzeRouter from './routes/analyze.js';
import issuesRouter from './routes/issues.js';
import insightsRouter from './routes/insights.js';
import escalateRouter from './routes/escalate.js';
import verifyResolutionRouter from './routes/verify-resolution.js';

app.use('/api/analyze', analyzeRouter);
app.use('/api/issues', issuesRouter);
app.use('/api/insights', insightsRouter);
app.use('/api/escalate', escalateRouter);
app.use('/api/verify-resolution', verifyResolutionRouter);

// ── 2. API 404 handler (must come BEFORE static serving) ────────────────────
// Plain middleware — avoids path-to-regexp wildcard issues in Express 5
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: `API endpoint not found: ${req.method} ${req.path}` });
  }
  next();
});

// ── 3. Static serving MUST BE LAST ──────────────────────────────────────────
// In production, Express serves the React build from /public
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'public')));
  // Catch-all: return index.html for all non-API routes (client-side routing)
  // Using middleware instead of app.get('*') — Express 5 removed bare '*' wildcards
  app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });
}

// ── Start server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
});
