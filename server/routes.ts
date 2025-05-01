import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import fs from "fs";
import { plantIdentificationResultSchema } from "@shared/schema";
import { z } from "zod";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
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
  // Identify plant from image
  app.post("/api/identify", upload.single("image"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }
      
      // TODO: This is a placeholder for the actual plant identification logic
      // In a real implementation, this would call the existing plant identification code
      
      // Mock response for demonstration purposes
      // This would be replaced with actual plant identification logic
      const mockIdentificationResult = {
        scientificName: "Monstera deliciosa",
        commonName: "Swiss Cheese Plant",
        family: "Araceae",
        genus: "Monstera",
        confidence: 96,
        category: "Household",
        distribution: "Central America, Mexico",
        habitat: "Tropical forests",
        description: "A species of flowering plant native to tropical forests of southern Mexico, south to Panama. It has been introduced to many tropical areas, and has become a mildly invasive species in Hawaii, Seychelles, Ascension Island and the Society Islands.",
        similarPlants: [
          {
            scientificName: "Monstera adansonii",
            commonName: "Monkey Mask",
            similarity: 85,
            imageUrl: "https://images.unsplash.com/photo-1682685795463-0674c065f315"
          },
          {
            scientificName: "Philodendron bipinnatifidum",
            commonName: "Split-leaf Philodendron",
            similarity: 72,
            imageUrl: "https://images.unsplash.com/photo-1637967886160-fd0748e0ac1f"
          },
          {
            scientificName: "Rhaphidophora tetrasperma",
            commonName: "Mini Monstera",
            similarity: 68,
            imageUrl: "https://images.unsplash.com/photo-1656513285042-385fbe3b2105"
          },
          {
            scientificName: "Epipremnum aureum",
            commonName: "Golden Pothos",
            similarity: 61,
            imageUrl: "https://images.unsplash.com/photo-1622554129902-aa7d3cafe862"
          }
        ]
      };
      
      // Validate the result against the schema
      const parsedResult = plantIdentificationResultSchema.parse(mockIdentificationResult);
      
      res.status(200).json(parsedResult);
    } catch (error) {
      console.error("Error processing plant identification:", error);
      res.status(500).json({ message: "Failed to process plant identification" });
    }
  });

  // Get all plant identifications
  app.get("/api/identifications", async (_req, res) => {
    try {
      const identifications = await storage.getAllPlantIdentifications();
      res.status(200).json(identifications);
    } catch (error) {
      console.error("Error fetching plant identifications:", error);
      res.status(500).json({ message: "Failed to fetch plant identifications" });
    }
  });

  // Get a specific plant identification
  app.get("/api/identifications/:id", async (req, res) => {
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
  app.post("/api/identifications", async (req, res) => {
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
  app.delete("/api/identifications/:id", async (req, res) => {
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

  const httpServer = createServer(app);
  return httpServer;
}
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Add this to your existing routes
app.post('/api/chat', async (req, res) => {
  try {
    const { message, context } = req.body;

    let systemPrompt = "You are a helpful plant expert chatbot. ";
    if (!context.hasImage) {
      systemPrompt += "The user hasn't uploaded any plant image yet. Encourage them to upload one for identification.";
    } else if (!context.hasResults) {
      systemPrompt += "The user has uploaded an image and it's being processed. You can discuss general plant topics while waiting.";
    } else {
      systemPrompt += `The user has uploaded an image of ${context.plantDetails.name} (${context.plantDetails.commonName}). You can provide specific information about this plant.`;
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
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
