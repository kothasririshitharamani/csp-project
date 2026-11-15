import React, { useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Calculator,
  CloudSun,
  Droplets,
  HelpCircle,
  History,
  Leaf,
  Loader2,
  MapPin,
  Microscope,
  RefreshCw,
  ShieldAlert,
  Sprout,
  UserCog,
} from "lucide-react";
import { ReadAloudButton } from "../components/ReadAloudButton";
import { VoiceInputControl } from "../components/VoiceInputControl";
import { useLanguage } from "../hooks/useLanguage";
import { getTranslations } from "../i18n/translations";
import { AuthUser, PageId, RecentActivityItem } from "../types/app";
import { safeJsonFetch } from "../utils/apiClient";

interface HomePageProps {
  user: AuthUser;
  onNavigate: (page: PageId) => void;
  activities: RecentActivityItem[];
  onOpenHistory: () => void;
}

export function HomePage({
  user,
  onNavigate,
  activities,
  onOpenHistory,
}: HomePageProps) {
  const { language } = useLanguage();
  const t = getTranslations(language);

  const profile = user.profile;
  const farmerName = profile?.farmerName || user.fullName;
  const cropDisplay = profile
    ? profile.crop === "other" && profile.customCrop
      ? profile.customCrop
      : t.options.crops[profile.crop]
    : "";

  const [voiceQuestion, setVoiceQuestion] = useState("");
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceAnswer, setVoiceAnswer] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const featureCards: Array<{
    id: PageId;
    title: string;
    desc: string;
    icon: React.ReactNode;
    accentBg: string;
  }> = [
    {
      id: "soil",
      title: t.home.cards.soil.title,
      desc: t.home.cards.soil.desc,
      icon: <Microscope className="w-6 h-6 text-[#39785C]" />,
      accentBg: "bg-[#E3F0E8]",
    },
    {
      id: "irrigation",
      title: t.home.cards.irrigation.title,
      desc: t.home.cards.irrigation.desc,
      icon: <Sprout className="w-6 h-6 text-[#39785C]" />,
      accentBg: "bg-[#E3F0E8]",
    },
    {
      id: "budget",
      title: t.home.cards.budget.title,
      desc: t.home.cards.budget.desc,
      icon: <Calculator className="w-6 h-6 text-[#4D91B5]" />,
      accentBg: "bg-[#E8F3F8]",
    },
    {
      id: "weather",
      title: t.home.cards.weather.title,
      desc: t.home.cards.weather.desc,
      icon: <CloudSun className="w-6 h-6 text-[#4D91B5]" />,
      accentBg: "bg-[#E8F3F8]",
    },
    {
      id: "disaster",
      title: t.home.cards.disaster.title,
      desc: t.home.cards.disaster.desc,
      icon: <ShieldAlert className="w-6 h-6 text-[#B45309]" />,
      accentBg: "bg-[#FEF3C7]",
    },
    {
      id: "faq",
      title: t.home.cards.faq.title,
      desc: t.home.cards.faq.desc,
      icon: <HelpCircle className="w-6 h-6 text-[#39785C]" />,
      accentBg: "bg-[#E3F0E8]",
    },
  ];

  const askQuickAi = async (questionText: string) => {
    const trimmed = questionText.trim();
    if (!trimmed || voiceLoading) return;

    setVoiceLoading(true);
    setVoiceError(null);

    try {
      const data = await safeJsonFetch<{ ok: boolean; reply: string }>(
        "/api/faq/chat",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            language,
            farmContext: profile
              ? {
                  farmerName,
                  village: profile.village,
                  mandal: profile.mandal,
                  district: profile.district,
                  state: profile.state,
                  crop: cropDisplay,
                  landArea: `${profile.landArea} ${t.options.areaUnits[profile.areaUnit]}`,
                  soilType: t.options.soils[profile.soilType],
                  waterSource: t.options.waterSources[profile.waterSource],
                  irrigationMethod: t.options.methods[profile.irrigationMethod],
                  waterAvailability:
                    t.options.availability[profile.waterAvailability],
                }
              : undefined,
          }),
        }
      );
      setVoiceAnswer(data.reply);
    } catch (err) {
      setVoiceError(
        err instanceof Error
          ? err.message
          : "Unable to get AI response right now. Please retry."
      );
      setVoiceAnswer(null);
    } finally {
      setVoiceLoading(false);
    }
  };

  const handleVoiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    askQuickAi(voiceQuestion);
  };

  return (
    <div className="space-y-8">
      <section className="bg-white border border-[#D3E3D8] rounded-2xl p-6 sm:p-8 shadow-[0_2px_10px_rgba(33,75,61,0.04)]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Personalized Greeting & Farmer Profile Summary */}
          <div className="lg:col-span-7 space-y-5">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-[#39785C]">
                <Leaf className="w-4 h-4 shrink-0" />
                <span>{t.appName}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#214B3D] tracking-tight text-balance leading-tight">
                {t.home.welcome.replace("{name}", farmerName)}
              </h1>
              {profile && (
                <p className="inline-flex items-center gap-1.5 text-base sm:text-lg text-[#71877D]">
                  <MapPin className="w-4 h-4 text-[#39785C] shrink-0" />
                  <span>
                    {t.home.farmLocationLine
                      .replace("{village}", profile.village)
                      .replace("{district}", profile.district)}
                  </span>
                </p>
              )}
            </div>

            {profile && (
              <div className="bg-[#EDF5EF] border border-[#D3E3D8] rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-sm font-bold text-[#214B3D]">
                    {t.home.summaryHeading}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onNavigate("profile_setup")}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#D3E3D8] text-xs font-semibold text-[#39785C] hover:bg-[#E3F0E8] min-h-[36px]"
                    >
                      <UserCog className="w-3.5 h-3.5" />
                      <span>{t.home.editProfileBtn}</span>
                    </button>
                    <button
                      type="button"
                      onClick={onOpenHistory}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#D3E3D8] text-xs font-semibold text-[#4D91B5] hover:bg-[#E3F0E8] min-h-[36px]"
                    >
                      <History className="w-3.5 h-3.5" />
                      <span>
                        {t.home.recentHistoryBtn} ({activities.length})
                      </span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs sm:text-sm">
                  <div>
                    <div className="text-[#71877D]">{t.home.summaryVillage}</div>
                    <div className="font-semibold text-[#214B3D]">
                      {profile.village}, {profile.district}
                    </div>
                  </div>
                  <div>
                    <div className="text-[#71877D]">{t.home.summaryCrop}</div>
                    <div className="font-semibold text-[#214B3D]">
                      {cropDisplay}
                    </div>
                  </div>
                  <div>
                    <div className="text-[#71877D]">{t.home.summaryArea}</div>
                    <div className="font-semibold text-[#214B3D] tabular-nums">
                      {profile.landArea} {t.options.areaUnits[profile.areaUnit]}
                    </div>
                  </div>
                  <div>
                    <div className="text-[#71877D]">{t.home.summarySoil}</div>
                    <div className="font-semibold text-[#214B3D]">
                      {t.options.soils[profile.soilType]}
                    </div>
                  </div>
                  <div>
                    <div className="text-[#71877D]">
                      {t.home.summaryWaterSource}
                    </div>
                    <div className="font-semibold text-[#214B3D]">
                      {t.options.waterSources[profile.waterSource]}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick-Access AI Voice Assistant Section */}
          <div className="lg:col-span-5 bg-[#EDF5EF] border border-[#D3E3D8] rounded-2xl p-5 space-y-3.5">
            <div>
              <h2 className="text-lg font-bold text-[#214B3D]">
                {t.home.voiceTitle}
              </h2>
              <p className="text-sm text-[#71877D] mt-0.5">
                {t.home.voiceInstruction}
              </p>
            </div>

            <VoiceInputControl
              onTranscriptChange={(text) => setVoiceQuestion(text)}
            />

            <form onSubmit={handleVoiceSubmit} className="space-y-2.5">
              <textarea
                rows={2}
                value={voiceQuestion}
                onChange={(e) => setVoiceQuestion(e.target.value)}
                placeholder={t.home.voicePlaceholder}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3E3D8] bg-white text-[#214B3D] text-sm resize-none"
              />
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={!voiceQuestion.trim() || voiceLoading}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#39785C] text-white text-sm font-semibold hover:bg-[#2f634c] disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px]"
                >
                  {voiceLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4" />
                  )}
                  <span>
                    {voiceLoading ? t.home.voiceThinking : t.home.voiceSend}
                  </span>
                </button>
                {(voiceQuestion || voiceAnswer || voiceError) && (
                  <button
                    type="button"
                    onClick={() => {
                      setVoiceQuestion("");
                      setVoiceAnswer(null);
                      setVoiceError(null);
                    }}
                    className="px-3.5 py-2.5 rounded-xl border border-[#D3E3D8] bg-white text-sm font-medium text-[#71877D] hover:text-[#214B3D] min-h-[44px]"
                  >
                    {t.home.voiceClear}
                  </button>
                )}
              </div>
            </form>

            {voiceError && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs sm:text-sm text-red-900 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{voiceError}</span>
                </div>
                {voiceQuestion.trim() && (
                  <button
                    type="button"
                    onClick={() => askQuickAi(voiceQuestion)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-red-300 text-xs font-semibold text-red-800"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{t.home.voiceRetry}</span>
                  </button>
                )}
              </div>
            )}

            {voiceAnswer && (
              <div className="rounded-xl bg-white border border-[#D3E3D8] p-4 space-y-2.5">
                <div className="text-xs font-bold text-[#39785C]">
                  {t.home.voiceResponseHeading}
                </div>
                <p className="text-sm text-[#214B3D] whitespace-pre-line leading-relaxed">
                  {voiceAnswer}
                </p>
                <ReadAloudButton
                  text={voiceAnswer}
                  itemId="home-voice-answer"
                  className="!py-1.5 !px-3 !min-h-[38px] !text-xs"
                />
              </div>
            )}
          </div>
        </div>
      </section>

      <section aria-labelledby="features-heading" className="space-y-4">
        <h2
          id="features-heading"
          className="text-xl font-bold text-[#214B3D] tracking-tight"
        >
          {t.home.featuresHeading}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {featureCards.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => onNavigate(card.id)}
              className="group text-left bg-white border border-[#D3E3D8] rounded-2xl p-5 sm:p-6 shadow-[0_2px_10px_rgba(33,75,61,0.03)] hover:border-[#39785C] hover:shadow-[0_6px_18px_rgba(33,75,61,0.08)] transition-all flex flex-col justify-between gap-4 min-h-[160px]"
            >
              <div className="space-y-3">
                <div
                  className={`w-12 h-12 rounded-xl ${card.accentBg} flex items-center justify-center`}
                >
                  {card.icon}
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-lg font-bold text-[#214B3D] group-hover:text-[#39785C] transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-sm text-[#71877D] leading-relaxed">
                    {card.desc}
                  </p>
                </div>
              </div>
              <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#39785C]">
                <span>{card.title}</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </div>
            </button>
          ))}
        </div>
      </section>

      <section aria-labelledby="quick-access-heading" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
          <h2
            id="quick-access-heading"
            className="text-xl font-bold text-[#214B3D] tracking-tight"
          >
            {t.home.quickAccessHeading}
          </h2>
          <span className="text-xs text-[#71877D]">{t.home.educationalLabel}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          <div className="bg-white border border-[#D3E3D8] rounded-2xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-sm font-bold text-[#39785C]">
              <Sprout className="w-4 h-4 shrink-0" />
              <h3>{t.home.farmingTipTitle}</h3>
            </div>
            <p className="text-sm text-[#214B3D] leading-relaxed">
              {t.home.farmingTipBody}
            </p>
          </div>

          <div className="bg-white border border-[#D3E3D8] rounded-2xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-sm font-bold text-[#4D91B5]">
              <Droplets className="w-4 h-4 shrink-0" />
              <h3>{t.home.waterTipTitle}</h3>
            </div>
            <p className="text-sm text-[#214B3D] leading-relaxed">
              {t.home.waterTipBody}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
