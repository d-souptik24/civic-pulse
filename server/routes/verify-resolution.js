import express from 'express';
import { db, FieldValue } from '../lib/firebase-admin.js';
import { callGemini, extractJSON, toInlineImage } from '../lib/gemini.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Pipeline 5: AI Resolution Verifier
// POST /api/verify-resolution
// Receives: { issueId, resolvedPhotoUrl }
// Returns:  { resolved: boolean, confidence: number, explanation: string }
router.post('/', auth, async (req, res) => {
  const { issueId, resolvedPhotoUrl } = req.body;

  if (!issueId || !resolvedPhotoUrl) {
    return res.status(400).json({ error: 'Missing issueId or resolvedPhotoUrl' });
  }

  try {
    // 1. Fetch the issue from Firestore to get the original "before" photo
    const issueRef = db.collection('issues').doc(issueId);
    const issueSnap = await issueRef.get();

    if (!issueSnap.exists) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    const issueData = issueSnap.data();
    const { photoUrl: originalPhotoUrl, reportedBy } = issueData;

    if (!originalPhotoUrl) {
      return res.status(400).json({ error: 'Issue has no original photo to compare against' });
    }

    // 2. Download both images and convert to base64 for Gemini inline data
    const [beforeRes, afterRes] = await Promise.all([
      fetch(originalPhotoUrl),
      fetch(resolvedPhotoUrl),
    ]);

    if (!beforeRes.ok || !afterRes.ok) {
      return res.status(502).json({ error: 'Failed to download one or both images' });
    }

    const [beforeBuffer, afterBuffer] = await Promise.all([
      beforeRes.arrayBuffer(),
      afterRes.arrayBuffer(),
    ]);

    const beforeBase64 = Buffer.from(beforeBuffer).toString('base64');
    const afterBase64 = Buffer.from(afterBuffer).toString('base64');

    // Detect MIME type from Content-Type header — default to jpeg
    const beforeMime = beforeRes.headers.get('content-type')?.split(';')[0] || 'image/jpeg';
    const afterMime  = afterRes.headers.get('content-type')?.split(';')[0]  || 'image/jpeg';

    const beforePart = toInlineImage(beforeBase64, beforeMime);
    const afterPart  = toInlineImage(afterBase64,  afterMime);

    // 3. Send both images to Gemini for visual comparison
    const prompt = `
You are an AI resolution verifier for a civic issue reporting platform.
You will receive TWO images:
- Image 1 (BEFORE): The original civic problem reported by a citizen.
- Image 2 (AFTER): A photo submitted by a field officer claiming the issue is fixed.

Your task: Carefully compare the two images and determine if the civic issue has been genuinely resolved.

Respond with ONLY a valid JSON object. No explanations, no markdown:
{
  "resolved": true or false,
  "confidence": a decimal between 0 and 1,
  "explanation": "A single, concise sentence explaining your verdict"
}
    `.trim();

    const rawText = await callGemini(prompt, [beforePart, afterPart], 20000, 'minimal');
    const verdict = extractJSON(rawText);

    if (!verdict || typeof verdict.resolved !== 'boolean') {
      return res.status(500).json({ error: 'AI returned an unparsable verdict' });
    }

    // 4. Atomically update Firestore inside a Transaction
    await db.runTransaction(async (transaction) => {
      // RULE: All database reads MUST occur before any database writes
      // Read 1: Issue
      const issueDoc = await transaction.get(issueRef);
      if (!issueDoc.exists) throw new Error('Issue disappeared during transaction');

      // Read 2: User (if resolved)
      let userRef = null;
      let userDoc = null;
      if (verdict.resolved && reportedBy) {
        userRef = db.collection('users').doc(reportedBy);
        userDoc = await transaction.get(userRef);
      }

      // Now perform all Writes
      if (verdict.resolved) {
        // ── Successful Resolution ──
        // Update the issue document
        transaction.update(issueRef, {
          status: 'resolved',
          resolvedPhotoUrl,                             // Only written on a PASSING verdict
          resolvedAt: FieldValue.serverTimestamp(),     // Required for Phase 13 avg-resolution-time calc
          aiResolutionVerified: true,
          aiResolutionExplanation: verdict.explanation,
          statusHistory: FieldValue.arrayUnion({
            status: 'resolved',
            timestamp: new Date(),        // Firestore will convert this to a native Timestamp
            changedBy: 'ai_verifier',
          }),
        });

        // Update the ORIGINAL reporter's gamification stats
        if (userDoc && userDoc.exists) {
          const userData = userDoc.data();
          const newIssuesResolved = (userData.issuesResolved || 0) + 1;
          const badgeUpdate = {};

          // HACKATHON THRESHOLD: 1 resolved issue triggers Community Savior badge
          if (newIssuesResolved >= 1 && !userData.badges?.includes('Community Savior')) {
            badgeUpdate.badges = FieldValue.arrayUnion('Community Savior');
            badgeUpdate.lastBadgeAwardedAt = FieldValue.serverTimestamp();
          }

          transaction.update(userRef, {
            points:         FieldValue.increment(100),
            issuesResolved: FieldValue.increment(1),
            ...badgeUpdate,
          });
        }
      }
      // If verification fails, we do NOT write anything to Firestore.
      // The rejection verdict is passed directly to the frontend dynamically.
    });

    // 5. Return the verdict to the frontend
    res.json({
      resolved:    verdict.resolved,
      confidence:  verdict.confidence ?? null,
      explanation: verdict.explanation,
    });

  } catch (error) {
    console.error('Resolution verification failed:', error);
    res.status(500).json({ error: 'Failed to verify resolution' });
  }
});

export default router;
