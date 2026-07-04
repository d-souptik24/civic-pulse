/**
 * server/scratch/seed.js
 * One-time script: seeds 3 backdated civic issues into Firestore.
 * Run from the server/ directory: node scratch/seed.js
 *
 * These issues are required for the escalation agent demo:
 *   - status: "open"
 *   - reportedAt: > 24 hours ago
 *   - upvotes: >= 3
 */

import { db } from '../lib/firebase-admin.js';
import { Timestamp } from 'firebase-admin/firestore';

// Approximate geohash for Sector V, Kolkata (lat: 22.5735, lng: 88.4331)
// Generated via geofire-common: geohashForLocation([22.5735, 88.4331])
const SECTOR_V_GEOHASH = 'tgn0fb';

const now = Date.now();
const HOUR = 60 * 60 * 1000;

const issues = [
  {
    title: 'Major Pothole on Sector V Main Road',
    description:
      'Deep pothole near the main crossroads causing vehicles to swerve dangerously. Road surface has completely collapsed over a ~2ft area.',
    category: 'pothole',
    severity: 4,
    status: 'open',
    location: { lat: 22.5735, lng: 88.4331 },
    geohash: SECTOR_V_GEOHASH,
    photoUrl:
      'https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&w=600&q=80',
    resolvedPhotoUrl: null,
    upvotes: 3,
    upvotedBy: ['demo-user-1', 'demo-user-2', 'demo-user-3'],
    reportedBy: 'demo-reporter-1',
    reportedAt: Timestamp.fromDate(new Date(now - 30 * HOUR)),
    resolvedAt: null,
    aiCategory: 'pothole',
    aiSeverity: 4,
    aiAuthenticity: true,
    aiReasoning:
      'Image clearly shows a significant depression in public asphalt road surface, posing a traffic hazard.',
    aiEscalationSummary: null,
    aiResolutionVerified: null,
    aiResolutionExplanation: null,
    confidence: 0.95,
    statusHistory: [
      {
        status: 'open',
        timestamp: Timestamp.fromDate(new Date(now - 30 * HOUR)),
        changedBy: 'system',
      },
    ],
  },
  {
    title: 'Broken Streetlight near Technopolis Gate 2',
    description:
      'Streetlight has been completely dark for over a week. The footpath is pitch black at night, making it unsafe for pedestrians.',
    category: 'streetlight',
    severity: 3,
    status: 'open',
    location: { lat: 22.5792, lng: 88.4373 },
    geohash: SECTOR_V_GEOHASH,
    photoUrl:
      'https://images.unsplash.com/photo-1508873696983-2df519f0397e?auto=format&fit=crop&w=600&q=80',
    resolvedPhotoUrl: null,
    upvotes: 4,
    upvotedBy: ['demo-user-1', 'demo-user-3', 'demo-user-4', 'demo-user-5'],
    reportedBy: 'demo-reporter-2',
    reportedAt: Timestamp.fromDate(new Date(now - 36 * HOUR)),
    resolvedAt: null,
    aiCategory: 'streetlight',
    aiSeverity: 3,
    aiAuthenticity: true,
    aiReasoning:
      'Visual input confirms dark, unlit pole during twilight hours in a pedestrian zone.',
    aiEscalationSummary: null,
    aiResolutionVerified: null,
    aiResolutionExplanation: null,
    confidence: 0.89,
    statusHistory: [
      {
        status: 'open',
        timestamp: Timestamp.fromDate(new Date(now - 36 * HOUR)),
        changedBy: 'system',
      },
    ],
  },
  {
    title: 'Burst Water Main — Water Spraying onto Street',
    description:
      'Drinking water is spraying from a cracked municipal supply pipe. The surrounding road is waterlogged and pedestrians cannot pass safely.',
    category: 'water_leak',
    severity: 5,
    status: 'open',
    location: { lat: 22.5751, lng: 88.4355 },
    geohash: SECTOR_V_GEOHASH,
    photoUrl:
      'https://images.unsplash.com/photo-1542013936693-8848e5740a7a?auto=format&fit=crop&w=600&q=80',
    resolvedPhotoUrl: null,
    upvotes: 3,
    upvotedBy: ['demo-user-2', 'demo-user-4', 'demo-user-5'],
    reportedBy: 'demo-reporter-3',
    reportedAt: Timestamp.fromDate(new Date(now - 28 * HOUR)),
    resolvedAt: null,
    aiCategory: 'water_leak',
    aiSeverity: 5,
    aiAuthenticity: true,
    aiReasoning:
      'High-pressure fluid dispersion observed originating from a municipal water conduit at street level.',
    aiEscalationSummary: null,
    aiResolutionVerified: null,
    aiResolutionExplanation: null,
    confidence: 0.92,
    statusHistory: [
      {
        status: 'open',
        timestamp: Timestamp.fromDate(new Date(now - 28 * HOUR)),
        changedBy: 'system',
      },
    ],
  },
];

async function runSeed() {
  console.log('🚀 Starting Firestore seed...\n');
  try {
    for (const issue of issues) {
      const docRef = db.collection('issues').doc();
      await docRef.set({ id: docRef.id, ...issue });
      console.log(`  ✅ "${issue.title}"  →  ID: ${docRef.id}`);
    }
    console.log('\n🏁 Seeding complete! Open Firebase Console → Firestore to verify.');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Seeding failed:', err.message);
    console.error(err);
    process.exit(1);
  }
}

runSeed();
