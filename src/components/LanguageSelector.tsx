import { useLanguage } from "../hooks/useLanguage";
import { Language } from "../types/app";

interface LanguageSelectorProps {
  onLanguageChange?: (lang: Language) => void;
  variant?: "light" | "dark";
}

export function LanguageSelector({
  onLanguageChange,
  variant = "light",
}: LanguageSelectorProps) {
  const { language, setLanguage } = useLanguage();

  const items: Array<{ code: Language; label: string }> = [
    { code: "te", label: "తెలుగు" },
    { code: "en", label: "English" },
    { code: "hi", label: "हिन्दी" },
  ];

  const handleSelect = (code: Language) => {
    setLanguage(code);
    onLanguageChange?.(code);
  };

  return (
    <div
      role="group"
      aria-label="Language selector"
      className={`inline-flex items-center p-0.5 rounded-xl border ${
        variant === "dark"
          ? "bg-[#18382D] border-[#39785C]"
          : "bg-[#EDF5EF] border-[#D3E3D8]"
      }`}
    >
      {items.map((item) => {
        const active = language === item.code;
        return (
          <button
            key={item.code}
            type="button"
            onClick={() => handleSelect(item.code)}
            aria-pressed={active}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors min-h-[34px] ${
              active
                ? "bg-[#39785C] text-white"
                : variant === "dark"
                  ? "text-[#E3F0E8] hover:bg-[#295948]"
                  : "text-[#214B3D] hover:bg-[#E3F0E8]"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
