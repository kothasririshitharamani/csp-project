import { useState, type ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CloudLightning,
  Info,
  MapPin,
  ShieldCheck,
  Sun,
  Waves,
} from "lucide-react";
import { BackToHome } from "../components/BackToHome";
import { ReadAloudButton } from "../components/ReadAloudButton";
import { DISASTER_GUIDES } from "../data/disasterData";
import { useLanguage } from "../hooks/useLanguage";
import { getTranslations } from "../i18n/translations";
import { DisasterType, FarmProfile } from "../types/app";

interface DisasterPageProps {
  profile: FarmProfile | null;
  onBackHome: () => void;
}

export function DisasterPage({ profile, onBackHome }: DisasterPageProps) {
  const { language } = useLanguage();
  const t = getTranslations(language);
  const [selected, setSelected] = useState<DisasterType | null>(null);

  const cropDisplay = profile
    ? profile.crop === "other" && profile.customCrop
      ? profile.customCrop
      : t.options.crops[profile.crop]
    : "";

  const disasterCards: Array<{
    id: DisasterType;
    title: string;
    subtitle: string;
    icon: ReactNode;
    activeClass: string;
  }> = [
    {
      id: "cyclone",
      title: DISASTER_GUIDES.cyclone.title[language],
      subtitle: DISASTER_GUIDES.cyclone.subtitle[language],
      icon: <CloudLightning className="w-6 h-6 text-[#4D91B5]" />,
      activeClass: "border-[#4D91B5] bg-[#E8F3F8]",
    },
    {
      id: "flood",
      title: DISASTER_GUIDES.flood.title[language],
      subtitle: DISASTER_GUIDES.flood.subtitle[language],
      icon: <Waves className="w-6 h-6 text-[#39785C]" />,
      activeClass: "border-[#39785C] bg-[#E3F0E8]",
    },
    {
      id: "drought",
      title: DISASTER_GUIDES.drought.title[language],
      subtitle: DISASTER_GUIDES.drought.subtitle[language],
      icon: <Sun className="w-6 h-6 text-[#B45309]" />,
      activeClass: "border-[#B45309] bg-amber-50",
    },
  ];

  const activeGuide = selected ? DISASTER_GUIDES[selected] : null;

  const buildReadAloud = () => {
    if (!activeGuide) return "";
    return [
      activeGuide.title[language],
      `${t.disaster.beforeLabel}: ${activeGuide.before[language].join(". ")}`,
      `${t.disaster.duringLabel}: ${activeGuide.during[language].join(". ")}`,
      `${t.disaster.afterLabel}: ${activeGuide.after[language].join(". ")}`,
    ].join("\n\n");
  };

  return (
    <div className="space-y-6">
      <BackToHome onClick={onBackHome} />

      <div className="space-y-1.5">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#214B3D] tracking-tight">
          {t.disaster.title}
        </h1>
        <p className="text-sm sm:text-base text-[#71877D] max-w-3xl">
          {t.disaster.subtitle}
        </p>
      </div>

      {profile && (
        <div className="bg-[#E3F0E8] border border-[#D3E3D8] rounded-2xl p-4 flex items-center gap-2.5 text-xs sm:text-sm text-[#214B3D]">
          <MapPin className="w-4 h-4 text-[#39785C] shrink-0" />
          <span className="font-medium">
            {t.disaster.farmContextBanner
              .replace("{crop}", cropDisplay)
              .replace("{district}", profile.district)
              .replace("{state}", profile.state || "Andhra Pradesh")}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {disasterCards.map((item) => {
          const isSelected = selected === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelected(item.id)}
              aria-pressed={isSelected}
              className={`text-left rounded-2xl border p-5 transition-all space-y-2.5 min-h-[120px] ${
                isSelected
                  ? item.activeClass
                  : "bg-white border-[#D3E3D8] hover:border-[#39785C]"
              }`}
            >
              <div className="w-11 h-11 rounded-xl bg-white border border-[#D3E3D8] flex items-center justify-center">
                {item.icon}
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#214B3D]">{item.title}</h2>
                <p className="text-xs sm:text-sm text-[#71877D] mt-1">
                  {item.subtitle}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {!activeGuide ? (
        <div className="bg-white border border-[#D3E3D8] rounded-2xl p-8 text-center space-y-2">
          <ShieldCheck className="w-9 h-9 text-[#39785C] mx-auto" />
          <h2 className="text-lg font-bold text-[#214B3D]">
            {t.disaster.emptyTitle}
          </h2>
          <p className="text-sm text-[#71877D] max-w-md mx-auto">
            {t.disaster.emptyBody}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-[#D3E3D8] rounded-2xl p-4">
            <h2 className="text-lg font-bold text-[#214B3D]">
              {activeGuide.title[language]}
            </h2>
            <ReadAloudButton
              text={buildReadAloud()}
              itemId={`disaster-${activeGuide.id}`}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-white border border-[#D3E3D8] rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-[#39785C]">
                <ShieldCheck className="w-5 h-5 shrink-0" />
                <h3>{t.disaster.beforeLabel}</h3>
              </div>
              <ul className="space-y-2.5 text-sm text-[#214B3D] list-disc pl-5 leading-relaxed">
                {activeGuide.before[language].map((step, idx) => (
                  <li key={idx}>{step}</li>
                ))}
              </ul>
            </div>

            <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-[#B45309]">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <h3>{t.disaster.duringLabel}</h3>
              </div>
              <ul className="space-y-2.5 text-sm text-[#214B3D] list-disc pl-5 leading-relaxed">
                {activeGuide.during[language].map((step, idx) => (
                  <li key={idx}>{step}</li>
                ))}
              </ul>
            </div>

            <div className="bg-[#E8F3F8]/60 border border-[#C2DCE8] rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-[#316886]">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <h3>{t.disaster.afterLabel}</h3>
              </div>
              <ul className="space-y-2.5 text-sm text-[#214B3D] list-disc pl-5 leading-relaxed">
                {activeGuide.after[language].map((step, idx) => (
                  <li key={idx}>{step}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <section className="bg-white border border-[#D3E3D8] rounded-2xl p-5 sm:p-6 space-y-2">
        <div className="flex items-center gap-2 text-base font-bold text-[#214B3D]">
          <Info className="w-5 h-5 text-[#4D91B5] shrink-0" />
          <h2>{t.disaster.emergencyTitle}</h2>
        </div>
        <p className="text-sm text-[#214B3D] leading-relaxed">
          {t.disaster.emergencyBody}
        </p>
        <p className="text-xs text-[#71877D]">{t.disaster.emergencyNote}</p>
      </section>
    </div>
  );
}
