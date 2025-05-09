import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { dataService } from '@/services/DataService';

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

// Export the data service functions for use elsewhere in the app
export const saveToHistory = dataService.saveToHistory.bind(dataService);
export const getHistory = dataService.getHistory.bind(dataService);
export const getFavorites = dataService.getFavorites.bind(dataService);
export const toggleFavorite = dataService.toggleFavorite.bind(dataService);
export const deleteIdentification = dataService.deleteIdentification.bind(dataService);

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
      
      // Use DataService to handle login
      await dataService.loginUser(username.trim());
      
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