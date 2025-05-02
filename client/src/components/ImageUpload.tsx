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
          <h3 className="text-xl font-heading font-semibold mb-4 flex items-center">
            <div className="mr-2 p-1.5 rounded-full bg-gradient-to-br from-green-100 to-green-200">
              <Upload className="h-5 w-5 text-green-600" />
            </div>
            <span>Upload Plant Image</span>
          </h3>
          
          <Tabs defaultValue="upload">
            <TabsList className="mb-6 border-b border-green-100 w-full justify-start rounded-none bg-transparent p-0">
              <TabsTrigger 
                value="upload"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-green-500 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-50 data-[state=active]:to-transparent data-[state=active]:text-green-700 px-4 py-2 transition-all"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Image
              </TabsTrigger>
              <TabsTrigger 
                value="camera"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-green-500 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-50 data-[state=active]:to-transparent data-[state=active]:text-green-700 px-4 py-2 transition-all"
              >
                <Camera className="h-4 w-4 mr-2" />
                Use Camera
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="upload" className="slide-in mt-0">
              <div 
                className={`upload-area rounded-lg p-8 text-center cursor-pointer bg-gradient-to-r from-green-50/90 to-white/90 backdrop-blur-sm border-dashed border-2 border-green-300 shadow-inner ${isDragging ? 'dragover' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="mx-auto mb-4 rounded-full p-5 bg-gradient-to-br from-green-100 to-green-50 shadow-sm inline-block">
                  <Upload className="h-10 w-10 mx-auto text-green-600" />
                </div>
                <p className="mb-2 font-medium">Drag and drop your image here</p>
                <p className="text-sm text-neutral-dark mb-4">or</p>
                <Button className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-heading font-medium shadow-sm">
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
