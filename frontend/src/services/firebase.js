import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Connect to emulator only when explicitly enabled via env var
// REACT_APP_USE_EMULATOR=true in .env for local dev
// REACT_APP_USE_EMULATOR=false (or unset) in production
if (
  process.env.NODE_ENV === "development" &&
  process.env.REACT_APP_USE_EMULATOR === "true"
) {
  try {
    connectFirestoreEmulator(db, "127.0.0.1", 8081);
    console.log("✅ Firestore connected to local emulator");
  } catch (e) {
    // Already connected — ignore duplicate calls
  }
}

export default app;