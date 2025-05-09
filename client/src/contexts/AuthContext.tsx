import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as firebaseUser from '@/firebase/user';

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

// Firebase-first data store functions
export async function saveToHistory(username: string, data: any) {
  try {
    // Primary storage - Firebase
    try {
      // Ensure we have a clientId for consistent tracking
      const dataToSave = {
        ...data,
        clientId: data.clientId || `${Date.now()}-${Math.floor(Math.random() * 1000)}`
      };
      
      const savedData = await saveToFirebaseHistory(username, dataToSave);
      console.log('Identification saved to Firebase:', savedData);
      
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
        existingItems = existingItems.filter((item: any) => item.id !== savedData.id);
        
        // Add the new item at the beginning
        existingItems.unshift(savedData);
        localStorage.setItem(historyKey, JSON.stringify(existingItems));
      } catch (localStorageError) {
        console.error('Failed to update localStorage cache:', localStorageError);
      }
      
      // Secondary backup - server database
      try {
        const response = await fetch(`/api/users/${username}/history`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(dataToSave),
        });
        
        if (!response.ok) {
          console.warn(`Server database backup returned ${response.status}: ${response.statusText}`);
        } else {
          console.log('Identification also backed up to server database');
        }
      } catch (serverError) {
        console.warn('Server database backup failed:', serverError);
      }
      
      return savedData;
    } catch (firebaseError) {
      console.error('Firebase save failed, trying server database fallback:', firebaseError);
      
      // Fallback - server database
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
        
        // Update localStorage cache
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
          existingItems = existingItems.filter((item: any) => item.id !== savedData.id);
          
          // Add the new item at the beginning
          existingItems.unshift(savedData);
          localStorage.setItem(historyKey, JSON.stringify(existingItems));
        } catch (localStorageError) {
          console.error('Failed to update localStorage cache:', localStorageError);
        }
        
        return savedData;
      } catch (serverError) {
        console.error('Server database fallback also failed, using localStorage only:', serverError);
        
        // Last resort - localStorage only
        const clientId = data.clientId || `local-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const dataWithId = {
          ...data,
          id: clientId,
          clientId,
          createdAt: {
            seconds: Math.floor(Date.now() / 1000),
            nanoseconds: 0
          },
          isFavorite: data.isFavorite || false
        };
        
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
        
        return dataWithId;
      }
    }
  } catch (error) {
    console.error('Error saving identification to history:', error);
    throw error;
  }
}

export async function getHistory(username: string) {
  try {
    // Primary storage - Firebase
    try {
      const firebaseData = await getFirebaseHistory(username);
      console.log('Retrieved history from Firebase:', firebaseData.length, 'items');
      
      // Update localStorage cache
      try {
        const historyKey = `plantHistory_${username}`;
        localStorage.setItem(historyKey, JSON.stringify(firebaseData));
      } catch (cacheError) {
        console.error('Failed to update localStorage cache:', cacheError);
      }
      
      return firebaseData;
    } catch (firebaseError) {
      console.error('Failed to get history from Firebase, trying server database:', firebaseError);
      
      // Secondary fallback - server database
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
        
        // Last resort - localStorage
        const historyKey = `plantHistory_${username}`;
        const localData = localStorage.getItem(historyKey);
        
        if (localData) {
          const parsedData = JSON.parse(localData);
          console.log('Retrieved history from localStorage:', parsedData.length, 'items');
          return parsedData;
        }
        
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
    // Primary storage - Firebase
    try {
      const firebaseData = await getFirebaseFavorites(username);
      console.log('Retrieved favorites from Firebase:', firebaseData.length, 'items');
      return firebaseData;
    } catch (firebaseError) {
      console.error('Failed to get favorites from Firebase, trying server database:', firebaseError);
      
      // Secondary fallback - server database
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
        
        // Last resort - localStorage
        const historyKey = `plantHistory_${username}`;
        const localData = localStorage.getItem(historyKey);
        
        if (localData) {
          const allItems = JSON.parse(localData);
          const favorites = allItems.filter((item: any) => item.isFavorite === true);
          console.log('Retrieved favorites from localStorage:', favorites.length, 'items');
          return favorites;
        }
        
        return [];
      }
    }
  } catch (error) {
    console.error('Error getting user favorites:', error);
    return [];
  }
}

export async function toggleFavorite(username: string, identificationId: string, isFavorite: boolean): Promise<{id: string, isFavorite: boolean}> {
  try {
    // Primary storage - Firebase
    try {
      const result = await toggleFavoriteFirebase(username, identificationId, isFavorite);
      console.log('Updated favorite status in Firebase:', result);
      
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
      
      // Secondary backup - server database
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
          console.warn(`Server database backup returned ${response.status}: ${response.statusText}`);
        } else {
          console.log('Favorite status also backed up to server database');
        }
      } catch (serverError) {
        console.warn('Server database backup failed:', serverError);
      }
      
      return result;
    } catch (firebaseError) {
      console.error('Firebase update failed, trying server database fallback:', firebaseError);
      
      // Fallback - server database
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
        console.error('Server database fallback also failed, using localStorage only:', serverError);
        
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
    }
  } catch (error) {
    console.error('Error toggling favorite status:', error);
    throw error;
  }
}

export async function deleteIdentification(username: string, identificationId: string): Promise<{id: string, success: boolean}> {
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
        
        return { id: identificationId, success: true };
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