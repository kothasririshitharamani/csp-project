import { useState } from "react";
import {
  Droplets,
  History,
  Leaf,
  LogOut,
  Menu,
  Mic,
  UserCog,
  X,
} from "lucide-react";
import { useLanguage } from "../hooks/useLanguage";
import { getTranslations } from "../i18n/translations";
import { Language, PageId } from "../types/app";
import { LanguageSelector } from "./LanguageSelector";

interface HeaderProps {
  currentPage: PageId;
  profileComplete: boolean;
  onNavigate: (page: PageId) => void;
  onOpenVoice: () => void;
  onOpenHistory: () => void;
  onLogout: () => void;
  onLanguageChange: (lang: Language) => void;
}

export function Header({
  currentPage,
  profileComplete,
  onNavigate,
  onOpenVoice,
  onOpenHistory,
  onLogout,
  onLanguageChange,
}: HeaderProps) {
  const { language } = useLanguage();
  const t = getTranslations(language);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: Array<{ id: PageId; label: string }> = profileComplete
    ? [
        { id: "home", label: t.nav.home },
        { id: "soil", label: t.nav.soil },
        { id: "irrigation", label: t.nav.irrigation },
        { id: "budget", label: t.nav.budget },
        { id: "weather", label: t.nav.weather },
        { id: "disaster", label: t.nav.disaster },
        { id: "faq", label: t.nav.faq },
      ]
    : [];

  const handleSelect = (page: PageId) => {
    onNavigate(page);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-[#D3E3D8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => handleSelect(profileComplete ? "home" : "profile_setup")}
          className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 rounded-lg py-1 pr-2 hover:opacity-90 transition-opacity"
        >
          <span
            className="w-9 h-9 rounded-xl bg-[#E3F0E8] border border-[#D3E3D8] flex items-center justify-center relative shrink-0"
            aria-hidden="true"
          >
            <Leaf className="w-4 h-4 text-[#39785C] -translate-x-1" />
            <Droplets className="w-4 h-4 text-[#4D91B5] translate-x-1 translate-y-0.5" />
          </span>
          <span className="font-bold text-sm sm:text-base text-[#214B3D] tracking-tight whitespace-nowrap">
            {t.appShortName}
          </span>
        </button>

        {navItems.length > 0 && (
          <nav
            aria-label="Main navigation"
            className="hidden xl:flex items-center gap-4"
          >
            {navItems.map((item) => {
              const active = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item.id)}
                  className={`text-sm font-medium whitespace-nowrap shrink-0 py-1.5 border-b-2 transition-colors ${
                    active
                      ? "text-[#39785C] border-[#39785C] font-semibold"
                      : "text-[#71877D] border-transparent hover:text-[#214B3D] hover:border-[#D3E3D8]"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        )}

        <div className="flex items-center gap-2 shrink-0">
          <LanguageSelector onLanguageChange={onLanguageChange} />

          {profileComplete && (
            <button
              type="button"
              onClick={onOpenVoice}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#4D91B5] text-white text-xs font-semibold hover:bg-[#3f7d9e] transition-colors whitespace-nowrap shrink-0 min-h-[38px]"
            >
              <Mic className="w-3.5 h-3.5 shrink-0" />
              <span>{t.nav.voiceShortcut}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onLogout}
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#EDF5EF] border border-[#D3E3D8] text-[#214B3D] text-xs font-semibold hover:bg-[#E3F0E8] transition-colors whitespace-nowrap shrink-0 min-h-[38px]"
          >
            <LogOut className="w-3.5 h-3.5 text-[#39785C] shrink-0" />
            <span>{t.nav.logout}</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? t.nav.close : t.nav.menu}
            className="xl:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[#EDF5EF] border border-[#D3E3D8] text-[#214B3D] hover:bg-[#E3F0E8] transition-colors"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="xl:hidden border-t border-[#D3E3D8] bg-white px-4 py-4 shadow-md space-y-3">
          {navItems.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {navItems.map((item) => {
                const active = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold min-h-[44px] transition-colors ${
                      active
                        ? "bg-[#39785C] text-white"
                        : "bg-[#EDF5EF] text-[#214B3D] hover:bg-[#E3F0E8]"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          )}

          <div className="pt-2 border-t border-[#D3E3D8] flex flex-wrap gap-2">
            {profileComplete && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenVoice();
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#4D91B5] text-white text-sm font-semibold min-h-[44px]"
                >
                  <Mic className="w-4 h-4" />
                  <span>{t.nav.voiceShortcut}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelect("profile_setup")}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#EDF5EF] border border-[#D3E3D8] text-[#214B3D] text-sm font-semibold min-h-[44px]"
                >
                  <UserCog className="w-4 h-4 text-[#39785C]" />
                  <span>{t.nav.editProfile}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenHistory();
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#EDF5EF] border border-[#D3E3D8] text-[#214B3D] text-sm font-semibold min-h-[44px]"
                >
                  <History className="w-4 h-4 text-[#4D91B5]" />
                  <span>{t.nav.recentActivity}</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onLogout();
              }}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-red-900 text-sm font-semibold min-h-[44px]"
            >
              <LogOut className="w-4 h-4" />
              <span>{t.nav.logout}</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
