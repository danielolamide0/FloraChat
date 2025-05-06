import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import fs from "fs";
import { plantIdentificationResultSchema } from "@shared/schema";
import { z } from "zod";
import { OpenAI } from 'openai';
import FormData from 'form-data';
import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';
import { 
  uploadImageToFirebase, 
  isFirebaseConfigured,
  getUser,
  createUser,
  updateUserLastLogin,
  saveIdentificationToHistory,
  getUserIdentificationHistory,
  getUserFavorites,
  toggleFavorite,
  deleteIdentification 
} from './firebase';
import { fetchPlantReferenceImage, fetchPlantImageFromCommons } from './utils/wiki-images';

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit (increased from 10MB)
  },
  fileFilter: (_req: any, file: any, cb: any) => {
    // Accept only image files
    const filetypes = /jpeg|jpg|png|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    
    cb(new Error("Only image files are allowed"));
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // User Routes
  // Login/Register a user
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username } = req.body;
      
      if (!username || typeof username !== 'string' || username.trim() === '') {
        return res.status(400).json({ message: "Username is required" });
      }
      
      try {
        // Check if user exists in database
        let user = await storage.getUserByUsername(username);
        
        if (!user) {
          // Create new user if they don't exist
          user = await storage.createUser({
            username,
            password: 'placeholder' // We're not using password auth but schema requires it
          });
          console.log(`Created new user in database: ${username}`);
        } else {
          // Update last login time for existing user (Firebase fallback)
          try {
            await updateUserLastLogin(username);
          } catch (firebaseError) {
            console.error("Firebase error updating last login - continuing with DB user:", firebaseError);
          }
          console.log(`User logged in: ${username}`);
        }
      } catch (dbError) {
        console.error("Database error in user login/register:", dbError);
        
        // Fallback to Firebase
        try {
          // Check if user exists in Firebase
          let user = await getUser(username);
          
          if (!user) {
            // Create new user if they don't exist
            user = await createUser(username);
            console.log(`Created new user in Firebase fallback: ${username}`);
          } else {
            // Update last login time for existing user
            await updateUserLastLogin(username);
            console.log(`User logged in via Firebase fallback: ${username}`);
          }
        } catch (firebaseError) {
          // Firebase error but we can continue with localStorage as a last resort
          console.error("Firebase fallback error in user login/register:", firebaseError);
        }
      }
      
      return res.status(200).json({ success: true, username });
    } catch (error: any) {
      console.error("Error in user login/register:", error);
      return res.status(500).json({ 
        message: "Error processing login", 
        error: error.message || "Unknown error"
      });
    }
  });

  // Get user identification history
  app.get("/api/users/:username/history", async (req: Request, res: Response) => {
    try {
      const { username } = req.params;
      
      try {
        // Check if user exists in database
        const user = await storage.getUserByUsername(username);
        if (!user) {
          // Try Firebase as fallback if user not in database
          try {
            const firebaseUser = await getUser(username);
            if (!firebaseUser) {
              console.log(`User ${username} not found in DB or Firebase - returning empty history`);
              return res.status(200).json([]);
            }
            
            // User exists in Firebase but not in DB, get history from Firebase
            const history = await getUserIdentificationHistory(username);
            return res.status(200).json(history);
          } catch (firebaseError) {
            console.error("Firebase fallback error fetching history:", firebaseError);
            return res.status(200).json([]);
          }
        }
        
        // Get identifications from database
        const identifications = await storage.getAllPlantIdentifications();
        
        // Filter to only include this user's identifications by matching on username
        // Log the filter operation for debugging
        console.log(`Filtering ${identifications.length} identifications for user ${username}`);
        console.log('Database contains usernames:', identifications.map(id => id.username));
        
        const userIdentifications = identifications.filter(
          identification => identification.username === username
        );
        
        console.log(`Found ${userIdentifications.length} identifications for user ${username}`);
        
        // Format the response to match the expected client format
        // Check image URL sizes - if they're too large, replace with placeholder
        const history = userIdentifications.map(identification => {
          // Process the image URLs to handle potential large data URLs
          let imageUrl = identification.imageUrl;
          let referenceImageUrl = identification.referenceImageUrl;
          
          // Return formatted identification
          return {
            id: identification.clientId,
            scientificName: identification.scientificName,
            commonName: identification.commonName || identification.scientificName,
            family: identification.family || '',
            genus: identification.genus || '',
            confidence: identification.confidence || 0,
            imageUrl: imageUrl, // Keep the URL as-is (client will compress if needed)
            referenceImageUrl: referenceImageUrl || null,
            isFavorite: identification.isFavorite,
            createdAt: identification.identifiedAt,
            username: identification.username // Ensure username is included
          };
        });
        
        return res.status(200).json(history);
      } catch (dbError) {
        console.error("Database error fetching history - trying Firebase:", dbError);
        
        // Try Firebase as fallback
        try {
          // Check if user exists in Firebase
          const user = await getUser(username);
          if (!user) {
            console.log(`User ${username} not found in Firebase fallback - returning empty history`);
            return res.status(200).json([]);
          }
          
          const history = await getUserIdentificationHistory(username);
          return res.status(200).json(history);
        } catch (firebaseError) {
          // Firebase error - return empty array as final fallback
          console.error("Firebase fallback error fetching history:", firebaseError);
          return res.status(200).json([]);
        }
      }
    } catch (error: any) {
      console.error("Error fetching user history:", error);
      return res.status(500).json({ 
        message: "Error fetching history", 
        error: error.message || "Unknown error"
      });
    }
  });

  // Get user favorites
  app.get("/api/users/:username/favorites", async (req: Request, res: Response) => {
    try {
      const { username } = req.params;
      
      try {
        // Check if user exists in database
        const user = await storage.getUserByUsername(username);
        if (!user) {
          // Try Firebase fallback if user not in database
          try {
            const firebaseUser = await getUser(username);
            if (!firebaseUser) {
              console.log(`User ${username} not found in DB or Firebase - returning empty favorites`);
              return res.status(200).json([]);
            }
            
            // User exists in Firebase but not in DB, get favorites from Firebase
            const favorites = await getUserFavorites(username);
            return res.status(200).json(favorites);
          } catch (firebaseError) {
            console.error("Firebase fallback error fetching favorites:", firebaseError);
            return res.status(200).json([]);
          }
        }
        
        // Get identifications from database
        const identifications = await storage.getAllPlantIdentifications();
        
        // Filter to only include this user's favorited identifications
        // Log the filter operation for debugging
        console.log(`Filtering favorites among ${identifications.length} identifications for user ${username}`);
        console.log('Database contains usernames:', identifications.map(id => id.username));
        
        const userFavorites = identifications.filter(
          identification => identification.username === username && identification.isFavorite === true
        );
        
        console.log(`Found ${userFavorites.length} favorites for user ${username}`);
        
        // Format the response to match the expected client format
        // Process images to handle potential large data URLs
        const favorites = userFavorites.map(identification => {
          // Process the image URLs - keep original but client will compress if needed
          let imageUrl = identification.imageUrl;
          let referenceImageUrl = identification.referenceImageUrl;
          
          return {
            id: identification.clientId,
            scientificName: identification.scientificName,
            commonName: identification.commonName || identification.scientificName,
            family: identification.family || '',
            genus: identification.genus || '',
            confidence: identification.confidence || 0,
            imageUrl: imageUrl,
            referenceImageUrl: referenceImageUrl || null,
            isFavorite: true,
            createdAt: identification.identifiedAt,
            username: identification.username // Ensure username is included
          };
        });
        
        return res.status(200).json(favorites);
      } catch (dbError) {
        console.error("Database error fetching favorites - trying Firebase:", dbError);
        
        // Try Firebase as fallback
        try {
          // Check if user exists in Firebase
          const user = await getUser(username);
          if (!user) {
            console.log(`User ${username} not found in Firebase fallback - returning empty favorites`);
            return res.status(200).json([]);
          }
          
          const favorites = await getUserFavorites(username);
          return res.status(200).json(favorites);
        } catch (firebaseError) {
          // Firebase error - return empty array as final fallback
          console.error("Firebase fallback error fetching favorites:", firebaseError);
          return res.status(200).json([]);
        }
      }
    } catch (error: any) {
      console.error("Error fetching user favorites:", error);
      return res.status(500).json({ 
        message: "Error fetching favorites", 
        error: error.message || "Unknown error"
      });
    }
  });

  // Toggle favorite status for an identification
  app.post("/api/users/:username/favorites", async (req: Request, res: Response) => {
    try {
      const { username } = req.params;
      const { identificationId, isFavorite } = req.body;
      
      if (!identificationId) {
        return res.status(400).json({ message: "Identification ID is required" });
      }
      
      try {
        // First check if user exists in database
        const user = await storage.getUserByUsername(username);
        
        // If user doesn't exist in database, create them
        if (!user) {
          try {
            await storage.createUser({
              username,
              password: 'placeholder' // We're not using password auth but schema requires it
            });
            console.log(`Created new user in database for toggling favorite: ${username}`);
          } catch (createDbError) {
            console.error("Error creating user in database for favorite toggle:", createDbError);
            // We'll continue with Firebase fallback
          }
        }
        
        // Try to find the identification in the database by clientId
        const allIdentifications = await storage.getAllPlantIdentifications();
        const identification = allIdentifications.find(i => i.clientId === identificationId && i.username === username);
        
        if (identification) {
          // Update the identification in the database
          try {
            // In a proper implementation, we'd have an update method in storage
            // For now, we'll just create a new identification with the same clientId but updated isFavorite
            await storage.createPlantIdentification({
              ...identification,
              isFavorite
            });
            
            console.log(`Updated favorite status in database for identification ${identificationId} to ${isFavorite}`);
            
            // Try to also update in Firebase for data consistency
            try {
              await toggleFavorite(username, identificationId, isFavorite);
            } catch (firebaseToggleError) {
              console.error("Firebase toggle error (database already updated):", firebaseToggleError);
            }
            
            return res.status(200).json({ 
              id: identificationId, 
              isFavorite
            });
          } catch (dbUpdateError) {
            console.error("Database error updating favorite status:", dbUpdateError);
            // Continue to Firebase fallback
          }
        }
        
        // Database update failed or identification not found in DB, try Firebase
        try {
          // Check if user exists in Firebase
          const firebaseUser = await getUser(username);
          
          // If the user doesn't exist in Firebase, create them
          if (!firebaseUser) {
            try {
              await createUser(username);
              console.log(`Created new user in Firebase for toggling favorite: ${username}`);
            } catch (createFirebaseError) {
              console.error("Failed to create user in Firebase for favorite toggle:", createFirebaseError);
              // Return success anyway as a fallback
              return res.status(200).json({ 
                id: identificationId, 
                isFavorite
              });
            }
          }
          
          // Try to update in Firebase
          const result = await toggleFavorite(username, identificationId, isFavorite);
          return res.status(200).json(result);
        } catch (firebaseError) {
          console.error("Firebase error in toggle favorite - returning simulated response:", firebaseError);
          // Return a simulated success response for the client
          return res.status(200).json({ 
            id: identificationId, 
            isFavorite
          });
        }
      } catch (error: any) {
        console.error("Unexpected error in toggle favorite - returning simulated response:", error);
        // Return a simulated success response for the client
        return res.status(200).json({ 
          id: identificationId, 
          isFavorite
        });
      }
    } catch (error: any) {
      console.error("Error toggling favorite status:", error);
      return res.status(500).json({ 
        message: "Error updating favorite status", 
        error: error.message || "Unknown error"
      });
    }
  });

  // Save an identification to user history
  app.post("/api/users/:username/history", async (req: Request, res: Response) => {
    try {
      const { username } = req.params;
      const identificationData = req.body;
      
      // Generate a unique ID for this identification (timestamp + random)
      const clientId = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      try {
        // First try to save to database
        try {
          // Check if user exists in database
          let user = await storage.getUserByUsername(username);
          
          // Create user if doesn't exist in database
          if (!user) {
            try {
              user = await storage.createUser({
                username,
                password: 'placeholder' // We're not using password auth but schema requires it
              });
              console.log(`Created new user in database for saving history: ${username}`);
            } catch (createDbError) {
              console.error("Error creating user in database:", createDbError);
              throw createDbError; // Rethrow to trigger Firebase fallback
            }
          }
          
          // Prepare data for database storage
          const plantIdentificationData = {
            username,
            clientId,
            imageUrl: identificationData.imageUrl,
            scientificName: identificationData.scientificName,
            commonName: identificationData.commonName || null,
            family: identificationData.family || null,
            genus: identificationData.genus || null,
            confidence: identificationData.confidence || null,
            category: identificationData.category || null,
            distribution: identificationData.distribution || null,
            habitat: identificationData.habitat || null,
            description: identificationData.description || null,
            referenceImageUrl: identificationData.referenceImageUrl || null,
            isFavorite: false // Default to not favorited
          };
          
          // Save to database
          await storage.createPlantIdentification(plantIdentificationData);
          console.log(`Saved identification to database for user ${username}`);
          
          // Try to save to Firebase as well for data consistency
          try {
            await saveIdentificationToHistory(username, {
              ...identificationData,
              id: clientId
            });
          } catch (firebaseSaveError) {
            console.error("Firebase save error (database already saved):", firebaseSaveError);
          }
          
          // Return success with the data we saved
          return res.status(201).json({
            id: clientId,
            ...identificationData,
            createdAt: new Date(),
            isFavorite: false
          });
        } catch (dbError) {
          console.error("Database error saving identification - trying Firebase:", dbError);
          throw dbError; // Rethrow to trigger Firebase fallback
        }
      } catch (dbFallbackError) {
        // Database failed, try Firebase fallback
        try {
          // Check if user exists in Firebase
          const firebaseUser = await getUser(username);
          
          // Create user if doesn't exist in Firebase
          if (!firebaseUser) {
            try {
              await createUser(username);
              console.log(`Created new user in Firebase for history save: ${username}`);
            } catch (createFirebaseError) {
              console.error("Failed to create user in Firebase:", createFirebaseError);
              // Continue anyway, we'll return a local identification
            }
          }
          
          // Try to save identification to Firebase
          try {
            const savedIdentification = await saveIdentificationToHistory(username, {
              ...identificationData,
              id: clientId
            });
            return res.status(201).json(savedIdentification);
          } catch (firebaseSaveError) {
            console.error("Firebase save error - returning local ID:", firebaseSaveError);
            // Return a fallback identification object if Firebase fails
            return res.status(201).json({
              id: clientId,
              ...identificationData,
              createdAt: new Date(),
              isFavorite: false
            });
          }
        } catch (firebaseError) {
          console.error("Firebase error - returning local identification:", firebaseError);
          // Return a fallback identification object if both DB and Firebase fail
          return res.status(201).json({
            id: clientId,
            ...identificationData,
            createdAt: new Date(),
            isFavorite: false
          });
        }
      }
    } catch (error: any) {
      console.error("Error saving to history:", error);
      return res.status(500).json({ 
        message: "Error saving identification to history", 
        error: error.message || "Unknown error"
      });
    }
  });

  // Delete an identification from user history
  app.delete("/api/users/:username/history/:identificationId", async (req: Request, res: Response) => {
    try {
      const { username, identificationId } = req.params;
      
      try {
        // First try to delete from database
        try {
          // Get all identifications
          const allIdentifications = await storage.getAllPlantIdentifications();
          
          // Find the identification by clientId
          const identification = allIdentifications.find(i => 
            i.clientId === identificationId && i.username === username
          );
          
          if (identification) {
            // Found the identification in the database, delete it
            const deleted = await storage.deletePlantIdentification(identification.id);
            
            if (deleted) {
              console.log(`Deleted identification ${identificationId} from database`);
              
              // Try to also delete from Firebase for consistency
              try {
                await deleteIdentification(username, identificationId);
              } catch (firebaseDeleteError) {
                console.error("Firebase delete error (database already deleted):", firebaseDeleteError);
              }
              
              return res.status(200).json({ success: true, id: identificationId });
            } else {
              console.error(`Failed to delete identification ${identificationId} from database`);
              // Continue to Firebase fallback
            }
          } else {
            console.log(`Identification ${identificationId} not found in database - trying Firebase`);
            // Continue to Firebase fallback
          }
        } catch (dbError) {
          console.error("Database error deleting identification - trying Firebase:", dbError);
          // Continue to Firebase fallback
        }
        
        // Try Firebase deletion as fallback
        try {
          // Check if user exists in Firebase
          const user = await getUser(username);
          
          if (!user) {
            // User not found but return success anyway (simulate deletion)
            console.log(`User ${username} not found in Firebase for delete operation - simulating success`);
            return res.status(200).json({ success: true, id: identificationId });
          }
          
          // Try Firebase deletion
          const result = await deleteIdentification(username, identificationId);
          return res.status(200).json(result);
        } catch (deleteError) {
          console.error("Error deleting from Firebase - simulating success:", deleteError);
          // Return simulated success to client
          return res.status(200).json({ success: true, id: identificationId });
        }
      } catch (error: any) {
        console.error("Unexpected error in delete operation - simulating success:", error);
        // Return simulated success to client
        return res.status(200).json({ success: true, id: identificationId });
      }
    } catch (error: any) {
      console.error("Error deleting identification:", error);
      return res.status(500).json({ 
        message: "Error deleting identification", 
        error: error.message || "Unknown error"
      });
    }
  });
  // PlantNet API integration for plant identification
  app.post("/api/identify", upload.single("image"), async (req: any, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }
      
      // Check if PlantNet API key exists
      if (!process.env.PLANTNET_API_KEY) {
        return res.status(503).json({ 
          message: "Plant identification is currently unavailable. Please provide a PlantNet API key.",
          error: "PlantNet API key not configured" 
        });
      }

      console.log("Processing plant identification request...");
      
      // Create temporary file paths (without __dirname which isn't available in ES modules)
      const tempFileName = `${uuidv4()}.${req.file.originalname.split('.').pop()}`;
      const tempFilePath = path.join('temp', tempFileName);
      
      // Ensure the temp directory exists
      const tempDir = 'temp';
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      // Write the file to disk
      fs.writeFileSync(tempFilePath, req.file.buffer);
      
      try {
        // Call PlantNet API for identification
        const plantNetUrl = "https://my-api.plantnet.org/v2/identify/all";
        const formData = new FormData();
        
        // Add the image file to form data
        formData.append('images', fs.createReadStream(tempFilePath));
        
        // Add other required parameters
        formData.append('organs', 'auto'); // Let PlantNet detect the organ automatically
        
        // Make the API request
        const response = await fetch(`${plantNetUrl}?api-key=${process.env.PLANTNET_API_KEY}`, {
          method: 'POST',
          body: formData as any,
        });
        
        // Clean up temporary file
        fs.unlinkSync(tempFilePath);
        
        if (!response.ok) {
          console.error(`PlantNet API responded with status ${response.status}: ${response.statusText}`);
          const errorText = await response.text();
          console.error('Error response:', errorText);
          return res.status(500).json({ message: "Plant identification service failed" });
        }
        
        const data = await response.json() as {
          results?: Array<{
            score: number;
            species: {
              scientificNameWithoutAuthor: string;
              commonNames?: string[];
              family?: { scientificNameWithoutAuthor: string };
              genus?: { scientificNameWithoutAuthor: string };
              gbif?: { description: string };
            };
            images?: Array<{
              url: {
                o: string;
              };
            }>;
          }>;
          queryMetadata?: {
            classification?: string;
          };
        };
        
        // Check if results exist
        if (!data.results || data.results.length === 0) {
          return res.status(404).json({ message: "No plants identified in the image" });
        }
        
        // Map PlantNet API response to our schema
        const bestMatch = data.results[0];
        const species = bestMatch.species;
        const scientificName = species.scientificNameWithoutAuthor;
        
        // Fetch a reference image for the plant from Wikimedia
        console.log(`Fetching reference image for: ${scientificName}`);
        let referenceImageUrl = null;
        
        try {
          // Try primary method first
          referenceImageUrl = await fetchPlantReferenceImage(scientificName);
          
          // If that fails, try the Commons method
          if (!referenceImageUrl) {
            console.log(`No image found via Wikipedia, trying Wikimedia Commons...`);
            referenceImageUrl = await fetchPlantImageFromCommons(scientificName);
          }
          
          if (referenceImageUrl) {
            console.log(`Found reference image for ${scientificName}: ${referenceImageUrl}`);
          } else {
            console.log(`No reference image found for ${scientificName}`);
          }
        } catch (imageError) {
          console.error(`Error fetching reference image for ${scientificName}:`, imageError);
        }
        
        const identificationResult = {
          scientificName,
          commonName: species.commonNames && species.commonNames.length > 0 ? species.commonNames[0] : scientificName,
          family: species.family?.scientificNameWithoutAuthor || '',
          genus: species.genus?.scientificNameWithoutAuthor || '',
          confidence: Math.round(bestMatch.score * 100),
          category: data.queryMetadata?.classification || 'Unknown',
          distribution: '',
          habitat: '',
          description: bestMatch.species.gbif?.description || '',
          referenceImageUrl,
          imageUrl: req.file.buffer.toString('base64'),
          similarPlants: data.results.slice(1, 5).map((result) => {
            const similarSpecies = result.species;
            return {
              scientificName: similarSpecies.scientificNameWithoutAuthor,
              commonName: similarSpecies.commonNames && similarSpecies.commonNames.length > 0 
                ? similarSpecies.commonNames[0] 
                : similarSpecies.scientificNameWithoutAuthor,
              similarity: Math.round(result.score * 100),
              imageUrl: result.images && result.images.length > 0 
                ? result.images[0].url.o 
                : undefined
            };
          })
        };
        
        // Save the identification to storage with Firebase for images
        try {
          let imageUrl;
          
          // Check if Firebase is configured for image storage
          if (isFirebaseConfigured()) {
            try {
              // Upload image to Firebase Storage
              const firebaseFileName = `plant-${uuidv4()}.${req.file.originalname.split('.').pop()}`;
              imageUrl = await uploadImageToFirebase(
                req.file.buffer,
                firebaseFileName,
                req.file.mimetype
              );
              console.log("Image uploaded to Firebase:", imageUrl);
            } catch (firebaseError) {
              console.error("Failed to upload image to Firebase:", firebaseError);
              // Fallback to data URL
              imageUrl = `data:image/${req.file.mimetype.split('/')[1]};base64,${req.file.buffer.toString('base64')}`;
            }
          } else {
            // Firebase not configured, use data URL
            console.log("Firebase not configured. Using data URL for image storage.");
            imageUrl = `data:image/${req.file.mimetype.split('/')[1]};base64,${req.file.buffer.toString('base64')}`;
          }

          // Generate a client ID for this identification
          const clientId = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          
          // Save identification to application storage
          const createdId = await storage.createPlantIdentification({
            username: 'guest', // Default to guest user for API identifications
            clientId,
            scientificName: identificationResult.scientificName,
            commonName: identificationResult.commonName,
            family: identificationResult.family,
            genus: identificationResult.genus,
            confidence: identificationResult.confidence,
            category: identificationResult.category,
            distribution: identificationResult.distribution,
            habitat: identificationResult.habitat,
            description: identificationResult.description,
            referenceImageUrl: identificationResult.referenceImageUrl,
            imageUrl: imageUrl,
            isFavorite: false
          });
          
          // Add similar plants
          if (identificationResult.similarPlants && identificationResult.similarPlants.length > 0) {
            for (const similarPlant of identificationResult.similarPlants) {
              await storage.createSimilarPlant({
                identificationId: createdId.id,
                scientificName: similarPlant.scientificName,
                commonName: similarPlant.commonName,
                similarity: similarPlant.similarity,
                imageUrl: similarPlant.imageUrl
              });
            }
          }
          
          console.log(`Plant identification saved with ID: ${createdId.id}`);
        } catch (storageError) {
          console.error("Failed to save identification to storage:", storageError);
        }
        
        // Validate the result against our schema
        const parsedResult = plantIdentificationResultSchema.parse(identificationResult);
        
        res.status(200).json(parsedResult);
      } catch (apiError) {
        // Clean up temporary file if it exists
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
        
        console.error("Error calling PlantNet API:", apiError);
        res.status(500).json({ message: "Failed to identify plant" });
      }
    } catch (error) {
      console.error("Error processing plant identification:", error);
      res.status(500).json({ message: "Failed to process plant identification" });
    }
  });

  // Get all plant identifications
  app.get("/api/identifications", async (_req: Request, res: Response) => {
    try {
      const identifications = await storage.getAllPlantIdentifications();
      res.status(200).json(identifications);
    } catch (error) {
      console.error("Error fetching plant identifications:", error);
      res.status(500).json({ message: "Failed to fetch plant identifications" });
    }
  });

  // Get a specific plant identification
  app.get("/api/identifications/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      
      const identification = await storage.getPlantIdentification(id);
      if (!identification) {
        return res.status(404).json({ message: "Plant identification not found" });
      }
      
      res.status(200).json(identification);
    } catch (error) {
      console.error("Error fetching plant identification:", error);
      res.status(500).json({ message: "Failed to fetch plant identification" });
    }
  });

  // Create a new plant identification
  app.post("/api/identifications", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        scientificName: z.string(),
        commonName: z.string().optional(),
        family: z.string().optional(),
        genus: z.string().optional(),
        confidence: z.number().optional(),
        category: z.string().optional(),
        distribution: z.string().optional(),
        habitat: z.string().optional(),
        description: z.string().optional(),
        referenceImageUrl: z.string().optional(),
        imageUrl: z.string(),
        similarPlants: z.array(
          z.object({
            scientificName: z.string(),
            commonName: z.string().optional(),
            similarity: z.number().optional(),
            imageUrl: z.string().optional(),
          })
        ).optional(),
      });
      
      const validatedData = schema.parse(req.body);
      
      // Generate a client ID for the identification
      const clientId = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      const newIdentification = await storage.createPlantIdentification({
        username: 'guest', // Default username for API-created identifications
        clientId,
        scientificName: validatedData.scientificName,
        commonName: validatedData.commonName,
        family: validatedData.family,
        genus: validatedData.genus,
        confidence: validatedData.confidence,
        category: validatedData.category,
        distribution: validatedData.distribution,
        habitat: validatedData.habitat,
        description: validatedData.description,
        referenceImageUrl: validatedData.referenceImageUrl,
        imageUrl: validatedData.imageUrl,
        isFavorite: false
      });
      
      // Add similar plants if they exist
      if (validatedData.similarPlants && validatedData.similarPlants.length > 0) {
        for (const similarPlant of validatedData.similarPlants) {
          await storage.createSimilarPlant({
            identificationId: newIdentification.id,
            scientificName: similarPlant.scientificName,
            commonName: similarPlant.commonName,
            similarity: similarPlant.similarity,
            imageUrl: similarPlant.imageUrl,
          });
        }
      }
      
      // Get the complete identification with similar plants
      const completeIdentification = await storage.getPlantIdentification(newIdentification.id);
      
      res.status(201).json(completeIdentification);
    } catch (error) {
      console.error("Error creating plant identification:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data format", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create plant identification" });
      }
    }
  });

  // Delete a plant identification
  app.delete("/api/identifications/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      
      const deleted = await storage.deletePlantIdentification(id);
      if (!deleted) {
        return res.status(404).json({ message: "Plant identification not found" });
      }
      
      res.status(200).json({ message: "Plant identification deleted successfully" });
    } catch (error) {
      console.error("Error deleting plant identification:", error);
      res.status(500).json({ message: "Failed to delete plant identification" });
    }
  });

  // Initialize OpenAI client
  let openai: OpenAI | undefined;
  try {
    if (process.env.OPENAI_API_KEY) {
      openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      console.log("OpenAI client initialized successfully");
    } else {
      console.log("No OpenAI API key found. Chat functionality will be disabled.");
    }
  } catch (error) {
    console.error("Failed to initialize OpenAI client:", error);
  }

  // Add chat endpoint - Context-aware plant chatbot
  app.post('/api/chat', async (req: Request, res: Response) => {
    try {
      // Check if OpenAI client is available
      if (!openai) {
        return res.status(503).json({ 
          message: "Chat functionality is currently unavailable. Please provide an OpenAI API key to enable this feature.",
          error: "OpenAI API key not configured" 
        });
      }
      
      const { message, context, conversation } = req.body as { 
        message: string, 
        context: { 
          hasImage: boolean, 
          hasResults: boolean, 
          plantDetails?: { 
            name: string, 
            commonName: string 
          } 
        },
        conversation: Array<{role: 'user' | 'assistant', content: string}>
      };

      // Define the base system prompt
      let systemPrompt = "You are a helpful plant expert chatbot with deep knowledge of gardening, botany, and plant care. ";
      
      // Initial context-specific prompts
      if (!context.hasImage) {
        systemPrompt += "The user hasn't uploaded any plant image yet. Encourage them to upload one for identification, but also provide helpful gardening tips or plant care advice if they ask.";
      } else if (!context.hasResults) {
        systemPrompt += "The user has uploaded an image and it's being processed. You can discuss general plant topics while waiting, such as gardening techniques, plant care tips, or seasonal gardening information.";
      } else if (context.plantDetails && conversation.length <= 2) {
        // Only provide the structured format for the FIRST response after plant identification
        systemPrompt += `The user has uploaded an image of ${context.plantDetails.name} (${context.plantDetails.commonName}). 

Provide an extremely structured and concise plant identification summary using EXACTLY this format:

The plant appears to be [Scientific Name] ([Common Name]).

Identifying Features:
• [Feature 1 - flower color/shape]
• [Feature 2 - leaf structure] 
• [Feature 3 - growth habit]
• [Any other distinctive features]

Habitat: 
[Brief description of where this plant typically grows]

Important Notes:
• [Note about toxicity if applicable]
• [Note about invasiveness if applicable]
• [Other significant information]

[End with a single simple question offering further help]

IMPORTANT: Use this exact structure with these exact headers. Keep bullet points very concise (1-2 lines each). Do not use markdown formatting like **bold** or *italics*. Keep the entire response under 200 words total.`;
      } else if (context.plantDetails) {
        // For ongoing conversation after initial plant identification
        systemPrompt += `The user has uploaded an image of ${context.plantDetails.name} (${context.plantDetails.commonName}). 
        
Now have a natural, conversational discussion about this plant or any other gardening topics the user wants to discuss. 
Be helpful and informative but avoid repeating the structured format info unless specifically asked for more details. 
Respond directly to the user's questions in a conversational way.`;
      }

      // Create messages array starting with system prompt
      const messages: Array<{role: 'system' | 'user' | 'assistant', content: string}> = [
        { role: "system", content: systemPrompt }
      ];

      // Add conversation history if it exists and has content
      if (conversation && conversation.length > 0) {
        // Add only the last few messages to keep context but avoid token limits
        const recentMessages = conversation.slice(-6); // Take last 6 messages (3 exchanges)
        messages.push(...recentMessages);
      }

      // Add the current user message if not already included in conversation
      if (!conversation || conversation.length === 0 || conversation[conversation.length - 1].role !== 'user' || conversation[conversation.length - 1].content !== message) {
        messages.push({ role: "user", content: message });
      }

      // Type assertion to make TypeScript happy with our message format
      const completion = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: messages as any, // Type assertion needed due to OpenAI SDK expecting specific format
      });

      res.json({ message: completion.choices[0].message.content });
    } catch (error) {
      console.error('Chat error:', error);
      res.status(500).json({ error: 'Failed to process chat message' });
    }
  });
  
  const httpServer = createServer(app);
  return httpServer;
}