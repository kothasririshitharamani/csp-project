import { useCallback, useEffect, useRef, useState } from "react";
import { Language, LANGUAGE_META } from "../types/app";

export type SpeechState =
  | "ready"
  | "listening"
  | "processing"
  | "recognized"
  | "permission_denied"
  | "unsupported"
  | "language_unsupported"
  | "no_speech"
  | "network_error"
  | "error";

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence?: number;
}

interface SpeechRecognitionResultItem {
  isFinal: boolean;
  length: number;
  [altIndex: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionResultEvent {
  resultIndex?: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultItem;
  };
}

interface SpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onerror: ((event: { error: string; message?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
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

function pickBestAlternative(item: SpeechRecognitionResultItem): string {
  if (!item || item.length === 0) return "";
  let bestText = item[0]?.transcript || "";
  let bestConf = typeof item[0]?.confidence === "number" ? item[0].confidence : -1;

  for (let a = 1; a < item.length; a++) {
    const alt = item[a];
    if (!alt || typeof alt.transcript !== "string") continue;
    const conf = typeof alt.confidence === "number" ? alt.confidence : -1;
    if (conf > bestConf && alt.transcript.trim()) {
      bestConf = conf;
      bestText = alt.transcript;
    }
  }
  return bestText.trim();
}

export function useSpeechRecognition(language: Language) {
  const supported = Boolean(getSpeechRecognitionConstructor());
  const [speechState, setSpeechState] = useState<SpeechState>(
    supported ? "ready" : "unsupported"
  );
  const [finalTranscript, setFinalTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const sessionIdRef = useRef(0);
  const manualStopRef = useRef(false);
  const finalBufferRef = useRef("");
  const interimBufferRef = useRef("");

  const abortActiveRecognition = useCallback(() => {
    sessionIdRef.current += 1;
    if (recognitionRef.current) {
      const rec = recognitionRef.current;
      recognitionRef.current = null;
      rec.onstart = null;
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      try {
        rec.abort();
      } catch {
        // Ignore abort errors
      }
    }
  }, []);

  // Abort & cleanly reset active listening if user switches language
  useEffect(() => {
    abortActiveRecognition();
    manualStopRef.current = false;
    finalBufferRef.current = "";
    interimBufferRef.current = "";
    setFinalTranscript("");
    setInterimTranscript("");
    setErrorCode(null);
    setSpeechState(supported ? "ready" : "unsupported");
  }, [language, supported, abortActiveRecognition]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortActiveRecognition();
    };
  }, [abortActiveRecognition]);

  const startListening = useCallback(async () => {
    const RecognitionCtor = getSpeechRecognitionConstructor();
    if (!RecognitionCtor) {
      setSpeechState("unsupported");
      return;
    }

    abortActiveRecognition();
    const mySessionId = ++sessionIdRef.current;
    manualStopRef.current = false;
    finalBufferRef.current = "";
    interimBufferRef.current = "";
    setFinalTranscript("");
    setInterimTranscript("");
    setErrorCode(null);

    // Explicitly request microphone access (and enable noise suppression where supported)
    if (
      typeof navigator !== "undefined" &&
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === "function"
    ) {
      try {
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });
        } catch (constraintErr) {
          const name = constraintErr instanceof Error ? constraintErr.name : "";
          if (name === "NotAllowedError" || name === "PermissionDeniedError") {
            throw constraintErr;
          }
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }
        for (const track of stream.getTracks()) {
          track.stop();
        }
      } catch (err) {
        if (sessionIdRef.current !== mySessionId) return;
        const name = err instanceof Error ? err.name : "";
        if (name === "NotAllowedError" || name === "PermissionDeniedError") {
          setSpeechState("permission_denied");
          setErrorCode("permission_denied");
        } else {
          setSpeechState("error");
          setErrorCode("mic_unavailable");
        }
        return;
      }
    }

    if (sessionIdRef.current !== mySessionId) return;

    try {
      const recognition = new RecognitionCtor();
      // Strictly apply exact regional Indian BCP-47 locale without falling back to English
      recognition.lang = LANGUAGE_META[language].bcp47;
      recognition.interimResults = true;
      recognition.maxAlternatives = 3;
      recognition.continuous = true;

      recognition.onstart = () => {
        if (sessionIdRef.current !== mySessionId) return;
        setSpeechState("listening");
      };

      recognition.onresult = (event: SpeechRecognitionResultEvent) => {
        if (sessionIdRef.current !== mySessionId) return;

        const finals: string[] = [];
        const interims: string[] = [];

        for (let i = 0; i < event.results.length; i++) {
          const item = event.results[i];
          if (!item) continue;
          const piece = pickBestAlternative(item);
          if (!piece) continue;
          if (item.isFinal) {
            finals.push(piece);
          } else {
            interims.push(piece);
          }
        }

        const nextFinal = finals.join(" ").replace(/\s+/g, " ").trim();
        const nextInterim = interims.join(" ").replace(/\s+/g, " ").trim();

        finalBufferRef.current = nextFinal;
        interimBufferRef.current = nextInterim;
        setFinalTranscript(nextFinal);
        setInterimTranscript(nextInterim);
      };

      recognition.onerror = (event: { error: string }) => {
        if (sessionIdRef.current !== mySessionId) return;

        const errType = event.error;
        if (errType === "aborted") {
          return;
        }

        recognitionRef.current = null;

        if (errType === "not-allowed" || errType === "service-not-allowed") {
          setSpeechState("permission_denied");
          setErrorCode("permission_denied");
        } else if (errType === "language-not-supported") {
          setSpeechState("language_unsupported");
          setErrorCode("language_unsupported");
        } else if (errType === "no-speech") {
          setSpeechState("no_speech");
          setErrorCode("no_speech");
        } else if (errType === "network") {
          setSpeechState("network_error");
          setErrorCode("network_error");
        } else {
          setSpeechState("error");
          setErrorCode(errType || "generic");
        }
      };

      recognition.onend = () => {
        if (sessionIdRef.current !== mySessionId) return;
        recognitionRef.current = null;

        // Commit any lingering interim words upon clean stop
        const combined = [finalBufferRef.current, interimBufferRef.current]
          .filter(Boolean)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();

        if (combined) {
          finalBufferRef.current = combined;
          interimBufferRef.current = "";
          setFinalTranscript(combined);
          setInterimTranscript("");
        }

        setSpeechState((prev) => {
          if (
            prev === "permission_denied" ||
            prev === "unsupported" ||
            prev === "language_unsupported" ||
            prev === "no_speech" ||
            prev === "network_error" ||
            prev === "error"
          ) {
            return prev;
          }
          if (combined) {
            return "recognized";
          }
          return manualStopRef.current ? "ready" : "no_speech";
        });
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      if (sessionIdRef.current !== mySessionId) return;
      setSpeechState("error");
      setErrorCode("start_failed");
    }
  }, [language, abortActiveRecognition]);

  const stopListening = useCallback(() => {
    manualStopRef.current = true;
    if (recognitionRef.current) {
      setSpeechState("processing");
      try {
        recognitionRef.current.stop();
      } catch {
        setSpeechState(finalBufferRef.current || interimBufferRef.current ? "recognized" : "ready");
      }
    } else {
      setSpeechState(finalBufferRef.current ? "recognized" : "ready");
    }
  }, []);

  const resetRecognition = useCallback(() => {
    abortActiveRecognition();
    manualStopRef.current = false;
    finalBufferRef.current = "";
    interimBufferRef.current = "";
    setFinalTranscript("");
    setInterimTranscript("");
    setErrorCode(null);
    setSpeechState(supported ? "ready" : "unsupported");
  }, [supported, abortActiveRecognition]);

  const retryListening = useCallback(() => {
    startListening();
  }, [startListening]);

  const transcript = [finalTranscript, interimTranscript]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  return {
    supported,
    speechState,
    transcript,
    finalTranscript,
    interimTranscript,
    errorCode,
    startListening,
    stopListening,
    resetRecognition,
    retryListening,
  };
}
