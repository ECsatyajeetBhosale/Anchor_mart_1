import { z } from "zod";

/**
 * Validation schema for creating a category (POST add-category/).
 * Only `name` is required; `description` and `image` are optional stored strings.
 */
export const categoryAddSchema = z.object({
  name: z.string().trim().min(1, "Category name is required"),
  description: z.string().trim().default(""),
  // Stored image path/key (e.g. "category_images/example.jpg") — not a file upload.
  image: z.string().trim().default(""),
});

export type CategoryAddFormData = z.infer<typeof categoryAddSchema>;

/**
 * Validation schema for updating a category (PATCH update-category/{id}/).
 * Mirrors the add fields plus the `is_active` soft enable/disable flag.
 */
export const categoryUpdateSchema = categoryAddSchema.extend({
  is_active: z.boolean().default(true),
});

export type CategoryUpdateFormData = z.infer<typeof categoryUpdateSchema>;
