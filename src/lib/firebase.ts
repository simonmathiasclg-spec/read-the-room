import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import { getDatabase, type Database } from "firebase/database";

// All values are public-by-design Firebase web config (safe to expose to the
// browser), but they still live in .env.local so each environment can point at
// its own Firebase project. Access is locked down by Realtime Database rules.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** True once real keys are present — lets the UI show a setup hint instead of crashing. */
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.databaseURL &&
    firebaseConfig.projectId,
);

let database: Database | undefined;

/** Lazily initialize Firebase once (guards against re-init on Fast Refresh). */
export function getDb(): Database {
  if (!isFirebaseConfigured) {
    throw new Error(
      "Firebase is not configured. Copy .env.local.example to .env.local and add your keys.",
    );
  }
  if (!database) {
    const app: FirebaseApp = getApps().length
      ? getApp()
      : initializeApp(firebaseConfig);
    database = getDatabase(app);
  }
  return database;
}
