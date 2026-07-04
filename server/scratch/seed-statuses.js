
import { db } from '../lib/firebase-admin.js';
import { Timestamp } from 'firebase-admin/firestore';

const SECTOR_V_GEOHASH = 'tgn0fb';
const now = Date.now();
const HOUR = 60 * 60 * 1000;

const issues = [
  {
    title: 'Pending: Overgrown Tree',
    description: 'Tree blocking road.',
    category: 'other',
    severity: 2,
    status: 'pending',
    location: { lat: 22.5745, lng: 88.4341 },
    geohash: SECTOR_V_GEOHASH,
    upvotes: 1,
    reportedAt: Timestamp.fromDate(new Date(now - 1 * HOUR)),
  },
  {
    title: 'Unverified: Abandoned Vehicle',
    description: 'Vehicle parked for days.',
    category: 'other',
    severity: 2,
    status: 'unverified',
    location: { lat: 22.5755, lng: 88.4351 },
    geohash: SECTOR_V_GEOHASH,
    upvotes: 2,
    reportedAt: Timestamp.fromDate(new Date(now - 2 * HOUR)),
  },
  {
    title: 'In Progress: Traffic Light',
    description: 'Light malfunction.',
    category: 'infrastructure',
    severity: 4,
    status: 'in_progress',
    location: { lat: 22.5765, lng: 88.4361 },
    geohash: SECTOR_V_GEOHASH,
    upvotes: 5,
    reportedAt: Timestamp.fromDate(new Date(now - 3 * HOUR)),
  },
  {
    title: 'Escalated: Live Wire',
    description: 'Fallen live wire.',
    category: 'electrical',
    severity: 5,
    status: 'escalated',
    location: { lat: 22.5775, lng: 88.4371 },
    geohash: SECTOR_V_GEOHASH,
    upvotes: 10,
    reportedAt: Timestamp.fromDate(new Date(now - 4 * HOUR)),
  },
  {
    title: 'Resolved: Graffiti',
    description: 'Cleaned up graffiti.',
    category: 'vandalism',
    severity: 1,
    status: 'resolved',
    location: { lat: 22.5785, lng: 88.4381 },
    geohash: SECTOR_V_GEOHASH,
    upvotes: 1,
    reportedAt: Timestamp.fromDate(new Date(now - 5 * HOUR)),
  }
];

async function runSeed() {
  for (const issue of issues) {
    const docRef = db.collection('issues').doc();
    await docRef.set({ id: docRef.id, ...issue });
  }
  console.log('Seeded 5 new statuses!');
  process.exit(0);
}

runSeed();

