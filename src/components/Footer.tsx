import { Droplets, Leaf } from "lucide-react";
import { useLanguage } from "../hooks/useLanguage";
import { getTranslations } from "../i18n/translations";
import { PageId } from "../types/app";

interface FooterProps {
  profileComplete: boolean;
  onNavigate: (page: PageId) => void;
}

export function Footer({ profileComplete, onNavigate }: FooterProps) {
  const { language } = useLanguage();
  const t = getTranslations(language);

  return (
    <footer className="mt-14 border-t border-[#D3E3D8] bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2 text-[#214B3D] font-semibold text-sm">
              <Leaf className="w-4 h-4 text-[#39785C]" />
              <Droplets className="w-4 h-4 text-[#4D91B5]" />
              <span>{t.appName}</span>
            </div>
            <p className="text-xs sm:text-sm text-[#71877D]">{t.footer.tagline}</p>
            <p className="text-xs text-[#71877D]">{t.footer.disclaimer}</p>
          </div>

          {profileComplete && (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium text-[#39785C]">
              <button
                type="button"
                onClick={() => onNavigate("home")}
                className="hover:underline whitespace-nowrap"
              >
                {t.nav.home}
              </button>
              <button
                type="button"
                onClick={() => onNavigate("irrigation")}
                className="hover:underline whitespace-nowrap"
              >
                {t.nav.irrigation}
              </button>
              <button
                type="button"
                onClick={() => onNavigate("budget")}
                className="hover:underline whitespace-nowrap"
              >
                {t.nav.budget}
              </button>
              <button
                type="button"
                onClick={() => onNavigate("faq")}
                className="hover:underline whitespace-nowrap"
              >
                {t.nav.faq}
              </button>
              <button
                type="button"
                onClick={() => onNavigate("profile_setup")}
                className="hover:underline whitespace-nowrap"
              >
                {t.nav.editProfile}
              </button>
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
