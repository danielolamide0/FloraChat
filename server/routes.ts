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
import { uploadImageToFirebase, isFirebaseConfigured } from './firebase';

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
        
        const data = await response.json();
        
        // Check if results exist
        if (!data.results || data.results.length === 0) {
          return res.status(404).json({ message: "No plants identified in the image" });
        }
        
        // Map PlantNet API response to our schema
        const bestMatch = data.results[0];
        const species = bestMatch.species;
        const identificationResult = {
          scientificName: species.scientificNameWithoutAuthor,
          commonName: species.commonNames && species.commonNames.length > 0 ? species.commonNames[0] : species.scientificNameWithoutAuthor,
          family: species.family?.scientificNameWithoutAuthor || '',
          genus: species.genus?.scientificNameWithoutAuthor || '',
          confidence: Math.round(bestMatch.score * 100),
          category: data.queryMetadata?.classification || 'Unknown',
          distribution: '',
          habitat: '',
          description: bestMatch.species.gbif?.description || 'No description available',
          imageUrl: req.file.buffer.toString('base64'),
          similarPlants: data.results.slice(1, 5).map((result: any) => {
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

          // Save identification to application storage
          const createdId = await storage.createPlantIdentification({
            scientificName: identificationResult.scientificName,
            commonName: identificationResult.commonName,
            family: identificationResult.family,
            genus: identificationResult.genus,
            confidence: identificationResult.confidence,
            category: identificationResult.category,
            distribution: identificationResult.distribution,
            habitat: identificationResult.habitat,
            description: identificationResult.description,
            imageUrl: imageUrl
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
      
      const newIdentification = await storage.createPlantIdentification({
        scientificName: validatedData.scientificName,
        commonName: validatedData.commonName,
        family: validatedData.family,
        genus: validatedData.genus,
        confidence: validatedData.confidence,
        category: validatedData.category,
        distribution: validatedData.distribution,
        habitat: validatedData.habitat,
        description: validatedData.description,
        imageUrl: validatedData.imageUrl,
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
      
      const { message, context } = req.body as { 
        message: string, 
        context: { 
          hasImage: boolean, 
          hasResults: boolean, 
          plantDetails?: { 
            name: string, 
            commonName: string 
          } 
        } 
      };

      let systemPrompt = "You are a helpful plant expert chatbot with deep knowledge of gardening, botany, and plant care. ";
      if (!context.hasImage) {
        systemPrompt += "The user hasn't uploaded any plant image yet. Encourage them to upload one for identification, but also provide helpful gardening tips or plant care advice if they ask.";
      } else if (!context.hasResults) {
        systemPrompt += "The user has uploaded an image and it's being processed. You can discuss general plant topics while waiting, such as gardening techniques, plant care tips, or seasonal gardening information.";
      } else if (context.plantDetails) {
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
      }

      const completion = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
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