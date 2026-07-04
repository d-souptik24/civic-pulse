/**
 * server/lib/gemini.js
 *
 * Gemini API wrapper — written against @google/genai (v2.10.0, active SDK).
 *
 * SDK MIGRATION NOTE:
 *   @google/generative-ai reached EOL August 31 2025.
 *   Replacement: @google/genai — breaking API changes:
 *     OLD: new GoogleGenerativeAI(key) → model.generateContent(parts)
 *          result.response.text()   ← method call
 *     NEW: new GoogleGenAI({ apiKey }) → ai.models.generateContent({ model, contents, config })
 *          response.text            ← property, not a method
 *
 *   Thinking config (Gemini 3.x):
 *     thinking_budget (old)  →  thinkingConfig: { thinkingLevel: 'minimal' }
 *     Default thinking level is 'high' — burns tokens. Use 'minimal' for JSON extraction.
 */

import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Rate limit protection: never call Gemini more than once per 500ms
let lastCallTime = 0;
const MIN_INTERVAL_MS = 500;

/**
 * Core Gemini wrapper used by all pipelines.
 *
 * @param {string}  prompt      - The text prompt
 * @param {Array}   imageParts  - Optional: [{ inlineData: { mimeType, data } }]
 * @param {number}  timeoutMs   - Hard timeout in ms (default 15000)
 * @param {string}  thinkingLevel - 'minimal' | 'low' | 'medium' | 'high' (default 'minimal')
 * @returns {Promise<string>}   - Raw text from Gemini
 * @throws  On timeout, safety block, or network error
 */
export async function callGemini(
  prompt,
  imageParts = [],
  timeoutMs = 15000,
  thinkingLevel = 'minimal'
) {
  // Enforce minimum spacing between consecutive calls
  const now = Date.now();
  const elapsed = now - lastCallTime;
  if (elapsed < MIN_INTERVAL_MS) {
    await new Promise((r) => setTimeout(r, MIN_INTERVAL_MS - elapsed));
  }
  lastCallTime = Date.now();

  // Build contents array — text part always first, then optional image parts
  const contents = [
    {
      role: 'user',
      parts: [
        { text: prompt },
        ...imageParts, // each item: { inlineData: { mimeType: 'image/jpeg', data: '<base64>' } }
      ],
    },
  ];

  // Race the Gemini call against a hard timeout
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('GEMINI_TIMEOUT')), timeoutMs)
  );

  const geminiPromise = ai.models.generateContent({
    model: process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite',
    contents,
    config: {
      // responseMimeType lives in config (not generationConfig) in the new SDK
      responseMimeType: 'text/plain',
      // thinkingConfig: Gemini 3.x replaces thinking_budget with thinkingLevel
      // 'minimal' is correct for JSON-extraction pipelines — avoids token waste
      thinkingConfig: { thinkingLevel },
    },
  });

  const response = await Promise.race([geminiPromise, timeoutPromise]);

  // response.text is a property in @google/genai, NOT a method like the old SDK
  return response.text;
}

/**
 * Safely extract JSON from a Gemini response that may be wrapped in markdown fences.
 * Returns null if all extraction attempts fail — callers MUST handle null gracefully.
 *
 * @param {string} text - Raw Gemini response text
 * @returns {object|null}
 */
export function extractJSON(text) {
  if (!text) return null;

  // Attempt 1: direct parse (Gemini sometimes returns clean JSON)
  try {
    return JSON.parse(text);
  } catch { /* fall through */ }

  // Attempt 2: strip ```json ... ``` or ``` ... ``` markdown fences
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch { /* fall through */ }
  }

  // Attempt 3: extract first {...} block via regex
  const objMatch = text.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try {
      return JSON.parse(objMatch[0]);
    } catch { /* fall through */ }
  }

  return null;
}

/**
 * Helper: convert a base64 data URL or raw base64 string into the inlineData
 * format that Gemini's contents API expects.
 *
 * @param {string} base64    - Raw base64 string (no data URL prefix)
 * @param {string} mimeType  - e.g. 'image/jpeg', 'image/png', 'image/webp'
 * @returns {{ inlineData: { mimeType: string, data: string } }}
 */
export function toInlineImage(base64, mimeType = 'image/jpeg') {
  // Strip data URL prefix if present (e.g. "data:image/jpeg;base64,...")
  const data = base64.replace(/^data:[^;]+;base64,/, '');
  return { inlineData: { mimeType, data } };
}
