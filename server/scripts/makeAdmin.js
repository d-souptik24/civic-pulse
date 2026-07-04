import { auth } from '../lib/firebase-admin.js';

async function makeAdmin(uid) {
  if (!uid) {
    console.error('Please provide a Firebase User ID (UID).');
    console.log('Usage: node makeAdmin.js <uid>');
    process.exit(1);
  }

  try {
    // Set custom user claims
    await auth.setCustomUserClaims(uid, { admin: true });
    console.log(`Successfully granted admin privileges to user: ${uid}`);
    
    // Fetch the user to verify
    const user = await auth.getUser(uid);
    console.log('Current custom claims:', user.customClaims);
  } catch (error) {
    console.error('Error granting admin privileges:', error);
  }
}

const uid = process.argv[2];
makeAdmin(uid);
