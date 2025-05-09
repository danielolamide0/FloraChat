import admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

// Initialize Firebase Admin with service account credentials
let app: admin.app.App | undefined;
let db: admin.firestore.Firestore | undefined;
let storage: admin.storage.Storage | undefined;

// Get service account from environment variable
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;

try {
  if (serviceAccount) {
    // Parse the service account JSON if it's available
    const serviceAccountObj = JSON.parse(serviceAccount);
    
    console.log("Initializing Firebase Admin SDK with service account for project:", serviceAccountObj.project_id);
    
    // Initialize with the service account credentials
    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccountObj),
      storageBucket: `${serviceAccountObj.project_id}.appspot.com`
    });
    
    // Get the firestore and storage instances
    db = admin.firestore();
    storage = admin.storage();
    console.log("Firebase Admin SDK initialized successfully with service account");
  } 
  else if (process.env.FIREBASE_PROJECT_ID) {
    // Fallback to project ID if no service account is available
    console.log("Initializing Firebase Admin SDK with project ID:", process.env.FIREBASE_PROJECT_ID);
    
    app = admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET
    });
    
    db = admin.firestore();
    storage = admin.storage();
    console.log("Firebase Admin SDK initialized with project ID only");
  } 
  else {
    console.error("Firebase Admin SDK not initialized: Missing FIREBASE_SERVICE_ACCOUNT and FIREBASE_PROJECT_ID");
  }
} catch (error: any) {
  console.error("Error initializing Firebase Admin SDK:", error);
  
  // Handle case where the app has already been initialized
  if (error.code === 'app/duplicate-app') {
    try {
      app = admin.app();
      db = admin.firestore();
      storage = admin.storage();
      console.log("Retrieved existing Firebase Admin app");
    } catch (appError) {
      console.error("Error retrieving existing Firebase Admin app:", appError);
    }
  }
}

// User management functions
export async function getUser(username: string) {
  if (!db) {
    console.error('Firestore Admin not initialized');
    throw new Error('Firestore Admin not initialized');
  }

  try {
    const userRef = db.collection('users').doc(username);
    const userSnap = await userRef.get();
    
    if (userSnap.exists) {
      const userData = userSnap.data();
      console.log(`Found existing user in Firebase (admin): ${username}`);
      return {
        ...userData,
        createdAt: userData?.createdAt instanceof Timestamp ? 
          userData.createdAt.toDate() : userData?.createdAt,
        lastLogin: userData?.lastLogin instanceof Timestamp ? 
          userData.lastLogin.toDate() : userData?.lastLogin
      };
    } else {
      console.log(`No user found in Firebase (admin): ${username}`);
      return null;
    }
  } catch (error) {
    console.error('Error getting user (admin):', error);
    throw error;
  }
}

export async function createUser(username: string) {
  if (!db) {
    console.error('Firestore Admin not initialized');
    throw new Error('Firestore Admin not initialized');
  }

  try {
    // Check if user already exists
    const existingUser = await getUser(username);
    if (existingUser) {
      console.log(`User ${username} already exists, returning existing user (admin)`);
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
    
    // Create the user in the users collection
    const userRef = db.collection('users').doc(username);
    await userRef.set(userData);
    
    console.log(`Created new user in Firebase (admin): ${username}`);
    return userData;
  } catch (error) {
    console.error('Error creating user (admin):', error);
    throw error;
  }
}

export async function updateUserLastLogin(username: string) {
  if (!db) {
    console.error('Firestore Admin not initialized');
    throw new Error('Firestore Admin not initialized');
  }

  try {
    const userRef = db.collection('users').doc(username);
    await userRef.update({
      lastLogin: new Date()
    });
    console.log(`Updated last login for user (admin): ${username}`);
  } catch (error) {
    console.error('Error updating user last login (admin):', error);
    throw error;
  }
}

// Plant identification history management
export async function saveIdentificationToHistory(username: string, identificationData: any) {
  if (!db) {
    console.error('Firestore Admin not initialized');
    throw new Error('Firestore Admin not initialized');
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
    
    // Store the identification in the history collection with clientId as document ID
    const historyRef = db.collection('history').doc(clientId);
    await historyRef.set(identificationWithMetadata);
    
    console.log(`Saved identification to history for user ${username}, ID: ${clientId} (admin)`);
    return {
      id: clientId,
      ...identificationWithMetadata
    };
  } catch (error) {
    console.error('Error saving identification to history (admin):', error);
    throw error;
  }
}

export async function getUserIdentificationHistory(username: string) {
  if (!db) {
    console.error('Firestore Admin not initialized');
    throw new Error('Firestore Admin not initialized');
  }

  try {
    // Get the history collection and filter by username
    const historyRef = db.collection('history');
    const snapshot = await historyRef
      .where('username', '==', username)
      .where('deleted', '!=', true)
      .get();
    
    // Process the query results
    const identifications = snapshot.docs.map(doc => {
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
    
    console.log(`Retrieved ${sortedIdentifications.length} history items for user ${username} (admin)`);
    return sortedIdentifications;
  } catch (error) {
    console.error('Error getting user identification history (admin):', error);
    throw error;
  }
}

export async function getUserFavorites(username: string) {
  if (!db) {
    console.error('Firestore Admin not initialized');
    throw new Error('Firestore Admin not initialized');
  }

  try {
    // Get the favorites collection and filter by username
    const favoritesRef = db.collection('favorites');
    const favoritesSnapshot = await favoritesRef
      .where('username', '==', username)
      .where('deleted', '!=', true)
      .get();
    
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
      
      console.log(`Retrieved ${sortedFavorites.length} favorites from dedicated collection for user ${username} (admin)`);
      return sortedFavorites;
    }
    
    // Fallback to filtering history for favorites
    const historyRef = db.collection('history');
    const historySnapshot = await historyRef
      .where('username', '==', username)
      .where('isFavorite', '==', true)
      .where('deleted', '!=', true)
      .get();
    
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
    
    console.log(`Retrieved ${sortedFavorites.length} favorites from history for user ${username} (admin)`);
    return sortedFavorites;
  } catch (error) {
    console.error('Error getting user favorites (admin):', error);
    throw error;
  }
}

export async function toggleFavorite(username: string, identificationId: string, isFavorite: boolean) {
  if (!db) {
    console.error('Firestore Admin not initialized');
    throw new Error('Firestore Admin not initialized');
  }

  try {
    // First, update the history item
    const historyRef = db.collection('history').doc(identificationId);
    const historySnap = await historyRef.get();
    
    if (!historySnap.exists) {
      throw new Error(`Identification ${identificationId} not found for user ${username} (admin)`);
    }
    
    // Make sure this history item belongs to the user
    const historyData = historySnap.data();
    if (historyData?.username !== username) {
      throw new Error(`Identification ${identificationId} does not belong to user ${username} (admin)`);
    }
    
    // Update the favorite status in history
    await historyRef.update({ isFavorite });
    
    // If setting as favorite, also add to the favorites collection
    if (isFavorite) {
      const favoriteData = {
        ...historyData,
        isFavorite: true
      };
      
      const favoriteRef = db.collection('favorites').doc(identificationId);
      await favoriteRef.set(favoriteData);
      console.log(`Added identification ${identificationId} to favorites for user ${username} (admin)`);
    } else {
      // If removing from favorites, mark as deleted in the favorites collection
      const favoriteRef = db.collection('favorites').doc(identificationId);
      const favoriteSnap = await favoriteRef.get();
      
      if (favoriteSnap.exists) {
        await favoriteRef.update({ 
          deleted: true,
          isFavorite: false
        });
        console.log(`Removed identification ${identificationId} from favorites for user ${username} (admin)`);
      }
    }
    
    return { 
      id: identificationId, 
      isFavorite 
    };
  } catch (error) {
    console.error('Error toggling favorite status (admin):', error);
    throw error;
  }
}

export async function deleteIdentification(username: string, identificationId: string) {
  if (!db) {
    console.error('Firestore Admin not initialized');
    throw new Error('Firestore Admin not initialized');
  }

  try {
    // Mark as deleted in history collection (we don't actually delete the document)
    const historyRef = db.collection('history').doc(identificationId);
    const historySnap = await historyRef.get();
    
    if (!historySnap.exists) {
      throw new Error(`Identification ${identificationId} not found (admin)`);
    }
    
    // Make sure this history item belongs to the user
    const historyData = historySnap.data();
    if (historyData?.username !== username) {
      throw new Error(`Identification ${identificationId} does not belong to user ${username} (admin)`);
    }
    
    await historyRef.update({ 
      deleted: true,
      isFavorite: false // Automatically remove from favorites when deleted
    });
    
    // Also mark as deleted in favorites collection if it exists there
    const favoriteRef = db.collection('favorites').doc(identificationId);
    const favoriteSnap = await favoriteRef.get();
    
    if (favoriteSnap.exists) {
      await favoriteRef.update({ 
        deleted: true,
        isFavorite: false
      });
    }
    
    console.log(`Marked identification ${identificationId} as deleted for user ${username} (admin)`);
    return { 
      success: true, 
      id: identificationId, 
      deleted: true 
    };
  } catch (error) {
    console.error('Error deleting identification (admin):', error);
    throw error;
  }
}

// Test function to check Firebase connectivity
export async function testFirebaseConnection() {
  if (!db) {
    console.error('Firestore Admin not initialized');
    throw new Error('Firestore Admin not initialized');
  }
  
  try {
    const testRef = db.collection('test').doc('connection-test');
    await testRef.set({
      timestamp: new Date(),
      message: 'Testing Firebase Admin SDK connection'
    });
    console.log('Successfully wrote to Firebase with Admin SDK');
    return { success: true };
  } catch (error) {
    console.error('Error testing Firebase Admin connection:', error);
    throw error;
  }
}

export { db as firestore, storage as firebaseStorage };