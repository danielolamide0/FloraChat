import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Camera, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CameraCaptureProps {
  onCapture: (imageBlob: Blob) => void;
}

export default function CameraCapture({ onCapture }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [isCameraAvailable, setIsCameraAvailable] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    startCamera();
    
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [facingMode]);

  const startCamera = async () => {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      
      setStream(newStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
      
      setIsCameraAvailable(true);
    } catch (error) {
      console.error("Error accessing camera:", error);
      setIsCameraAvailable(false);
      toast({
        title: "Camera access denied",
        description: "Please allow camera access to use this feature.",
        variant: "destructive",
      });
    }
  };

  const switchCamera = () => {
    setFacingMode(prevMode => prevMode === 'user' ? 'environment' : 'user');
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw the current video frame on the canvas
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert canvas to blob
        canvas.toBlob((blob) => {
          if (blob) {
            onCapture(blob);
          } else {
            toast({
              title: "Capture failed",
              description: "Failed to process the captured image.",
              variant: "destructive",
            });
          }
        }, 'image/jpeg', 0.9);
      }
    }
  };

  return (
    <div className="text-center">
      {isCameraAvailable ? (
        <>
          <div className="relative max-w-md mx-auto mb-3 md:mb-4 bg-neutral rounded-lg overflow-hidden border-2 border-green-300 shadow-md backdrop-blur-md" style={{ aspectRatio: "4/3" }}>
            <video 
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          </div>
          <canvas ref={canvasRef} className="hidden" />
          <div className="flex flex-col sm:flex-row justify-center space-y-2 sm:space-y-0 sm:space-x-4">
            <Button 
              onClick={captureImage}
              size="sm"
              className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-heading font-medium shadow-sm text-xs md:text-sm"
            >
              <Camera className="mr-1.5 md:mr-2 h-3.5 w-3.5 md:h-4 md:w-4" /> Capture
            </Button>
            <Button 
              onClick={switchCamera}
              size="sm"
              variant="outline"
              className="border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800 font-heading font-medium text-xs md:text-sm"
            >
              <RefreshCw className="mr-1.5 md:mr-2 h-3.5 w-3.5 md:h-4 md:w-4" /> Switch Camera
            </Button>
          </div>
        </>
      ) : (
        <div className="py-4 md:py-8">
          <p className="text-red-500 mb-3 md:mb-4 text-sm md:text-base">Camera access is required for this feature.</p>
          <Button 
            onClick={startCamera}
            size="sm"
            className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-heading font-medium shadow-sm text-xs md:text-sm"
          >
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
}
