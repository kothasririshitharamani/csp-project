export type Language = "en" | "te" | "ta" | "ml" | "hi" | "kn" | "bn" | "mr";

export const SUPPORTED_LANGUAGES: readonly Language[] = [
  "en",
  "te",
  "ta",
  "ml",
  "hi",
  "kn",
  "bn",
  "mr",
] as const;

export interface LanguageMeta {
  code: Language;
  bcp47: string;
  nativeName: string;
  englishName: string;
  defaultTtsRate: number;
}

export const LANGUAGE_META: Record<Language, LanguageMeta> = {
  en: {
    code: "en",
    bcp47: "en-IN",
    nativeName: "English",
    englishName: "English",
    defaultTtsRate: 0.95,
  },
  te: {
    code: "te",
    bcp47: "te-IN",
    nativeName: "తెలుగు",
    englishName: "Telugu",
    defaultTtsRate: 0.9,
  },
  ta: {
    code: "ta",
    bcp47: "ta-IN",
    nativeName: "தமிழ்",
    englishName: "Tamil",
    defaultTtsRate: 0.92,
  },
  ml: {
    code: "ml",
    bcp47: "ml-IN",
    nativeName: "മലയാളം",
    englishName: "Malayalam",
    defaultTtsRate: 0.92,
  },
  hi: {
    code: "hi",
    bcp47: "hi-IN",
    nativeName: "हिन्दी",
    englishName: "Hindi",
    defaultTtsRate: 0.93,
  },
  kn: {
    code: "kn",
    bcp47: "kn-IN",
    nativeName: "ಕನ್ನಡ",
    englishName: "Kannada",
    defaultTtsRate: 0.92,
  },
  bn: {
    code: "bn",
    bcp47: "bn-IN",
    nativeName: "বাংলা",
    englishName: "Bengali",
    defaultTtsRate: 0.92,
  },
  mr: {
    code: "mr",
    bcp47: "mr-IN",
    nativeName: "मराठी",
    englishName: "Marathi",
    defaultTtsRate: 0.93,
  },
};

export function isSupportedLanguage(val: unknown): val is Language {
  return (
    typeof val === "string" &&
    (SUPPORTED_LANGUAGES as readonly string[]).includes(val)
  );
}

export type PageId =
  | "home"
  | "soil"
  | "irrigation"
  | "budget"
  | "weather"
  | "disaster"
  | "faq"
  | "profile_setup";

export type AuthView = "login" | "register" | "forgot";

export type AreaUnit = "acres" | "hectares";

export type CropOption =
  | "paddy"
  | "maize"
  | "cotton"
  | "groundnut"
  | "chilli"
  | "sugarcane"
  | "pulses"
  | "other";

export type GrowthStageOption =
  | "initial"
  | "vegetative"
  | "flowering"
  | "maturity"
  | "unknown";

export type SeasonOption = "kharif" | "rabi" | "summer";

export type SoilTypeOption =
  | "red"
  | "black"
  | "sandy"
  | "clay"
  | "loamy"
  | "unknown";

export type WaterSourceOption =
  | "borewell"
  | "open_well"
  | "canal"
  | "rainwater"
  | "tank"
  | "other";

export type IrrigationMethodOption =
  | "drip"
  | "sprinkler"
  | "flood"
  | "unknown";

export type WaterAvailabilityOption =
  | "sufficient"
  | "limited"
  | "very_limited";

export type WaterUnit = "litres" | "kilolitres" | "cubic_metres";

export type DisasterType = "cyclone" | "flood" | "drought";

export interface FarmProfile {
  farmerName: string;
  mobileNumber: string;
  village: string;
  mandal: string;
  district: string;
  state: string;
  landArea: string;
  areaUnit: AreaUnit;
  crop: CropOption;
  customCrop: string;
  otherCrops: string;
  growthStage: GrowthStageOption;
  soilType: SoilTypeOption;
  waterSource: WaterSourceOption;
  irrigationMethod: IrrigationMethodOption;
  waterAvailability: WaterAvailabilityOption;
  updatedAt: string;
}

export interface AuthUser {
  id: string;
  fullName: string;
  mobileNumber: string;
  preferredLanguage: Language;
  profileComplete: boolean;
  profile: FarmProfile | null;
  authMode: "demo_server";
}

export interface IrrigationInput {
  crop: CropOption;
  customCrop?: string;
  landArea: number;
  areaUnit: AreaUnit;
  growthStage: GrowthStageOption;
  season: SeasonOption;
  soilType: SoilTypeOption;
  irrigationMethod: IrrigationMethodOption;
  waterAvailability: WaterAvailabilityOption;
}

export interface IrrigationRecommendation {
  estimatedLitresPerCycle: number;
  estimatedLitresMin: number;
  estimatedLitresMax: number;
  estimatedDepthMm: number;
  frequencyDaysMin: number;
  frequencyDaysMax: number;
  suggestedTiming: string;
  practicalTips: string[];
  waterSavingAdvice: Array<{ title: string; reason: string }>;
  changingFactors: string[];
  assumptions: string[];
  limitations: string[];
}

export interface WaterBudgetInput {
  availableWater: number;
  waterUnit: WaterUnit;
  crop: CropOption;
  landArea: number;
  areaUnit: AreaUnit;
  irrigationMethod: IrrigationMethodOption;
  knownWaterPerIrrigationLitres?: number;
  planningDays?: number;
}

export interface WaterBudgetResult {
  availableWaterLitres: number;
  availableWaterKilolitres: number;
  waterPerIrrigationLitres: number;
  usedKnownPerIrrigation: boolean;
  possibleCycles: number;
  assumedIntervalDays: number;
  estimatedDaysLast: number;
  requiredCyclesForPlanningDays: number | null;
  requiredWaterForPlanningDaysLitres: number | null;
  shortageLitres: number | null;
  surplusLitres: number | null;
  formulaCycles: string;
  formulaDays: string;
  assumptions: string[];
}

export interface SoilAnalysisResult {
  visibleCharacteristics: string;
  moistureCondition: string;
  drainageAndRetentionSigns: string;
  concernsToCheck: string[];
  waterManagementPractices: string[];
  practicalNextSteps: string[];
  preliminaryDisclaimer: string;
}

export interface RecentActivityItem {
  id: string;
  type: "irrigation" | "budget";
  createdAt: string;
  summaryTitle: string;
  summaryDetail: string;
  payload: IrrigationInput | WaterBudgetInput;
}
