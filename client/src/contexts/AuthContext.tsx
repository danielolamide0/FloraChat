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

// Local storage functions - primary data source
export async function saveToHistory(username: string, data: any) {
  try {
    // Try Firebase as a bonus
    try {
      await saveIdentificationToHistory(username, data);
    } catch (error) {
      console.error('Firebase save error (continuing with localStorage):', error);
    }
    
    // Primary storage in localStorage
    const historyKey = `plantHistory_${username}`;
    const existingHistory = JSON.parse(localStorage.getItem(historyKey) || '[]');
    
    // Add data to the beginning of the array (newest first)
    existingHistory.unshift(data);
    
    // Save back to localStorage
    localStorage.setItem(historyKey, JSON.stringify(existingHistory));
    
    return data;
  } catch (error) {
    console.error('Error saving identification to history:', error);
    throw error;
  }
}

export async function getHistory(username: string) {
  try {
    // Primary storage is localStorage
    const historyKey = `plantHistory_${username}`;
    const localData = localStorage.getItem(historyKey);
    
    if (localData) {
      return JSON.parse(localData);
    }
    
    // Try Firebase as fallback only if localStorage is empty
    try {
      const firebaseData = await getUserIdentificationHistory(username);
      if (firebaseData && firebaseData.length > 0) {
        // Save to localStorage for next time
        localStorage.setItem(historyKey, JSON.stringify(firebaseData));
        return firebaseData;
      }
    } catch (error) {
      console.error('Firebase history fetch error (continuing with empty array):', error);
    }
    
    return [];
  } catch (error) {
    console.error('Error getting user history:', error);
    return [];
  }
}

export async function getFavorites(username: string) {
  try {
    // Get from localStorage
    const historyKey = `plantHistory_${username}`;
    const localData = localStorage.getItem(historyKey);
    
    if (localData) {
      const allItems = JSON.parse(localData);
      return allItems.filter((item: any) => item.isFavorite === true);
    }
    
    // Try Firebase as fallback only if localStorage is empty
    try {
      const firebaseData = await getUserFavorites(username);
      if (firebaseData && firebaseData.length > 0) {
        return firebaseData;
      }
    } catch (error) {
      console.error('Firebase favorites fetch error (continuing with empty array):', error);
    }
    
    return [];
  } catch (error) {
    console.error('Error getting user favorites:', error);
    return [];
  }
}

export async function toggleFavorite(username: string, identificationId: string, isFavorite: boolean) {
  try {
    // Try Firebase as a bonus
    try {
      await toggleFavoriteFirebase(username, identificationId, isFavorite);
    } catch (error) {
      console.error('Firebase toggle favorite error (continuing with localStorage):', error);
    }
    
    // Primary storage in localStorage
    const historyKey = `plantHistory_${username}`;
    const existingHistory = JSON.parse(localStorage.getItem(historyKey) || '[]');
    
    // Update favorite status
    const updatedHistory = existingHistory.map((item: any) => {
      if (item.id === identificationId) {
        return { ...item, isFavorite };
      }
      return item;
    });
    
    // Save back to localStorage
    localStorage.setItem(historyKey, JSON.stringify(updatedHistory));
    
    return { id: identificationId, isFavorite };
  } catch (error) {
    console.error('Error toggling favorite status:', error);
    throw error;
  }
}

export async function deleteIdentification(username: string, identificationId: string) {
  try {
    // Try Firebase as a bonus
    try {
      await deleteIdentificationFirebase(username, identificationId);
    } catch (error) {
      console.error('Firebase delete error (continuing with localStorage):', error);
    }
    
    // Primary storage in localStorage
    const historyKey = `plantHistory_${username}`;
    const existingHistory = JSON.parse(localStorage.getItem(historyKey) || '[]');
    
    // Filter out the item to delete
    const updatedHistory = existingHistory.filter((item: any) => item.id !== identificationId);
    
    // Save back to localStorage
    localStorage.setItem(historyKey, JSON.stringify(updatedHistory));
    
    return { id: identificationId, deleted: true };
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
      
      // Check if the user exists in Firebase
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