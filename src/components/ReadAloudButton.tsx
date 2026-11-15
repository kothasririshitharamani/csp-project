import { Volume2, Square } from "lucide-react";
import { useLanguage } from "../hooks/useLanguage";
import { useTextToSpeech } from "../hooks/useTextToSpeech";
import { getTranslations } from "../i18n/translations";
import { Language } from "../types/app";

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
  const { supported, isSpeaking, activeId, hasVoiceForLanguage, speak } =
    useTextToSpeech();

  const speakingThis = isSpeaking && activeId === itemId;
  const hasVoice = hasVoiceForLanguage(targetLang);

  if (!supported) {
    return (
      <span className="text-xs text-[#71877D]">{t.voice.ttsUnsupported}</span>
    );
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={() => speak(text, targetLang, itemId)}
        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors min-h-[44px] whitespace-nowrap ${
          speakingThis
            ? "bg-[#214B3D] text-white border-[#214B3D]"
            : "bg-[#E3F0E8] text-[#214B3D] border-[#D3E3D8] hover:bg-[#d6e8dd]"
        } ${className}`}
      >
        {speakingThis ? (
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
      {!hasVoice && (
        <span className="text-[11px] text-[#71877D] max-w-xs">
          {t.voice.ttsNoVoiceForLang}
        </span>
      )}
    </div>
  );
}
