export type Language = "te" | "en" | "hi";

export type AuthView = "login" | "register" | "forgot";

export type PageId =
  | "home"
  | "soil"
  | "irrigation"
  | "budget"
  | "weather"
  | "disaster"
  | "faq"
  | "profile_setup";

export type CropOption =
  | "paddy"
  | "maize"
  | "cotton"
  | "groundnut"
  | "chilli"
  | "sugarcane"
  | "pulses"
  | "other";

export type AreaUnit = "acres" | "hectares";
export type SeasonOption = "kharif" | "rabi" | "summer";
export type SoilTypeOption = "sandy" | "clay" | "loamy" | "black" | "red" | "unknown";
export type WaterSourceOption =
  | "borewell"
  | "open_well"
  | "canal"
  | "rainwater"
  | "tank"
  | "other";
export type IrrigationMethodOption = "drip" | "sprinkler" | "flood" | "unknown";
export type WaterAvailabilityOption = "sufficient" | "limited" | "very_limited";
export type GrowthStageOption =
  | "initial"
  | "vegetative"
  | "flowering"
  | "maturity"
  | "unknown";

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
  authMode: "firebase" | "demo_server";
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
  customCrop?: string;
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

export interface RecentActivityItem {
  id: string;
  type: "irrigation" | "budget";
  createdAt: string;
  summaryTitle: string;
  summaryDetail: string;
  payload: IrrigationInput | WaterBudgetInput;
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
