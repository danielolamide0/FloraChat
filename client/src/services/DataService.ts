import * as firebaseUser from '@/firebase/user';

// Type definitions for identification data
interface IdentificationData {
  id?: string;
  clientId?: string;
  scientificName?: string;
  commonName?: string;
  family?: string;
  genus?: string;
  confidence?: number;
  imageUrl?: string;
  referenceImageUrl?: string;
  isFavorite?: boolean;
  createdAt?: any;
  [key: string]: any; // Allow additional properties
}

// Type definitions for response formats
interface FavoriteResponse {
  id: string;
  isFavorite: boolean;
}

interface DeleteResponse {
  id: string;
  success: boolean;
}

/**
 * Service class for handling all data operations in the application
 * Supports Firebase as primary storage with database and localStorage fallbacks
 */
class DataService {
  /**
   * Save plant identification to user history
   */
  async saveToHistory(username: string, data: IdentificationData): Promise<IdentificationData> {
    try {
      // Primary storage - Firebase
      try {
        // Ensure we have a clientId for consistent tracking
        const dataToSave = {
          ...data,
          clientId: data.clientId || `${Date.now()}-${Math.floor(Math.random() * 1000)}`
        };
        
        const savedData = await firebaseUser.saveIdentificationToHistory(username, dataToSave);
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

  /**
   * Get user identification history
   */
  async getHistory(username: string): Promise<IdentificationData[]> {
    try {
      // Primary storage - Firebase
      try {
        const firebaseData = await firebaseUser.getUserIdentificationHistory(username);
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

  /**
   * Get user's favorite identifications
   */
  async getFavorites(username: string): Promise<IdentificationData[]> {
    try {
      // Primary storage - Firebase
      try {
        const firebaseData = await firebaseUser.getUserFavorites(username);
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

  /**
   * Toggle favorite status for an identification
   */
  async toggleFavorite(username: string, identificationId: string, isFavorite: boolean): Promise<FavoriteResponse> {
    try {
      // Primary storage - Firebase
      try {
        const result = await firebaseUser.toggleFavorite(username, identificationId, isFavorite);
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

  /**
   * Delete an identification from user history
   */
  async deleteIdentification(username: string, identificationId: string): Promise<DeleteResponse> {
    try {
      // Primary storage - Firebase
      try {
        const result = await firebaseUser.deleteIdentification(username, identificationId);
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

  /**
   * Login user and create account if not exists
   */
  async loginUser(username: string): Promise<{ username: string }> {
    try {
      const existingUser = await firebaseUser.getUser(username.trim());
      
      if (!existingUser) {
        // Create a new user if they don't exist
        console.log(`Creating new user in Firebase: ${username.trim()}`);
        await firebaseUser.createUser(username.trim());
      } else {
        // Update last login time for existing user
        console.log(`Updating last login for existing user: ${username.trim()}`);
        await firebaseUser.updateUserLastLogin(username.trim());
      }
      
      return { username: username.trim() };
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
        return { username: username.trim() };
      } catch (serverError) {
        console.error('Server database login also failed, using localStorage only:', serverError);
        return { username: username.trim() };
      }
    }
  }
}

// Export a singleton instance
export const dataService = new DataService();