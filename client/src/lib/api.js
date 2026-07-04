/**
 * api.js — Client-side helpers for talking to our Express backend.
 * All routes are relative (e.g. /api/issues) — Vite proxy forwards to port 3001 in dev.
 * In production, Express serves the built React app, so relative paths work natively.
 *
 * Mutating endpoints require a Firebase ID token for authentication.
 * Read-only / public endpoints (getInsights) do not require a token.
 */

const BASE = '/api';

async function request(path, options = {}, token = null) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };

  // Inject Authorization header if a token is provided
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

// ── Pipeline 1: Vision analysis ───────────────────────────────────────────────
export async function analyzePhoto(imageUrl, token) {
  return request('/analyze', {
    method: 'POST',
    body: JSON.stringify({ imageUrl }),
  }, token);
}

// ── Pipeline 2: Geo-Deduplication ─────────────────────────────────────────────
export async function checkDuplicate(lat, lng, category, token) {
  return request('/issues/deduplicate', {
    method: 'POST',
    body: JSON.stringify({ lat, lng, category }),
  }, token);
}

// ── Pipeline 2: Create issue ──────────────────────────────────────────────────
export async function createIssue(issueData, token) {
  return request('/issues', { method: 'POST', body: JSON.stringify(issueData) }, token);
}

// ── Upvote ────────────────────────────────────────────────────────────────────
export async function upvoteIssue(issueId, token) {
  return request(`/issues/${issueId}/upvote`, {
    method: 'POST',
  }, token);
}

// ── Status Update ─────────────────────────────────────────────────────────────
export async function updateIssueStatus(issueId, status, token) {
  return request(`/issues/${issueId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  }, token);
}

// ── Pipeline 3: Hotspot insights ──────────────────────────────────────────────
export async function getInsights(lat, lng, radiusKm = 5, token) {
  return request('/insights', {
    method: 'POST',
    body: JSON.stringify({ lat, lng, radiusKm }),
  }, token);
}

// ── Pipeline 4: Escalation agent ─────────────────────────────────────────────
export async function triggerEscalation(token) {
  return request('/escalate', { method: 'POST' }, token);
}

// ── Pipeline 5: Resolution verifier ──────────────────────────────────────────
export async function verifyResolution(issueId, resolvedPhotoUrl, token) {
  return request('/verify-resolution', {
    method: 'POST',
    body: JSON.stringify({ issueId, resolvedPhotoUrl }),
  }, token);
}
