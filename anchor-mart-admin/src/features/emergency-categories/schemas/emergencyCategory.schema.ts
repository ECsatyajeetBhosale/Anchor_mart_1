import { z } from "zod";

/**
 * Validation schema for creating an emergency category
 * (POST emergency-spares/categories/add/).
 * Only `name` is required; `description` and `image` are optional stored strings.
 */
export const emergencyCategoryAddSchema = z.object({
  name: z.string().trim().min(1, "Category name is required"),
  description: z.string().trim().default(""),
  // Stored image path/key (e.g. "category_images/example.jpg") — not a file upload.
  image: z.string().trim().default(""),
});

export type EmergencyCategoryAddFormData = z.infer<typeof emergencyCategoryAddSchema>;

/**
 * Validation schema for updating an emergency category
 * (PATCH emergency-spares/categories/{id}/update/).
 * Mirrors the add fields plus the `is_active` soft enable/disable flag.
 */
export const emergencyCategoryUpdateSchema = emergencyCategoryAddSchema.extend({
  is_active: z.boolean().default(true),
});

export type EmergencyCategoryUpdateFormData = z.infer<typeof emergencyCategoryUpdateSchema>;
