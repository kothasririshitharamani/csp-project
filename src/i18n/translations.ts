import { EN, type TranslationDict } from "./schema";
import { TE } from "./locales/te";
import { TA } from "./locales/ta";
import { ML } from "./locales/ml";
import { HI } from "./locales/hi";
import { KN } from "./locales/kn";
import { BN } from "./locales/bn";
import { MR } from "./locales/mr";
import type { Language } from "../types/app";

export type { TranslationDict };

export const TRANSLATIONS: Record<Language, TranslationDict> = {
  en: EN,
  te: TE,
  ta: TA,
  ml: ML,
  hi: HI,
  kn: KN,
  bn: BN,
  mr: MR,
};

export function getTranslations(language: Language): TranslationDict {
  return TRANSLATIONS[language] || EN;
}
