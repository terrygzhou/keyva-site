# KEYVA Marketing & Sales IA — Design Spec

Date: 2026-10-27
Status: proposed
Repo: keyva-site (Astro 4 hybrid, Cloudflare Pages, Tailwind 3, Vitest)

## 1. Purpose

Restructure keyva-site's information architecture so that every visitor path
converts: industry-aware landing, selectable product specs, a working
enquiry funnel with lead routing, and lead-magnet downloads. This spec
covers **P0 + P1** of the agreed priority list:

- **P0** — enquiry form backend + industry/condition prefill
- **P1** — industry solution pages (power / petrochem / mining), product
  pages with condition tagging + cross-sell + gated sample download

Out of scope (P2, future spec): resource centre beyond gated samples,
case-study quantification, full EN translation of all pages, on-site
search, analytics event wiring.

## 2. Language scope

**zh-CN + EN as separate routes.** All P0/P1 pages exist in both languages:

- `/<page>` → Chinese (default, mirrors keyva.cn audience)
- `/en/<page>` → English (serves NY / Birmingham OSSCs)

Shared components and layouts take a `lang` prop; copy lives in
`src/content/locales/{zh,en}.ts` as flat key→string maps. Product/industry
content collections carry both `title` / `titleEn` fields. Nav renders a
language switcher that preserves the current section under the other
locale.

## 3. Target site map (P0+P1)

```
/                              首页 (zh)
/en                            首页 (en)

/industries/power              电力行业解决方案
/industries/petrochemical      石化行业解决方案
/industries/mining             矿山行业解决方案
/en/industries/...             (EN mirrors)

/products                      产品总览 (筛选: 工况/规格/压力等级/连接方式)
/products/[slug]  ×7           产品详情: SB-STD, A-STD, sb-pcv-rb-pcv,
                               tb, rb, rb-3p, sb
/en/products/...               (EN mirrors)

/why-keyva                     核心技术 + 认证资质 + 客户
/why-keyva/cases/...           (P1 minimal: case cards link here; full
                               case pages are P2)
/en/why-keyva

/contact                       在线询价 (核心转化页)
/en/contact
```

Routing note: `/products/[slug]` remains the product detail route; the
industry routes are static pages generated from the `industries` content
collection.

## 4. Data model (content collections)

New collections in `src/content/config.ts`:

### `products`
```ts
z.object({
  slug: z.string(),                    // "sb-std", "a-std", ...
  title: z.string(),                   // zh display name
  titleEn: z.string(),
  subtitle: z.string(),                // e.g. 方孔直通疏水球阀
  subtitleEn: z.string(),
  specs: z.object({
    sizes: z.string(),                 // '3/4"–6"'
    pressureClasses: z.string(),       // "600–4500Lb"
    materials: z.string(),
    connection: z.string(),
  }),
  features: z.array(z.string()),       // 技术特点
  featuresEn: z.array(z.string()),
  conditions: z.array(z.string()),     // 工况标签, shared vocabulary (below)
  applications: z.array(z.string()),   // 应用场景长文
  relatedProducts: z.array(z.string()).default([]),  // cross-sell slugs
  sampleFile: z.string().optional(),   // public path under /samples/
  image: z.string(),
  draft: z.boolean().default(false),
})
```

### `industries`
```ts
z.object({
  slug: z.string(),                    // power / petrochemical / mining
  title: z.string(),
  titleEn: z.string(),
  pain: z.string(),                    // 工况痛点一段话
  painEn: z.string(),
  recommendedProducts: z.array(z.string()),  // product slugs
  parameterNotes: z.array(z.string()),
  caseHints: z.array(z.string()).default([]), // P2 case links land here
})
```

### `conditions` vocabulary
A single source of truth (exported const in `src/content/conditions.ts`,
consumed by both locales and the enquiry form):
```
锅炉定排·连排 | 汽包排汽 | 汽机疏水 | 过热器排汽 | 减温水隔离 |
EH油隔离 | 锅炉/过热器动力泄放 | 高压差易冲刷工况 | 矿浆输送
```
Each condition maps to `{ en: string, products: string[], industry: 'power'|'petrochemical'|'mining' }`.
Product pages, industry pages, and the enquiry form's condition multi-select
all derive from this list — no free-text condition entry.

Existing `services` / `case-studies` / `insights` collections stay as-is
until P2.

## 5. Enquiry form (P0 core)

### 5.1 Form fields (`/contact`, `/en/contact`)

| Field | Type | Required | Notes |
|---|---|---|---|
| industry | radio: 电力/石化/矿山 | ✔ | routes lead to matching sales line |
| conditions | multi-select chips (from `conditions.ts`) | ✔ min 1 | prefillable via query |
| sizeRange | select (3/4"–12" ranges) | optional | |
| pressureClass | select (150–4500Lb) | optional | |
| quantity / project timeline / project name | text | optional | |
| company | text | ✔ | |
| name | text | ✔ | |
| email | email | ✔ | |
| phone | text | ✔ | |

Prefill: `/contact?industry=power&cond=汽机疏水` populates industry +
conditions via a small client script; product/industry pages link here
with prefill.

### 5.2 Backend (upgrading the `api/contact.ts` stub)

- Validate: industry in enum, ≥1 condition (known slug), email regex,
  phone non-empty, name/company ≥2 chars. 400 + field-level `errors`
  JSON otherwise.
- Persist lead to **Durable Object** `LeadStore` (KV alternative rejected:
  no structured queries). DO methods: `add(lead)`, `list({industry, limit})`.
- On `add`: email notification via **Resend API** (env `RESEND_API_KEY`,
  `ENQUIRY_CC`) to the matching sales line (电力 → sales-power, 石化/矿山
  → sales-industrial; fallback single inbox). Email is fire-and-forget
  with retry-once; a failed email does not fail the 200 response —
  lead is persisted regardless.
- Response: `{ ok: true, id }`. Client shows success panel with secondary
  CTAs (选型指南 / 案例) — page still renders if JS fails: form falls
  back to `mailto:` link.
- PII hygiene (existing convention kept): worker logs only redacted
  receipts, never raw PII.
- Rate limit: per-IP 5 submissions / 10 min via `x-forwarded-for`
  heuristic + DO counter; 429 beyond.

### 5.3 Success + no-JS
Success panel is DOM-swap after fetch. Without JS the same form POSTs to
`mailto:sales@keyva.cn` with pre-structured subject. Both paths reachable.

## 6. Product detail page (P1)

- Condition **chips** (from `conditions.ts`, filtered to this product's
  `conditions`). Clicking a chip → `/contact?cond=<slug>&product=<slug>`
  ("按此工况询价" button appears with the chip highlighted).
- **Cross-sell band**: "相近系列" cards from `relatedProducts`, each with
  its own "询价" link.
- **Gated sample download**: "下载样本 PDF" opens a modal collecting
  name/company/email/phone + product interest; submits to a second DO
  endpoint `api/lead-magnet` (same Durable Object, `kind: 'magnet'`),
  then reveals the `/samples/<slug>.pdf` link. One click to download
  after gating; the gate email feeds the MQL pool.
- Spec table unchanged in content, re-presented (same data as live site).

## 7. Industry solution pages (P1)

Fixed structure per industry page (batch-producible from `industries`
collection):
1. 工况痛点 (`pain`, 1 paragraph)
2. 推荐产品组合 — cards from `recommendedProducts`
3. 工况参数对照 — `parameterNotes` table
4. 案例提示 — `caseHints` (P2: link out to case pages)
5. CTA band → prefill `/contact?industry=<slug>`

## 8. Home page changes

- Hero copy from brand slogan to **promise copy** (zh):
  「为电力·石化·矿山苛刻工况提供最高 4500lb 金属密封球阀 — 服务中石化、华能等集团」
  EN mirror.
- 3 industry cards (电力/石化/矿山) → `/industries/<slug>`.
- Proof band: client logo wall + certification marks + stat numbers
  (4500lb / 7 系列 / 3 OSSC / 4 认证).
- Persistent top-nav CTA "在线询价" on every page (Header component).

## 9. Component / file map

```
src/
  layouts/BaseLayout.astro        + lang prop, section switching
  components/Header.astro        nav + lang switcher + CTA
  components/Footer.astro        unchanged content, lang-aware
  components/ConditionChips.astro
  components/CrossSellBand.astro
  components/GatedDownload.astro
  components/EnquiryForm.astro   (used on /contact; prefilled via query)
  content/
    conditions.ts                single-source condition vocabulary
    locales/zh.ts, locales/en.ts copy maps
    products/*.md                ×7 (port specs from keyva.cn)
    industries/*.md             ×3
    (PDFs ship from public/samples/<slug>.pdf, referenced by sampleFile)
  pages/
    index.astro, about.astro     kept, copy-rewritten
    contact.astro, en/contact.astro
    industries/index.astro, [slug].astro
    products/index.astro, [slug].astro
    en/... mirrors (generate via shared .ts page builders to avoid 2× copy)
  pages/api/contact.ts           upgraded (above)
  pages/api/lead-magnet.ts       DO endpoint for gated downloads
  db/lead-store.ts               Durable Object (wrangler durable_bindings in wrangler.jsonc)
tests/
  contact-api.test.ts            validation, routing, rate limit (mock DO)
  content.test.ts                extended: products/industries/conditions contracts
```

i18n strategy: EN pages built from the same content + locale maps; a
small `pages/en/*.astro` wrapper passes `lang="en"`. No i18n framework.

## 10. Error handling & UX

- Form: inline field errors from 400 JSON; global error state with
  "or call 021-50896336" fallback.
- Gated download: DO down → show direct phone CTA instead of failing.
- Prefill missing/unknown cond → silently ignore, never block submit.

## 11. Testing

- Vitest: API route contract tests (400 cases, 200 shape, DO mocked);
  content collection contract tests extended to new schemas; conditions
  vocabulary consistency test (every product `conditions` slug exists in
  `conditions.ts`, every industry `recommendedProducts` slug exists).
- `astro check` passes; build passes with `output: "hybrid"` + DO
  binding present.

## 12. Success criteria

- Enquiry submission works end-to-end (DO write + Resend email) — P0.
- From any product or industry page, ≤2 clicks to a prefilled enquiry form.
- All 7 product pages + 3 industry pages live in zh and en.
- Zero broken prefill links; all condition chips resolve.

## 13. Open questions (accepted defaults)

- Durable Object chosen over KV (needs structured list/query later).
  If Resend unavailable at deploy, email step degrades gracefully.
- EN scope = P0/P1 pages only; product spec text EN translations are
  provided in `titleEn`/`featuresEn` fields, longer copy can follow in P2.
