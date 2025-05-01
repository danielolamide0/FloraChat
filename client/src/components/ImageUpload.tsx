import { useState, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Upload, Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import CameraCapture from "./CameraCapture";

interface ImageUploadProps {
  onImageCapture: (file: File) => void;
}

export default function ImageUpload({ onImageCapture }: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      validateAndProcessFile(file);
    }
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      validateAndProcessFile(file);
    }
  }, []);

  const validateAndProcessFile = (file: File) => {
    // Check if the file is an image
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file (JPG, PNG, WEBP).",
        variant: "destructive",
      });
      return;
    }
    
    // Check if the file size is under 25MB
    if (file.size > 25 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 25MB.",
        variant: "destructive",
      });
      return;
    }
    
    onImageCapture(file);
  };

  const handleCameraCapture = (imageBlob: Blob) => {
    const file = new File([imageBlob], "camera-capture.jpg", { type: "image/jpeg" });
    onImageCapture(file);
  };

  return (
    <section className="mb-12" id="upload-section">
      <Card>
        <CardContent className="p-6 md:p-8">
          <h3 className="text-xl font-heading font-semibold mb-4">Upload Plant Image</h3>
          
          <Tabs defaultValue="upload">
            <TabsList className="mb-6 border-b border-neutral w-full justify-start rounded-none bg-transparent">
              <TabsTrigger 
                value="upload"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary"
              >
                Upload Image
              </TabsTrigger>
              <TabsTrigger 
                value="camera"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary"
              >
                Use Camera
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="upload" className="slide-in mt-0">
              <div 
                className={`upload-area rounded-lg p-8 text-center cursor-pointer ${isDragging ? 'dragover' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="mx-auto mb-4 text-primary-light">
                  <Upload className="h-16 w-16 mx-auto" />
                </div>
                <p className="mb-2 font-medium">Drag and drop your image here</p>
                <p className="text-sm text-neutral-dark mb-4">or</p>
                <Button className="bg-primary hover:bg-primary-dark text-white font-heading font-medium">
                  Browse Files
                </Button>
                <input 
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileInputChange}
                />
                <p className="mt-4 text-sm text-neutral-dark">Supported formats: JPG, PNG, WEBP (up to 25MB)</p>
              </div>
            </TabsContent>
            
            <TabsContent value="camera" className="slide-in mt-0">
              <CameraCapture onCapture={handleCameraCapture} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </section>
  );
}
