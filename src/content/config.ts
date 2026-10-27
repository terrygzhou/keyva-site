import { defineCollection, z } from "astro:content";

const services = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string(),
    /** One-paragraph pitch shown on cards. */
    pitch: z.string(),
    /** Capabilities listed on the service detail page. */
    capabilities: z.array(z.string()),
    outcomes: z.array(z.string()).default([]),
    /** Internal URL of a matching case study, if any. */
    relatedCaseStudy: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

const caseStudyCollection = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    client: z.string().optional(),
    industry: z.string(),
    summary: z.string(),
    challenge: z.string(),
    approach: z.string(),
    results: z.array(z.string()),
    /** e.g. ["Cloud","Security"] */
    tags: z.array(z.string()).default([]),
    date: z.coerce.date(),
    draft: z.boolean().default(false),
  }),
});

const insights = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    author: z.string().default("KeyVA"),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { services, "case-studies": caseStudyCollection, insights };
