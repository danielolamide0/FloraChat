import { useEffect, useState } from 'react';
import { useAuth, getHistory, getFavorites, toggleFavorite, deleteIdentification } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Heart, Trash2, ArrowLeft, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { useIsMobile } from '@/hooks/use-mobile';

export default function Favorites() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const isMobile = useIsMobile();
  
  const [isLoading, setIsLoading] = useState(true);
  const [favorites, setFavorites] = useState<any[]>([]);
  
  useEffect(() => {
    const fetchFavorites = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        
        try {
          // Try Firebase first via context functions
          const favoritesData = await getFavorites(user.username);
          if (favoritesData && favoritesData.length > 0) {
            setFavorites(favoritesData);
            return;
          }
        } catch (firebaseError) {
          console.error('Firebase error, falling back to localStorage:', firebaseError);
        }
        
        // Fallback to localStorage
        try {
          const historyKey = `plantHistory_${user.username}`;
          const localStorageData = localStorage.getItem(historyKey);
          
          if (localStorageData) {
            const parsedData = JSON.parse(localStorageData);
            const favoriteItems = parsedData.filter((item: any) => item.isFavorite);
            setFavorites(favoriteItems);
          } else {
            setFavorites([]);
          }
        } catch (localStorageError) {
          console.error('localStorage error:', localStorageError);
          throw new Error('Failed to load from localStorage');
        }
      } catch (error) {
        console.error('Error fetching favorites:', error);
        toast({
          title: 'Error',
          description: 'Failed to load favorite plants',
          variant: 'destructive',
        });
        setFavorites([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchFavorites();
  }, [user, toast]);
  
  const handleToggleFavorite = async (id: string, currentState: boolean) => {
    if (!user) return;
    
    try {
      // Try Firebase-based function first
      try {
        await toggleFavorite(user.username, id, !currentState);
      } catch (firebaseError) {
        console.error('Firebase error, falling back to localStorage:', firebaseError);
        
        // Fallback to localStorage
        try {
          const historyKey = `plantHistory_${user.username}`;
          const existingHistory = JSON.parse(localStorage.getItem(historyKey) || '[]');
          
          // Find the item and update its favorite status
          const updatedHistory = existingHistory.map((item: any) => {
            if (item.id === id) {
              return {...item, isFavorite: !currentState};
            }
            return item;
          });
          
          // Save back to localStorage
          localStorage.setItem(historyKey, JSON.stringify(updatedHistory));
        } catch (localStorageError) {
          console.error('localStorage error:', localStorageError);
          throw new Error('Failed to update favorite status in localStorage');
        }
      }
      
      // Update the UI - if removing from favorites, filter it out
      if (currentState) {
        setFavorites(prev => prev.filter(item => item.id !== id));
      } else {
        setFavorites(prev => 
          prev.map(item => 
            item.id === id ? { ...item, isFavorite: !currentState } : item
          )
        );
      }
      
      toast({
        title: !currentState ? 'Added to favorites' : 'Removed from favorites',
        description: 'Your identification has been updated',
      });
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast({
        title: 'Error',
        description: 'Failed to update favorite status',
        variant: 'destructive',
      });
    }
  };
  
  const handleDeleteIdentification = async (id: string) => {
    if (!user) return;
    
    if (!confirm('Are you sure you want to delete this identification?')) {
      return;
    }
    
    try {
      // Try Firebase-based function first
      try {
        await deleteIdentification(user.username, id);
      } catch (firebaseError) {
        console.error('Firebase error, falling back to localStorage:', firebaseError);
        
        // Fallback to localStorage
        try {
          const historyKey = `plantHistory_${user.username}`;
          const existingHistory = JSON.parse(localStorage.getItem(historyKey) || '[]');
          
          // Filter out the item to delete
          const updatedHistory = existingHistory.filter((item: any) => item.id !== id);
          
          // Save back to localStorage
          localStorage.setItem(historyKey, JSON.stringify(updatedHistory));
        } catch (localStorageError) {
          console.error('localStorage error:', localStorageError);
          throw new Error('Failed to delete from localStorage');
        }
      }
      
      // Update the UI
      setFavorites(prev => prev.filter(item => item.id !== id));
      
      toast({
        title: 'Deleted',
        description: 'Identification has been removed',
      });
    } catch (error) {
      console.error('Error deleting identification:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete identification',
        variant: 'destructive',
      });
    }
  };
  
  const formatDate = (timestamp: { seconds: number, nanoseconds: number } | string) => {
    if (!timestamp) return 'Unknown date';
    
    let date;
    if (typeof timestamp === 'string') {
      // Handle ISO string format from localStorage
      date = new Date(timestamp);
    } else {
      // Handle Firebase timestamp format
      date = new Date(timestamp.seconds * 1000);
    }
    
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold flex items-center">
            <Star className="mr-2 h-6 w-6 text-yellow-500" />
            My Favorites
          </h1>
        </div>
      </div>
      
      <div className="space-y-4">
        {isLoading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <Card key={i} className="bg-white/50 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-4 w-1/4 mt-1" />
              </CardHeader>
              <CardContent>
                <div className="flex items-start space-x-4">
                  <Skeleton className="h-24 w-24 rounded-md" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : favorites.length === 0 ? (
          <Card className="bg-white/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>No favorites yet</CardTitle>
              <CardDescription>
                Add identifications to your favorites to see them here
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/history')}>
                View Your History
              </Button>
            </CardContent>
          </Card>
        ) : (
          favorites.map((item) => (
            <Card key={item.id} className="bg-white/50 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">{item.scientificName}</CardTitle>
                    <CardDescription>
                      {item.commonName || 'No common name available'}
                    </CardDescription>
                  </div>
                  <Badge variant={item.confidence > 60 ? "default" : "outline"} className="bg-green-100 text-green-800 hover:bg-green-200">
                    {Math.round(item.confidence)}% match
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-shrink-0">
                    <img 
                      src={item.imageUrl} 
                      alt={item.scientificName}
                      className="rounded-md h-36 w-36 object-cover"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Family: {item.family || 'Unknown'}</p>
                    <p className="text-sm font-medium">Genus: {item.genus || 'Unknown'}</p>
                    {item.distribution && (
                      <p className="text-sm">Distribution: {item.distribution}</p>
                    )}
                    {item.habitat && (
                      <p className="text-sm">Habitat: {item.habitat}</p>
                    )}
                    <p className="text-xs text-slate-500 mt-2">
                      Identified on {formatDate(item.createdAt)}
                    </p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end space-x-2 pt-0">
                <Button
                  variant="ghost"
                  size={isMobile ? "sm" : "default"}
                  onClick={() => handleToggleFavorite(item.id, item.isFavorite)}
                  className="text-red-500 hover:text-red-600"
                >
                  <Heart className="h-5 w-5 fill-current" />
                  <span className="ml-2">Unfavorite</span>
                </Button>
                <Button
                  variant="ghost"
                  size={isMobile ? "sm" : "default"}
                  onClick={() => handleDeleteIdentification(item.id)}
                  className="text-slate-500 hover:text-red-600"
                >
                  <Trash2 className="h-5 w-5" />
                  <span className="ml-2">Delete</span>
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}