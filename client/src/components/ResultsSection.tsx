import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Bookmark, PlusCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PlantIdentificationResult } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

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
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveToHistory = async () => {
    if (!results) return;
    
    setIsSaving(true);
    try {
      await apiRequest('POST', '/api/identifications', {
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
        similarPlants: results.similarPlants
      });
      
      toast({
        title: "Saved to history",
        description: "This identification has been added to your history.",
      });
      
      // Invalidate the identifications query to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/identifications'] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save identification to history.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportData = () => {
    if (!results) return;
    
    const dataStr = JSON.stringify(results, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `plant-identification-${results.scientificName.toLowerCase().replace(/\s+/g, '-')}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <section id="results-section" className="mb-12">
      <Card>
        <CardContent className="p-6 md:p-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-heading font-semibold">Identification Results</h3>
            <Button 
              variant="ghost" 
              className="text-primary hover:text-primary-dark font-medium transition-colors"
              onClick={onNewIdentification}
            >
              <PlusCircle className="mr-1 h-4 w-4" /> New Identification
            </Button>
          </div>

          {isLoading && (
            <div id="loading-state" className="py-8 text-center">
              <div className="loading-spinner w-12 h-12 border-4 border-neutral rounded-full mx-auto mb-4"></div>
              <p className="text-lg font-medium">Analyzing your plant image...</p>
              <p className="text-sm text-neutral-dark mt-2">This may take a few moments</p>
            </div>
          )}

          {!isLoading && hasError && (
            <div id="error-state" className="py-8 text-center">
              <div className="text-red-500 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <h4 className="text-xl font-heading font-medium mb-2">Identification Failed</h4>
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
                className="bg-primary hover:bg-primary-dark text-white font-heading font-medium"
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
                  </div>
                </div>
                
                {/* Results Info */}
                <div className="md:w-2/3">
                  <div className="mb-4">
                    <h4 className="text-2xl font-heading font-semibold text-primary mb-1">
                      {results.scientificName}
                    </h4>
                    <p className="text-lg italic mb-2">
                      {results.commonName}
                    </p>
                    <div className="flex items-center mb-4">
                      <div className="bg-primary-light text-white text-sm px-3 py-1 rounded-full mr-2">
                        {results.confidence}% Match
                      </div>
                      {results.category && (
                        <div className="bg-secondary-light text-primary-dark text-sm px-3 py-1 rounded-full">
                          {results.category}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-neutral-light p-3 rounded">
                      <p className="text-sm font-medium">Family</p>
                      <p>{results.family}</p>
                    </div>
                    <div className="bg-neutral-light p-3 rounded">
                      <p className="text-sm font-medium">Genus</p>
                      <p>{results.genus}</p>
                    </div>
                    {results.distribution && (
                      <div className="bg-neutral-light p-3 rounded">
                        <p className="text-sm font-medium">Distribution</p>
                        <p>{results.distribution}</p>
                      </div>
                    )}
                    {results.habitat && (
                      <div className="bg-neutral-light p-3 rounded">
                        <p className="text-sm font-medium">Habitat</p>
                        <p>{results.habitat}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      className="bg-accent hover:bg-accent-dark text-neutral-dark font-heading font-medium mr-3"
                      onClick={handleExportData}
                    >
                      <Download className="mr-1 h-4 w-4" /> Export Data
                    </Button>
                    <Button 
                      className="bg-primary hover:bg-primary-dark text-white font-heading font-medium"
                      onClick={handleSaveToHistory}
                      disabled={isSaving}
                    >
                      <Bookmark className="mr-1 h-4 w-4" /> Save to History
                    </Button>
                  </div>
                </div>
              </div>

              {/* Similar Species */}
              {results.similarPlants && results.similarPlants.length > 0 && (
                <div className="mt-8">
                  <h4 className="text-lg font-heading font-medium mb-4">Similar Species</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {results.similarPlants.map((plant, index) => (
                      <div key={index} className="bg-white border border-neutral rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                        {plant.imageUrl && (
                          <img src={plant.imageUrl} alt={plant.scientificName} className="w-full h-32 object-cover" />
                        )}
                        <div className="p-3">
                          <p className="font-medium text-sm">{plant.scientificName}</p>
                          <p className="text-xs text-neutral-dark">{plant.commonName}</p>
                          {plant.similarity && (
                            <div className="mt-1 text-xs bg-secondary-light text-primary-dark px-2 py-0.5 rounded-full inline-block">
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
