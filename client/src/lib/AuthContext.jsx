import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, googleProvider, db } from './firebase.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading, null = logged out

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Read the cryptographically-signed Custom Claim from the Firebase ID token.
        // This is the authoritative source for admin status — cannot be spoofed client-side.
        try {
          const idTokenResult = await firebaseUser.getIdTokenResult();
          firebaseUser._isAdmin = !!idTokenResult.claims.admin;
        } catch {
          firebaseUser._isAdmin = false;
        }
        setUser(firebaseUser);
        try {
          // Upsert user profile in Firestore on every login
          const userRef = doc(db, 'users', firebaseUser.uid);
          await setDoc(userRef, {
            id: firebaseUser.uid,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            email: firebaseUser.email,
            joinedAt: serverTimestamp(),
          }, { merge: true }); // merge: true prevents overwriting points/badges
        } catch (error) {
          console.error("Failed to sync user profile to Firestore:", error);
        }
      } else {
        setUser(null);
      }
    });
    return unsubscribe;
  }, []);

  const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
  const logout = () => signOut(auth);

  // Derived from the Custom Claim fetched on login — purely a UI convenience flag.
  // All real enforcement happens on the backend via requireAdmin middleware.
  const isAdmin = !!user?._isAdmin;

  return (
    <AuthContext.Provider value={{ user, isAdmin, signInWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === null) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
