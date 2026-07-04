import express from 'express';
import { db, FieldValue } from '../lib/firebase-admin.js';
import * as geofire from 'geofire-common';
import { callGemini } from '../lib/gemini.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Pipeline 3: Predictive Hotspot Mapper
// POST /api/insights
router.post('/', auth, async (req, res) => {
  try {
    const { lat, lng } = req.body;
    
    if (!lat || !lng) {
      return res.status(400).json({ error: 'Missing lat or lng' });
    }

    // 1. Calculate Geohash Prefix (Length 5 covers ~4.9km x 4.9km)
    const fullHash = geofire.geohashForLocation([lat, lng]);
    const geohashPrefix = fullHash.slice(0, 5);
    
    const insightRef = db.collection('insights').doc(geohashPrefix);

    // 2. Check Cache
    const insightDoc = await insightRef.get();
    if (insightDoc.exists) {
      const data = insightDoc.data();
      const ageMs = Date.now() - (data.lastUpdated?.toDate().getTime() || 0);
      
      // If cache is younger than 30 minutes, return it immediately
      if (ageMs < 30 * 60 * 1000) {
        return res.json({
          geohash: geohashPrefix,
          insight: data.insight,
          issueCount: data.issueCount,
          cached: true
        });
      }
    }

    // 3. Cache Miss - Aggregate Data
    // We use a string-prefix query to align perfectly with the cache boundary
    const snapshot = await db.collection('issues')
      .where('geohash', '>=', geohashPrefix)
      .where('geohash', '<=', geohashPrefix + '\uf8ff')
      .get();

    if (snapshot.empty) {
      return res.json({
        geohash: geohashPrefix,
        insight: "No recent civic issues reported in this area.",
        issueCount: 0,
        cached: false
      });
    }

    let stats = {
      total: snapshot.size,
      categories: {},
      severities: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      open: 0,
      resolved: 0
    };

    snapshot.forEach(doc => {
      const issue = doc.data();
      
      // Category count
      const cat = issue.category || 'other';
      stats.categories[cat] = (stats.categories[cat] || 0) + 1;
      
      // Severity count
      if (issue.severity) stats.severities[issue.severity]++;
      
      // Status
      if (issue.status === 'resolved') stats.resolved++;
      else stats.open++;
    });

    // 4. Agentic Generation via Gemini
    const prompt = `
You are an expert civic AI analyzing a 5km city area.
Here is the aggregated data for issues reported in this grid:
Total Issues: ${stats.total}
Open: ${stats.open}
Resolved: ${stats.resolved}
Categories: ${JSON.stringify(stats.categories)}

Provide a concise, 1-to-2 sentence analytical insight. Highlight the biggest problem or a positive trend. Be professional and data-driven. Do NOT use markdown.
    `.trim();

    const insightText = await callGemini(prompt, [], 15000, 'minimal');

    // 5. Update Cache
    await insightRef.set({
      geohash: geohashPrefix,
      insight: insightText.trim(),
      issueCount: stats.total,
      lastUpdated: FieldValue.serverTimestamp()
    });

    res.json({
      geohash: geohashPrefix,
      insight: insightText.trim(),
      issueCount: stats.total,
      cached: false
    });

  } catch (error) {
    console.error('Insights generation failed:', error);
    res.status(500).json({ error: 'Failed to generate insights' });
  }
});

export default router;
