import express from 'express';
import { db, FieldValue } from '../lib/firebase-admin.js';
import * as geofire from 'geofire-common';
import auth, { requireAdmin } from '../middleware/auth.js';

const router = express.Router();


// ── GET /api/issues ───────────────────────────────────────────────────────────
// List issues with optional category/status filters (Limit 100)
router.get('/', async (req, res) => {
  try {
    const { category, status } = req.query;
    
    let query = db.collection('issues');
    
    if (category) query = query.where('category', '==', category);
    if (status) query = query.where('status', '==', status);
    
    // Sort by newest first, limit 100 to protect Firebase read quota
    query = query.orderBy('reportedAt', 'desc').limit(100);
    
    const snapshot = await query.get();
    const issues = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    res.json(issues);
  } catch (error) {
    console.error('Failed to fetch issues:', error);
    res.status(500).json({ error: 'Failed to fetch issues' });
  }
});

// ── POST /api/issues/deduplicate (Pipeline 2) ────────────────────────────────
// Geo-Deduplication Agent: checks 200m radius for open issues of same category
router.post('/deduplicate', auth, async (req, res) => {
  try {
    const { lat, lng, category } = req.body;
    if (!lat || !lng || !category) {
      return res.status(400).json({ error: 'Missing lat, lng, or category' });
    }

    const center = [lat, lng];
    const radiusInM = 200;
    const bounds = geofire.geohashQueryBounds(center, radiusInM);

    const promises = bounds.map(b => {
      return db.collection('issues')
        .orderBy('geohash')
        .startAt(b[0])
        .endAt(b[1])
        .get();
    });

    const snapshots = await Promise.all(promises);
    let duplicateId = null;

    for (const snap of snapshots) {
      for (const doc of snap.docs) {
        const issue = doc.data();
        
        // In-memory filter to bypass missing composite index requirement
        if (issue.category !== category || issue.status !== 'open') continue;

        if (issue.location && issue.location.lat && issue.location.lng) {
          const docLoc = [issue.location.lat, issue.location.lng];
          const distanceKm = geofire.distanceBetween(center, docLoc);
          if (distanceKm <= (radiusInM / 1000)) { // 200m = 0.2km
            duplicateId = doc.id;
            break;
          }
        }
      }
      if (duplicateId) break;
    }

    if (duplicateId) {
      res.json({ isDuplicate: true, duplicateId });
    } else {
      res.json({ isDuplicate: false });
    }
  } catch (error) {
    console.error('Deduplication check failed:', error);
    res.status(500).json({ error: 'Deduplication check failed' });
  }
});

// ── POST /api/issues ─────────────────────────────────────────────────────────
// Issue Creation with Gamification Batch
router.post('/', auth, async (req, res) => {
  try {
    const { 
      imageUrl, category, severity, title, description, 
      location, isAuthentic, confidence, reasoning 
    } = req.body;

    // userId comes from the verified Firebase token — not the request body
    const userId = req.user.uid;

    if (!location || !location.lat || !location.lng) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // 1. Calculate Geohash
    const hash = geofire.geohashForLocation([location.lat, location.lng]);

    // 2. Determine initial status based on Pipeline 1 AI Authenticity
    const initialStatus = isAuthentic ? 'open' : 'unverified';

    // 3. Prepare Issue Document
    const issueRef = db.collection('issues').doc();
    const newIssue = {
      title: title || 'Reported Issue',
      description: description || '',
      category,
      severity,
      status: initialStatus,
      statusHistory: [{
        status: initialStatus,
        timestamp: new Date(),
        changedBy: 'system'
      }],
      location,
      geohash: hash,
      photoUrl: imageUrl || null,
      resolvedPhotoUrl: null,
      upvotes: 0,
      upvotedBy: [],
      reportedBy: userId,
      reportedAt: FieldValue.serverTimestamp(),
      resolvedAt: null,
      
      // AI Fields from Pipeline 1
      aiCategory: category,
      aiSeverity: severity,
      aiAuthenticity: !!isAuthentic,
      aiReasoning: reasoning || null,
      confidence: confidence || 0,
      
      // Future Pipeline Fields
      aiEscalationSummary: null,
      aiResolutionVerified: null,
      aiResolutionExplanation: null
    };

    // 4. Prepare User Gamification Updates
    // Points: +50 for creation, +25 bonus if AI-authenticated. 0 if unverified.
    const pointsAwarded = isAuthentic ? 75 : 0;

    // Badge determination (check which category-based badges to award)
    // Use a transaction to read existing badges first so we can detect newly earned ones
    const userRef = db.collection('users').doc(userId);

    // 5. Execute in a transaction so we can safely check existing badges
    await db.runTransaction(async (transaction) => {
      // ALL READS FIRST
      const userDoc = await transaction.get(userRef);

      // Determine which badges to award
      const existingBadges = (userDoc.exists && userDoc.data().badges) || [];
      const badgesToAdd = [];

      if (category === 'pothole' && !existingBadges.includes('Pothole Patrol')) {
        badgesToAdd.push('Pothole Patrol');
      }
      if (category === 'water_leak' && !existingBadges.includes('Water Warden')) {
        badgesToAdd.push('Water Warden');
      }
      if (category === 'streetlight' && !existingBadges.includes('Light Keeper')) {
        badgesToAdd.push('Light Keeper');
      }

      // Build user update object
      const userUpdate = {
        reportsCount: FieldValue.increment(1)
      };
      if (pointsAwarded > 0) {
        userUpdate.points = FieldValue.increment(pointsAwarded);
      }
      if (badgesToAdd.length > 0) {
        userUpdate.badges = FieldValue.arrayUnion(...badgesToAdd);
        // Schema extension: track when last badge was awarded for confetti trigger
        userUpdate.lastBadgeAwardedAt = FieldValue.serverTimestamp();
      }

      // ALL WRITES AFTER READS
      transaction.set(issueRef, newIssue);
      transaction.set(userRef, userUpdate, { merge: true });
    });

    res.status(201).json({ id: issueRef.id, ...newIssue, pointsAwarded });
  } catch (error) {
    console.error('Failed to create issue:', error);
    res.status(500).json({ error: 'Failed to create issue' });
  }
});

// ── POST /api/issues/:id/upvote ──────────────────────────────────────────────
// Upvoting Transaction: awards +10 pts to original reporter,
// increments upvoter's upvotesGiven (for Upvote Champion badge), 0 pts to upvoter.
router.post('/:id/upvote', auth, async (req, res) => {
  try {
    const { id } = req.params;
    // userId comes from the verified Firebase token — not the request body
    const userId = req.user.uid;


    const issueRef = db.collection('issues').doc(id);
    const upvoterRef = db.collection('users').doc(userId);

    await db.runTransaction(async (transaction) => {
      // ── ALL READS FIRST (Node.js Firestore transaction rule) ──────────────
      const issueDoc = await transaction.get(issueRef);
      if (!issueDoc.exists) {
        throw new Error('Issue not found');
      }

      const upvoterDoc = await transaction.get(upvoterRef);
      
      const issueData = issueDoc.data();

      const hasUpvoted = issueData.upvotedBy && issueData.upvotedBy.includes(userId);

      if (hasUpvoted) {
        // ── UNDO UPVOTE ──
        transaction.update(issueRef, {
          upvotes: FieldValue.increment(-1),
          upvotedBy: FieldValue.arrayRemove(userId)
        });

        if (issueData.reportedBy) {
          const reporterRef = db.collection('users').doc(issueData.reportedBy);
          transaction.set(reporterRef, {
            points: FieldValue.increment(-10)
          }, { merge: true });
        }

        const upvoterUpdate = {
          upvotesGiven: FieldValue.increment(-1)
        };
        transaction.set(upvoterRef, upvoterUpdate, { merge: true });
      } else {
        // ── DO UPVOTE ──
        // Calculate badge eligibility for upvoter
        const currentUpvotesGiven = (upvoterDoc.exists && upvoterDoc.data().upvotesGiven) || 0;
        const existingBadges = (upvoterDoc.exists && upvoterDoc.data().badges) || [];
        const isUpvoteChampionNew = 
          currentUpvotesGiven === 19 && // This will be the 20th upvote
          !existingBadges.includes('Upvote Champion');

        transaction.update(issueRef, {
          upvotes: FieldValue.increment(1),
          upvotedBy: FieldValue.arrayUnion(userId)
        });

        if (issueData.reportedBy) {
          const reporterRef = db.collection('users').doc(issueData.reportedBy);
          transaction.set(reporterRef, {
            points: FieldValue.increment(10)
          }, { merge: true });
        }

        const upvoterUpdate = {
          upvotesGiven: FieldValue.increment(1)
        };
        if (isUpvoteChampionNew) {
          upvoterUpdate.badges = FieldValue.arrayUnion('Upvote Champion');
          upvoterUpdate.lastBadgeAwardedAt = FieldValue.serverTimestamp();
        }
        transaction.set(upvoterRef, upvoterUpdate, { merge: true });
      }
    });

    res.json({ success: true, message: 'Upvote recorded successfully' });
  } catch (error) {
    console.error('Upvote failed:', error);
    if (error.message === 'Issue not found') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to process upvote' });
  }
});

// ── PATCH /api/issues/:id/status ─────────────────────────────────────────────
// Admin action: change issue status (e.g., Mark as In Progress)
// Replaces the old client-side updateDoc which is now blocked by firestore.rules
router.patch('/:id/status', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Whitelist allowed status transitions from the frontend
    const ALLOWED_STATUSES = ['in_progress'];
    if (!status || !ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Allowed: ${ALLOWED_STATUSES.join(', ')}` });
    }

    const issueRef = db.collection('issues').doc(id);
    const issueSnap = await issueRef.get();
    if (!issueSnap.exists) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    await issueRef.update({
      status,
      statusHistory: FieldValue.arrayUnion({
        status,
        timestamp: new Date(),
        changedBy: req.user.uid,
      }),
    });

    res.json({ success: true, message: `Issue status updated to ${status}` });
  } catch (error) {
    console.error('Status update failed:', error);
    res.status(500).json({ error: 'Failed to update issue status' });
  }
});

export default router;
