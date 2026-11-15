import { useCallback, useEffect, useRef, useState } from "react";
import { Language } from "../types/app";

export type SpeechState =
  | "ready"
  | "recording"
  | "processing"
  | "permission_denied"
  | "unsupported"
  | "error";

interface SpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface SpeechRecognitionResultEvent {
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [altIndex: number]: { transcript: string };
    };
  };
}

function getSpeechRecognitionConstructor():
  | (new () => SpeechRecognitionInstance)
  | null {
  if (typeof window === "undefined") return null;
  const win = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  };
  return win.SpeechRecognition || win.webkitSpeechRecognition || null;
}

function getRecognitionLocale(language: Language): string {
  if (language === "te") return "te-IN";
  if (language === "hi") return "hi-IN";
  return "en-IN";
}

export function useSpeechRecognition(language: Language) {
  const supported = Boolean(getSpeechRecognitionConstructor());
  const [speechState, setSpeechState] = useState<SpeechState>(
    supported ? "ready" : "unsupported"
  );
  const [transcript, setTranscript] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore cleanup abort errors
        }
      }
    };
  }, []);

  const startListening = useCallback(async () => {
    const RecognitionCtor = getSpeechRecognitionConstructor();
    if (!RecognitionCtor) {
      setSpeechState("unsupported");
      return;
    }

    setErrorMessage(null);

    // Cleanly abort any active session before starting a new one
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // Ignore
      }
      recognitionRef.current = null;
    }

    // Explicitly request microphone permission when MediaDevices API is available
    if (
      typeof navigator !== "undefined" &&
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === "function"
    ) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        for (const track of stream.getTracks()) {
          track.stop();
        }
      } catch (err) {
        const name = err instanceof Error ? err.name : "";
        if (name === "NotAllowedError" || name === "PermissionDeniedError") {
          setSpeechState("permission_denied");
          return;
        }
        setSpeechState("error");
        setErrorMessage(
          language === "te"
            ? "మైక్రోఫోన్ అందుబాటులో లేదు. దయచేసి టైప్ చేసి అడగండి."
            : language === "hi"
              ? "माइक्रोफ़ोन उपलब्ध नहीं है। कृपया टाइप करके पूछें।"
              : "Microphone is unavailable. Please type your question."
        );
        return;
      }
    }

    try {
      const recognition = new RecognitionCtor();
      recognition.lang = getRecognitionLocale(language);
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.continuous = false;

      recognition.onstart = () => {
        setSpeechState("recording");
      };

      recognition.onresult = (event: SpeechRecognitionResultEvent) => {
        let combined = "";
        let hasFinal = false;
        for (let i = 0; i < event.results.length; i++) {
          const item = event.results[i];
          if (item && item[0] && typeof item[0].transcript === "string") {
            combined += item[0].transcript;
          }
          if (item?.isFinal) {
            hasFinal = true;
          }
        }
        // Speech text is plain string, never parsed as JSON
        setTranscript(combined.trim());
        if (hasFinal) {
          setSpeechState("processing");
        }
      };

      recognition.onerror = (event: { error: string }) => {
        if (
          event.error === "not-allowed" ||
          event.error === "service-not-allowed"
        ) {
          setSpeechState("permission_denied");
        } else if (event.error === "no-speech") {
          setSpeechState("error");
          setErrorMessage(
            language === "te"
              ? "మాట వినిపించలేదు. మళ్లీ ప్రయత్నించండి లేదా టైప్ చేయండి."
              : language === "hi"
                ? "कोई आवाज़ सुनाई नहीं दी। फिर से बोलें या टाइप करें।"
                : "No speech detected. Please try again or type your question."
          );
        } else {
          setSpeechState("error");
          setErrorMessage(
            language === "te"
              ? "వాయిస్ గుర్తింపులో లోపం జరిగింది. దయచేసి టైప్ చేయండి."
              : language === "hi"
                ? "आवाज़ पहचानने में त्रुटि हुई। कृपया टाइप करें।"
                : "Voice recognition error. Please try again or type your text."
          );
        }
      };

      recognition.onend = () => {
        setSpeechState((prev) =>
          prev === "permission_denied" ||
          prev === "unsupported" ||
          prev === "error"
            ? prev
            : "ready"
        );
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setSpeechState("error");
      setErrorMessage(
        language === "te"
          ? "మైక్రోఫోన్ ప్రారంభించలేకపోయాము. టైప్ చేసి ఉపయోగించండి."
          : language === "hi"
            ? "माइक्रोफ़ोन शुरू नहीं हो सका। कृपया टाइप करके उपयोग करें।"
            : "Unable to start microphone. Please use typed input."
      );
    }
  }, [language]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      setSpeechState("processing");
      try {
        recognitionRef.current.stop();
      } catch {
        setSpeechState("ready");
      }
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript("");
    setErrorMessage(null);
    if (supported) setSpeechState("ready");
  }, [supported]);

  return {
    supported,
    speechState,
    transcript,
    setTranscript,
    errorMessage,
    startListening,
    stopListening,
    resetTranscript,
  };
}
