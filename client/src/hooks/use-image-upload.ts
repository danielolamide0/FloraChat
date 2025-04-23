import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface UseImageUploadOptions {
  maxSizeInMB?: number;
  acceptedTypes?: string[];
}

interface UseImageUploadResult {
  isUploading: boolean;
  error: string | null;
  uploadImage: (file: File) => Promise<{ url: string; file: File } | null>;
  validateImage: (file: File) => boolean;
}

export function useImageUpload(options: UseImageUploadOptions = {}): UseImageUploadResult {
  const { maxSizeInMB = 10, acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'] } = options;
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const validateImage = (file: File): boolean => {
    // Check file type
    if (!acceptedTypes.includes(file.type)) {
      const errorMsg = `Invalid file type. Please upload one of the following: ${acceptedTypes.join(', ')}`;
      setError(errorMsg);
      toast({
        title: "Invalid file type",
        description: errorMsg,
        variant: "destructive",
      });
      return false;
    }

    // Check file size
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
      const errorMsg = `File size exceeds ${maxSizeInMB}MB`;
      setError(errorMsg);
      toast({
        title: "File too large",
        description: errorMsg,
        variant: "destructive",
      });
      return false;
    }

    setError(null);
    return true;
  };

  const uploadImage = async (file: File): Promise<{ url: string; file: File } | null> => {
    if (!validateImage(file)) {
      return null;
    }

    setIsUploading(true);
    setError(null);

    try {
      // For this simple implementation, we're just creating an object URL
      // In a real application, you would upload the file to a server or cloud storage
      const url = URL.createObjectURL(file);
      return { url, file };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to process image';
      setError(errorMsg);
      toast({
        title: "Upload failed",
        description: errorMsg,
        variant: "destructive",
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return { isUploading, error, uploadImage, validateImage };
}
