import { Loader2, Square, Volume2 } from "lucide-react";
import { useLanguage } from "../hooks/useLanguage";
import { useTextToSpeech } from "../hooks/useTextToSpeech";
import { getTranslations } from "../i18n/translations";
import { Language, LANGUAGE_META } from "../types/app";

interface ReadAloudButtonProps {
  text: string;
  itemId?: string;
  forceLanguage?: Language;
  labelOverride?: string;
  className?: string;
}

export function ReadAloudButton({
  text,
  itemId = "main",
  forceLanguage,
  labelOverride,
  className = "",
}: ReadAloudButtonProps) {
  const { language } = useLanguage();
  const targetLang = forceLanguage ?? language;
  const t = getTranslations(language);
  const {
    browserSupported,
    neuralAvailable,
    isSpeaking,
    isLoadingAudio,
    activeId,
    hasBrowserVoiceForLanguage,
    lastPlaybackInfo,
    playbackError,
    speak,
    stop,
  } = useTextToSpeech();

  const speakingThis = isSpeaking && activeId === itemId;
  const loadingThis = isLoadingAudio && activeId === itemId;
  const canPlay = neuralAvailable || browserSupported;
  const hasBrowserVoice = hasBrowserVoiceForLanguage(targetLang);

  if (!canPlay) {
    return (
      <span className="text-xs text-[#71877D]">{t.voice.ttsUnsupported}</span>
    );
  }

  return (
    <div className="inline-flex flex-col items-start gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => speak(text, targetLang, itemId)}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors min-h-[42px] whitespace-nowrap ${
            speakingThis || loadingThis
              ? "bg-[#214B3D] text-white border-[#214B3D]"
              : "bg-[#E3F0E8] text-[#214B3D] border-[#D3E3D8] hover:bg-[#d6e8dd]"
          } ${className}`}
        >
          {loadingThis ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <span>{t.voice.loadingAudio}</span>
            </>
          ) : speakingThis ? (
            <>
              <Square className="w-4 h-4 fill-current shrink-0" />
              <span>{t.voice.stopReading}</span>
            </>
          ) : (
            <>
              <Volume2 className="w-4 h-4 text-[#39785C] shrink-0" />
              <span>{labelOverride || t.voice.readAloud}</span>
            </>
          )}
        </button>

        {(speakingThis || loadingThis) && (
          <button
            type="button"
            onClick={stop}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#D3E3D8] bg-white text-xs font-semibold text-[#214B3D] hover:bg-[#EDF5EF] min-h-[38px]"
          >
            <Square className="w-3.5 h-3.5 fill-current text-[#C2410C]" />
            <span>{t.voice.stopReading}</span>
          </button>
        )}
      </div>

      {speakingThis && lastPlaybackInfo && (
        <span className="text-[11px] text-[#39785C]">
          {lastPlaybackInfo.fellBackFromNeural
            ? t.voice.ttsFallbackNotice
            : lastPlaybackInfo.mode === "neural"
              ? t.voice.ttsUsingServerNeural.replace(
                  "{lang}",
                  LANGUAGE_META[targetLang].nativeName
                )
              : t.voice.ttsUsingBrowserVoice.replace(
                  "{voice}",
                  lastPlaybackInfo.voiceLabel
                )}
        </span>
      )}

      {!neuralAvailable && !hasBrowserVoice && (
        <span className="text-[11px] text-[#71877D] max-w-xs">
          {t.voice.ttsNoVoiceForLang.replace(
            "{lang}",
            LANGUAGE_META[targetLang].nativeName
          )}
        </span>
      )}

      {playbackError && (
        <span className="text-[11px] text-amber-800">{playbackError}</span>
      )}
    </div>
  );
}
