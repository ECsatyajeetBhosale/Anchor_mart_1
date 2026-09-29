import { z } from "zod";

/** FAQ create/update. `is_active: false` saves a draft, hidden from sailors (BUG-057). */
export const faqSchema = z.object({
  faq_type: z.string().min(1, "Select a FAQ category"),
  question: z.string().trim().min(1, "Question is required"),
  answer: z.string().trim().min(1, "Answer is required"),
  is_active: z.boolean().default(true),
});

export type FaqFormData = z.infer<typeof faqSchema>;

/** Inputs on the FAQ form a 400 can be pinned to. */
export const FAQ_FIELDS = ["faq_type", "question", "answer"] as const;

// The loyalty-config schema that lived here went with the form it validated.
// Settings no longer edits loyalty values — Rewards & Coupons owns that, and its
// own `loyaltyConfig.schema.ts` validates the surviving editor.
