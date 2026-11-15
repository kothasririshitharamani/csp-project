import { GoogleGenAI, Type, GenerateContentResponse, ThinkingLevel } from "@google/genai";

export type SupportedLanguage =
  | "en"
  | "te"
  | "ta"
  | "ml"
  | "hi"
  | "kn"
  | "bn"
  | "mr";

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

const LANGUAGE_INFO: Record<
  SupportedLanguage,
  { display: string; scriptNote: string }
> = {
  en: {
    display: "English",
    scriptNote: "simple, warm, everyday Indian English",
  },
  te: {
    display: "Telugu (తెలుగు)",
    scriptNote:
      "natural, everyday rural Telugu script (తెలుగు) spoken politely in Andhra Pradesh and Telangana. Use common farmer terms and write out or explain technical terms simply in Telugu script.",
  },
  ta: {
    display: "Tamil (தமிழ்)",
    scriptNote:
      "natural, everyday spoken-style Tamil script (தமிழ்) that farmers in Tamil Nadu understand easily.",
  },
  ml: {
    display: "Malayalam (മലയാളം)",
    scriptNote:
      "natural, everyday Malayalam script (മലയാളം) clear for farmers in Kerala.",
  },
  hi: {
    display: "Hindi (हिन्दी)",
    scriptNote:
      "simple, everyday rural Hindi script (हिन्दी) easy for farmers to hear and read.",
  },
  kn: {
    display: "Kannada (ಕನ್ನಡ)",
    scriptNote:
      "natural, everyday Kannada script (ಕನ್ನಡ) clear for farmers in Karnataka.",
  },
  bn: {
    display: "Bengali (বাংলা)",
    scriptNote:
      "simple, warm everyday Bengali script (বাংলা) easy for farmers in West Bengal.",
  },
  mr: {
    display: "Marathi (मराठी)",
    scriptNote:
      "natural, everyday Marathi script (मराठी) clear for farmers in Maharashtra.",
  },
};

function getLanguageDisplay(language: SupportedLanguage): string {
  return LANGUAGE_INFO[language]?.display || "English";
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

export function getGeminiClient(): GoogleGenAI {
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
  const langNote = LANGUAGE_INFO[input.language]?.scriptNote || langLabel;

  const symptomsList =
    input.symptoms && input.symptoms.length > 0
      ? input.symptoms.join(", ")
      : "None specified";

  const descriptionText = input.description?.trim() || "None provided";
  const farmContextStr = formatFarmContext(input.farmContext);

  const systemInstruction = `You are a practical, careful agricultural soil and water-management advisor helping smallholder farmers in India.
Respond strictly in ${langLabel} using ${langNote} so a first-time smartphone user can understand and listen easily. Avoid unnecessary mixing of other languages.
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
  const langInfo = LANGUAGE_INFO[input.language] || LANGUAGE_INFO.en;
  const farmContextStr = formatFarmContext(input.farmContext);

  const systemInstruction = `You are a respectful, practical agricultural water-management advisor for farmers in rural India.
STRICT LANGUAGE RULE:
- Respond ONLY in ${langInfo.display} using ${langInfo.scriptNote}.
- Do NOT mix English words unless there is no common local agricultural word, and if you must mention a technical concept, explain it in plain everyday words in ${langInfo.display}.
- Write clean, natural sentences with clear punctuation so your answer also sounds warm and natural when read aloud by text-to-speech.
- Do NOT use markdown asterisks (**) or hash symbols (#) or raw JSON.

FARMER GUIDANCE RULES:
1. Keep the explanation concise, practical, and easy to follow step by step (ideal for mobile reading and voice listening).
2. Focus on crop water needs, soil moisture checks, irrigation scheduling, water conservation, local weather precautions, and cyclone/flood/drought safety.
3. Use the farmer's saved profile details naturally when helpful, without inventing missing facts.
4. When key details are missing (such as crop age, soil wetness, or rainfall), ask 1 or 2 short clarifying questions in ${langInfo.display} at the end.
5. Never invent pesticide doses, fertilizer chemical quantities, or guaranteed yield claims; for crop diseases or exact chemical sprays, advise visiting the local Agriculture Officer / Krishi Vigyan Kendra (KVK).
${farmContextStr ? `\nFarmer's saved profile context: ${farmContextStr}` : ""}`;

  const recentHistory = (input.history || []).slice(-8);
  const formattedHistory = recentHistory
    .map(
      (turn) => `${turn.role === "user" ? "Farmer" : "Assistant"}: ${turn.text}`
    )
    .join("\n");

  const fullPrompt = formattedHistory
    ? `Previous conversation:\n${formattedHistory}\n\nFarmer's new question (reply in ${langInfo.display}): ${question}`
    : `Farmer's question (reply in ${langInfo.display}): ${question}`;

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
