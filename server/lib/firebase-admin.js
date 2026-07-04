import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';
import dotenv from 'dotenv';

dotenv.config();

// CRITICAL: Cloud Run stores FIREBASE_PRIVATE_KEY with escaped newlines (\n as literal
// two-character sequence). Without this replace(), cert() throws
// "Error: Invalid PEM encoded key" on every request, crashing the server.
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

// getApps() returns [] if no app is initialized yet — prevents double-init in dev
if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
    // Post Oct-2024 Firebase projects use .firebasestorage.app (not .appspot.com)
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET
      || `${process.env.FIREBASE_PROJECT_ID}.firebasestorage.app`,
  });
}

const db = getFirestore();
const auth = getAuth();
const bucket = getStorage().bucket();

export { db, auth, bucket, FieldValue };
