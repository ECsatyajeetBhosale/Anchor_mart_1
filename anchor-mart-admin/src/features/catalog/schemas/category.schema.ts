import { z } from "zod";

/**
 * The stored-path prefix `category_images/` is enforced server-side on both add
 * and update, and — because `upload_to` is inert on this path — that validator is
 * the *only* control. Mirroring it here turns a round-trip 400 into an inline
 * message; it is not the safety boundary.
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
 * Validation schema for creating a category (POST add-category/).
 *
 * **Only `name` is required** — `description` and `image` are optional, and
 * `image` is additionally nullable/blankable server-side. `is_active` is
 * deliberately absent: it is not on the create serializer, so every category is
 * born active and offering the switch here would be a control that does nothing.
 */
export const categoryAddSchema = z.object({
  name: z.string().trim().min(1, "Category name is required"),
  description: z.string().trim().default(""),
  // Stored image path/key (e.g. "category_images/example.jpg") — not a file upload.
  image: categoryImageSchema,
  /**
   * Parent category id; `""` means top-level and is sent as `null`.
   *
   * The real rules — same scope, not itself, no cycle, parent not soft-deleted —
   * are enforced by the backend and are the guarantee. The picker narrows the
   * options as a convenience only.
   */
  parent: z.string().default(""),
});

export type CategoryAddFormData = z.infer<typeof categoryAddSchema>;

/**
 * Validation schema for updating a category (PATCH update-category/{id}/).
 * The add fields plus `is_active`, which only exists on update.
 */
export const categoryUpdateSchema = categoryAddSchema.extend({
  is_active: z.boolean().default(true),
});

export type CategoryUpdateFormData = z.infer<typeof categoryUpdateSchema>;
