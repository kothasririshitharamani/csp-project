import { Globe } from "lucide-react";
import { useLanguage } from "../hooks/useLanguage";
import { LANGUAGE_META, Language, SUPPORTED_LANGUAGES } from "../types/app";

interface LanguageSelectorProps {
  onLanguageChange?: (lang: Language) => void;
  variant?: "light" | "dark";
  id?: string;
}

export function LanguageSelector({
  onLanguageChange,
  variant = "light",
  id,
}: LanguageSelectorProps) {
  const { language, setLanguage } = useLanguage();

  const handleChange = (next: Language) => {
    setLanguage(next);
    onLanguageChange?.(next);
  };

  return (
    <div className="inline-flex items-center gap-1.5">
      <label htmlFor={id || `lang-select-${variant}`} className="sr-only">
        Language selector
      </label>
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-colors min-h-[38px] ${
          variant === "dark"
            ? "bg-[#18382D] border-[#39785C] text-white"
            : "bg-[#EDF5EF] border-[#D3E3D8] text-[#214B3D]"
        }`}
      >
        <Globe
          className={`w-3.5 h-3.5 shrink-0 ${
            variant === "dark" ? "text-[#A7D7BE]" : "text-[#39785C]"
          }`}
          aria-hidden="true"
        />
        <select
          id={id || `lang-select-${variant}`}
          aria-label="Select application language"
          value={language}
          onChange={(e) => handleChange(e.target.value as Language)}
          className={`bg-transparent text-xs sm:text-sm font-semibold focus:outline-none cursor-pointer pr-1 ${
            variant === "dark" ? "text-white" : "text-[#214B3D]"
          }`}
        >
          {SUPPORTED_LANGUAGES.map((code) => {
            const meta = LANGUAGE_META[code];
            return (
              <option
                key={code}
                value={code}
                className="bg-white text-[#214B3D]"
              >
                {meta.nativeName}
                {meta.nativeName !== meta.englishName
                  ? ` (${meta.englishName})`
                  : ""}
              </option>
            );
          })}
        </select>
      </div>
    </div>
  );
}
