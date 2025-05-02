import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  getDocs, 
  query, 
  where, 
  arrayUnion, 
  arrayRemove, 
  serverTimestamp, 
  Timestamp 
} from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

// Initialize Firebase
let app: any = null;
let storage: any = null;
let db: any = null;

try {
  app = initializeApp(firebaseConfig);
  storage = getStorage(app);
  db = getFirestore(app);
  console.log("Firebase initialized successfully");
} catch (error: any) {
  console.error("Error initializing Firebase:", error);
}

/**
 * Upload image to Firebase Storage
 * @param imageBuffer - The image buffer to upload
 * @param fileName - The name to give the file in storage
 * @param contentType - The content type of the image
 * @returns The download URL of the uploaded image
 */
export async function uploadImageToFirebase(
  imageBuffer: Buffer, 
  fileName: string,
  contentType: string
): Promise<string> {
  // First check if Firebase is properly initialized
  if (!storage) {
    console.error('Firebase Storage not initialized');
    throw new Error('Firebase Storage not initialized');
  }
  
  try {
    // Create a storage reference
    const storageRef = ref(storage, `plant-images/${fileName}`);
    
    // Upload the image
    const metadata = {
      contentType
    };
    
    // Log the upload attempt with size
    console.log(`Attempting to upload image: ${fileName}, Size: ${imageBuffer.length} bytes`);
    
    const snapshot = await uploadBytes(storageRef, imageBuffer, metadata);
    console.log('Uploaded image to Firebase Storage successfully');
    
    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log('Generated download URL:', downloadURL);
    return downloadURL;
  } catch (error: any) {
    console.error('Error uploading image to Firebase:', error);
    
    // Add more detailed error logging
    if (error.code) {
      console.error(`Firebase error code: ${error.code}`);
    }
    
    if (error.customData && error.customData.serverResponse) {
      console.error('Server response:', error.customData.serverResponse);
    }
    
    throw error;
  }
}

// Check if Firebase is configured
export function isFirebaseConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_API_KEY &&
    process.env.FIREBASE_AUTH_DOMAIN &&
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_STORAGE_BUCKET
  );
}

// User management functions
export async function getUser(username: string) {
  if (!db) {
    console.error('Firestore not initialized');
    throw new Error('Firestore not initialized');
  }

  try {
    const userRef = doc(db, 'users', username);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return userSnap.data();
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
  }
}

export async function createUser(username: string) {
  if (!db) {
    console.error('Firestore not initialized');
    throw new Error('Firestore not initialized');
  }

  try {
    const userRef = doc(db, 'users', username);
    const userData = {
      username,
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp()
    };
    
    await setDoc(userRef, userData);
    return userData;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

export async function updateUserLastLogin(username: string) {
  if (!db) {
    console.error('Firestore not initialized');
    throw new Error('Firestore not initialized');
  }

  try {
    const userRef = doc(db, 'users', username);
    await updateDoc(userRef, {
      lastLogin: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating user last login:', error);
    throw error;
  }
}

// Plant identification history management
export async function saveIdentificationToHistory(username: string, identificationData: any) {
  if (!db) {
    console.error('Firestore not initialized');
    throw new Error('Firestore not initialized');
  }

  try {
    // Add a timestamp to the identification data
    const identificationWithTimestamp = {
      ...identificationData,
      createdAt: serverTimestamp(),
      isFavorite: false // Default to not a favorite
    };
    
    // Create a unique ID for this identification (could be timestamp-based)
    const identificationId = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Save to the user's identifications collection
    const identificationRef = doc(db, `users/${username}/identifications`, identificationId);
    await setDoc(identificationRef, identificationWithTimestamp);
    
    return {
      id: identificationId,
      ...identificationWithTimestamp
    };
  } catch (error) {
    console.error('Error saving identification to history:', error);
    throw error;
  }
}

export async function getUserIdentificationHistory(username: string) {
  if (!db) {
    console.error('Firestore not initialized');
    throw new Error('Firestore not initialized');
  }

  try {
    const identificationsRef = collection(db, `users/${username}/identifications`);
    const identificationSnapshot = await getDocs(identificationsRef);
    
    const identifications = identificationSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Sort by createdAt timestamp in descending order (newest first)
    return identifications.sort((a, b) => {
      const aTime = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : 0;
      const bTime = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : 0;
      return bTime - aTime;
    });
  } catch (error) {
    console.error('Error getting user identification history:', error);
    throw error;
  }
}

export async function getUserFavorites(username: string) {
  if (!db) {
    console.error('Firestore not initialized');
    throw new Error('Firestore not initialized');
  }

  try {
    const identificationsRef = collection(db, `users/${username}/identifications`);
    const q = query(identificationsRef, where("isFavorite", "==", true));
    const favoritesSnapshot = await getDocs(q);
    
    const favorites = favoritesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Sort by createdAt timestamp in descending order (newest first)
    return favorites.sort((a, b) => {
      const aTime = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : 0;
      const bTime = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : 0;
      return bTime - aTime;
    });
  } catch (error) {
    console.error('Error getting user favorites:', error);
    throw error;
  }
}

export async function toggleFavorite(username: string, identificationId: string, isFavorite: boolean) {
  if (!db) {
    console.error('Firestore not initialized');
    throw new Error('Firestore not initialized');
  }

  try {
    const identificationRef = doc(db, `users/${username}/identifications`, identificationId);
    await updateDoc(identificationRef, {
      isFavorite
    });
    return { id: identificationId, isFavorite };
  } catch (error) {
    console.error('Error toggling favorite status:', error);
    throw error;
  }
}

export async function deleteIdentification(username: string, identificationId: string) {
  if (!db) {
    console.error('Firestore not initialized');
    throw new Error('Firestore not initialized');
  }

  try {
    const identificationRef = doc(db, `users/${username}/identifications`, identificationId);
    await updateDoc(identificationRef, { deleted: true });
    return { success: true, id: identificationId };
  } catch (error) {
    console.error('Error deleting identification:', error);
    throw error;
  }
}

export { storage as firebaseStorage, db as firestore };