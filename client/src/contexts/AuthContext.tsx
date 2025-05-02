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

// Export the history management functions using Firebase
export async function saveToHistory(username: string, data: any) {
  try {
    return await saveIdentificationToHistory(username, data);
  } catch (error) {
    console.error('Error saving identification to history:', error);
    throw error;
  }
}

export async function getHistory(username: string) {
  try {
    return await getUserIdentificationHistory(username);
  } catch (error) {
    console.error('Error getting user history:', error);
    return [];
  }
}

export async function getFavorites(username: string) {
  try {
    return await getUserFavorites(username);
  } catch (error) {
    console.error('Error getting user favorites:', error);
    return [];
  }
}

export async function toggleFavorite(username: string, identificationId: string, isFavorite: boolean) {
  try {
    return await toggleFavoriteFirebase(username, identificationId, isFavorite);
  } catch (error) {
    console.error('Error toggling favorite status:', error);
    throw error;
  }
}

export async function deleteIdentification(username: string, identificationId: string) {
  try {
    return await deleteIdentificationFirebase(username, identificationId);
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
      
      // Check if the user exists in Firebase
      const existingUser = await getUser(username.trim());
      
      if (!existingUser) {
        // Create a new user if they don't exist
        await createUser(username.trim());
      } else {
        // Update last login time for existing user
        await updateUserLastLogin(username.trim());
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
    setUser(null);
    localStorage.removeItem('floraChat_user');
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