import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { AlertCircle, Mic, MicOff, RefreshCw, Square } from "lucide-react";
import { useLanguage } from "../hooks/useLanguage";
import { SpeechState, useSpeechRecognition } from "../hooks/useSpeechRecognition";
import { getTranslations } from "../i18n/translations";
import { LANGUAGE_META } from "../types/app";

export interface VoiceInputControlHandle {
  reset: () => void;
  stop: () => void;
}

interface VoiceInputControlProps {
  onTranscriptChange: (text: string) => void;
  onStateChange?: (state: SpeechState) => void;
  compact?: boolean;
}

export const VoiceInputControl = forwardRef<
  VoiceInputControlHandle,
  VoiceInputControlProps
>(function VoiceInputControl(
  { onTranscriptChange, onStateChange, compact = false },
  ref
) {
  const { language } = useLanguage();
  const t = getTranslations(language);
  const langName = LANGUAGE_META[language].nativeName;

  const {
    speechState,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetRecognition,
    retryListening,
  } = useSpeechRecognition(language);

  const suppressSyncRef = useRef(false);

  useImperativeHandle(
    ref,
    () => ({
      reset: () => {
        suppressSyncRef.current = true;
        resetRecognition();
      },
      stop: () => {
        stopListening();
      },
    }),
    [resetRecognition, stopListening]
  );

  useEffect(() => {
    onStateChange?.(speechState);
  }, [speechState, onStateChange]);

  useEffect(() => {
    if (suppressSyncRef.current) {
      if (!transcript) {
        suppressSyncRef.current = false;
      }
      return;
    }
    if (transcript) {
      onTranscriptChange(transcript);
    }
  }, [transcript, onTranscriptChange]);

  const statusText = (() => {
    switch (speechState) {
      case "listening":
        return t.voice.recording;
      case "processing":
        return t.voice.processing;
      case "recognized":
        return t.voice.recognized;
      case "permission_denied":
        return t.voice.permission_denied;
      case "unsupported":
        return t.voice.unsupported;
      case "language_unsupported":
        return t.voice.language_unsupported.replace("{lang}", langName);
      case "no_speech":
        return t.voice.no_speech;
      case "network_error":
        return t.voice.network_error;
      case "error":
        return t.voice.error;
      default:
        return t.voice.ready;
    }
  })();

  const errorHelpText = (() => {
    switch (speechState) {
      case "permission_denied":
        return t.voice.permissionHelp;
      case "unsupported":
        return t.voice.unsupportedHelp;
      case "language_unsupported":
        return t.voice.languageUnsupportedHelp.replace("{lang}", langName);
      case "no_speech":
        return t.voice.noSpeechHelp;
      case "network_error":
        return t.voice.networkHelp;
      case "error":
        return t.voice.genericErrorHelp;
      default:
        return null;
    }
  })();

  const isDisabled = speechState === "unsupported";
  const isListening = speechState === "listening";
  const canRetry =
    speechState === "no_speech" ||
    speechState === "network_error" ||
    speechState === "error" ||
    speechState === "permission_denied";

  const pillClass = (() => {
    if (isListening) {
      return "bg-[#C2410C]/10 text-[#9A3412] border-[#C2410C]/30";
    }
    if (speechState === "processing") {
      return "bg-[#4D91B5]/10 text-[#316886] border-[#4D91B5]/30";
    }
    if (speechState === "recognized") {
      return "bg-[#39785C]/10 text-[#214B3D] border-[#39785C]/30";
    }
    if (
      speechState === "permission_denied" ||
      speechState === "unsupported" ||
      speechState === "language_unsupported" ||
      speechState === "no_speech" ||
      speechState === "network_error" ||
      speechState === "error"
    ) {
      return "bg-amber-50 text-amber-900 border-amber-200";
    }
    return "bg-white text-[#71877D] border-[#D3E3D8]";
  })();

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          disabled={isDisabled}
          onClick={() => {
            suppressSyncRef.current = false;
            if (isListening) {
              stopListening();
            } else {
              startListening();
            }
          }}
          className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all min-h-[46px] whitespace-nowrap shadow-sm ${
            compact ? "px-3.5 py-2 text-sm" : "px-5 py-3 text-base"
          } ${
            isDisabled
              ? "bg-[#EDF5EF] text-[#71877D] border border-[#D3E3D8] cursor-not-allowed"
              : isListening
                ? "bg-[#C2410C] text-white hover:bg-[#9A3412] ring-4 ring-[#C2410C]/20"
                : "bg-[#4D91B5] text-white hover:bg-[#3f7d9e]"
          }`}
        >
          {isDisabled ? (
            <MicOff className="w-4 h-4 shrink-0" />
          ) : isListening ? (
            <Square className="w-4 h-4 fill-current shrink-0" />
          ) : (
            <Mic className="w-5 h-5 shrink-0" />
          )}
          <span>{isListening ? t.voice.stopMic : t.voice.startMic}</span>
        </button>

        {isListening && (
          <div
            className="inline-flex items-end gap-1 h-5 px-2"
            aria-label={t.voice.recording}
          >
            <span className="w-1 bg-[#C2410C] rounded-full animate-pulse h-3" />
            <span className="w-1 bg-[#C2410C] rounded-full animate-bounce h-5" />
            <span className="w-1 bg-[#C2410C] rounded-full animate-pulse h-2.5" />
            <span className="w-1 bg-[#C2410C] rounded-full animate-bounce h-4" />
          </div>
        )}

        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${pillClass}`}
        >
          {statusText}
        </span>

        {canRetry && (
          <button
            type="button"
            onClick={() => {
              suppressSyncRef.current = false;
              retryListening();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#D3E3D8] text-xs font-semibold text-[#39785C] hover:bg-[#E3F0E8] min-h-[36px]"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{t.voice.retryMic}</span>
          </button>
        )}
      </div>

      {isListening && (
        <div className="rounded-xl bg-white border border-[#D3E3D8] px-3.5 py-2.5 space-y-1">
          <div className="text-[11px] font-bold text-[#39785C]">
            {t.voice.livePreviewLabel} ({langName}):
          </div>
          <p className="text-xs sm:text-sm text-[#214B3D] min-h-[20px]">
            {transcript || interimTranscript || t.voice.listeningTip}
          </p>
        </div>
      )}

      {errorHelpText && (
        <div className="text-xs sm:text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
          <span>{errorHelpText}</span>
        </div>
      )}
    </div>
  );
});
