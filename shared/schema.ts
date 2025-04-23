import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema from original file
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
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

export const insertSimilarPlantSchema = createInsertSchema(similarPlants).omit({
  id: true,
});

export type PlantIdentification = typeof plantIdentifications.$inferSelect;
export type InsertPlantIdentification = z.infer<typeof insertPlantIdentificationSchema>;
export type SimilarPlant = typeof similarPlants.$inferSelect;
export type InsertSimilarPlant = z.infer<typeof insertSimilarPlantSchema>;

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
