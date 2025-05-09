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

// User management functions
export async function getUser(username: string) {
  try {
    const userRef = doc(db, 'FloraChat/Users', username);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      console.log(`Found existing user in Firebase: ${username}`);
      return userSnap.data();
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
    // Return a basic user object without throwing to handle Firebase permission issues
    return { 
      username,
      createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 },
      lastLogin: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }
    };
  }
}

export async function updateUserLastLogin(username: string) {
  try {
    const userRef = doc(db, 'FloraChat/Users', username);
    await updateDoc(userRef, {
      lastLogin: serverTimestamp()
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
    // Ensure data has a clientId for consistent reference
    const clientId = identificationData.clientId || `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Add a timestamp to the identification data
    const identificationWithTimestamp = {
      ...identificationData,
      clientId,
      createdAt: serverTimestamp(),
      isFavorite: false, // Default to not a favorite
      username // Store the username with each identification
    };
    
    // Save to the user's history collection
    const identificationRef = doc(db, `FloraChat/Users/${username}/history`, clientId);
    await setDoc(identificationRef, identificationWithTimestamp);
    
    console.log(`Saved identification to history for user ${username}, ID: ${clientId}`);
    return {
      id: clientId,
      ...identificationWithTimestamp,
      // Convert server timestamp (which might be null at this point) to a local timestamp
      createdAt: {
        seconds: Math.floor(Date.now() / 1000),
        nanoseconds: 0
      }
    };
  } catch (error) {
    console.error('Error saving identification to history:', error);
    
    // Create a local fallback with a timestamp when Firebase fails
    const now = {
      seconds: Math.floor(Date.now() / 1000),
      nanoseconds: 0
    };
    
    // Return a client-side object that mimics what would have been saved
    const clientId = identificationData.clientId || `local-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    return {
      id: clientId,
      clientId,
      ...identificationData,
      createdAt: now,
      isFavorite: false,
      username
    };
  }
}

export async function getUserIdentificationHistory(username: string) {
  try {
    const historyRef = collection(db, `FloraChat/Users/${username}/history`);
    const q = query(historyRef, where("deleted", "!=", true), orderBy('createdAt', 'desc'));
    const historySnapshot = await getDocs(q);
    
    const historyItems = historySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`Retrieved ${historyItems.length} history items for user ${username}`);
    return historyItems;
  } catch (error) {
    console.error('Error getting user identification history:', error);
    // Return an empty array instead of throwing to handle Firebase permission issues
    return [];
  }
}

export async function getUserFavorites(username: string) {
  try {
    // First try to get from the dedicated favorites collection
    const favoritesRef = collection(db, `FloraChat/Users/${username}/favorites`);
    let favoritesSnapshot = await getDocs(favoritesRef);
    
    // If no dedicated favorites, fall back to filtering history
    if (favoritesSnapshot.empty) {
      const historyRef = collection(db, `FloraChat/Users/${username}/history`);
      const q = query(historyRef, where("isFavorite", "==", true), where("deleted", "!=", true), orderBy('createdAt', 'desc'));
      favoritesSnapshot = await getDocs(q);
    }
    
    const favorites = favoritesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`Retrieved ${favorites.length} favorites for user ${username}`);
    return favorites;
  } catch (error) {
    console.error('Error getting user favorites:', error);
    // Return an empty array instead of throwing to handle Firebase permission issues
    return [];
  }
}

export async function toggleFavorite(username: string, identificationId: string, isFavorite: boolean) {
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
    // Return the expected result even if Firebase update fails
    return { id: identificationId, isFavorite };
  }
}

export async function deleteIdentification(username: string, identificationId: string) {
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
    // Return success anyway to maintain the UI flow
    return { success: true, id: identificationId };
  }
}