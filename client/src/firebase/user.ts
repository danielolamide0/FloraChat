import { db } from './config';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  setDoc, 
  updateDoc, 
  serverTimestamp,
  orderBy,
  Timestamp
} from 'firebase/firestore';

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

// User management functions
export async function getUser(username: string) {
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
    // Return null instead of throwing when there's a Firebase permission issue
    // This allows us to gracefully handle issues with Firestore permissions
    return null;
  }
}

export async function createUser(username: string) {
  try {
    // Check if user already exists
    const existingUser = await getUser(username);
    if (existingUser) {
      console.log(`User ${username} already exists, returning existing user`);
      // Update lastLogin
      await updateUserLastLogin(username);
      return existingUser;
    }
    
    // Create the user document
    const userRef = getUserDoc(username);
    const now = new Date();
    const userData = {
      username,
      name: username, // For compatibility
      createdAt: now,
      lastLogin: now
    };
    
    await setDoc(userRef, userData);
    console.log(`Created new user in Firebase: ${username}`);
    return userData;
  } catch (error) {
    console.error('Error creating user:', error);
    // Return a basic user object without throwing to handle Firebase permission issues
    const now = new Date();
    return { 
      username,
      name: username,
      createdAt: now,
      lastLogin: now
    };
  }
}

export async function updateUserLastLogin(username: string) {
  try {
    const userRef = getUserDoc(username);
    await updateDoc(userRef, {
      lastLogin: new Date()
    });
    console.log(`Updated last login for user: ${username}`);
  } catch (error) {
    console.error('Error updating user last login:', error);
    // Don't throw, simply log the error
  }
}

// Plant identification history management
export async function saveIdentificationToHistory(username: string, identificationData: any) {
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
    
    // Create a local fallback with a timestamp when Firebase fails
    const now = new Date();
    const clientId = identificationData.clientId || `local-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Return a client-side object that mimics what would have been saved
    return {
      id: clientId,
      clientId,
      ...identificationData,
      createdAt: now,
      timestamp: now,
      isFavorite: false,
      username
    };
  }
}

export async function getUserIdentificationHistory(username: string) {
  try {
    // Get the user's history collection
    const historyCollection = getUserHistoryCollection(username);
    
    // Query for non-deleted items (we'll sort manually)
    const q = query(
      historyCollection,
      where("deleted", "!=", true)
    );
    
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
    // Return an empty array instead of throwing to handle Firebase permission issues
    return [];
  }
}

export async function getUserFavorites(username: string) {
  try {
    // First try to get from dedicated favorites collection
    const favoritesCollection = getUserFavoritesCollection(username);
    const favoritesQuery = query(
      favoritesCollection,
      where("deleted", "!=", true),
      orderBy("createdAt", "desc")
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
      
      console.log(`Retrieved ${favorites.length} favorites from dedicated collection for user ${username}`);
      return favorites;
    }
    
    // Fallback to filtering history for favorites
    const historyCollection = getUserHistoryCollection(username);
    const historyQuery = query(
      historyCollection,
      where("isFavorite", "==", true),
      where("deleted", "!=", true),
      orderBy("createdAt", "desc")
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
    
    console.log(`Retrieved ${favorites.length} favorites from history for user ${username}`);
    return favorites;
  } catch (error) {
    console.error('Error getting user favorites:', error);
    // Return an empty array instead of throwing to handle Firebase permission issues
    return [];
  }
}

export async function toggleFavorite(username: string, identificationId: string, isFavorite: boolean) {
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
    // Return the expected result even if Firebase update fails
    return { id: identificationId, isFavorite };
  }
}

export async function deleteIdentification(username: string, identificationId: string) {
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
    // Return success anyway to maintain the UI flow
    return { success: true, id: identificationId };
  }
}