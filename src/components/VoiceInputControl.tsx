import { useEffect } from "react";
import { AlertCircle, Mic, MicOff, Square } from "lucide-react";
import { useLanguage } from "../hooks/useLanguage";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import { getTranslations } from "../i18n/translations";

interface VoiceInputControlProps {
  onTranscriptChange: (text: string) => void;
  compact?: boolean;
}

export function VoiceInputControl({
  onTranscriptChange,
  compact = false,
}: VoiceInputControlProps) {
  const { language } = useLanguage();
  const t = getTranslations(language);
  const {
    speechState,
    transcript,
    errorMessage,
    startListening,
    stopListening,
  } = useSpeechRecognition(language);

  useEffect(() => {
    if (transcript) {
      onTranscriptChange(transcript);
    }
  }, [transcript, onTranscriptChange]);

  const statusText = (() => {
    switch (speechState) {
      case "recording":
        return t.voice.recording;
      case "processing":
        return t.voice.processing;
      case "permission_denied":
        return t.voice.permission_denied;
      case "unsupported":
        return t.voice.unsupported;
      case "error":
        return t.voice.error;
      default:
        return t.voice.ready;
    }
  })();

  const isDisabled = speechState === "unsupported";
  const isRecording = speechState === "recording";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={isDisabled}
          onClick={isRecording ? stopListening : startListening}
          className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors min-h-[44px] whitespace-nowrap ${
            compact ? "px-3.5 py-2 text-sm" : "px-5 py-3 text-base"
          } ${
            isDisabled
              ? "bg-[#EDF5EF] text-[#71877D] border border-[#D3E3D8] cursor-not-allowed"
              : isRecording
                ? "bg-[#C2410C] text-white hover:bg-[#9A3412]"
                : "bg-[#4D91B5] text-white hover:bg-[#3f7d9e]"
          }`}
        >
          {isDisabled ? (
            <MicOff className="w-4 h-4 shrink-0" />
          ) : isRecording ? (
            <Square className="w-4 h-4 fill-current shrink-0" />
          ) : (
            <Mic className="w-4 h-4 shrink-0" />
          )}
          <span>{isRecording ? t.voice.stopMic : t.voice.startMic}</span>
        </button>

        <span
          className={`text-xs sm:text-sm ${
            speechState === "permission_denied" || speechState === "error"
              ? "text-amber-800 font-medium"
              : speechState === "recording"
                ? "text-[#C2410C] font-semibold"
                : "text-[#71877D]"
          }`}
        >
          {statusText}
        </span>
      </div>

      {errorMessage && (
        <div className="text-xs sm:text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
