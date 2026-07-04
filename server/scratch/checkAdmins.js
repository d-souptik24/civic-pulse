import { auth } from '../lib/firebase-admin.js';

async function checkAdmins() {
  try {
    console.log("Checking all users for admin privileges...");
    let nextPageToken;
    let adminCount = 0;
    
    // Loop through all users (1000 at a time)
    do {
      const listUsersResult = await auth.listUsers(1000, nextPageToken);
      
      listUsersResult.users.forEach((userRecord) => {
        if (userRecord.customClaims && userRecord.customClaims.admin === true) {
          console.log(`- Admin Found: ${userRecord.email || 'No Email'} (UID: ${userRecord.uid})`);
          adminCount++;
        }
      });
      
      nextPageToken = listUsersResult.pageToken;
    } while (nextPageToken);
    
    if (adminCount === 0) {
      console.log("No admins found in the system right now.");
    }
  } catch (error) {
    console.error("Error fetching users:", error);
  }
}

checkAdmins();
