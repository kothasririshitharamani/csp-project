import { ArrowLeft } from "lucide-react";
import { useLanguage } from "../hooks/useLanguage";
import { getTranslations } from "../i18n/translations";

interface BackToHomeProps {
  onClick: () => void;
  className?: string;
}

export function BackToHome({ onClick, className = "" }: BackToHomeProps) {
  const { language } = useLanguage();
  const t = getTranslations(language);

  return (
    <div className={className}>
      <button
        type="button"
        onClick={onClick}
        aria-label={t.nav.backToHome}
        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-[#E3F0E8] active:bg-[#D3E3D8] border border-[#D3E3D8] text-[#214B3D] text-sm font-semibold shadow-[0_1px_4px_rgba(33,75,61,0.04)] transition-colors min-h-[40px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39785C] focus-visible:ring-offset-2 focus-visible:ring-offset-[#EDF5EF]"
      >
        <ArrowLeft
          className="w-4 h-4 text-[#39785C] shrink-0"
          aria-hidden="true"
        />
        <span>{t.nav.backToHome}</span>
      </button>
    </div>
  );
}
