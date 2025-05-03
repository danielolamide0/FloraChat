import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Star, LogIn } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PlantIdentificationResult } from "@shared/schema";
import { useAuth, saveToHistory, toggleFavorite } from "@/contexts/AuthContext";
import { useLocation } from "wouter";

interface ResultsSectionProps {
  isLoading: boolean;
  hasError: boolean;
  uploadedImage: string | null;
  results: PlantIdentificationResult | null;
  onNewIdentification: () => void;
}

export default function ResultsSection({
  isLoading,
  hasError,
  uploadedImage,
  results,
  onNewIdentification
}: ResultsSectionProps) {
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [isSaving, setIsSaving] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [savedIdentificationId, setSavedIdentificationId] = useState<string | null>(null);

  // Auto-save to history when identification results are available
  useEffect(() => {
    if (results && !savedIdentificationId) {
      // Auto-save to history silently
      const saveToHistoryAutomatically = async () => {
        try {
          // Create data with timestamp ID
          const identificationId = `id-${Date.now()}`;
          const identificationData = {
            id: identificationId,
            scientificName: results.scientificName,
            commonName: results.commonName,
            family: results.family,
            genus: results.genus,
            confidence: results.confidence,
            category: results.category,
            distribution: results.distribution,
            habitat: results.habitat,
            description: results.description,
            imageUrl: uploadedImage,
            referenceImageUrl: results.referenceImageUrl,
            similarPlants: results.similarPlants,
            createdAt: new Date().toISOString(),
            isFavorite: false,
          };
          
          // Save to history
          const historyKey = `plantHistory_${user?.username || 'guest'}`;
          const existingHistory = JSON.parse(localStorage.getItem(historyKey) || '[]');
          existingHistory.unshift(identificationData);
          localStorage.setItem(historyKey, JSON.stringify(existingHistory));
          
          // Set the ID for favorite functionality
          setSavedIdentificationId(identificationId);
          
          // Try server save in background if authenticated
          if (user?.username) {
            try {
              fetch(`/api/users/${user.username}/history`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(identificationData),
              }).catch(err => console.log('Background server save error (non-critical):', err));
            } catch (e) {
              // Ignore server errors for background save
            }
          }
        } catch (error) {
          console.error('Auto-save error:', error);
          // Don't show errors for auto-save
        }
      };
      
      saveToHistoryAutomatically();
    }
  }, [results, user, uploadedImage, savedIdentificationId]);
  
  const handleToggleFavorite = async () => {
    if (!isAuthenticated) {
      toast({
        title: "Login required",
        description: "Please login to save identifications to your favorites.",
        variant: "destructive",
      });
      navigate('/auth');
      return;
    }
    
    if (!savedIdentificationId) {
      // The identification should be auto-saved already, but if it's not:
      toast({
        title: "Processing",
        description: "Please wait while we prepare your identification.",
      });
      return;
    }
    
    try {
      // Update UI immediately for a responsive feel
      const newFavoriteState = !isFavorite;
      setIsFavorite(newFavoriteState);
      
      // Try server-side first
      try {
        const response = await fetch(`/api/users/${user?.username}/favorites`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            identificationId: savedIdentificationId, 
            isFavorite: newFavoriteState 
          }),
        });
        
        if (!response.ok) {
          throw new Error('Server response not OK');
        }
      } catch (serverError) {
        console.error('Server error, using localStorage instead:', serverError);
        
        // Fallback to localStorage for favorites
        try {
          // Get the history from localStorage
          const historyKey = `plantHistory_${user?.username || 'guest'}`;
          const existingHistory = JSON.parse(localStorage.getItem(historyKey) || '[]');
          
          // Find the item and update its favorite status
          const updatedHistory = existingHistory.map((item: any) => {
            if (item.id === savedIdentificationId) {
              return {...item, isFavorite: newFavoriteState};
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
      
      toast({
        title: newFavoriteState ? "Added to favorites" : "Removed from favorites",
        description: `The plant has been ${newFavoriteState ? 'added to' : 'removed from'} your favorites.`,
      });
    } catch (error) {
      console.error('Favorite toggle error:', error);
      // Revert UI state on error
      setIsFavorite(!isFavorite);
      toast({
        title: "Error",
        description: "Failed to update favorite status.",
        variant: "destructive",
      });
    }
  };

  // Export function removed as requested

  return (
    <section id="results-section" className="mb-12">
      <Card>
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
            <h3 className="text-xl font-heading font-semibold flex items-center">
              <div className="mr-2 p-1.5 rounded-full bg-gradient-to-br from-green-100 to-green-200">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
                  <path d="M12 2a9 9 0 0 0-9 9c0 3.18 1.65 5.98 4.15 7.58.37.23.63.59.76 1 .1.33.17.67.21 1 .08.62.29 1.16.56 1.42.14.14.33.18.54.11s.37-.24.45-.45c.37-.98.89-1.92 1.56-2.75.47-.6 1.11-1.1 1.84-1.44.73-.35 1.55-.52 2.37-.52.82 0 1.64.17 2.37.52.73.35 1.37.85 1.84 1.44.67.83 1.19 1.77 1.56 2.75.08.21.24.39.45.45s.4.03.54-.11c.27-.25.48-.8.56-1.42.04-.33.11-.67.21-1 .13-.41.39-.77.76-1C19.35 16.98 21 14.18 21 11a9 9 0 0 0-9-9z" />
                </svg>
              </div>
              <span>Identification Results</span>
            </h3>
            <Button 
              variant="outline" 
              className="border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800 font-medium transition-colors text-sm md:text-base"
              onClick={onNewIdentification}
              size="sm"
            >
              <PlusCircle className="mr-1 h-4 w-4" /> New Identification
            </Button>
          </div>

          {isLoading && (
            <div id="loading-state" className="py-8 text-center">
              <div className="loading-spinner w-12 h-12 border-4 border-t-green-500 border-neutral-200 rounded-full mx-auto mb-4 animate-spin"></div>
              <p className="text-lg font-medium text-green-700">Analyzing your plant image...</p>
              <p className="text-sm text-neutral-dark mt-2">This may take a few moments</p>
            </div>
          )}

          {!isLoading && hasError && (
            <div id="error-state" className="py-8 text-center">
              <div className="bg-red-50 p-4 rounded-full inline-block mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-red-500">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <h4 className="text-xl font-heading font-medium mb-2 text-red-600">Identification Failed</h4>
              <p className="text-neutral-dark mb-4">We couldn't identify the plant in your image. Please ensure your image:</p>
              <ul className="text-left max-w-md mx-auto mb-6">
                <li className="flex items-start mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mt-1 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <span>Shows the plant clearly without obstructions</span>
                </li>
                <li className="flex items-start mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mt-1 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <span>Has good lighting and is in focus</span>
                </li>
                <li className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mt-1 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <span>Includes distinctive features like leaves, flowers, or stems</span>
                </li>
              </ul>
              <Button 
                onClick={onNewIdentification}
                className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-heading font-medium shadow-md"
              >
                Try Again
              </Button>
            </div>
          )}

          {!isLoading && !hasError && results && (
            <div id="results-display" className="slide-in">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Uploaded Image Preview */}
                <div className="md:w-1/3">
                  <div className="rounded-lg overflow-hidden shadow-sm">
                    {uploadedImage && (
                      <img 
                        src={uploadedImage} 
                        alt="Uploaded plant" 
                        className="w-full h-auto object-cover" 
                      />
                    )}
                    
                    {results.referenceImageUrl && (
                      <div className="mt-2 p-2 border border-green-300 rounded-lg bg-white/50 shadow-sm">
                        <p className="text-xs text-green-700 mb-1 font-medium flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                            <path d="M12 2a9 9 0 0 0-9 9c0 3.18 1.65 5.98 4.15 7.58.37.23.63.59.76 1 .1.33.17.67.21 1 .08.62.29 1.16.56 1.42.14.14.33.18.54.11s.37-.24.45-.45c.37-.98.89-1.92 1.56-2.75.47-.6 1.11-1.1 1.84-1.44.73-.35 1.55-.52 2.37-.52.82 0 1.64.17 2.37.52.73.35 1.37.85 1.84 1.44.67.83 1.19 1.77 1.56 2.75.08.21.24.39.45.45s.4.03.54-.11c.27-.25.48-.8.56-1.42.04-.33.11-.67.21-1 .13-.41.39-.77.76-1C19.35 16.98 21 14.18 21 11a9 9 0 0 0-9-9z" />
                          </svg>
                          Reference Image
                        </p>
                        <img 
                          src={results.referenceImageUrl} 
                          alt={`Reference image of ${results.scientificName}`}
                          className="w-full h-auto object-cover rounded shadow-sm" 
                        />
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Results Info */}
                <div className="md:w-2/3">
                  <div className="mb-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xl md:text-2xl font-heading font-semibold bg-gradient-to-r from-green-700 to-emerald-600 bg-clip-text text-transparent mb-1 break-words">
                        {results.scientificName}
                      </h4>
                      
                      <button 
                        onClick={handleToggleFavorite}
                        className="ml-3 p-2 rounded-full hover:bg-yellow-50 transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-200"
                        aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                        title={isFavorite ? "Remove from favorites" : "Add to favorites"}
                      >
                        <Star className={`h-6 w-6 ${
                          isFavorite 
                            ? 'fill-yellow-500 text-yellow-500' 
                            : 'text-yellow-400 hover:text-yellow-500'
                        }`} />
                      </button>
                    </div>
                    <p className="text-base md:text-lg italic mb-2 text-slate-700">
                      {results.commonName}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      <div className="bg-gradient-to-r from-green-600 to-green-500 text-white text-xs md:text-sm px-2 md:px-3 py-0.5 md:py-1 rounded-full shadow-sm">
                        {results.confidence}% Match
                      </div>
                      {results.category && (
                        <div className="bg-green-100 text-green-800 text-xs md:text-sm px-2 md:px-3 py-0.5 md:py-1 rounded-full shadow-sm">
                          {results.category}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-gradient-to-r from-green-50/70 to-white/70 p-3 rounded shadow-sm border border-green-200">
                      <p className="text-sm font-medium text-green-800">Family</p>
                      <p>{results.family}</p>
                    </div>
                    <div className="bg-gradient-to-r from-green-50/70 to-white/70 p-3 rounded shadow-sm border border-green-200">
                      <p className="text-sm font-medium text-green-800">Genus</p>
                      <p>{results.genus}</p>
                    </div>
                    {results.distribution && (
                      <div className="bg-gradient-to-r from-green-50/70 to-white/70 p-3 rounded shadow-sm border border-green-200">
                        <p className="text-sm font-medium text-green-800">Distribution</p>
                        <p>{results.distribution}</p>
                      </div>
                    )}
                    {results.habitat && (
                      <div className="bg-gradient-to-r from-green-50/70 to-white/70 p-3 rounded shadow-sm border border-green-200">
                        <p className="text-sm font-medium text-green-800">Habitat</p>
                        <p>{results.habitat}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap justify-center sm:justify-end gap-3">
                    {!isAuthenticated && (
                      <Button
                        variant="link"
                        size="sm"
                        className="text-green-700 hover:text-green-800 font-heading font-medium text-xs sm:text-sm"
                        onClick={() => navigate('/auth')}
                      >
                        <LogIn className="mr-1 h-3 w-3 sm:h-4 sm:w-4" /> Login to save favorites
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Similar Species */}
              {results.similarPlants && results.similarPlants.length > 0 && (
                <div className="mt-8">
                  <h4 className="text-lg font-heading font-medium mb-4 text-green-700 pb-2 border-b border-green-100">Similar Species</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {results.similarPlants.map((plant, index) => (
                      <div key={index} className="bg-white/50 border border-green-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                        {plant.imageUrl && (
                          <img src={plant.imageUrl} alt={plant.scientificName} className="w-full h-32 object-cover" />
                        )}
                        <div className="p-3">
                          <p className="font-medium text-sm">{plant.scientificName}</p>
                          <p className="text-xs text-neutral-dark">{plant.commonName}</p>
                          {plant.similarity && (
                            <div className="mt-1 text-xs bg-gradient-to-r from-green-100 to-green-50 text-green-700 px-2 py-0.5 rounded-full inline-block shadow-sm">
                              {plant.similarity}% Similar
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
