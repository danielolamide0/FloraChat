import { useState } from "react";
import HeroBanner from "@/components/HeroBanner";
import ImageUpload from "@/components/ImageUpload";
import ResultsSection from "@/components/ResultsSection";
import HistorySection from "@/components/HistorySection";
import FeatureSection from "@/components/FeatureSection";

export default function Home() {
  const [showResults, setShowResults] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [identificationResults, setIdentificationResults] = useState<any | null>(null);

  const handleImageUpload = async (imageFile: File) => {
    setShowResults(true);
    setIsLoading(true);
    setHasError(false);
    
    // Create local object URL for displaying the image
    const imageUrl = URL.createObjectURL(imageFile);
    setUploadedImage(imageUrl);
    
    try {
      // Create form data to send to the server
      const formData = new FormData();
      formData.append('image', imageFile);

      // Send the image to the server for identification
      const response = await fetch('/api/identify', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to identify plant');
      }

      const data = await response.json();
      setIdentificationResults(data);
      setIsLoading(false);
    } catch (error) {
      console.error('Error identifying plant:', error);
      setHasError(true);
      setIsLoading(false);
    }
  };

  const handleNewIdentification = () => {
    setShowResults(false);
    setUploadedImage(null);
    setIdentificationResults(null);
  };

  return (
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
      <main>
        <HeroBanner />
        
        {!showResults ? (
          <ImageUpload onImageCapture={handleImageUpload} />
        ) : (
          <ResultsSection 
            isLoading={isLoading}
            hasError={hasError}
            uploadedImage={uploadedImage}
            results={identificationResults}
            onNewIdentification={handleNewIdentification}
          />
        )}
        
        <HistorySection />
        <FeatureSection />
      </main>
    </div>
  );
}
