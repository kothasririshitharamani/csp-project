import { GoogleGenAI } from "@google/genai";
import { isGeminiConfigured, SupportedLanguage } from "./geminiService.ts";

export interface TtsSynthesisInput {
  text: string;
  language: SupportedLanguage;
  rate?: number;
}

export interface TtsSynthesisResult {
  audioBase64: string;
  mimeType: string;
  provider: "gemini-3.8-flash-lite-tts" | "google-cloud-tts";
  voiceName: string;
}

const LANGUAGE_SPEECH_STYLE: Record<
  SupportedLanguage,
  { style: string; cloudLangCode: string; cloudVoice: string; geminiVoice: string }
> = {
  te: {
    style:
      "Speak in clear, natural, warm rural Andhra Pradesh Telugu pronunciation at a calm, unhurried pace suitable for a farmer listening on a phone.",
    cloudLangCode: "te-IN",
    cloudVoice: "te-IN-Standard-A",
    geminiVoice: "Kore",
  },
  ta: {
    style:
      "Speak in clear, natural, warm everyday Tamil pronunciation at a calm, unhurried pace suitable for a farmer.",
    cloudLangCode: "ta-IN",
    cloudVoice: "ta-IN-Standard-A",
    geminiVoice: "Kore",
  },
  ml: {
    style:
      "Speak in clear, natural, warm everyday Malayalam pronunciation at a calm, unhurried pace suitable for a farmer.",
    cloudLangCode: "ml-IN",
    cloudVoice: "ml-IN-Standard-A",
    geminiVoice: "Kore",
  },
  hi: {
    style:
      "Speak in clear, natural, warm everyday Indian Hindi pronunciation at a calm, unhurried pace suitable for a farmer.",
    cloudLangCode: "hi-IN",
    cloudVoice: "hi-IN-Neural2-A",
    geminiVoice: "Kore",
  },
  kn: {
    style:
      "Speak in clear, natural, warm everyday Kannada pronunciation at a calm, unhurried pace suitable for a farmer.",
    cloudLangCode: "kn-IN",
    cloudVoice: "kn-IN-Standard-A",
    geminiVoice: "Kore",
  },
  bn: {
    style:
      "Speak in clear, natural, warm everyday Bengali pronunciation at a calm, unhurried pace suitable for a farmer.",
    cloudLangCode: "bn-IN",
    cloudVoice: "bn-IN-Standard-A",
    geminiVoice: "Kore",
  },
  mr: {
    style:
      "Speak in clear, natural, warm everyday Marathi pronunciation at a calm, unhurried pace suitable for a farmer.",
    cloudLangCode: "mr-IN",
    cloudVoice: "mr-IN-Standard-A",
    geminiVoice: "Kore",
  },
  en: {
    style:
      "Speak in clear, friendly, warm Indian English pronunciation at a calm, unhurried pace suitable for a farmer.",
    cloudLangCode: "en-IN",
    cloudVoice: "en-IN-Neural2-A",
    geminiVoice: "Kore",
  },
};

export function sanitizeTextForSpeech(raw: string, maxChars = 1600): string {
  const cleaned = raw
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s*#{1,6}\s*/gm, "")
    .replace(/^\s*[-*•]\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, ", ")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (cleaned.length <= maxChars) return cleaned;

  const sliced = cleaned.slice(0, maxChars);
  const lastBreak = Math.max(
    sliced.lastIndexOf(". "),
    sliced.lastIndexOf("। "),
    sliced.lastIndexOf("? "),
    sliced.lastIndexOf("! ")
  );
  if (lastBreak > maxChars * 0.5) {
    return sliced.slice(0, lastBreak + 1).trim();
  }
  return `${sliced.trim()}.`;
}

export function isGoogleCloudTtsConfigured(): boolean {
  const key = process.env.GOOGLE_CLOUD_TTS_API_KEY?.trim();
  return Boolean(key && key.length > 10);
}

export function isTtsConfigured(): boolean {
  return isGoogleCloudTtsConfigured() || isGeminiConfigured();
}

export function getTtsCapabilities() {
  const cloud = isGoogleCloudTtsConfigured();
  const gemini = isGeminiConfigured();
  return {
    configured: cloud || gemini,
    provider: cloud
      ? "google-cloud-tts"
      : gemini
        ? "gemini-3.8-flash-lite-tts"
        : "browser-only",
    neuralAvailable: cloud || gemini,
    supportedLanguages: ["en", "te", "ta", "ml", "hi", "kn", "bn", "mr"] as SupportedLanguage[],
  };
}

async function synthesizeWithGoogleCloudTts(
  text: string,
  language: SupportedLanguage,
  rate?: number
): Promise<TtsSynthesisResult> {
  const apiKey = process.env.GOOGLE_CLOUD_TTS_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GOOGLE_CLOUD_TTS_API_KEY not set");
  }
  const meta = LANGUAGE_SPEECH_STYLE[language] || LANGUAGE_SPEECH_STYLE.en;
  const speakingRate =
    typeof rate === "number" && Number.isFinite(rate)
      ? Math.min(1.3, Math.max(0.7, rate))
      : 0.92;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const resp = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          input: { text },
          voice: {
            languageCode: meta.cloudLangCode,
            name: meta.cloudVoice,
          },
          audioConfig: {
            audioEncoding: "MP3",
            speakingRate,
          },
        }),
      }
    );

    if (!resp.ok) {
      const errBody = await resp.text().catch(() => "");
      throw new Error(`Cloud TTS error (${resp.status}): ${errBody.slice(0, 120)}`);
    }

    const json = (await resp.json()) as { audioContent?: string };
    if (!json.audioContent) {
      throw new Error("Cloud TTS returned empty audio.");
    }

    return {
      audioBase64: json.audioContent,
      mimeType: "audio/mpeg",
      provider: "google-cloud-tts",
      voiceName: meta.cloudVoice,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function createTtsClient(apiVersion: "v1beta" | "v1alpha"): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    const err = new Error("GEMINI_NOT_CONFIGURED");
    (err as Error & { code?: string }).code = "GEMINI_NOT_CONFIGURED";
    throw err;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      apiVersion,
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

async function synthesizeWithGeminiTts(
  text: string,
  language: SupportedLanguage,
  rate?: number
): Promise<TtsSynthesisResult> {
  const aiBeta = createTtsClient("v1beta");
  const aiAlpha = createTtsClient("v1alpha");
  const meta = LANGUAGE_SPEECH_STYLE[language] || LANGUAGE_SPEECH_STYLE.en;
  const paceNote =
    typeof rate === "number" && rate < 0.9
      ? " Speak slowly and very clearly."
      : typeof rate === "number" && rate > 1.05
        ? " Speak at a brisk, natural pace."
        : "";

  const stylePrompt = `${meta.style}${paceNote}`;
  const attempts: Array<{
    label: string;
    run: () => ReturnType<typeof aiBeta.models.generateContent>;
  }> = [
    {
      label: "v1beta:gemini-3.8-flash-lite-tts+speechMetadata",
      run: () =>
        aiBeta.models.generateContent({
          model: "gemini-3.8-flash-lite-tts",
          contents: [
            {
              role: "user",
              parts: [
                {
                  text,
                  speechMetadata: { style: stylePrompt },
                } as unknown as { text: string },
              ],
            },
          ],
          config: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: meta.geminiVoice },
              },
            },
          },
        }),
    },
    {
      label: "v1alpha:gemini-3.8-flash-lite-tts+speechMetadata",
      run: () =>
        aiAlpha.models.generateContent({
          model: "gemini-3.8-flash-lite-tts",
          contents: [
            {
              role: "user",
              parts: [
                {
                  text,
                  speechMetadata: { style: stylePrompt },
                } as unknown as { text: string },
              ],
            },
          ],
          config: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: meta.geminiVoice },
              },
            },
          },
        }),
    },
    {
      label: "v1beta:gemini-3.8-flash-lite-tts+speechConfig",
      run: () =>
        aiBeta.models.generateContent({
          model: "gemini-3.8-flash-lite-tts",
          contents: [{ role: "user", parts: [{ text }] }],
          config: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: meta.geminiVoice },
              },
            },
          },
        }),
    },
    {
      label: "v1beta:gemini-2.5-flash-preview-tts",
      run: () =>
        aiBeta.models.generateContent({
          model: "gemini-2.5-flash-preview-tts",
          contents: [{ role: "user", parts: [{ text }] }],
          config: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: meta.geminiVoice },
              },
            },
          },
        }),
    },
  ];

  let lastError: unknown;
  const attemptNotes: string[] = [];
  for (const attempt of attempts) {
    try {
      const response = await attempt.run();
      const inlineData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      const data = inlineData?.data;
      if (data && typeof data === "string") {
        return {
          audioBase64: data,
          mimeType: inlineData.mimeType || "audio/wav",
          provider: "gemini-3.8-flash-lite-tts",
          voiceName: meta.geminiVoice,
        };
      }
      attemptNotes.push(`${attempt.label}: empty audio`);
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      attemptNotes.push(`${attempt.label}: ${msg.slice(0, 140)}`);
      console.warn(`[ttsService] Attempt ${attempt.label} failed:`, msg.slice(0, 180));
      if (msg.includes("PERMISSION_DENIED") || msg.includes("API_KEY_INVALID")) {
        throw err;
      }
    }
  }

  throw new Error(
    `Neural TTS failed (${attemptNotes.join(" | ")})`,
    { cause: lastError }
  );
}

export async function synthesizeSpeech(
  input: TtsSynthesisInput
): Promise<TtsSynthesisResult> {
  const cleanText = sanitizeTextForSpeech(input.text);
  if (!cleanText) {
    const err = new Error("No readable text provided for speech synthesis.");
    (err as Error & { status?: number }).status = 400;
    throw err;
  }

  if (isGoogleCloudTtsConfigured()) {
    try {
      return await synthesizeWithGoogleCloudTts(
        cleanText,
        input.language,
        input.rate
      );
    } catch (cloudErr) {
      console.warn(
        "[ttsService] Google Cloud TTS failed, attempting Gemini Neural TTS fallback:",
        cloudErr instanceof Error ? cloudErr.message : cloudErr
      );
    }
  }

  if (!isGeminiConfigured()) {
    const err = new Error("TTS_NOT_CONFIGURED");
    (err as Error & { code?: string; status?: number }).code = "TTS_NOT_CONFIGURED";
    (err as Error & { status?: number }).status = 503;
    throw err;
  }

  return await synthesizeWithGeminiTts(cleanText, input.language, input.rate);
}
