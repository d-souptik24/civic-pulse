
import { db } from '../lib/firebase-admin.js';
import { callGemini } from '../lib/gemini.js';

async function test() {
  try {
    const snapshot = await db.collection('issues').where('status', '==', 'open').get();
    const qualifyingIssues = [];
    snapshot.forEach(doc => {
      const issue = doc.data();
      if ((issue.upvotes || 0) >= 3) {
        qualifyingIssues.push({ id: doc.id, ...issue });
      }
    });

    console.log('Qualifying:', qualifyingIssues.length);
    
    for (const issue of qualifyingIssues) {
      const prompt = \You are an autonomous civic agent. Draft a formal, professional escalation summary... Title: \\;
      try {
        const summary = await callGemini(prompt, [], 20000, 'minimal');
        console.log('Gemini success for', issue.id);
      } catch (err) {
        console.error('Gemini failed for', issue.id, err);
      }
    }
    console.log('Done testing gemini');
  } catch (e) {
    console.error('Outer catch:', e);
  }
}
test().then(() => setTimeout(() => process.exit(0), 1000));

