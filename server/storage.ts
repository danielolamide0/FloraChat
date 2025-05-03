import { 
  users, 
  type User, 
  type InsertUser, 
  plantIdentifications, 
  type PlantIdentification, 
  type InsertPlantIdentification,
  similarPlants,
  type SimilarPlant,
  type InsertSimilarPlant,
  plantImages,
  type PlantImage,
  type InsertPlantImage
} from "@shared/schema";

// Modify the interface with CRUD methods
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Plant identification methods
  getPlantIdentification(id: number): Promise<(PlantIdentification & { similarPlants?: SimilarPlant[] }) | undefined>;
  getAllPlantIdentifications(): Promise<(PlantIdentification & { similarPlants?: SimilarPlant[] })[]>;
  createPlantIdentification(identification: InsertPlantIdentification): Promise<PlantIdentification>;
  deletePlantIdentification(id: number): Promise<boolean>;

  // Similar plant methods
  getSimilarPlantsByIdentificationId(identificationId: number): Promise<SimilarPlant[]>;
  createSimilarPlant(similarPlant: InsertSimilarPlant): Promise<SimilarPlant>;
  
  // Plant images methods
  getPlantImagesByIdentificationId(identificationClientId: string): Promise<PlantImage[]>;
  savePlantImage(insertImage: InsertPlantImage): Promise<PlantImage>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private plantIdentifications: Map<number, PlantIdentification>;
  private similarPlants: Map<number, SimilarPlant>;
  private plantImages: Map<string, PlantImage>;
  private currentUserId: number;
  private currentPlantIdentificationId: number;
  private currentSimilarPlantId: number;
  private currentPlantImageId: number;

  constructor() {
    this.users = new Map();
    this.plantIdentifications = new Map();
    this.similarPlants = new Map();
    this.plantImages = new Map();
    this.currentUserId = 1;
    this.currentPlantIdentificationId = 1;
    this.currentSimilarPlantId = 1;
    this.currentPlantImageId = 1;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      ...insertUser, 
      id,
      lastLoginAt: new Date(),
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  // Plant identification methods
  async getPlantIdentification(id: number): Promise<(PlantIdentification & { similarPlants?: SimilarPlant[] }) | undefined> {
    const identification = this.plantIdentifications.get(id);
    if (!identification) return undefined;

    const similarPlants = await this.getSimilarPlantsByIdentificationId(id);
    return {
      ...identification,
      similarPlants: similarPlants.length > 0 ? similarPlants : undefined
    };
  }

  async getAllPlantIdentifications(): Promise<(PlantIdentification & { similarPlants?: SimilarPlant[] })[]> {
    const identifications = Array.from(this.plantIdentifications.values());
    
    // Sort by identifiedAt in descending order (newest first)
    identifications.sort((a, b) => {
      const dateA = new Date(a.identifiedAt || 0).getTime();
      const dateB = new Date(b.identifiedAt || 0).getTime();
      return dateB - dateA;
    });

    // Add similar plants to each identification
    const results = await Promise.all(
      identifications.map(async (identification) => {
        const similarPlants = await this.getSimilarPlantsByIdentificationId(identification.id);
        return {
          ...identification,
          similarPlants: similarPlants.length > 0 ? similarPlants : undefined
        };
      })
    );

    return results;
  }

  async createPlantIdentification(insertIdentification: InsertPlantIdentification): Promise<PlantIdentification> {
    const id = this.currentPlantIdentificationId++;
    
    // Ensure all required fields are present with appropriate defaults
    const identification: PlantIdentification = { 
      id,
      username: insertIdentification.username,
      userId: insertIdentification.userId || null,
      clientId: insertIdentification.clientId,
      imageUrl: insertIdentification.imageUrl,
      scientificName: insertIdentification.scientificName,
      commonName: insertIdentification.commonName || null,
      family: insertIdentification.family || null,
      genus: insertIdentification.genus || null,
      confidence: insertIdentification.confidence || null,
      category: insertIdentification.category || null,
      distribution: insertIdentification.distribution || null,
      habitat: insertIdentification.habitat || null,
      description: insertIdentification.description || null,
      referenceImageUrl: insertIdentification.referenceImageUrl || null,
      isFavorite: insertIdentification.isFavorite ?? false,
      identifiedAt: new Date()
    };
    
    this.plantIdentifications.set(id, identification);
    return identification;
  }

  async deletePlantIdentification(id: number): Promise<boolean> {
    // Delete all similar plants first
    const similarPlants = await this.getSimilarPlantsByIdentificationId(id);
    for (const plant of similarPlants) {
      this.similarPlants.delete(plant.id);
    }

    // Delete the identification
    return this.plantIdentifications.delete(id);
  }

  // Similar plant methods
  async getSimilarPlantsByIdentificationId(identificationId: number): Promise<SimilarPlant[]> {
    return Array.from(this.similarPlants.values()).filter(
      (plant) => plant.identificationId === identificationId
    );
  }

  async createSimilarPlant(insertSimilarPlant: InsertSimilarPlant): Promise<SimilarPlant> {
    const id = this.currentSimilarPlantId++;
    
    // Ensure required fields are not undefined
    const similarPlant: SimilarPlant = { 
      ...insertSimilarPlant, 
      id,
      imageUrl: insertSimilarPlant.imageUrl || null,
      commonName: insertSimilarPlant.commonName || null,
      identificationId: insertSimilarPlant.identificationId || null,
      similarity: insertSimilarPlant.similarity || null
    };
    
    this.similarPlants.set(id, similarPlant);
    return similarPlant;
  }

  // Plant images methods
  async getPlantImagesByIdentificationId(identificationClientId: string): Promise<PlantImage[]> {
    return Array.from(this.plantImages.values()).filter(
      (image) => image.identificationClientId === identificationClientId
    );
  }
  
  async savePlantImage(insertImage: InsertPlantImage): Promise<PlantImage> {
    const id = this.currentPlantImageId++;
    const image: PlantImage = { 
      ...insertImage, 
      id,
      createdAt: new Date()
    };
    this.plantImages.set(image.clientId, image);
    return image;
  }
}

import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Plant identification methods
  async getPlantIdentification(id: number): Promise<(PlantIdentification & { similarPlants?: SimilarPlant[] }) | undefined> {
    const [identification] = await db.select().from(plantIdentifications).where(eq(plantIdentifications.id, id));
    
    if (!identification) return undefined;
    
    const relatedPlants = await this.getSimilarPlantsByIdentificationId(id);
    
    return {
      ...identification,
      similarPlants: relatedPlants.length > 0 ? relatedPlants : undefined
    };
  }

  async getAllPlantIdentifications(): Promise<(PlantIdentification & { similarPlants?: SimilarPlant[] })[]> {
    const identifications = await db.select()
      .from(plantIdentifications)
      .orderBy(desc(plantIdentifications.identifiedAt));
    
    // Add similar plants to each identification
    const results = await Promise.all(
      identifications.map(async (identification) => {
        const similarPlants = await this.getSimilarPlantsByIdentificationId(identification.id);
        return {
          ...identification,
          similarPlants: similarPlants.length > 0 ? similarPlants : undefined
        };
      })
    );

    return results;
  }

  async createPlantIdentification(insertIdentification: InsertPlantIdentification): Promise<PlantIdentification> {
    const [identification] = await db.insert(plantIdentifications)
      .values(insertIdentification)
      .returning();
    
    return identification;
  }

  async deletePlantIdentification(id: number): Promise<boolean> {
    // Delete all related similar plants first
    await db.delete(similarPlants).where(eq(similarPlants.identificationId, id));
    
    // Delete the identification
    const result = await db.delete(plantIdentifications).where(eq(plantIdentifications.id, id)).returning();
    return result.length > 0;
  }

  // Similar plant methods
  async getSimilarPlantsByIdentificationId(identificationId: number): Promise<SimilarPlant[]> {
    return db.select()
      .from(similarPlants)
      .where(eq(similarPlants.identificationId, identificationId));
  }

  async createSimilarPlant(insertSimilarPlant: InsertSimilarPlant): Promise<SimilarPlant> {
    const [similarPlant] = await db.insert(similarPlants)
      .values(insertSimilarPlant)
      .returning();
    
    return similarPlant;
  }

  // Plant images methods
  async getPlantImagesByIdentificationId(identificationClientId: string): Promise<PlantImage[]> {
    return db.select()
      .from(plantImages)
      .where(eq(plantImages.identificationClientId, identificationClientId));
  }
  
  async savePlantImage(insertImage: InsertPlantImage): Promise<PlantImage> {
    const [image] = await db.insert(plantImages)
      .values(insertImage)
      .returning();
    
    return image;
  }
}

// Use the DB storage implementation
export const storage = new DatabaseStorage();
