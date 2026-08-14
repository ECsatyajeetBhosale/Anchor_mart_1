import { z } from "zod";

/** FAQ create/update — the API accepts exactly these three fields. */
export const faqSchema = z.object({
  faq_type: z.string().min(1, "Select a FAQ category"),
  question: z.string().trim().min(1, "Question is required"),
  answer: z.string().trim().min(1, "Answer is required"),
});

export type FaqFormData = z.infer<typeof faqSchema>;

// The loyalty-config schema that lived here went with the form it validated.
// Settings no longer edits loyalty values — Rewards & Coupons owns that, and its
// own `loyaltyConfig.schema.ts` validates the surviving editor.
