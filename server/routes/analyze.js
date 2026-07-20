import express from 'express';
import { callGemini, extractJSON, toInlineImage } from '../lib/gemini.js';
import { signVerdict } from '../lib/token.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Pipeline 1: Vision Categorizer + Authenticity Verifier (merged)
// POST /api/analyze
// Receives: { imageUrl } 
// Returns: { category, severity, title, description, isAuthentic, confidence, reasoning, verdictToken }

const FALLBACK_DEFAULTS = {
  category: "other",
  severity: 3,
  title: "Reported Issue",
  description: "AI analysis unavailable",
  isAuthentic: false,
  confidence: 0,
  reasoning: null
};

// ── Per-user abuse counter ───────────────────────────────────────────────────
// Tracks consecutive rejected (inauthentic) uploads per user.
// 3 consecutive rejections within the TTL window → HTTP 429 cooldown.
const abuseMap = new Map(); // uid → { count, firstRejectedAt }
const ABUSE_MAX_REJECTIONS = 3;
const ABUSE_WINDOW_MS = 30 * 60 * 1000; // 30 minutes
const ABUSE_COOLDOWN_MINUTES = 30;

function checkAbuse(uid) {
  const entry = abuseMap.get(uid);
  if (!entry) return { blocked: false };

  // Window expired — reset
  if (Date.now() - entry.firstRejectedAt > ABUSE_WINDOW_MS) {
    abuseMap.delete(uid);
    return { blocked: false };
  }

  if (entry.count >= ABUSE_MAX_REJECTIONS) {
    return { blocked: true, cooldownMinutes: ABUSE_COOLDOWN_MINUTES };
  }

  return { blocked: false };
}

function recordRejection(uid) {
  const entry = abuseMap.get(uid);
  if (!entry || Date.now() - entry.firstRejectedAt > ABUSE_WINDOW_MS) {
    abuseMap.set(uid, { count: 1, firstRejectedAt: Date.now() });
  } else {
    entry.count += 1;
  }
}

function resetAbuse(uid) {
  abuseMap.delete(uid);
}

router.post('/', auth, async (req, res) => {
  const { imageUrl } = req.body;
  const uid = req.user.uid;

  // Check abuse cooldown before burning a Gemini API call
  const abuse = checkAbuse(uid);
  if (abuse.blocked) {
    return res.status(429).json({
      error: `Too many rejected uploads. Please wait ${abuse.cooldownMinutes} minutes before trying again.`,
      cooldownMinutes: abuse.cooldownMinutes
    });
  }
  
  if (!imageUrl) {
    return res.status(200).json({ ...FALLBACK_DEFAULTS, verdictToken: null });
  }

  try {
    // 1. Fetch image from Firebase Storage URL
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) throw new Error(`Failed to fetch image: ${imgRes.statusText}`);
    
    const arrayBuffer = await imgRes.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = imgRes.headers.get('content-type') || 'image/jpeg';
    
    // 2. Construct Prompt
    const prompt = `
You are a civic issue analyzer for a hyperlocal problem-solving platform called CivicPulse.
Analyze the provided image and output a strict JSON response with the following structure:
{
  "category": "One of: pothole, streetlight, water_leak, waste, other",
  "severity": <integer between 1 and 5 (1=minor, 5=critical)>,
  "title": "<A short 3-5 word title summarizing the issue>",
  "description": "<A detailed summary of the visual problem>",
  "isAuthentic": <boolean: true if it's a real civic issue, false if it's a selfie, meme, blank photo, or irrelevant>,
  "confidence": <float between 0.0 and 1.0 indicating your certainty>,
  "reasoning": "<A brief chain-of-thought explaining why you chose this category, severity, and authenticity>"
}
Do NOT wrap the output in markdown code blocks. Output ONLY raw valid JSON.`;

    // 3. Call Gemini (15000ms hard timeout)
    const textResponse = await callGemini(
      prompt,
      [toInlineImage(base64, mimeType)],
      15000,
      'minimal'
    );

    // 4. Parse Response
    const data = extractJSON(textResponse);
    if (!data) {
      console.error('Failed to parse Gemini response as JSON');
      return res.status(200).json({ ...FALLBACK_DEFAULTS, verdictToken: null });
    }
    
    // 5. Build result and sign verdict token
    const result = {
      category: data.category || 'other',
      severity: data.severity || 3,
      title: data.title || 'Reported Issue',
      description: data.description || 'No description provided.',
      isAuthentic: data.isAuthentic ?? true,
      confidence: data.confidence || 0.5,
      reasoning: data.reasoning || null
    };

    // 6. Track abuse if inauthentic, reset on authentic
    if (!result.isAuthentic) {
      recordRejection(uid);
    } else {
      resetAbuse(uid);
    }

    // 7. Sign the verdict — client must send this back at POST /api/issues
    const verdictToken = signVerdict({
      isAuthentic: result.isAuthentic,
      imageUrl
    });

    return res.status(200).json({ ...result, verdictToken });

  } catch (error) {
    console.error('analyze.js error:', error);
    // Timeout / 429 / Network Error path -> 503
    return res.status(503).json({ error: "AI service temporarily unavailable. Please try again." });
  }
});

export default router;
