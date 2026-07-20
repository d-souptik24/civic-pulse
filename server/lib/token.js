/**
 * server/lib/token.js
 *
 * Lightweight HMAC-based "verdict token" utility.
 * Used to sign the AI analysis result on the server so the client
 * cannot forge `isAuthentic: true` in the issue-creation request.
 *
 * The token encodes: { isAuthentic, imageUrl, exp }
 * and is verified at POST /api/issues before any Firestore write.
 */

import crypto from 'crypto';

// Use a dedicated secret from env, fall back to a derived key from GEMINI_API_KEY
const SECRET = process.env.VERDICT_SECRET || process.env.GEMINI_API_KEY || 'civicpulse-dev-secret';
const TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes

// Warn in production if no dedicated VERDICT_SECRET is configured
if (process.env.NODE_ENV === 'production' && !process.env.VERDICT_SECRET) {
  console.warn('[SECURITY] VERDICT_SECRET is not set. Falling back to GEMINI_API_KEY or dev secret. Set a dedicated VERDICT_SECRET in production.');
}

/**
 * Sign an AI verdict into a tamper-proof token.
 *
 * @param {object} payload - Must contain at least { isAuthentic, imageUrl }
 * @returns {string} - Base64url-encoded token string
 */
export function signVerdict(payload) {
  const data = {
    isAuthentic: !!payload.isAuthentic,
    imageUrl: payload.imageUrl || '',
    exp: Date.now() + TOKEN_TTL_MS,
  };

  const json = JSON.stringify(data);
  const dataB64 = Buffer.from(json).toString('base64url');
  const sig = crypto
    .createHmac('sha256', SECRET)
    .update(dataB64)
    .digest('base64url');

  return `${dataB64}.${sig}`;
}

/**
 * Verify and decode a verdict token.
 *
 * @param {string} token - The token string from the client
 * @returns {{ valid: boolean, data?: object, reason?: string }}
 */
export function verifyVerdict(token) {
  if (!token || typeof token !== 'string') {
    return { valid: false, reason: 'Missing verdict token' };
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    return { valid: false, reason: 'Malformed verdict token' };
  }

  const [dataB64, sig] = parts;

  // Verify HMAC signature
  const expectedSig = crypto
    .createHmac('sha256', SECRET)
    .update(dataB64)
    .digest('base64url');

  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
    return { valid: false, reason: 'Invalid verdict signature' };
  }

  // Decode payload
  let data;
  try {
    data = JSON.parse(Buffer.from(dataB64, 'base64url').toString());
  } catch {
    return { valid: false, reason: 'Corrupt verdict payload' };
  }

  // Check expiry
  if (Date.now() > data.exp) {
    return { valid: false, reason: 'Verdict token expired' };
  }

  return { valid: true, data };
}
