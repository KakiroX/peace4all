import type { FirebaseOptions } from "firebase/app";

// Firebase web config. These values are public by design (they ship to every browser);
// access is controlled by Firestore security rules (firestore.rules), not by hiding them.
//
// Set them as NEXT_PUBLIC_FIREBASE_* environment variables (e.g. in Vercel), or paste the
// config from Firebase console → Project settings → Your apps into COMMITTED_CONFIG.
const COMMITTED_CONFIG: FirebaseOptions | null = null;

const fromEnv: FirebaseOptions | null = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  ? {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    }
  : null;

export const firebaseConfig: FirebaseOptions | null = fromEnv ?? COMMITTED_CONFIG;
export const firebaseConfigured = firebaseConfig !== null;

/** Point the SDK at local emulators (`npm run emulators`) instead of the real project. */
export const firebaseEmulatorsEnabled = process.env.NEXT_PUBLIC_FIREBASE_EMULATORS === "1";
