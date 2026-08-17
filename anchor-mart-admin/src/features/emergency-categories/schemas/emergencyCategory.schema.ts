import { z } from "zod";

/**
 * Both taxonomies store images under the same `category_images/` prefix, and the
 * prefix is enforced server-side on add and update. Because `upload_to` is inert
 * on this path, that validator is the only real control — mirroring it here just
 * turns a round-trip 400 into an inline message.
 */
const CATEGORY_IMAGE_PREFIX = "category_images/";

const categoryImageSchema = z
  .string()
  .trim()
  .default("")
  .refine((v) => v === "" || v.startsWith(CATEGORY_IMAGE_PREFIX), {
    message: `Image path must start with "${CATEGORY_IMAGE_PREFIX}"`,
  });

/**
 * Validation schema for creating an emergency category
 * (POST emergency-spares/categories/add/).
 *
 * **Only `name` is required.** `is_active` is deliberately absent — it is not on
 * the create serializer, so a category is always born active and a switch here
 * would be a control that does nothing.
 */
export const emergencyCategoryAddSchema = z.object({
  name: z.string().trim().min(1, "Category name is required"),
  description: z.string().trim().default(""),
  // Stored image path/key (e.g. "category_images/example.jpg") — not a file upload.
  image: categoryImageSchema,
  /**
   * Parent category id; `""` means top-level and is sent as `null`. The real
   * rules (same scope, not itself, no cycle, parent not soft-deleted) are
   * enforced by the backend — the picker only narrows the options.
   */
  parent: z.string().default(""),
});

export type EmergencyCategoryAddFormData = z.infer<typeof emergencyCategoryAddSchema>;

/**
 * Validation schema for updating an emergency category
 * (PATCH emergency-spares/categories/{id}/update/).
 * The add fields plus `is_active`, which only exists on update.
 */
export const emergencyCategoryUpdateSchema = emergencyCategoryAddSchema.extend({
  is_active: z.boolean().default(true),
});

export type EmergencyCategoryUpdateFormData = z.infer<typeof emergencyCategoryUpdateSchema>;
