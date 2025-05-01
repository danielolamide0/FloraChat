import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

/**
 * Upload image to Firebase Storage
 * @param imageBuffer - The image buffer to upload
 * @param fileName - The name to give the file in storage
 * @param contentType - The content type of the image
 * @returns The download URL of the uploaded image
 */
export async function uploadImageToFirebase(
  imageBuffer: Buffer, 
  fileName: string,
  contentType: string
): Promise<string> {
  try {
    // Create a storage reference
    const storageRef = ref(storage, `plant-images/${fileName}`);
    
    // Upload the image
    const metadata = {
      contentType
    };
    
    const snapshot = await uploadBytes(storageRef, imageBuffer, metadata);
    console.log('Uploaded image to Firebase Storage');
    
    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading image to Firebase:', error);
    throw error;
  }
}

// Check if Firebase is configured
export function isFirebaseConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_API_KEY &&
    process.env.FIREBASE_AUTH_DOMAIN &&
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_STORAGE_BUCKET
  );
}

export { storage as firebaseStorage };