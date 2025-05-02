import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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

// Simple localStorage-based history storage
const saveIdentification = (username: string, identification: any) => {
  try {
    // Get existing history
    const historyKey = `floraChat_history_${username}`;
    const existingHistory = localStorage.getItem(historyKey);
    const history = existingHistory ? JSON.parse(existingHistory) : [];
    
    // Create a new identification with ID and timestamp
    const newIdentification = {
      id: `${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      ...identification,
      createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 },
      isFavorite: false
    };
    
    // Add to history
    history.unshift(newIdentification);
    
    // Save back to localStorage
    localStorage.setItem(historyKey, JSON.stringify(history));
    
    return newIdentification;
  } catch (e) {
    console.error('Error saving identification:', e);
    throw e;
  }
};

export function saveToHistory(username: string, data: any) {
  return saveIdentification(username, data);
}

export function getHistory(username: string) {
  try {
    const historyKey = `floraChat_history_${username}`;
    const historyData = localStorage.getItem(historyKey);
    return historyData ? JSON.parse(historyData) : [];
  } catch (e) {
    console.error('Error getting history:', e);
    return [];
  }
}

export function getFavorites(username: string) {
  try {
    const historyKey = `floraChat_history_${username}`;
    const historyData = localStorage.getItem(historyKey);
    const history = historyData ? JSON.parse(historyData) : [];
    return history.filter((item: any) => item.isFavorite);
  } catch (e) {
    console.error('Error getting favorites:', e);
    return [];
  }
}

export function toggleFavorite(username: string, identificationId: string, isFavorite: boolean) {
  try {
    const historyKey = `floraChat_history_${username}`;
    const historyData = localStorage.getItem(historyKey);
    const history = historyData ? JSON.parse(historyData) : [];
    
    const updatedHistory = history.map((item: any) => {
      if (item.id === identificationId) {
        return { ...item, isFavorite };
      }
      return item;
    });
    
    localStorage.setItem(historyKey, JSON.stringify(updatedHistory));
    return { id: identificationId, isFavorite };
  } catch (e) {
    console.error('Error toggling favorite:', e);
    throw e;
  }
}

export function deleteIdentification(username: string, identificationId: string) {
  try {
    const historyKey = `floraChat_history_${username}`;
    const historyData = localStorage.getItem(historyKey);
    const history = historyData ? JSON.parse(historyData) : [];
    
    const updatedHistory = history.filter((item: any) => item.id !== identificationId);
    
    localStorage.setItem(historyKey, JSON.stringify(updatedHistory));
    return { success: true, id: identificationId };
  } catch (e) {
    console.error('Error deleting identification:', e);
    throw e;
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
      
      // Simple localStorage-based login
      if (!username.trim()) {
        throw new Error('Username is required');
      }
      
      // Store user in state and localStorage
      const newUser = { username: username.trim() };
      setUser(newUser);
      localStorage.setItem('floraChat_user', JSON.stringify(newUser));
      
    } catch (err: any) {
      setError(err.message || 'Failed to login');
      console.error('Login error:', err);
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