import express from 'express';
import { db, FieldValue } from '../lib/firebase-admin.js';
import { callGemini } from '../lib/gemini.js';
import auth, { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Pipeline 4: Autonomous Escalation Agent
// POST /api/escalate?demo=true
router.post('/', requireAdmin, async (req, res) => {
  try {
    const isDemo = req.query.demo === 'true';

    // 1. Query Firestore for open issues
    const snapshot = await db.collection('issues')
      .where('status', '==', 'open')
      .get();

    if (snapshot.empty) {
      return res.json({ escalatedCount: 0, message: 'No open issues found.' });
    }

    // 2. Filter in memory
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    
    const qualifyingIssues = [];
    
    snapshot.forEach(doc => {
      const issue = doc.data();
      
      // Must have at least 3 upvotes
      if ((issue.upvotes || 0) < 3) return;

      // Must be older than 24 hours, unless in demo mode
      if (!isDemo) {
        if (!issue.reportedAt) return; // safeguard
        const reportedAtMs = issue.reportedAt.toDate().getTime();
        if (now - reportedAtMs < oneDayMs) return; // too young
      }

      qualifyingIssues.push({ id: doc.id, ...issue });
    });

    if (qualifyingIssues.length === 0) {
      return res.json({ escalatedCount: 0, message: 'No issues met the escalation criteria.' });
    }

    // 3. Agentic Generation (Sequential with built-in Gemini throttling)
    const escalatedResults = [];
    
    for (const issue of qualifyingIssues) {
      const prompt = `
You are an autonomous civic agent. Draft a formal, professional escalation summary to the municipal authorities regarding the following unresolved public issue:
Title: ${issue.title}
Category: ${issue.category}
Description: ${issue.description || 'No description provided'}
Community Upvotes: ${issue.upvotes}
AI Authenticated: ${issue.aiAuthenticity ? 'Yes' : 'No'}

Write exactly one paragraph outlining why this needs immediate attention. Be formal. Do not use markdown.
      `.trim();

      try {
        const summary = await callGemini(prompt, [], 20000, 'minimal');
        escalatedResults.push({ id: issue.id, summary: summary.trim() });
      } catch (err) {
        console.error(`Gemini failed to generate summary for issue ${issue.id}:`, err);
        // We skip this issue if Gemini fails, allowing the rest to process
      }
    }

    if (escalatedResults.length === 0) {
      return res.status(500).json({ error: 'Failed to generate any escalation summaries.' });
    }

    // 4. Batch Update (Chunked at 450 items to respect Firestore's 500-op limit)
    let currentBatch = db.batch();
    let opCount = 0;
    
    for (const result of escalatedResults) {
      const issueRef = db.collection('issues').doc(result.id);
      
      currentBatch.update(issueRef, {
        status: 'escalated',
        aiEscalationSummary: result.summary,
        statusHistory: FieldValue.arrayUnion({
          status: 'escalated',
          timestamp: new Date(),
          changedBy: 'system'
        })
      });
      
      // Updating a doc counts as 1 operation. arrayUnion is part of the update.
      opCount++;

      // Chunk the batch
      if (opCount >= 450) {
        await currentBatch.commit();
        currentBatch = db.batch(); // Start a new batch
        opCount = 0;
      }
    }

    // Commit any remaining operations
    if (opCount > 0) {
      await currentBatch.commit();
    }

    res.json({
      escalatedCount: escalatedResults.length,
      message: `Successfully escalated ${escalatedResults.length} issues.`,
      issues: escalatedResults
    });

  } catch (error) {
    console.error('Escalation Agent failed:', error);
    res.status(500).json({ error: 'Failed to run Escalation Agent', details: error.message, stack: error.stack });
  }
});

export default router;
