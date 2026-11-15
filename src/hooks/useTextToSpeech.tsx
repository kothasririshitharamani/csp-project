import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getTranslations } from "../i18n/translations";
import { Language, LANGUAGE_META } from "../types/app";
import { safeJsonFetch } from "../utils/apiClient";

export type TtsEngineMode = "auto" | "browser";

export interface TtsSettings {
  engine: TtsEngineMode;
  voiceUriByLang: Partial<Record<Language, string>>;
  rateByLang: Partial<Record<Language, number>>;
  volume: number;
}

export interface PlaybackInfo {
  mode: "neural" | "browser";
  voiceLabel: string;
  fellBackFromNeural?: boolean;
}

interface ServerTtsCapabilities {
  configured: boolean;
  provider: string;
  neuralAvailable: boolean;
}

interface TextToSpeechContextValue {
  browserSupported: boolean;
  neuralAvailable: boolean;
  serverProvider: string;
  isSpeaking: boolean;
  isLoadingAudio: boolean;
  activeId: string | null;
  voices: SpeechSynthesisVoice[];
  settings: TtsSettings;
  lastPlaybackInfo: PlaybackInfo | null;
  playbackError: string | null;
  updateSettings: (patch: Partial<TtsSettings>) => void;
  setRateForLanguage: (lang: Language, rate: number) => void;
  setVoiceForLanguage: (lang: Language, voiceUri: string) => void;
  getRateForLanguage: (lang: Language) => number;
  getVoicesForLanguage: (lang: Language) => SpeechSynthesisVoice[];
  getSelectedVoiceForLanguage: (lang: Language) => SpeechSynthesisVoice | null;
  hasBrowserVoiceForLanguage: (lang: Language) => boolean;
  speak: (
    text: string,
    preferredLanguage: Language,
    itemId?: string
  ) => Promise<void>;
  testVoice: (lang: Language) => Promise<void>;
  stop: () => void;
}

const STORAGE_KEY = "swm_tts_settings_v1";

const DEFAULT_SETTINGS: TtsSettings = {
  engine: "auto",
  voiceUriByLang: {},
  rateByLang: {},
  volume: 1.0,
};

function readStoredSettings(): TtsSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<TtsSettings>;
    return {
      engine: parsed.engine === "browser" ? "browser" : "auto",
      voiceUriByLang: parsed.voiceUriByLang || {},
      rateByLang: parsed.rateByLang || {},
      volume:
        typeof parsed.volume === "number" &&
        parsed.volume >= 0.2 &&
        parsed.volume <= 1
          ? parsed.volume
          : 1.0,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function cleanSpeechText(raw: string): string {
  return raw
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
}

function rankVoice(v: SpeechSynthesisVoice, lang: Language): number {
  const bcp47 = LANGUAGE_META[lang].bcp47.toLowerCase();
  const base = lang.toLowerCase();
  const vLang = (v.lang || "").toLowerCase();
  const vName = (v.name || "").toLowerCase();
  const englishName = LANGUAGE_META[lang].englishName.toLowerCase();

  let matches = false;
  if (vLang === bcp47 || vLang.startsWith(`${base}-`) || vLang === base) {
    matches = true;
  } else if (vName.includes(englishName)) {
    matches = true;
  }

  if (!matches) return -1;

  let score = 10;
  if (vLang === bcp47) score += 25;
  if (vName.includes("neural") || vName.includes("natural")) score += 40;
  if (vName.includes("google")) score += 30;
  if (vName.includes("online")) score += 20;
  if (vName.includes("microsoft") || vName.includes("samsung")) score += 10;
  if (!v.localService) score += 5; // Cloud/enhanced voices typically sound smoother than robotic offline eSpeak
  if (vName.includes("espeak")) score -= 20;
  return score;
}

const TextToSpeechContext = createContext<TextToSpeechContextValue | null>(
  null
);

export function TextToSpeechProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const browserSupported =
    typeof window !== "undefined" && "speechSynthesis" in window;

  const [settings, setSettings] = useState<TtsSettings>(readStoredSettings);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [neuralCaps, setNeuralCaps] = useState<ServerTtsCapabilities>({
    configured: false,
    provider: "browser-only",
    neuralAvailable: false,
  });

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [lastPlaybackInfo, setLastPlaybackInfo] = useState<PlaybackInfo | null>(
    null
  );
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const playbackSeqRef = useRef(0);

  // Save settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Ignore storage failure
    }
  }, [settings]);

  // Probe server Neural TTS capabilities
  useEffect(() => {
    let active = true;
    safeJsonFetch<ServerTtsCapabilities>("/api/tts/status")
      .then((res) => {
        if (!active) return;
        setNeuralCaps({
          configured: Boolean(res.configured),
          provider: res.provider || "browser-only",
          neuralAvailable: Boolean(res.neuralAvailable),
        });
      })
      .catch(() => {
        // Keep browser-only fallback state
      });
    return () => {
      active = false;
    };
  }, []);

  // Load browser SpeechSynthesis voices
  useEffect(() => {
    if (!browserSupported) return;
    const loadVoices = () => {
      const list = window.speechSynthesis.getVoices();
      if (list.length > 0) {
        setVoices(list);
      }
    };
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
    };
  }, [browserSupported]);

  const stop = useCallback(() => {
    playbackSeqRef.current += 1;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    if (audioElRef.current) {
      try {
        audioElRef.current.pause();
        audioElRef.current.src = "";
      } catch {
        // Ignore audio cleanup errors
      }
      audioElRef.current = null;
    }

    if (audioUrlRef.current) {
      try {
        URL.revokeObjectURL(audioUrlRef.current);
      } catch {
        // Ignore revoke errors
      }
      audioUrlRef.current = null;
    }

    if (browserSupported) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore cancel errors
      }
    }

    setIsLoadingAudio(false);
    setIsSpeaking(false);
    setActiveId(null);
  }, [browserSupported]);

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  const updateSettings = useCallback((patch: Partial<TtsSettings>) => {
    setSettings((prev) => ({
      ...prev,
      ...patch,
      voiceUriByLang: patch.voiceUriByLang ?? prev.voiceUriByLang,
      rateByLang: patch.rateByLang ?? prev.rateByLang,
    }));
  }, []);

  const setRateForLanguage = useCallback((lang: Language, rate: number) => {
    const clamped = Math.min(1.25, Math.max(0.7, Math.round(rate * 100) / 100));
    setSettings((prev) => ({
      ...prev,
      rateByLang: {
        ...prev.rateByLang,
        [lang]: clamped,
      },
    }));
  }, []);

  const setVoiceForLanguage = useCallback((lang: Language, voiceUri: string) => {
    setSettings((prev) => ({
      ...prev,
      voiceUriByLang: {
        ...prev.voiceUriByLang,
        [lang]: voiceUri,
      },
    }));
  }, []);

  const getRateForLanguage = useCallback(
    (lang: Language): number => {
      const saved = settings.rateByLang[lang];
      if (typeof saved === "number" && Number.isFinite(saved)) {
        return saved;
      }
      return LANGUAGE_META[lang].defaultTtsRate;
    },
    [settings.rateByLang]
  );

  const getVoicesForLanguage = useCallback(
    (lang: Language): SpeechSynthesisVoice[] => {
      if (!browserSupported) return [];
      const raw = voices.length > 0 ? voices : window.speechSynthesis.getVoices();
      return raw
        .map((v) => ({ voice: v, score: rankVoice(v, lang) }))
        .filter((x) => x.score >= 0)
        .sort((a, b) => b.score - a.score)
        .map((x) => x.voice);
    },
    [browserSupported, voices]
  );

  const getSelectedVoiceForLanguage = useCallback(
    (lang: Language): SpeechSynthesisVoice | null => {
      const candidates = getVoicesForLanguage(lang);
      if (candidates.length === 0) return null;
      const savedUri = settings.voiceUriByLang[lang];
      if (savedUri) {
        const match = candidates.find((v) => v.voiceURI === savedUri);
        if (match) return match;
      }
      return candidates[0];
    },
    [getVoicesForLanguage, settings.voiceUriByLang]
  );

  const hasBrowserVoiceForLanguage = useCallback(
    (lang: Language): boolean => {
      if (!browserSupported) return false;
      return getVoicesForLanguage(lang).length > 0;
    },
    [browserSupported, getVoicesForLanguage]
  );

  const speakViaBrowser = useCallback(
    (
      cleanText: string,
      preferredLanguage: Language,
      itemId: string,
      mySeq: number,
      fellBackFromNeural: boolean
    ) => {
      if (!browserSupported) {
        setIsLoadingAudio(false);
        setIsSpeaking(false);
        setActiveId(null);
        setPlaybackError(getTranslations(preferredLanguage).voice.ttsUnsupported);
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      const bcp47 = LANGUAGE_META[preferredLanguage].bcp47;
      const selectedVoice = getSelectedVoiceForLanguage(preferredLanguage);

      utterance.lang = selectedVoice?.lang || bcp47;
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
      utterance.rate = getRateForLanguage(preferredLanguage);
      utterance.volume = settings.volume;
      utterance.pitch = 1.0;

      utterance.onstart = () => {
        if (playbackSeqRef.current !== mySeq) return;
        setIsLoadingAudio(false);
        setIsSpeaking(true);
        setActiveId(itemId);
        setLastPlaybackInfo({
          mode: "browser",
          voiceLabel: selectedVoice
            ? selectedVoice.name
            : `${LANGUAGE_META[preferredLanguage].nativeName} (${bcp47})`,
          fellBackFromNeural,
        });
      };

      utterance.onend = () => {
        if (playbackSeqRef.current !== mySeq) return;
        setIsLoadingAudio(false);
        setIsSpeaking(false);
        setActiveId(null);
      };

      utterance.onerror = () => {
        if (playbackSeqRef.current !== mySeq) return;
        setIsLoadingAudio(false);
        setIsSpeaking(false);
        setActiveId(null);
      };

      window.speechSynthesis.speak(utterance);
    },
    [
      browserSupported,
      getSelectedVoiceForLanguage,
      getRateForLanguage,
      settings.volume,
    ]
  );

  const speak = useCallback(
    async (text: string, preferredLanguage: Language, itemId = "default") => {
      const cleaned = cleanSpeechText(text);
      if (!cleaned) return;

      // Toggle off if already speaking/loading the exact same item
      if ((isSpeaking || isLoadingAudio) && activeId === itemId) {
        stop();
        return;
      }

      stop();
      setPlaybackError(null);
      const mySeq = ++playbackSeqRef.current;
      setActiveId(itemId);

      const rate = getRateForLanguage(preferredLanguage);
      const shouldTryNeural =
        settings.engine === "auto" && neuralCaps.neuralAvailable;

      if (shouldTryNeural) {
        setIsLoadingAudio(true);
        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
          const res = await safeJsonFetch<{
            ok: boolean;
            audioBase64: string;
            mimeType: string;
            provider: string;
            voiceName: string;
          }>("/api/tts/speak", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
              text: cleaned,
              language: preferredLanguage,
              rate,
            }),
          });

          if (playbackSeqRef.current !== mySeq) return;

          const binStr = atob(res.audioBase64);
          const bytes = new Uint8Array(binStr.length);
          for (let i = 0; i < binStr.length; i++) {
            bytes[i] = binStr.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: res.mimeType || "audio/wav" });
          const objectUrl = URL.createObjectURL(blob);
          audioUrlRef.current = objectUrl;

          const audio = new Audio(objectUrl);
          audio.volume = settings.volume;
          audio.playbackRate =
            preferredLanguage === "te"
              ? Math.min(1.25, Math.max(0.75, rate / 0.92))
              : Math.min(1.25, Math.max(0.75, rate / 0.95));
          audioElRef.current = audio;

          audio.onended = () => {
            if (playbackSeqRef.current !== mySeq) return;
            stop();
          };
          audio.onerror = () => {
            if (playbackSeqRef.current !== mySeq) return;
            speakViaBrowser(cleaned, preferredLanguage, itemId, mySeq, true);
          };

          setIsLoadingAudio(false);
          setIsSpeaking(true);
          setLastPlaybackInfo({
            mode: "neural",
            voiceLabel: `${res.provider} · ${res.voiceName}`,
          });
          await audio.play();
          return;
        } catch (err) {
          if (playbackSeqRef.current !== mySeq) return;
          if ((err as Error)?.name === "AbortError") return;
          // Seamlessly fall back to browser SpeechSynthesis
          speakViaBrowser(cleaned, preferredLanguage, itemId, mySeq, true);
          return;
        }
      }

      speakViaBrowser(cleaned, preferredLanguage, itemId, mySeq, false);
    },
    [
      isSpeaking,
      isLoadingAudio,
      activeId,
      stop,
      getRateForLanguage,
      settings.engine,
      settings.volume,
      neuralCaps.neuralAvailable,
      speakViaBrowser,
    ]
  );

  const testVoice = useCallback(
    async (lang: Language) => {
      const sample = getTranslations(lang).voice.ttsTestSample;
      await speak(sample, lang, `voice-test-${lang}`);
    },
    [speak]
  );

  const value = useMemo<TextToSpeechContextValue>(
    () => ({
      browserSupported,
      neuralAvailable: neuralCaps.neuralAvailable,
      serverProvider: neuralCaps.provider,
      isSpeaking,
      isLoadingAudio,
      activeId,
      voices,
      settings,
      lastPlaybackInfo,
      playbackError,
      updateSettings,
      setRateForLanguage,
      setVoiceForLanguage,
      getRateForLanguage,
      getVoicesForLanguage,
      getSelectedVoiceForLanguage,
      hasBrowserVoiceForLanguage,
      speak,
      testVoice,
      stop,
    }),
    [
      browserSupported,
      neuralCaps,
      isSpeaking,
      isLoadingAudio,
      activeId,
      voices,
      settings,
      lastPlaybackInfo,
      playbackError,
      updateSettings,
      setRateForLanguage,
      setVoiceForLanguage,
      getRateForLanguage,
      getVoicesForLanguage,
      getSelectedVoiceForLanguage,
      hasBrowserVoiceForLanguage,
      speak,
      testVoice,
      stop,
    ]
  );

  return (
    <TextToSpeechContext.Provider value={value}>
      {children}
    </TextToSpeechContext.Provider>
  );
}

export function useTextToSpeech() {
  const ctx = useContext(TextToSpeechContext);
  if (!ctx) {
    throw new Error("useTextToSpeech must be used inside TextToSpeechProvider");
  }
  return ctx;
}
