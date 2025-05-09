import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase configuration
// Note: Using 'spidey-78a0e' as project ID from the service account
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: 'spidey-78a0e.firebaseapp.com',
  projectId: 'spidey-78a0e',
  storageBucket: 'spidey-78a0e.appspot.com',
  messagingSenderId: "000000000000", // Not needed for our use case
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, db, storage };