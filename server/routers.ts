import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

import { sanitizeDetectedProductName, normalizeDetectedMrp } from "../shared/product-scan-rules.js";
import { buildCatalogSearchPrompt, catalogSearchSystemPrompt, fallbackCatalogMatches, sanitizeCatalogSearchMatches } from "../shared/catalog-search.js";
import { parseLlmJsonObject } from "../shared/llm-response.js";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { storageGetSignedUrl, storagePut } from "./storage";
import { transcribeAudio } from "./_core/voiceTranscription";

const catalogProduct = z.object({ id: z.string(), name: z.string(), category: z.string(), price: z.number(), unit: z.string() });
const smartBasketInput = z.object({ request: z.string().min(3).max(350), products: z.array(catalogProduct).min(1).max(80) });
const productScanInput = z.object({ imageDataUrl: z.string().startsWith("data:image/").max(7500000) });
const aiCatalogSearchInput = z.object({ query: z.string().min(1).max(120), products: z.array(catalogProduct).min(1).max(80) });
const productPhotoUploadInput = z.object({ imageDataUrl: z.string().startsWith("data:image/").max(7500000) });
const creditDocumentInput = z.object({ side: z.enum(["front", "back"]), imageDataUrl: z.string().startsWith("data:image/").max(7500000) });
const festivalBasketInput = z.object({ occasion: z.string().min(2).max(80), ownerNote: z.string().max(350), products: z.array(catalogProduct).min(1).max(80) });
const voiceSearchInput = z.object({ audioDataUrl: z.string().startsWith("data:audio/").max(6500000) });

function scanCategory(value: unknown) {
  const categories = ["Staples", "Pulses", "Dairy", "Fresh", "Snacks", "Home care", "Personal care", "Beverages"];
  return typeof value === "string" && categories.includes(value) ? value : "Staples";
}

export const appRouter = router({
  system: systemRouter,
  auth: router({ me: publicProcedure.query((opts) => opts.ctx.user), logout: publicProcedure.mutation(({ ctx }) => { const cookieOptions = getSessionCookieOptions(ctx.req); ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 }); return { success: true } as const; }) }),
  niv: router({
    aiSmartBasket: publicProcedure.input(smartBasketInput).mutation(async ({ input }) => {
      const productIndex = new Map(input.products.map((product) => [product.id, product]));
      const fallback = { message: "मैंने आपके nearby essentials के आधार पर एक practical basket बनाया है। आप quantities checkout से बदल सकते हैं।", items: input.products.slice(0, 4).map((product, index) => ({ id: product.id, quantity: index === 0 ? 2 : 1, reason: "Regular household essential" })) };
      try {
        const catalog = input.products.map((product) => `${product.id} | ${product.name} | ${product.category} | ₹${product.price} | ${product.unit}`).join("\n");
        const response = await invokeLLM({ model: "gpt-5-mini", messages: [{ role: "system", content: "You are NIV Kirana's helpful grocery basket planner. Reply in simple Hindi or Hinglish. You may only recommend products listed in the supplied catalog. Never make medical, financial, or diet claims. Return valid JSON only with exactly two keys: message (string) and items (array of objects with id, quantity integer 1-6, and reason string). Choose 2-7 practical products. Keep the message under 220 characters." }, { role: "user", content: `Customer request: ${input.request}\n\nAvailable catalog:\n${catalog}` }] });
        const parsed = parseLlmJsonObject(response?.choices?.[0]?.message?.content);
        if (!parsed) return fallback;
        if (!Array.isArray(parsed.items)) return fallback;
        const items = parsed.items.flatMap((item) => { if (!item || typeof item !== "object") return []; const candidate = item as { id?: unknown; quantity?: unknown; reason?: unknown }; const id = typeof candidate.id === "string" ? candidate.id : ""; if (!productIndex.has(id)) return []; return [{ id, quantity: Math.max(1, Math.min(6, Math.round(Number(candidate.quantity) || 1))), reason: typeof candidate.reason === "string" ? candidate.reason.slice(0, 100) : "Useful for your list" }]; });
        return { message: typeof parsed.message === "string" ? parsed.message.slice(0, 220) : fallback.message, items: items.length ? items : fallback.items };
      } catch (error) { console.warn("[NIV AI] Smart basket fallback", error); return fallback; }
    }),
    aiFestivalBasket: publicProcedure.input(festivalBasketInput).mutation(async ({ input }) => {
      const productIndex = new Map(input.products.map((product) => [product.id, product]));
      const fallbackItems = input.products.filter((product) => ["tea", "sugar", "biscuits", "milk"].includes(product.id)).slice(0, 4).map((product, index) => ({ productId: product.id, quantity: index === 2 ? 2 : 1, reason: "Festival household pick" }));
      const fallback = { title: `${input.occasion} Smart Basket`, description: "NIV Kirana के available products से owner-curated festival basket। Items और quantity बदलकर खरीदें।", items: fallbackItems.length ? fallbackItems : input.products.slice(0, 3).map((product) => ({ productId: product.id, quantity: 1, reason: "Festival pick" })) };
      try {
        const catalog = input.products.map((product) => `${product.id} | ${product.name} | ${product.category} | ₹${product.price} | ${product.unit}`).join("\n");
        const response = await invokeLLM({ model: "gpt-5-mini", messages: [{ role: "system", content: "You create editable festival grocery baskets for an Indian kirana store. Only select products whose id exists in the supplied catalog. Do not invent products. Return JSON only with title (string), description (short Hindi/Hinglish string), and items (array of productId, quantity integer 1-6, reason string). Select 3-7 practical festival products based on the occasion and owner note. Never include medical, financial, or alcohol claims." }, { role: "user", content: `Festival: ${input.occasion}\nOwner note: ${input.ownerNote || "Suggest practical popular products"}\n\nCatalog:\n${catalog}` }] });
        const parsed = parseLlmJsonObject(response?.choices?.[0]?.message?.content);
        if (!parsed) return fallback;
        if (!Array.isArray(parsed.items)) return fallback;
        const items = parsed.items.flatMap((item) => { if (!item || typeof item !== "object") return []; const candidate = item as { productId?: unknown; quantity?: unknown; reason?: unknown }; const productId = typeof candidate.productId === "string" ? candidate.productId : ""; if (!productIndex.has(productId)) return []; return [{ productId, quantity: Math.max(1, Math.min(6, Math.round(Number(candidate.quantity) || 1))), reason: typeof candidate.reason === "string" ? candidate.reason.slice(0, 100) : "Festival pick" }]; });
        return { title: typeof parsed.title === "string" && parsed.title.trim() ? parsed.title.trim().slice(0, 80) : fallback.title, description: typeof parsed.description === "string" && parsed.description.trim() ? parsed.description.trim().slice(0, 180) : fallback.description, items: items.length ? items : fallback.items };
      } catch (error) { console.warn("[NIV AI] Festival basket fallback", error); return fallback; }
    }),
    scanProductPhoto: publicProcedure.input(productScanInput).mutation(async ({ input }) => {
      const base64 = input.imageDataUrl.split(",")[1];
      if (!base64) throw new Error("Product image data is missing");
      const { url: imageUrl } = await storagePut(`niv-products/${crypto.randomUUID()}.jpg`, Buffer.from(base64, "base64"), "image/jpeg");
      const fallback = { productName: "Product name needs review", mrp: null as number | null, category: "Staples", unit: "1 pack", imageUrl, note: "Image saved. Please enter the product details manually if scan text is unclear." };
      try {
        const response = await invokeLLM({ model: "gpt-5-mini", messages: [{ role: "system", content: "You are NIV Kirana's careful product-label reader for Indian grocery and household packets. Identify the customer-facing product name, including the brand and the generic product when visible (for example, 'Activated Charcoal Detox Facewash', 'Rajma', or 'Aashirvaad Atta'). Read the printed MRP, not a discount or selling price. Read the pack size and preserve the unit such as g, kg, ml, L, or pack. Use null or 'Product name needs review' only when the label is genuinely unreadable; never guess. Return JSON only: productName (string), mrp (number or null), category (one of Staples, Pulses, Dairy, Fresh, Snacks, Home care, Personal care, Beverages), unit (string), note (short Hindi/Hinglish string telling the owner to verify the result)." }, { role: "user", content: [{ type: "text", text: "Read every clearly visible label on this packet. Prefer the largest product title over background objects or shop text. MRP may be written as MRP Rs, M.R.P., or ₹; return only the numeric value. If a field is not clear, use null for mrp and 'Product name needs review' for productName." }, { type: "image_url", image_url: { url: input.imageDataUrl, detail: "high" } }] }] });
        const parsed = parseLlmJsonObject(response?.choices?.[0]?.message?.content);
        if (!parsed) return fallback;
        const productName = parsed.productName ?? parsed.product_name ?? parsed.name ?? parsed.title;
        const mrp = parsed.mrp ?? parsed.mrpOnPacket ?? parsed.mrp_on_packet;
        const category = parsed.category;
        const unit = parsed.unit ?? parsed.packSize ?? parsed.pack_size ?? parsed.size;
        const note = parsed.note;
        return { productName: sanitizeDetectedProductName(productName), mrp: normalizeDetectedMrp(mrp), category: scanCategory(category), unit: typeof unit === "string" && unit.trim() ? unit.trim().slice(0, 30) : "1 pack", imageUrl, note: typeof note === "string" ? note.slice(0, 160) : "AI result को save करने से पहले verify करें।" };
      } catch (error) { console.warn("[NIV AI] Product scan fallback", error); return fallback; }
    }),
    aiSearchCatalog: publicProcedure.input(aiCatalogSearchInput).mutation(async ({ input }) => {
      const fallbackMatches = fallbackCatalogMatches(input.products, input.query);
      try {
        const response = await invokeLLM({ model: "gpt-5-mini", messages: [{ role: "system", content: catalogSearchSystemPrompt() }, { role: "user", content: buildCatalogSearchPrompt(input.query, input.products) }] });
        const parsed = parseLlmJsonObject(response?.choices?.[0]?.message?.content);
        if (!parsed) return { matches: fallbackMatches, usedAI: false };
        const matches = sanitizeCatalogSearchMatches(input.products, parsed.matches);
        return { matches: matches.length ? matches : fallbackMatches, usedAI: matches.length > 0 };
      } catch (error) {
        console.warn("[NIV AI] Catalog search fallback", error);
        return { matches: fallbackMatches, usedAI: false };
      }
    }),
    uploadProductPhoto: publicProcedure.input(productPhotoUploadInput).mutation(async ({ input }) => {
      const [header, base64] = input.imageDataUrl.split(",", 2);
      if (!base64) throw new Error("Product image data is missing");
      const mimeType = header.match(/^data:(image\/(?:jpeg|png|webp));base64$/i)?.[1]?.toLowerCase();
      if (!mimeType) throw new Error("Unsupported product image format");
      const extension = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
      const { url: imageUrl } = await storagePut(`niv-products/${crypto.randomUUID()}.${extension}`, Buffer.from(base64, "base64"), mimeType);
      return { imageUrl };
    }),
    transcribeSearchVoice: publicProcedure.input(voiceSearchInput).mutation(async ({ input }) => {
      const comma = input.audioDataUrl.indexOf(",");
      const header = comma > -1 ? input.audioDataUrl.slice(0, comma) : "data:audio/m4a;base64";
      const base64 = comma > -1 ? input.audioDataUrl.slice(comma + 1) : "";
      if (!base64) throw new Error("Voice search audio is missing");
      const mimeType = header.match(/^data:([^;]+)/)?.[1] ?? "audio/m4a";
      const { key } = await storagePut(`niv-search/${crypto.randomUUID()}.m4a`, Buffer.from(base64, "base64"), mimeType);
      const audioUrl = await storageGetSignedUrl(key);
      const result = await transcribeAudio({ audioUrl, language: "hi", prompt: "Transcribe only the grocery product or category words spoken by the customer. Keep Hindi or Hinglish product names exactly as heard." });
      if ("error" in result) throw new Error(result.error);
      return { text: result.text.trim(), language: result.language };
    }),
    uploadCreditDocument: publicProcedure.input(creditDocumentInput).mutation(async ({ input }) => {
      const base64 = input.imageDataUrl.includes(",") ? input.imageDataUrl.split(",")[1] : input.imageDataUrl;
      if (!base64) throw new Error("Credit document image is missing");
      const fileName = `${input.side}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.jpg`;
      const buffer = Buffer.from(base64, "base64");
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "https://ztvikgbtmsvlqlwotzkf.supabase.co";
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0dmlrZ2J0bXN2bHFsd290emtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwOTA5NjIsImV4cCI6MjEwNTY2Njk2Mn0.w_qadkmJXF8F34l_c83TKt19-KaxvkYta97WsL2qHmM";
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { error } = await supabase.storage
        .from("credit-documents")
        .upload(fileName, buffer, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (error) {
        throw new Error(`Supabase upload failed: ${error.message}`);
      }

      const { data: urlData } = supabase.storage
        .from("credit-documents")
        .getPublicUrl(fileName);

      return { imageUrl: urlData.publicUrl };
    }),
  }),
});

export type AppRouter = typeof appRouter;
