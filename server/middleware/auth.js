import { auth } from '../lib/firebase-admin.js';

/**
 * Express middleware: verifies Firebase ID Token from the Authorization header.
 *
 * Usage (inline on individual routes — NOT at the router mount level):
 *   router.post('/', authMiddleware, async (req, res) => { ... });
 *
 * On success: sets req.user = { uid, email } and calls next().
 * On failure: returns 401 Unauthorized.
 *
 * NOTE: This only checks authentication (is the user logged in?), not
 * authorization/RBAC (is the user an admin?). For admin-only routes like
 * /api/escalate and /api/verify-resolution, a future improvement would be
 * to use Firebase Custom Claims (e.g., { admin: true }) and check them here.
 * TODO: Implement RBAC via Firebase Custom Claims for admin routes.
 */
export default async function authMiddleware(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }

  const idToken = header.split('Bearer ')[1];

  try {
    const decoded = await auth.verifyIdToken(idToken);
    req.user = { uid: decoded.uid, email: decoded.email || null, admin: decoded.admin === true };
    next();
  } catch (error) {
    console.error('Auth middleware — token verification failed:', error.message);
    return res.status(401).json({ error: 'Invalid or expired authentication token' });
  }
}

/**
 * Express middleware: requires an admin Custom Claim on the token.
 * Use this for sensitive routes (e.g., /api/escalate, /api/verify-resolution).
 */
export async function requireAdmin(req, res, next) {
  // First run the standard auth check
  await authMiddleware(req, res, () => {
    // Then check if the decoded token had the admin flag
    if (req.user && req.user.admin === true) {
      next();
    } else {
      res.status(403).json({ error: 'Forbidden: Admin access required' });
    }
  });
}
