import { useCallback, useEffect, useState } from "react";
import { Language } from "../types/app";

export function useTextToSpeech() {
  const supported =
    typeof window !== "undefined" && "speechSynthesis" in window;
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (!supported) return;

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
      window.speechSynthesis.cancel();
    };
  }, [supported]);

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setActiveId(null);
  }, [supported]);

  const hasVoiceForLanguage = useCallback(
    (lang: Language): boolean => {
      if (!supported) return false;
      const list = voices.length > 0 ? voices : window.speechSynthesis.getVoices();
      if (list.length === 0) return true; // Voices may load lazily
      if (lang === "te") {
        return list.some(
          (v) =>
            v.lang.toLowerCase().startsWith("te") ||
            v.name.toLowerCase().includes("telugu")
        );
      }
      if (lang === "hi") {
        return list.some(
          (v) =>
            v.lang.toLowerCase().startsWith("hi") ||
            v.name.toLowerCase().includes("hindi")
        );
      }
      return list.some((v) => v.lang.toLowerCase().startsWith("en"));
    },
    [supported, voices]
  );

  const speak = useCallback(
    (text: string, preferredLanguage: Language, itemId = "default") => {
      if (!supported || !text.trim()) return;

      if (isSpeaking && activeId === itemId) {
        stop();
        return;
      }

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      const targetLang =
        preferredLanguage === "te"
          ? "te-IN"
          : preferredLanguage === "hi"
            ? "hi-IN"
            : "en-IN";
      utterance.lang = targetLang;
      utterance.rate = 0.95;

      const availableVoices =
        voices.length > 0 ? voices : window.speechSynthesis.getVoices();

      if (preferredLanguage === "te") {
        const teluguVoice = availableVoices.find(
          (v) =>
            v.lang.toLowerCase().startsWith("te") ||
            v.name.toLowerCase().includes("telugu")
        );
        if (teluguVoice) {
          utterance.voice = teluguVoice;
          utterance.lang = teluguVoice.lang;
        }
      } else if (preferredLanguage === "hi") {
        const hindiVoice = availableVoices.find(
          (v) =>
            v.lang.toLowerCase().startsWith("hi") ||
            v.name.toLowerCase().includes("hindi")
        );
        if (hindiVoice) {
          utterance.voice = hindiVoice;
          utterance.lang = hindiVoice.lang;
        }
      } else {
        const indianEnglishVoice =
          availableVoices.find((v) => v.lang.toLowerCase() === "en-in") ||
          availableVoices.find((v) => v.lang.toLowerCase().startsWith("en"));
        if (indianEnglishVoice) {
          utterance.voice = indianEnglishVoice;
        }
      }

      utterance.onstart = () => {
        setIsSpeaking(true);
        setActiveId(itemId);
      };
      utterance.onend = () => {
        setIsSpeaking(false);
        setActiveId(null);
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        setActiveId(null);
      };

      window.speechSynthesis.speak(utterance);
    },
    [supported, isSpeaking, activeId, voices, stop]
  );

  return {
    supported,
    isSpeaking,
    activeId,
    hasVoiceForLanguage,
    speak,
    stop,
  };
}
