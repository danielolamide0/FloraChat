import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  saveIdentificationToHistory, 
  getUserIdentificationHistory,
  getUserFavorites,
  toggleFavorite as toggleFavoriteFirebase,
  deleteIdentification as deleteIdentificationFirebase,
  getUser,
  createUser,
  updateUserLastLogin
} from '@/firebase/user';

interface User {
  username: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (username: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Simplified localStorage-first data store functions
export async function saveToHistory(username: string, data: any) {
  try {
    // Generate a unique ID if one doesn't exist
    const clientId = data.clientId || `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Create a formatted data object with all required fields
    const dataWithId = {
      ...data,
      id: clientId,
      clientId,
      createdAt: new Date().toISOString(),
      isFavorite: data.isFavorite || false,
      username
    };
    
    // Save to localStorage as primary storage
    const historyKey = `plantHistory_${username}`;
    let existingItems = [];
    
    try {
      const existingData = localStorage.getItem(historyKey);
      if (existingData) {
        existingItems = JSON.parse(existingData);
      }
    } catch (parseError) {
      console.error('Error parsing existing history:', parseError);
    }
    
    // Remove any existing items with the same ID to avoid duplicates
    existingItems = existingItems.filter((item: any) => item.id !== dataWithId.id);
    
    // Add the new item at the beginning
    existingItems.unshift(dataWithId);
    localStorage.setItem(historyKey, JSON.stringify(existingItems));
    console.log('Identification saved to localStorage:', dataWithId);
    
    // Try to backup to Firebase (but don't wait for it)
    try {
      saveIdentificationToHistory(username, dataWithId)
        .then(res => console.log('Backed up to Firebase:', res))
        .catch(err => console.warn('Firebase backup failed:', err));
    } catch (firebaseError) {
      console.warn('Failed to start Firebase backup:', firebaseError);
    }
    
    // Try to backup to server (but don't wait for it)
    try {
      fetch(`/api/users/${username}/history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataWithId),
      })
        .then(res => {
          if (!res.ok) {
            console.warn(`Server backup returned ${res.status}`);
          } else {
            console.log('Backed up to server database');
          }
        })
        .catch(err => console.warn('Server backup failed:', err));
    } catch (serverError) {
      console.warn('Failed to start server backup:', serverError);
    }
    
    return dataWithId;
  } catch (error) {
    console.error('Error saving identification to history:', error);
    throw error;
  }
}

export async function getHistory(username: string) {
  try {
    // Primary storage - localStorage
    const historyKey = `plantHistory_${username}`;
    const localData = localStorage.getItem(historyKey);
    
    if (localData) {
      const parsedData = JSON.parse(localData);
      console.log('Retrieved history from localStorage:', parsedData.length, 'items');
      
      // Try to fetch from Firebase in the background to update localStorage
      getUserIdentificationHistory(username)
        .then(firebaseData => {
          if (firebaseData && firebaseData.length > 0) {
            console.log('Synced history with Firebase:', firebaseData.length, 'items');
            
            // Merge with existing localStorage data
            const existingIds = new Set(parsedData.map((item: any) => item.id));
            const newItems = firebaseData.filter((item: any) => !existingIds.has(item.id));
            
            if (newItems.length > 0) {
              const updatedData = [...newItems, ...parsedData];
              localStorage.setItem(historyKey, JSON.stringify(updatedData));
              console.log('Updated localStorage with new items from Firebase');
            }
          }
        })
        .catch(err => console.warn('Background Firebase sync failed:', err));
      
      return parsedData;
    }
    
    // No localStorage data, try Firebase
    try {
      const firebaseData = await getUserIdentificationHistory(username);
      console.log('Retrieved history from Firebase:', firebaseData.length, 'items');
      
      // Save to localStorage
      localStorage.setItem(historyKey, JSON.stringify(firebaseData));
      
      return firebaseData;
    } catch (firebaseError) {
      console.warn('Failed to get history from Firebase:', firebaseError);
      
      // Try server database
      try {
        const response = await fetch(`/api/users/${username}/history`);
        
        if (!response.ok) {
          console.warn(`Server returned ${response.status}: ${response.statusText}`);
          return [];
        }
        
        const history = await response.json();
        console.log('Retrieved history from server database:', history.length, 'items');
        
        // Save to localStorage
        localStorage.setItem(historyKey, JSON.stringify(history));
        
        return history;
      } catch (serverError) {
        console.warn('Failed to get history from server:', serverError);
        return [];
      }
    }
  } catch (error) {
    console.error('Error getting user history:', error);
    return [];
  }
}

export async function getFavorites(username: string) {
  try {
    // Primary storage - localStorage
    const historyKey = `plantHistory_${username}`;
    const localData = localStorage.getItem(historyKey);
    
    if (localData) {
      const allItems = JSON.parse(localData);
      const favorites = allItems.filter((item: any) => item.isFavorite === true);
      console.log('Retrieved favorites from localStorage:', favorites.length, 'items');
      
      // Try to fetch from Firebase in the background to update localStorage
      getUserFavorites(username)
        .then(firebaseData => {
          if (firebaseData && firebaseData.length > 0) {
            console.log('Synced favorites with Firebase:', firebaseData.length, 'items');
            
            // Merge with existing localStorage data
            let updated = false;
            const updatedAllItems = allItems.map((item: any) => {
              // Check if this item should be a favorite based on Firebase data
              const firebaseFavorite = firebaseData.find((f: any) => f.id === item.id);
              if (firebaseFavorite && !item.isFavorite) {
                updated = true;
                return { ...item, isFavorite: true };
              }
              return item;
            });
            
            if (updated) {
              localStorage.setItem(historyKey, JSON.stringify(updatedAllItems));
              console.log('Updated localStorage with favorite status from Firebase');
            }
          }
        })
        .catch(err => console.warn('Background Firebase favorites sync failed:', err));
      
      return favorites;
    }
    
    // No localStorage data, try Firebase
    try {
      const firebaseData = await getUserFavorites(username);
      console.log('Retrieved favorites from Firebase:', firebaseData.length, 'items');
      
      // If we have favorites but no history, we need to save these to localStorage
      if (firebaseData.length > 0) {
        localStorage.setItem(historyKey, JSON.stringify(firebaseData));
      }
      
      return firebaseData;
    } catch (firebaseError) {
      console.warn('Failed to get favorites from Firebase:', firebaseError);
      
      // Try server database
      try {
        const response = await fetch(`/api/users/${username}/favorites`);
        
        if (!response.ok) {
          console.warn(`Server returned ${response.status}: ${response.statusText}`);
          return [];
        }
        
        const favorites = await response.json();
        console.log('Retrieved favorites from server database:', favorites.length, 'items');
        
        // If we have favorites but no history, we need to save these to localStorage
        if (favorites.length > 0) {
          localStorage.setItem(historyKey, JSON.stringify(favorites));
        }
        
        return favorites;
      } catch (serverError) {
        console.warn('Failed to get favorites from server:', serverError);
        return [];
      }
    }
  } catch (error) {
    console.error('Error getting user favorites:', error);
    return [];
  }
}

export async function toggleFavorite(username: string, identificationId: string, isFavorite: boolean) {
  try {
    // Primary storage - localStorage
    const historyKey = `plantHistory_${username}`;
    const localData = localStorage.getItem(historyKey);
    
    if (localData) {
      const existingHistory = JSON.parse(localData);
      let itemFound = false;
      
      // Update favorite status
      const updatedHistory = existingHistory.map((item: any) => {
        if (item.id === identificationId) {
          itemFound = true;
          return { ...item, isFavorite };
        }
        return item;
      });
      
      if (!itemFound) {
        console.warn(`Item with ID ${identificationId} not found in localStorage`);
      } else {
        // Save back to localStorage
        localStorage.setItem(historyKey, JSON.stringify(updatedHistory));
        console.log(`Updated favorite status in localStorage for item ${identificationId}: ${isFavorite}`);
      }
    } else {
      console.warn('No history data in localStorage to update favorites');
    }
    
    // Try to backup to Firebase (but don't wait for it)
    try {
      toggleFavoriteFirebase(username, identificationId, isFavorite)
        .then(res => console.log('Updated favorite status in Firebase:', res))
        .catch(err => console.warn('Firebase update failed:', err));
    } catch (firebaseError) {
      console.warn('Failed to start Firebase update:', firebaseError);
    }
    
    // Try to backup to server (but don't wait for it)
    try {
      fetch(`/api/users/${username}/favorites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identificationId,
          isFavorite
        }),
      })
        .then(res => {
          if (!res.ok) {
            console.warn(`Server backup returned ${res.status}`);
          } else {
            console.log('Updated favorite status in server database');
          }
        })
        .catch(err => console.warn('Server backup failed:', err));
    } catch (serverError) {
      console.warn('Failed to start server backup:', serverError);
    }
    
    return { id: identificationId, isFavorite };
  } catch (error) {
    console.error('Error toggling favorite status:', error);
    throw error;
  }
}

export async function deleteIdentification(username: string, identificationId: string) {
  try {
    // Primary storage - Firebase
    try {
      const result = await deleteIdentificationFirebase(username, identificationId);
      console.log('Deleted identification in Firebase:', result);
      
      // Update localStorage cache
      try {
        const historyKey = `plantHistory_${username}`;
        const localData = localStorage.getItem(historyKey);
        
        if (localData) {
          const existingHistory = JSON.parse(localData);
          
          // Filter out the item to delete
          const updatedHistory = existingHistory.filter((item: any) => item.id !== identificationId);
          
          // Save back to localStorage
          localStorage.setItem(historyKey, JSON.stringify(updatedHistory));
        }
      } catch (cacheError) {
        console.error('Failed to update localStorage cache:', cacheError);
      }
      
      // Secondary backup - server database
      try {
        const response = await fetch(`/api/users/${username}/history/${identificationId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (!response.ok) {
          console.warn(`Server database backup returned ${response.status}: ${response.statusText}`);
        } else {
          console.log('Deletion also backed up to server database');
        }
      } catch (serverError) {
        console.warn('Server database backup failed:', serverError);
      }
      
      return result;
    } catch (firebaseError) {
      console.error('Firebase delete failed, trying server database fallback:', firebaseError);
      
      // Fallback - server database
      try {
        const response = await fetch(`/api/users/${username}/history/${identificationId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (!response.ok) {
          throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Deleted identification from server database:', data);
        
        // Update localStorage cache
        try {
          const historyKey = `plantHistory_${username}`;
          const localData = localStorage.getItem(historyKey);
          
          if (localData) {
            const existingHistory = JSON.parse(localData);
            
            // Filter out the item to delete
            const updatedHistory = existingHistory.filter((item: any) => item.id !== identificationId);
            
            // Save back to localStorage
            localStorage.setItem(historyKey, JSON.stringify(updatedHistory));
          }
        } catch (cacheError) {
          console.error('Failed to update localStorage cache:', cacheError);
        }
        
        return data;
      } catch (serverError) {
        console.error('Server database fallback also failed, using localStorage only:', serverError);
        
        // Last resort - localStorage only
        try {
          const historyKey = `plantHistory_${username}`;
          const localData = localStorage.getItem(historyKey);
          
          if (localData) {
            const existingHistory = JSON.parse(localData);
            
            // Filter out the item to delete
            const updatedHistory = existingHistory.filter((item: any) => item.id !== identificationId);
            
            // Save back to localStorage
            localStorage.setItem(historyKey, JSON.stringify(updatedHistory));
          }
        } catch (localStorageError) {
          console.error('Failed to update localStorage:', localStorageError);
        }
        
        return { id: identificationId, deleted: true };
      }
    }
  } catch (error) {
    console.error('Error deleting identification:', error);
    throw error;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Check for existing user on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('floraChat_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error('Error parsing stored user:', e);
        localStorage.removeItem('floraChat_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (!username.trim()) {
        throw new Error('Username is required');
      }
      
      // Clear guest storage when a user logs in
      localStorage.removeItem('plantHistory_guest');
      
      // Primary - Firebase login/authentication
      try {
        const existingUser = await getUser(username.trim());
        
        if (!existingUser) {
          // Create a new user if they don't exist
          console.log(`Creating new user in Firebase: ${username.trim()}`);
          await createUser(username.trim());
        } else {
          // Update last login time for existing user
          console.log(`Updating last login for existing user: ${username.trim()}`);
          await updateUserLastLogin(username.trim());
        }
      } catch (firebaseError) {
        console.error('Firebase error during login, trying server fallback:', firebaseError);
        
        // Secondary fallback - server/database login
        try {
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username: username.trim() }),
          });
          
          if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
          }
          
          const data = await response.json();
          console.log('User logged in via server database:', data);
        } catch (serverError) {
          console.error('Server database login also failed, using localStorage only:', serverError);
        }
      }
      
      // Store user in state and localStorage
      const newUser = { username: username.trim() };
      setUser(newUser);
      localStorage.setItem('floraChat_user', JSON.stringify(newUser));
      
    } catch (err: any) {
      setError(err.message || 'Failed to login');
      console.error('Login error:', err);
      throw err; // Rethrow so the UI can handle it
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    const username = user?.username;
    
    // Clear user data
    setUser(null);
    localStorage.removeItem('floraChat_user');
    
    // Clear user-specific data
    if (username) {
      localStorage.removeItem(`plantHistory_${username}`);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      error,
      login,
      logout,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}