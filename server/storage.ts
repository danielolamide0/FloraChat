import { 
  users, 
  type User, 
  type InsertUser, 
  plantIdentifications, 
  type PlantIdentification, 
  type InsertPlantIdentification,
  similarPlants,
  type SimilarPlant,
  type InsertSimilarPlant
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
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private plantIdentifications: Map<number, PlantIdentification>;
  private similarPlants: Map<number, SimilarPlant>;
  private currentUserId: number;
  private currentPlantIdentificationId: number;
  private currentSimilarPlantId: number;

  constructor() {
    this.users = new Map();
    this.plantIdentifications = new Map();
    this.similarPlants = new Map();
    this.currentUserId = 1;
    this.currentPlantIdentificationId = 1;
    this.currentSimilarPlantId = 1;
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
    const user: User = { ...insertUser, id };
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
    const identification: PlantIdentification = { 
      ...insertIdentification, 
      id,
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
    const similarPlant: SimilarPlant = { ...insertSimilarPlant, id };
    this.similarPlants.set(id, similarPlant);
    return similarPlant;
  }
}

export const storage = new MemStorage();
