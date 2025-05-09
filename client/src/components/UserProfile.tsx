import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { HistoryIcon, StarIcon, LogOut, RefreshCw, Trash2 } from 'lucide-react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';

interface Identification {
  id: string;
  scientificName: string;
  commonName: string;
  family: string;
  genus: string;
  confidence: number;
  category?: string;
  distribution?: string;
  habitat?: string;
  imageUrl: string;
  referenceImageUrl?: string;
  isFavorite: boolean;
  createdAt: {
    seconds: number;
    nanoseconds: number;
  };
}

export default function UserProfile() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('history');
  const [history, setHistory] = useState<Identification[]>([]);
  const [favorites, setFavorites] = useState<Identification[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(false);

  const fetchHistory = async () => {
    if (!user) return;
    
    setIsLoadingHistory(true);
    try {
      const response = await fetch(`/api/users/${user.username}/history`);
      if (!response.ok) {
        throw new Error('Failed to fetch history');
      }
      const data = await response.json();
      setHistory(data);
    } catch (error) {
      console.error('Error fetching history:', error);
      toast({
        title: "Error",
        description: "Could not load your identification history",
        variant: "destructive",
      });
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const fetchFavorites = async () => {
    if (!user) return;
    
    setIsLoadingFavorites(true);
    try {
      const response = await fetch(`/api/users/${user.username}/favorites`);
      if (!response.ok) {
        throw new Error('Failed to fetch favorites');
      }
      const data = await response.json();
      setFavorites(data);
    } catch (error) {
      console.error('Error fetching favorites:', error);
      toast({
        title: "Error",
        description: "Could not load your favorite identifications",
        variant: "destructive",
      });
    } finally {
      setIsLoadingFavorites(false);
    }
  };

  const handleToggleFavorite = async (id: string, isFavorite: boolean) => {
    if (!user) return;
    
    try {
      const response = await fetch(`/api/users/${user.username}/favorites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ identificationId: id, isFavorite: !isFavorite }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update favorite status');
      }
      
      // Update local state
      if (activeTab === 'history') {
        setHistory(prev => 
          prev.map(item => 
            item.id === id ? { ...item, isFavorite: !isFavorite } : item
          )
        );
      } else {
        // If we're on favorites tab and removing a favorite, filter it out
        if (isFavorite) {
          setFavorites(prev => prev.filter(item => item.id !== id));
        }
      }
      
      // Refresh the other list
      if (activeTab === 'history') {
        fetchFavorites();
      } else {
        fetchHistory();
      }
      
      toast({
        title: isFavorite ? "Removed from favorites" : "Added to favorites",
        description: `The plant has been ${isFavorite ? 'removed from' : 'added to'} your favorites.`,
      });
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast({
        title: "Error",
        description: "Could not update favorite status",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    
    try {
      const response = await fetch(`/api/users/${user.username}/history/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete identification');
      }
      
      // Update local state
      if (activeTab === 'history') {
        setHistory(prev => prev.filter(item => item.id !== id));
      } else {
        setFavorites(prev => prev.filter(item => item.id !== id));
      }
      
      toast({
        title: "Deleted",
        description: "The plant identification has been deleted from your history.",
      });
    } catch (error) {
      console.error('Error deleting identification:', error);
      toast({
        title: "Error",
        description: "Could not delete identification",
        variant: "destructive",
      });
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast({
      title: "Logged out",
      description: "You have been logged out successfully.",
    });
  };

  useEffect(() => {
    if (user) {
      fetchHistory();
      fetchFavorites();
    }
  }, [user]);

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold bg-gradient-to-r from-green-700 to-emerald-600 bg-clip-text text-transparent">
            Your Profile
          </h1>
          <p className="text-sm text-slate-600">
            Welcome, {user.username}
          </p>
        </div>
        <Button 
          variant="outline" 
          className="border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-green-50 border border-green-100">
          <TabsTrigger 
            value="history" 
            className="data-[state=active]:bg-white data-[state=active]:text-green-700 data-[state=active]:shadow-sm"
          >
            <HistoryIcon className="mr-2 h-4 w-4" />
            History
          </TabsTrigger>
          <TabsTrigger 
            value="favorites" 
            className="data-[state=active]:bg-white data-[state=active]:text-green-700 data-[state=active]:shadow-sm"
          >
            <StarIcon className="mr-2 h-4 w-4" />
            Favorites
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="history" className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-green-800">Your Identification History</h2>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-green-600 hover:text-green-800"
              onClick={fetchHistory}
              disabled={isLoadingHistory}
            >
              <RefreshCw className={`mr-1 h-4 w-4 ${isLoadingHistory ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          
          {history.length === 0 ? (
            <Card className="bg-white/70 border-green-100">
              <CardContent className="p-6 text-center text-slate-500">
                <HistoryIcon className="mx-auto h-8 w-8 mb-2 text-slate-400" />
                <p>No plant identifications in your history yet.</p>
                <p className="text-sm mt-1">Identify a plant to start building your history!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {history.map((item) => (
                <Card key={item.id} className="overflow-hidden bg-white/70 border-green-100 hover:shadow-md transition-shadow">
                  <div className="h-40 overflow-hidden relative">
                    <img 
                      src={item.imageUrl} 
                      alt={item.scientificName} 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className={`h-8 w-8 rounded-full bg-white/80 ${item.isFavorite ? 'text-yellow-500 border-yellow-300' : 'text-slate-400 border-slate-200'}`}
                        onClick={() => handleToggleFavorite(item.id, item.isFavorite)}
                      >
                        <StarIcon className="h-4 w-4" fill={item.isFavorite ? 'currentColor' : 'none'} />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-full bg-white/80 text-red-500 border-red-200 hover:bg-red-50"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-medium text-green-800">{item.scientificName}</h3>
                    <p className="text-sm text-slate-600 italic">{item.commonName}</p>
                    <div className="flex items-center mt-2">
                      <div className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                        {item.confidence}% Match
                      </div>
                      <div className="text-xs text-slate-500 ml-auto">
                        {new Date(item.createdAt.seconds * 1000).toLocaleDateString()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="favorites" className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-green-800">Your Favorite Plants</h2>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-green-600 hover:text-green-800"
              onClick={fetchFavorites}
              disabled={isLoadingFavorites}
            >
              <RefreshCw className={`mr-1 h-4 w-4 ${isLoadingFavorites ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          
          {favorites.length === 0 ? (
            <Card className="bg-white/70 border-green-100">
              <CardContent className="p-6 text-center text-slate-500">
                <StarIcon className="mx-auto h-8 w-8 mb-2 text-slate-400" />
                <p>No favorite plants yet.</p>
                <p className="text-sm mt-1">Mark plants as favorites to save them here!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {favorites.map((item) => (
                <Card key={item.id} className="overflow-hidden bg-white/70 border-green-100 hover:shadow-md transition-shadow">
                  <div className="h-40 overflow-hidden relative">
                    <img 
                      src={item.imageUrl} 
                      alt={item.scientificName} 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-full bg-white/80 text-yellow-500 border-yellow-300"
                        onClick={() => handleToggleFavorite(item.id, item.isFavorite)}
                      >
                        <StarIcon className="h-4 w-4" fill="currentColor" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-full bg-white/80 text-red-500 border-red-200 hover:bg-red-50"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-medium text-green-800">{item.scientificName}</h3>
                    <p className="text-sm text-slate-600 italic">{item.commonName}</p>
                    <div className="flex items-center mt-2">
                      <div className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                        {item.confidence}% Match
                      </div>
                      <div className="text-xs text-slate-500 ml-auto">
                        {new Date(item.createdAt.seconds * 1000).toLocaleDateString()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}