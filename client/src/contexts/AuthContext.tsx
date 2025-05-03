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

// Database-first data store functions
export async function saveToHistory(username: string, data: any) {
  try {
    // Primary storage - send to server/database
    try {
      const response = await fetch(`/api/users/${username}/history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const savedData = await response.json();
      console.log('Identification saved to server database:', savedData);
      
      // Also update localStorage as a cache
      try {
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
        existingItems = existingItems.filter((item: any) => item.id !== data.id);
        
        // Add the new item at the beginning
        existingItems.unshift(data);
        localStorage.setItem(historyKey, JSON.stringify(existingItems));
      } catch (localStorageError) {
        console.error('Failed to update localStorage cache:', localStorageError);
      }
      
      return savedData;
    } catch (serverError) {
      console.error('Server database save failed, trying Firebase fallback:', serverError);
      
      // Secondary fallback - try Firebase
      try {
        await saveIdentificationToHistory(username, data);
      } catch (firebaseError) {
        console.error('Firebase save error, falling back to localStorage only:', firebaseError);
      }
      
      // Last resort - localStorage only
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
      existingItems = existingItems.filter((item: any) => item.id !== data.id);
      
      // Add the new item at the beginning
      existingItems.unshift(data);
      localStorage.setItem(historyKey, JSON.stringify(existingItems));
      
      return data;
    }
  } catch (error) {
    console.error('Error saving identification to history:', error);
    throw error;
  }
}

export async function getHistory(username: string) {
  try {
    // Primary storage - server/database
    try {
      const response = await fetch(`/api/users/${username}/history`);
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const history = await response.json();
      console.log('Retrieved history from server database:', history.length, 'items');
      
      // Update localStorage cache
      try {
        const historyKey = `plantHistory_${username}`;
        localStorage.setItem(historyKey, JSON.stringify(history));
      } catch (cacheError) {
        console.error('Failed to update localStorage cache:', cacheError);
      }
      
      return history;
    } catch (serverError) {
      console.error('Failed to get history from server, trying localStorage:', serverError);
      
      // Secondary fallback - localStorage
      const historyKey = `plantHistory_${username}`;
      const localData = localStorage.getItem(historyKey);
      
      if (localData) {
        const parsedData = JSON.parse(localData);
        console.log('Retrieved history from localStorage:', parsedData.length, 'items');
        return parsedData;
      }
      
      // Last resort - Firebase
      try {
        const firebaseData = await getUserIdentificationHistory(username);
        if (firebaseData && firebaseData.length > 0) {
          console.log('Retrieved history from Firebase:', firebaseData.length, 'items');
          // Cache in localStorage
          localStorage.setItem(historyKey, JSON.stringify(firebaseData));
          return firebaseData;
        }
      } catch (firebaseError) {
        console.error('Firebase history fetch error (returning empty array):', firebaseError);
      }
      
      return [];
    }
  } catch (error) {
    console.error('Error getting user history:', error);
    return [];
  }
}

export async function getFavorites(username: string) {
  try {
    // Primary storage - server/database
    try {
      const response = await fetch(`/api/users/${username}/favorites`);
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const favorites = await response.json();
      console.log('Retrieved favorites from server database:', favorites.length, 'items');
      
      return favorites;
    } catch (serverError) {
      console.error('Failed to get favorites from server, trying localStorage:', serverError);
      
      // Secondary fallback - localStorage
      const historyKey = `plantHistory_${username}`;
      const localData = localStorage.getItem(historyKey);
      
      if (localData) {
        const allItems = JSON.parse(localData);
        const favorites = allItems.filter((item: any) => item.isFavorite === true);
        console.log('Retrieved favorites from localStorage:', favorites.length, 'items');
        return favorites;
      }
      
      // Last resort - Firebase
      try {
        const firebaseData = await getUserFavorites(username);
        if (firebaseData && firebaseData.length > 0) {
          console.log('Retrieved favorites from Firebase:', firebaseData.length, 'items');
          return firebaseData;
        }
      } catch (firebaseError) {
        console.error('Firebase favorites fetch error (returning empty array):', firebaseError);
      }
      
      return [];
    }
  } catch (error) {
    console.error('Error getting user favorites:', error);
    return [];
  }
}

export async function toggleFavorite(username: string, identificationId: string, isFavorite: boolean) {
  try {
    // Primary storage - server/database
    try {
      const response = await fetch(`/api/users/${username}/favorites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identificationId,
          isFavorite
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Updated favorite status in server database:', data);
      
      // Update localStorage cache
      try {
        const historyKey = `plantHistory_${username}`;
        const localData = localStorage.getItem(historyKey);
        
        if (localData) {
          const existingHistory = JSON.parse(localData);
          
          // Update favorite status
          const updatedHistory = existingHistory.map((item: any) => {
            if (item.id === identificationId) {
              return { ...item, isFavorite };
            }
            return item;
          });
          
          // Save back to localStorage
          localStorage.setItem(historyKey, JSON.stringify(updatedHistory));
        }
      } catch (cacheError) {
        console.error('Failed to update localStorage cache:', cacheError);
      }
      
      return data;
    } catch (serverError) {
      console.error('Server database update failed, trying Firebase fallback:', serverError);
      
      // Secondary fallback - try Firebase
      try {
        await toggleFavoriteFirebase(username, identificationId, isFavorite);
      } catch (firebaseError) {
        console.error('Firebase favorite toggle error, falling back to localStorage only:', firebaseError);
      }
      
      // Last resort - localStorage only
      try {
        const historyKey = `plantHistory_${username}`;
        const localData = localStorage.getItem(historyKey);
        
        if (localData) {
          const existingHistory = JSON.parse(localData);
          
          // Update favorite status
          const updatedHistory = existingHistory.map((item: any) => {
            if (item.id === identificationId) {
              return { ...item, isFavorite };
            }
            return item;
          });
          
          // Save back to localStorage
          localStorage.setItem(historyKey, JSON.stringify(updatedHistory));
        }
      } catch (localStorageError) {
        console.error('Failed to update localStorage:', localStorageError);
      }
      
      return { id: identificationId, isFavorite };
    }
  } catch (error) {
    console.error('Error toggling favorite status:', error);
    throw error;
  }
}

export async function deleteIdentification(username: string, identificationId: string) {
  try {
    // Primary storage - server/database
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
      console.error('Server database delete failed, trying Firebase fallback:', serverError);
      
      // Secondary fallback - try Firebase
      try {
        await deleteIdentificationFirebase(username, identificationId);
      } catch (firebaseError) {
        console.error('Firebase delete error, falling back to localStorage only:', firebaseError);
      }
      
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
      
      // Primary - database/server login
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
        console.error('Server database login failed, trying Firebase fallback:', serverError);
        
        // Secondary fallback - try Firebase
        try {
          const existingUser = await getUser(username.trim());
          
          if (!existingUser) {
            // Create a new user if they don't exist
            await createUser(username.trim());
          } else {
            // Update last login time for existing user
            await updateUserLastLogin(username.trim());
          }
        } catch (firebaseError) {
          console.error('Firebase error during login, continuing with local storage only:', firebaseError);
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