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
    // First, ensure the FloraChat collection exists
    const floraChatRef = doc(db, 'FloraChat', 'metadata');
    const floraChatSnap = await getDoc(floraChatRef);
    
    if (!floraChatSnap.exists()) {
      // Create the FloraChat collection with metadata
      await setDoc(floraChatRef, {
        created: serverTimestamp(),
        version: '1.0'
      });
      console.log('Created FloraChat collection');
    }
    
    // Now access the user document
    const userRef = doc(db, 'FloraChat', 'Users');
    const userCollectionSnap = await getDoc(userRef);
    
    if (!userCollectionSnap.exists()) {
      // Create the Users document as a subcollection container
      await setDoc(userRef, {
        created: serverTimestamp(),
        description: 'Container for user data'
      });
      console.log('Created FloraChat/Users document');
    }
    
    // Now get the actual user data
    const specificUserRef = doc(db, 'FloraChat/Users/data', username);
    const userSnap = await getDoc(specificUserRef);
    
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
    // First, ensure the FloraChat and Users documents exist
    await getUser(username); // This will create parent documents if needed
    
    // Create the user document
    const userRef = doc(db, 'FloraChat/Users/data', username);
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
    const userRef = doc(db, 'FloraChat/Users/data', username);
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
    // Create the user's history collection if it doesn't exist
    const historyCollectionRef = doc(db, 'FloraChat/Users/data', username);
    const historyCollectionSnap = await getDoc(historyCollectionRef);
    
    if (!historyCollectionSnap.exists()) {
      // Create the user if they don't exist
      await createUser(username);
    }
    
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
    const identificationRef = doc(db, `FloraChat/Users/data/${username}/history`, identificationId);
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
    // Check if user exists first
    const userRef = doc(db, 'FloraChat/Users/data', username);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      console.log(`User ${username} not found, creating new user`);
      await createUser(username);
      return []; // Return empty history for new users
    }
    
    // Get the user's history
    const identificationsRef = collection(db, `FloraChat/Users/data/${username}/history`);
    const q = query(identificationsRef, where("deleted", "!=", true));
    const identificationSnapshot = await getDocs(q);
    
    const identifications = identificationSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Sort by createdAt timestamp in descending order (newest first)
    const sortedIdentifications = identifications.sort((a, b) => {
      // Handle different timestamp formats
      const getTime = (item: any) => {
        if (item.createdAt && item.createdAt.toMillis) {
          return item.createdAt.toMillis();
        } else if (item.createdAt && item.createdAt.seconds) {
          return item.createdAt.seconds * 1000;
        }
        return 0;
      };
      
      return getTime(b) - getTime(a);
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
    // Check if user exists first
    const userRef = doc(db, 'FloraChat/Users/data', username);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      console.log(`User ${username} not found, creating new user`);
      await createUser(username);
      return []; // Return empty favorites for new users
    }
    
    // First try to get from the dedicated favorites collection
    const favoritesRef = collection(db, `FloraChat/Users/data/${username}/favorites`);
    let favoritesSnapshot = await getDocs(favoritesRef);
    
    // If no dedicated favorites, fall back to filtering history
    if (favoritesSnapshot.empty) {
      const historyRef = collection(db, `FloraChat/Users/data/${username}/history`);
      const q = query(historyRef, where("isFavorite", "==", true), where("deleted", "!=", true));
      favoritesSnapshot = await getDocs(q);
    }
    
    const favorites = favoritesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Sort by createdAt timestamp in descending order (newest first)
    const sortedFavorites = favorites.sort((a, b) => {
      // Handle different timestamp formats
      const getTime = (item: any) => {
        if (item.createdAt && item.createdAt.toMillis) {
          return item.createdAt.toMillis();
        } else if (item.createdAt && item.createdAt.seconds) {
          return item.createdAt.seconds * 1000;
        }
        return 0;
      };
      
      return getTime(b) - getTime(a);
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
    // Check if user exists first
    const userRef = doc(db, 'FloraChat/Users/data', username);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      console.log(`User ${username} not found, creating new user`);
      await createUser(username);
      return { id: identificationId, isFavorite }; // Return expected result even for new users
    }
    
    // Update in history collection
    const historyRef = doc(db, `FloraChat/Users/data/${username}/history`, identificationId);
    const historySnap = await getDoc(historyRef);
    
    if (historySnap.exists()) {
      await updateDoc(historyRef, {
        isFavorite
      });
      
      // If marking as favorite, copy to favorites collection
      if (isFavorite) {
        const favoriteRef = doc(db, `FloraChat/Users/data/${username}/favorites`, identificationId);
        await setDoc(favoriteRef, {
          ...historySnap.data(),
          isFavorite: true
        });
      } else {
        // If removing from favorites, delete from favorites collection
        const favoriteRef = doc(db, `FloraChat/Users/data/${username}/favorites`, identificationId);
        const favoriteSnap = await getDoc(favoriteRef);
        if (favoriteSnap.exists()) {
          await updateDoc(favoriteRef, { deleted: true });
        }
      }
    } else {
      console.warn(`Identification ${identificationId} not found in user ${username}'s history`);
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
    // Check if user exists first
    const userRef = doc(db, 'FloraChat/Users/data', username);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      console.log(`User ${username} not found, creating new user`);
      await createUser(username);
      return { success: true, id: identificationId }; // Return success for new users
    }
    
    // Mark as deleted in history collection
    const historyRef = doc(db, `FloraChat/Users/data/${username}/history`, identificationId);
    const historySnap = await getDoc(historyRef);
    
    if (historySnap.exists()) {
      await updateDoc(historyRef, { deleted: true });
      
      // Also mark as deleted in favorites collection if it exists there
      const favoriteRef = doc(db, `FloraChat/Users/data/${username}/favorites`, identificationId);
      const favoriteSnap = await getDoc(favoriteRef);
      if (favoriteSnap.exists()) {
        await updateDoc(favoriteRef, { deleted: true });
      }
    } else {
      console.warn(`Identification ${identificationId} not found in user ${username}'s history`);
    }
    
    console.log(`Marked identification as deleted for user ${username}, ID: ${identificationId}`);
    return { success: true, id: identificationId };
  } catch (error) {
    console.error('Error deleting identification:', error);
    throw error;
  }
}

export { storage as firebaseStorage, db as firestore };