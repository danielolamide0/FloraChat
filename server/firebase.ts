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
    const userRef = doc(db, 'FloraChat/Users', username);
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
    // Create the FloraChat/Users collection if it doesn't exist
    const userRef = doc(db, 'FloraChat/Users', username);
    const userData = {
      username,
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp()
    };
    
    await setDoc(userRef, userData);
    console.log(`Created new user in Firebase: ${username}`);
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
    const userRef = doc(db, 'FloraChat/Users', username);
    await updateDoc(userRef, {
      lastLogin: serverTimestamp()
    });
    console.log(`Updated last login for user: ${username}`);
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
      isFavorite: false, // Default to not a favorite
      username // Store the username with each identification
    };
    
    // Create a unique ID for this identification
    const identificationId = identificationData.clientId || `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Save to the user's history collection
    const identificationRef = doc(db, `FloraChat/Users/${username}/history`, identificationId);
    await setDoc(identificationRef, identificationWithTimestamp);
    
    console.log(`Saved identification to history for user ${username}, ID: ${identificationId}`);
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
    const identificationsRef = collection(db, `FloraChat/Users/${username}/history`);
    const q = query(identificationsRef, where("deleted", "!=", true));
    const identificationSnapshot = await getDocs(q);
    
    const identifications = identificationSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Sort by createdAt timestamp in descending order (newest first)
    const sortedIdentifications = identifications.sort((a, b) => {
      const aTime = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : 0;
      const bTime = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : 0;
      return bTime - aTime;
    });
    
    console.log(`Retrieved ${sortedIdentifications.length} history items for user ${username}`);
    return sortedIdentifications;
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
    // First try to get from the dedicated favorites collection
    const favoritesRef = collection(db, `FloraChat/Users/${username}/favorites`);
    let favoritesSnapshot = await getDocs(favoritesRef);
    
    // If no dedicated favorites, fall back to filtering history
    if (favoritesSnapshot.empty) {
      const historyRef = collection(db, `FloraChat/Users/${username}/history`);
      const q = query(historyRef, where("isFavorite", "==", true), where("deleted", "!=", true));
      favoritesSnapshot = await getDocs(q);
    }
    
    const favorites = favoritesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Sort by createdAt timestamp in descending order (newest first)
    const sortedFavorites = favorites.sort((a, b) => {
      const aTime = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : 0;
      const bTime = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : 0;
      return bTime - aTime;
    });
    
    console.log(`Retrieved ${sortedFavorites.length} favorites for user ${username}`);
    return sortedFavorites;
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
    // Update in history collection
    const historyRef = doc(db, `FloraChat/Users/${username}/history`, identificationId);
    await updateDoc(historyRef, {
      isFavorite
    });
    
    // If marking as favorite, copy to favorites collection
    if (isFavorite) {
      const historySnap = await getDoc(historyRef);
      if (historySnap.exists()) {
        const favoriteRef = doc(db, `FloraChat/Users/${username}/favorites`, identificationId);
        await setDoc(favoriteRef, {
          ...historySnap.data(),
          isFavorite: true
        });
      }
    } else {
      // If removing from favorites, delete from favorites collection
      const favoriteRef = doc(db, `FloraChat/Users/${username}/favorites`, identificationId);
      const favoriteSnap = await getDoc(favoriteRef);
      if (favoriteSnap.exists()) {
        await updateDoc(favoriteRef, { deleted: true });
      }
    }
    
    console.log(`Toggled favorite status for user ${username}, ID: ${identificationId} to ${isFavorite}`);
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
    // Mark as deleted in history collection
    const historyRef = doc(db, `FloraChat/Users/${username}/history`, identificationId);
    await updateDoc(historyRef, { deleted: true });
    
    // Also mark as deleted in favorites collection if it exists there
    const favoriteRef = doc(db, `FloraChat/Users/${username}/favorites`, identificationId);
    const favoriteSnap = await getDoc(favoriteRef);
    if (favoriteSnap.exists()) {
      await updateDoc(favoriteRef, { deleted: true });
    }
    
    console.log(`Marked identification as deleted for user ${username}, ID: ${identificationId}`);
    return { success: true, id: identificationId };
  } catch (error) {
    console.error('Error deleting identification:', error);
    throw error;
  }
}

export { storage as firebaseStorage, db as firestore };