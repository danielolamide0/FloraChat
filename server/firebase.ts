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

// Root collection for FloraChat
const floraChatCollection = collection(db, "FloraChat");

// Helper functions for Firebase access
export const getUsersCollection = () => {
  return collection(floraChatCollection, "Users");
};

export const getUserDoc = (username: string) => {
  return doc(getUsersCollection(), username);
};

export const getUserHistoryCollection = (username: string) => {
  return collection(getUserDoc(username), "history");
};

export const getUserFavoritesCollection = (username: string) => {
  return collection(getUserDoc(username), "favorites");
};

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
    const userRef = getUserDoc(username);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = userSnap.data();
      console.log(`Found existing user in Firebase: ${username}`);
      return {
        ...userData,
        createdAt: userData.createdAt instanceof Timestamp ? 
          userData.createdAt.toDate() : userData.createdAt,
        lastLogin: userData.lastLogin instanceof Timestamp ? 
          userData.lastLogin.toDate() : userData.lastLogin
      };
    } else {
      console.log(`No user found in Firebase: ${username}`);
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
    // Check if user already exists
    const existingUser = await getUser(username);
    if (existingUser) {
      console.log(`User ${username} already exists, returning existing user`);
      // Update lastLogin
      await updateUserLastLogin(username);
      return existingUser;
    }
    
    // Create new user using username as document ID
    const now = new Date();
    const userData = {
      username,
      name: username, // For compatibility
      createdAt: now,
      lastLogin: now
    };
    
    // Create the user in the FloraChat/Users collection
    const userRef = getUserDoc(username);
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
    const userRef = getUserDoc(username);
    await updateDoc(userRef, {
      lastLogin: new Date()
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
    // Ensure we have a clientId for consistent reference
    const clientId = identificationData.clientId || `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Add necessary metadata to the identification
    const identificationWithMetadata = {
      ...identificationData,
      clientId,
      createdAt: new Date(),
      isFavorite: identificationData.isFavorite || false,
      username, // Store the username with each identification
      timestamp: new Date() // For compatibility with timestamp sorting
    };
    
    // Get the user's history collection
    const historyCollection = getUserHistoryCollection(username);
    
    // We'll use the clientId as the document ID for easy retrieval
    const identificationRef = doc(historyCollection, clientId);
    await setDoc(identificationRef, identificationWithMetadata);
    
    console.log(`Saved identification to history for user ${username}, ID: ${clientId}`);
    return {
      id: clientId,
      ...identificationWithMetadata
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
    // Get the user's history collection
    const historyCollection = getUserHistoryCollection(username);
    
    // Query for non-deleted items, ordered by timestamp (newest first)
    const q = query(
      historyCollection,
      where("deleted", "!=", true)
    );
    
    // Note: We'll sort manually after fetching since there's an issue with orderBy
    
    const querySnapshot = await getDocs(q);
    
    // Process the query results
    const identifications = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Ensure createdAt is a JavaScript Date
        createdAt: data.createdAt instanceof Timestamp ? 
          data.createdAt.toDate() : 
          data.createdAt
      };
    });
    
    // Sort manually by createdAt (newest first)
    const sortedIdentifications = identifications.sort((a, b) => {
      const aDate = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
      const bDate = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
      return bDate.getTime() - aDate.getTime();
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
    // First try to get from dedicated favorites collection
    const favoritesCollection = getUserFavoritesCollection(username);
    const favoritesQuery = query(
      favoritesCollection,
      where("deleted", "!=", true)
    );
    
    const favoritesSnapshot = await getDocs(favoritesQuery);
    
    // If we have favorites in the dedicated collection, use those
    if (!favoritesSnapshot.empty) {
      const favorites = favoritesSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Ensure createdAt is a JavaScript Date
          createdAt: data.createdAt instanceof Timestamp ? 
            data.createdAt.toDate() : 
            data.createdAt
        };
      });
      
      // Sort manually by createdAt (newest first)
      const sortedFavorites = favorites.sort((a, b) => {
        const aDate = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
        const bDate = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
        return bDate.getTime() - aDate.getTime();
      });
      
      console.log(`Retrieved ${sortedFavorites.length} favorites from dedicated collection for user ${username}`);
      return sortedFavorites;
    }
    
    // Fallback to filtering history for favorites
    const historyCollection = getUserHistoryCollection(username);
    const historyQuery = query(
      historyCollection,
      where("isFavorite", "==", true),
      where("deleted", "!=", true)
    );
    
    const historySnapshot = await getDocs(historyQuery);
    const favorites = historySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Ensure createdAt is a JavaScript Date
        createdAt: data.createdAt instanceof Timestamp ? 
          data.createdAt.toDate() : 
          data.createdAt
      };
    });
    
    // Sort manually by createdAt (newest first)
    const sortedFavorites = favorites.sort((a, b) => {
      const aDate = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
      const bDate = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
      return bDate.getTime() - aDate.getTime();
    });
    
    console.log(`Retrieved ${sortedFavorites.length} favorites from history for user ${username}`);
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
    // First, update the history item
    const historyRef = doc(getUserHistoryCollection(username), identificationId);
    const historySnap = await getDoc(historyRef);
    
    if (!historySnap.exists()) {
      throw new Error(`Identification ${identificationId} not found for user ${username}`);
    }
    
    // Update the favorite status in history
    await updateDoc(historyRef, { isFavorite });
    
    // If setting as favorite, also add to the favorites collection
    if (isFavorite) {
      const favoriteData = {
        ...historySnap.data(),
        isFavorite: true
      };
      
      const favoriteRef = doc(getUserFavoritesCollection(username), identificationId);
      await setDoc(favoriteRef, favoriteData);
      console.log(`Added identification ${identificationId} to favorites for user ${username}`);
    } else {
      // If removing from favorites, mark as deleted in the favorites collection
      const favoriteRef = doc(getUserFavoritesCollection(username), identificationId);
      const favoriteSnap = await getDoc(favoriteRef);
      
      if (favoriteSnap.exists()) {
        await updateDoc(favoriteRef, { 
          deleted: true,
          isFavorite: false
        });
        console.log(`Removed identification ${identificationId} from favorites for user ${username}`);
      }
    }
    
    return { 
      id: identificationId, 
      isFavorite 
    };
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
    // Mark as deleted in history collection (we don't actually delete the document)
    const historyRef = doc(getUserHistoryCollection(username), identificationId);
    await updateDoc(historyRef, { 
      deleted: true,
      isFavorite: false // Automatically remove from favorites when deleted
    });
    
    // Also mark as deleted in favorites collection if it exists there
    const favoriteRef = doc(getUserFavoritesCollection(username), identificationId);
    const favoriteSnap = await getDoc(favoriteRef);
    
    if (favoriteSnap.exists()) {
      await updateDoc(favoriteRef, { 
        deleted: true,
        isFavorite: false
      });
    }
    
    console.log(`Marked identification ${identificationId} as deleted for user ${username}`);
    return { 
      success: true, 
      id: identificationId, 
      deleted: true 
    };
  } catch (error) {
    console.error('Error deleting identification:', error);
    throw error;
  }
}

export { storage as firebaseStorage, db as firestore };