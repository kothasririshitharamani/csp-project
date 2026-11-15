import { GoogleGenAI, Type, GenerateContentResponse, ThinkingLevel } from "@google/genai";

export type SupportedLanguage = "te" | "en" | "hi";

export interface SoilAnalysisInput {
  imageBase64: string;
  mimeType: string;
  description?: string;
  symptoms?: string[];
  language: SupportedLanguage;
  farmContext?: FarmerContextInfo;
}

export interface SoilAnalysisResult {
  visibleCharacteristics: string;
  moistureCondition: string;
  drainageAndRetentionSigns: string;
  concernsToCheck: string[];
  waterManagementPractices: string[];
  practicalNextSteps: string[];
  preliminaryDisclaimer: string;
}

export interface ChatHistoryTurn {
  role: "user" | "assistant";
  text: string;
}

export interface FarmerContextInfo {
  farmerName?: string;
  village?: string;
  mandal?: string;
  district?: string;
  state?: string;
  crop?: string;
  landArea?: string;
  soilType?: string;
  waterSource?: string;
  irrigationMethod?: string;
  waterAvailability?: string;
}

export interface FarmerFaqInput {
  message: string;
  history?: ChatHistoryTurn[];
  language: SupportedLanguage;
  farmContext?: FarmerContextInfo;
}

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const GEMINI_TIMEOUT_MS = 45000;

function getLanguageDisplay(language: SupportedLanguage): string {
  if (language === "te") return "Telugu (తెలుగు)";
  if (language === "hi") return "Hindi (हिन्दी)";
  return "English";
}

function stripMarkdownCodeFences(raw: string): string {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenceMatch && fenceMatch[1]) {
    return fenceMatch[1].trim();
  }
  return trimmed;
}

function formatFarmContext(fc?: FarmerContextInfo): string {
  if (!fc) return "";
  const parts: string[] = [];
  if (fc.farmerName) parts.push(`Farmer: ${fc.farmerName}`);
  const loc = [fc.village, fc.mandal, fc.district, fc.state]
    .filter((v) => v && v.trim())
    .join(", ");
  if (loc) parts.push(`Location: ${loc}`);
  if (fc.crop) parts.push(`Main crop: ${fc.crop}`);
  if (fc.landArea) parts.push(`Land area: ${fc.landArea}`);
  if (fc.soilType) parts.push(`Soil type: ${fc.soilType}`);
  if (fc.waterSource) parts.push(`Water source: ${fc.waterSource}`);
  if (fc.irrigationMethod) parts.push(`Irrigation method: ${fc.irrigationMethod}`);
  if (fc.waterAvailability) parts.push(`Water availability: ${fc.waterAvailability}`);
  return parts.join(" | ");
}

export function isGeminiConfigured(): boolean {
  const key = process.env.GEMINI_API_KEY?.trim();
  return Boolean(key && key !== "MY_GEMINI_API_KEY");
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    const err = new Error("GEMINI_NOT_CONFIGURED");
    (err as Error & { code?: string }).code = "GEMINI_NOT_CONFIGURED";
    throw err;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error("Request to Gemini AI timed out. Please try again.");
      (err as Error & { code?: string }).code = "GEMINI_TIMEOUT";
      reject(err);
    }, ms);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function analyzeSoilImage(
  input: SoilAnalysisInput
): Promise<SoilAnalysisResult> {
  const normalizedMime = input.mimeType.toLowerCase().trim();
  if (!ALLOWED_IMAGE_MIME_TYPES.has(normalizedMime)) {
    const err = new Error(
      "Unsupported image format. Please upload a JPG, PNG, or WEBP image."
    );
    (err as Error & { status?: number }).status = 400;
    throw err;
  }

  const cleanBase64 = input.imageBase64.replace(/^data:[^;]+;base64,/, "").trim();
  if (!cleanBase64) {
    const err = new Error("Image data is empty.");
    (err as Error & { status?: number }).status = 400;
    throw err;
  }

  const estimatedBytes = Math.floor((cleanBase64.length * 3) / 4);
  if (estimatedBytes > MAX_IMAGE_BYTES) {
    const err = new Error(
      "Image exceeds the 8 MB limit. Please upload a smaller photo."
    );
    (err as Error & { status?: number }).status = 400;
    throw err;
  }

  const ai = getGeminiClient();
  const langLabel = getLanguageDisplay(input.language);

  const symptomsList =
    input.symptoms && input.symptoms.length > 0
      ? input.symptoms.join(", ")
      : "None specified";

  const descriptionText = input.description?.trim() || "None provided";
  const farmContextStr = formatFarmContext(input.farmContext);

  const systemInstruction = `You are a practical, careful agricultural soil and water-management advisor helping smallholder farmers in India.
Respond strictly in ${langLabel} using simple, clear, everyday words that a first-time smartphone user can understand easily.
IMPORTANT ACCURACY RULES:
1. Never claim that a photograph can definitively determine soil pH, exact NPK values, micronutrient levels, or exact chemical composition.
2. Clearly state that visual observations from a photo are preliminary only.
3. Recommend laboratory soil testing at a nearby agricultural testing centre / Krishi Vigyan Kendra (KVK) for accurate pH and nutrient values.
4. If the uploaded image does not clearly show soil or field surface, state that honestly in visibleCharacteristics and advise uploading a clearer close-up soil photo in natural daylight.
5. Keep practical recommendations focused on moisture observation, drainage, mulching, organic matter, and safe water management.`;

  const promptText = `Analyze this soil/field image along with the farmer's notes.
Farmer description: ${descriptionText}
Observed symptoms: ${symptomsList}
${farmContextStr ? `Farmer profile context: ${farmContextStr}` : ""}
Output language: ${langLabel}

Return structured JSON covering:
- visibleCharacteristics: What can be seen in the soil colour, texture appearance, clods, cracks, or surface cover.
- moistureCondition: Preliminary visual impression of surface dryness, dampness, or waterlogging.
- drainageAndRetentionSigns: Visible signs suggesting fast drying, crusting, compaction, or poor drainage.
- concernsToCheck: 2 to 4 practical field checks the farmer should verify in person or through soil testing.
- waterManagementPractices: 3 to 4 actionable water-saving or drainage steps suited to what is visible.
- practicalNextSteps: 2 to 4 clear next steps including laboratory soil testing for accurate pH and nutrients.
- preliminaryDisclaimer: A clear reminder in ${langLabel} that photo-based analysis is preliminary and cannot measure pH or NPK, so lab testing is needed.`;

  const response: GenerateContentResponse = await withTimeout(
    ai.models.generateContent({
      model: "gemini-4-hydrogen",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: normalizedMime === "image/jpg" ? "image/jpeg" : normalizedMime,
              data: cleanBase64,
            },
          },
          { text: promptText },
        ],
      },
      config: {
        systemInstruction,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            visibleCharacteristics: {
              type: Type.STRING,
              description:
                "Visible colour, surface texture, cracks, or clods observed in the photo.",
            },
            moistureCondition: {
              type: Type.STRING,
              description:
                "Preliminary visual impression of surface moisture condition.",
            },
            drainageAndRetentionSigns: {
              type: Type.STRING,
              description:
                "Visible signs of water retention or poor drainage.",
            },
            concernsToCheck: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description:
                "Concerns requiring physical field inspection or soil testing.",
            },
            waterManagementPractices: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description:
                "Recommended practical water-management practices.",
            },
            practicalNextSteps: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description:
                "Practical next steps including lab soil testing.",
            },
            preliminaryDisclaimer: {
              type: Type.STRING,
              description:
                "Clear disclaimer that photo analysis cannot determine exact pH or NPK.",
            },
          },
          required: [
            "visibleCharacteristics",
            "moistureCondition",
            "drainageAndRetentionSigns",
            "concernsToCheck",
            "waterManagementPractices",
            "practicalNextSteps",
            "preliminaryDisclaimer",
          ],
        },
      },
    }),
    GEMINI_TIMEOUT_MS
  );

  const rawText = response.text?.trim();
  if (!rawText) {
    console.error("[geminiService] Soil analysis returned empty response text.");
    throw new Error("The AI did not return any soil observations. Please retry.");
  }

  const cleanedJson = stripMarkdownCodeFences(rawText);
  try {
    const parsed = JSON.parse(cleanedJson) as SoilAnalysisResult;
    if (!parsed || typeof parsed.visibleCharacteristics !== "string") {
      throw new Error("Incomplete structured fields.");
    }
    return parsed;
  } catch (err) {
    console.error(
      "[geminiService] Failed to parse structured soil JSON:",
      err instanceof Error ? err.message : err,
      "Preview:",
      cleanedJson.slice(0, 200)
    );
    throw new Error(
      "Could not format soil analysis clearly. Please tap Retry to try again."
    );
  }
}

export async function askFarmerAssistant(
  input: FarmerFaqInput
): Promise<{ reply: string }> {
  const question = input.message.trim();
  if (!question) {
    const err = new Error("Question cannot be empty.");
    (err as Error & { status?: number }).status = 400;
    throw err;
  }
  if (question.length > 2000) {
    const err = new Error(
      "Question is too long. Please keep it under 2000 characters."
    );
    (err as Error & { status?: number }).status = 400;
    throw err;
  }

  const ai = getGeminiClient();
  const langLabel = getLanguageDisplay(input.language);
  const farmContextStr = formatFarmContext(input.farmContext);

  const systemInstruction = `You are a helpful, practical agricultural water-management assistant for farmers, especially in Andhra Pradesh and rural India.
LANGUAGE RULE: Always reply strictly in ${langLabel}.
- If Telugu is selected, reply in clear, everyday Telugu script (తెలుగు).
- If Hindi is selected, reply in clear, everyday Hindi script (हिन्दी).
- If English is selected, reply in simple, clear English.
GUIDANCE RULES:
1. Keep language simple and avoid dense technical jargon. Explain any necessary term simply.
2. Give practical, step-by-step advice suited for smallholder farmers.
3. Focus on crop water requirements, irrigation methods, water conservation, soil moisture, weather-based farming decisions, and flood/drought/cyclone preparedness.
4. Use the farmer's saved profile details naturally when relevant (without inventing extra details).
5. If important details are missing (such as crop stage, soil type, or local rainfall), ask 1–2 short follow-up questions so you can give more relevant guidance.
6. Never state uncertain estimates as guaranteed facts. Avoid inventing exact chemical dosages or unverified pesticide prescriptions.
7. For serious crop diseases, pest outbreaks, or fertilizer dosages, advise consulting the local Agriculture Officer (Mandal Agricultural Officer / RBK / KVK scientist).
8. Respond in plain readable text (do NOT output raw JSON).
${farmContextStr ? `\nFarmer's saved profile context: ${farmContextStr}` : ""}`;

  const recentHistory = (input.history || []).slice(-8);
  const formattedHistory = recentHistory
    .map(
      (turn) => `${turn.role === "user" ? "Farmer" : "Assistant"}: ${turn.text}`
    )
    .join("\n");

  const fullPrompt = formattedHistory
    ? `Previous conversation:\n${formattedHistory}\n\nFarmer's new question: ${question}`
    : question;

  const response: GenerateContentResponse = await withTimeout(
    ai.models.generateContent({
      model: "gemini-4-hydrogen",
      contents: fullPrompt,
      config: {
        systemInstruction,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    }),
    GEMINI_TIMEOUT_MS
  );

  const reply = response.text?.trim();
  if (!reply) {
    console.error("[geminiService] FAQ assistant returned empty response text.");
    throw new Error("No answer received from AI assistant. Please retry.");
  }

  return { reply };
}
