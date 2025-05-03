import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  lastLoginAt: timestamp("last_login_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Plant identification schemas
export const plantIdentifications = pgTable("plant_identifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  clientId: text("client_id").notNull(),  // For client-side sync
  username: text("username").notNull(),   // For easier lookups
  imageUrl: text("image_url").notNull(),
  scientificName: text("scientific_name").notNull(),
  commonName: text("common_name"),
  family: text("family"),
  genus: text("genus"),
  confidence: integer("confidence"),
  category: text("category"),
  distribution: text("distribution"),
  habitat: text("habitat"),
  description: text("description"),
  referenceImageUrl: text("reference_image_url"),
  isFavorite: boolean("is_favorite").default(false).notNull(),
  identifiedAt: timestamp("identified_at").defaultNow(),
});

export const insertPlantIdentificationSchema = createInsertSchema(plantIdentifications).omit({
  id: true,
  identifiedAt: true,
});

export const similarPlants = pgTable("similar_plants", {
  id: serial("id").primaryKey(),
  identificationId: integer("identification_id").references(() => plantIdentifications.id),
  scientificName: text("scientific_name").notNull(),
  commonName: text("common_name"),
  similarity: integer("similarity"),
  imageUrl: text("image_url"),
});

// Plant Images Table for storing binary image data
export const plantImages = pgTable("plant_images", {
  id: serial("id").primaryKey(),
  clientId: text("client_id").notNull(),  // For client-side sync
  identificationClientId: text("identification_client_id").notNull(),
  username: text("username").notNull(),   // For easier lookups
  imageType: text("image_type").notNull(), // 'uploaded' or 'reference'
  imageData: text("image_data").notNull(),  // base64 encoded image data
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSimilarPlantSchema = createInsertSchema(similarPlants).omit({
  id: true,
});

export const insertPlantImageSchema = createInsertSchema(plantImages).omit({
  id: true,
  createdAt: true,
});

export type PlantIdentification = typeof plantIdentifications.$inferSelect;
export type InsertPlantIdentification = z.infer<typeof insertPlantIdentificationSchema>;
export type SimilarPlant = typeof similarPlants.$inferSelect;
export type InsertSimilarPlant = z.infer<typeof insertSimilarPlantSchema>;
export type PlantImage = typeof plantImages.$inferSelect;
export type InsertPlantImage = z.infer<typeof insertPlantImageSchema>;

// Plant identification result schema for API
export const plantIdentificationResultSchema = z.object({
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
  similarPlants: z.array(
    z.object({
      scientificName: z.string(),
      commonName: z.string().optional(),
      similarity: z.number().optional(),
      imageUrl: z.string().optional(),
    })
  ).optional(),
});

export type PlantIdentificationResult = z.infer<typeof plantIdentificationResultSchema>;
