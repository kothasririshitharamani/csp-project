import { Volume2, Square, SlidersHorizontal, CheckCircle2, Info } from "lucide-react";
import { useLanguage } from "../hooks/useLanguage";
import { useTextToSpeech } from "../hooks/useTextToSpeech";
import { getTranslations } from "../i18n/translations";
import { Language, LANGUAGE_META, SUPPORTED_LANGUAGES } from "../types/app";

interface VoiceSettingsPanelProps {
  onLanguageChange?: (lang: Language) => void;
}

export function VoiceSettingsPanel({ onLanguageChange }: VoiceSettingsPanelProps) {
  const { language, setLanguage } = useLanguage();
  const t = getTranslations(language);
  const {
    browserSupported,
    neuralAvailable,
    settings,
    isSpeaking,
    isLoadingAudio,
    activeId,
    lastPlaybackInfo,
    updateSettings,
    setRateForLanguage,
    setVoiceForLanguage,
    getRateForLanguage,
    getVoicesForLanguage,
    getSelectedVoiceForLanguage,
    testVoice,
    stop,
  } = useTextToSpeech();

  const langMeta = LANGUAGE_META[language];
  const langVoices = getVoicesForLanguage(language);
  const selectedVoice = getSelectedVoiceForLanguage(language);
  const rate = getRateForLanguage(language);
  const testingThis = (isSpeaking || isLoadingAudio) && activeId === `voice-test-${language}`;

  return (
    <div className="bg-white border border-[#D3E3D8] rounded-2xl p-4 sm:p-5 space-y-4 shadow-[0_2px_10px_rgba(33,75,61,0.03)]">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#D3E3D8]">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-[#39785C]" />
          <h3 className="text-sm font-bold text-[#214B3D]">
            {t.voice.ttsSettingsTitle}
          </h3>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-[#EDF5EF] border border-[#D3E3D8] text-[#214B3D]">
          {neuralAvailable ? (
            <>
              <CheckCircle2 className="w-3 h-3 text-[#39785C]" />
              <span>Neural AI TTS</span>
            </>
          ) : (
            <>
              <Info className="w-3 h-3 text-[#4D91B5]" />
              <span>Browser TTS</span>
            </>
          )}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label
            htmlFor="voice-settings-lang"
            className="block text-xs font-bold text-[#214B3D] mb-1"
          >
            {t.voice.ttsPreferredLangLabel}
          </label>
          <select
            id="voice-settings-lang"
            value={language}
            onChange={(e) => {
              const next = e.target.value as Language;
              stop();
              setLanguage(next);
              onLanguageChange?.(next);
            }}
            className="w-full px-3 py-2 rounded-xl border border-[#D3E3D8] bg-[#EDF5EF]/50 text-xs sm:text-sm text-[#214B3D] min-h-[42px]"
          >
            {SUPPORTED_LANGUAGES.map((code) => {
              const meta = LANGUAGE_META[code];
              return (
                <option key={code} value={code}>
                  {meta.nativeName}
                  {meta.nativeName !== meta.englishName ? ` (${meta.englishName})` : ""}
                </option>
              );
            })}
          </select>
        </div>

        <div>
          <label
            htmlFor="voice-settings-engine"
            className="block text-xs font-bold text-[#214B3D] mb-1"
          >
            {t.voice.ttsEngineLabel}
          </label>
          <select
            id="voice-settings-engine"
            value={settings.engine}
            onChange={(e) =>
              updateSettings({
                engine: e.target.value === "browser" ? "browser" : "auto",
              })
            }
            className="w-full px-3 py-2 rounded-xl border border-[#D3E3D8] bg-[#EDF5EF]/50 text-xs sm:text-sm text-[#214B3D] min-h-[42px]"
          >
            <option value="auto" disabled={!neuralAvailable}>
              {t.voice.ttsEngineAuto}
            </option>
            <option value="browser">{t.voice.ttsEngineBrowser}</option>
          </select>
        </div>

        <div className="sm:col-span-2">
          <label
            htmlFor="voice-settings-browser-voice"
            className="block text-xs font-bold text-[#214B3D] mb-1"
          >
            {t.voice.ttsVoiceLabel.replace("{lang}", langMeta.nativeName)}
          </label>
          {browserSupported && langVoices.length > 0 ? (
            <select
              id="voice-settings-browser-voice"
              value={selectedVoice?.voiceURI || ""}
              onChange={(e) => setVoiceForLanguage(language, e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#D3E3D8] bg-[#EDF5EF]/50 text-xs sm:text-sm text-[#214B3D] min-h-[42px]"
            >
              {langVoices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          ) : (
            <div className="px-3 py-2.5 rounded-xl border border-[#D3E3D8] bg-[#EDF5EF] text-xs text-[#71877D]">
              {t.voice.ttsNoBrowserVoicesFound.replace("{lang}", langMeta.nativeName)}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between text-xs font-bold text-[#214B3D] mb-1">
            <label htmlFor="voice-settings-speed">{t.voice.ttsSpeedLabel}</label>
            <span className="tabular-nums text-[#39785C]">{rate.toFixed(2)}x</span>
          </div>
          <input
            id="voice-settings-speed"
            type="range"
            min={0.7}
            max={1.25}
            step={0.05}
            value={rate}
            onChange={(e) => setRateForLanguage(language, Number(e.target.value))}
            className="w-full accent-[#39785C]"
          />
          <div className="flex justify-between text-[10px] text-[#71877D]">
            <span>{t.voice.ttsSpeedSlow}</span>
            <span>{t.voice.ttsSpeedNormal}</span>
            <span>{t.voice.ttsSpeedFast}</span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs font-bold text-[#214B3D] mb-1">
            <label htmlFor="voice-settings-volume">{t.voice.ttsVolumeLabel}</label>
            <span className="tabular-nums text-[#39785C]">
              {Math.round(settings.volume * 100)}%
            </span>
          </div>
          <input
            id="voice-settings-volume"
            type="range"
            min={0.2}
            max={1}
            step={0.05}
            value={settings.volume}
            onChange={(e) =>
              updateSettings({ volume: Number(e.target.value) })
            }
            className="w-full accent-[#39785C]"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => testVoice(language)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#39785C] text-white text-xs font-semibold hover:bg-[#2f634c] min-h-[38px]"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>{t.voice.ttsTestBtn}</span>
          </button>

          {(testingThis || isSpeaking || isLoadingAudio) && (
            <button
              type="button"
              onClick={stop}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#214B3D] text-white text-xs font-semibold hover:bg-[#19382d] min-h-[38px]"
            >
              <Square className="w-3 h-3 fill-current" />
              <span>{t.voice.stopReading}</span>
            </button>
          )}
        </div>

        {lastPlaybackInfo && (
          <span className="text-[11px] text-[#71877D]">
            {lastPlaybackInfo.fellBackFromNeural
              ? t.voice.ttsFallbackNotice
              : lastPlaybackInfo.mode === "neural"
                ? t.voice.ttsUsingServerNeural.replace("{lang}", langMeta.nativeName)
                : t.voice.ttsUsingBrowserVoice.replace("{voice}", lastPlaybackInfo.voiceLabel)}
          </span>
        )}
      </div>
    </div>
  );
}
