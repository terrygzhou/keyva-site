import { defineCollection, z } from "astro:content";

const products = defineCollection({
  type: "content",
  schema: z.object({
    /** Short label, e.g. "SB-STD" */
    series: z.string(),
    /** Chinese product name */
    nameZh: z.string(),
    /** English product name */
    nameEn: z.string(),
    /** One-line description (ZH) */
    descZh: z.string(),
    /** One-line description (EN) */
    descEn: z.string(),
    /** Spec range, e.g. '3/4"–6" · 600/1500/3100/4500 Lb' */
    size: z.string(),
    /** Materials offered */
    materials: z.array(z.string()),
    /** Connection types */
    connection: z.string(),
    /** Key technical features (ZH) */
    featuresZh: z.array(z.string()),
    /** Key technical features (EN) */
    featuresEn: z.array(z.string()),
    /** Application scenarios (ZH) */
    appsZh: z.array(z.string()),
    /** Application scenarios (EN) */
    appsEn: z.array(z.string()),
    /** Image path under public/ (optional) */
    image: z.string().optional(),
    /** Whether ASME certified */
    asmeCertified: z.boolean().default(false),
    /** Whether it's a PCV (power-actuated control valve) */
    isPCV: z.boolean().default(false),
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
    /** e.g. ["Power","SZorb"] */
    tags: z.array(z.string()).default([]),
    /** Year the project was completed */
    year: z.coerce.number(),
    draft: z.boolean().default(false),
  }),
});

const insights = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    author: z.string().default("KEYVA"),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = {
  products,
  "case-studies": caseStudyCollection,
  insights,
};
