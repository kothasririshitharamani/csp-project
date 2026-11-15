import React, { useEffect, useState } from "react";
import { AlertCircle, CalendarClock, Droplets, Info, Sprout } from "lucide-react";
import { BackToHome } from "../components/BackToHome";
import { ReadAloudButton } from "../components/ReadAloudButton";
import { useLanguage } from "../hooks/useLanguage";
import { getTranslations } from "../i18n/translations";
import {
  AreaUnit,
  CropOption,
  FarmProfile,
  GrowthStageOption,
  IrrigationInput,
  IrrigationMethodOption,
  IrrigationRecommendation,
  RecentActivityItem,
  SeasonOption,
  SoilTypeOption,
  WaterAvailabilityOption,
} from "../types/app";
import { generateIrrigationPlan } from "../utils/irrigationCalculator";

interface IrrigationPlannerPageProps {
  profile: FarmProfile | null;
  onSaveActivity: (item: Omit<RecentActivityItem, "id" | "createdAt">) => void;
  prefillInput?: IrrigationInput | null;
  onBackHome: () => void;
}

export function IrrigationPlannerPage({
  profile,
  onSaveActivity,
  prefillInput,
  onBackHome,
}: IrrigationPlannerPageProps) {
  const { language } = useLanguage();
  const t = getTranslations(language);

  const [crop, setCrop] = useState<CropOption>(
    prefillInput?.crop || profile?.crop || "paddy"
  );
  const [customCrop, setCustomCrop] = useState(
    prefillInput?.customCrop || profile?.customCrop || ""
  );
  const [landArea, setLandArea] = useState(
    prefillInput?.landArea
      ? String(prefillInput.landArea)
      : profile?.landArea || "2"
  );
  const [areaUnit, setAreaUnit] = useState<AreaUnit>(
    prefillInput?.areaUnit || profile?.areaUnit || "acres"
  );
  const [growthStage, setGrowthStage] = useState<GrowthStageOption>(
    prefillInput?.growthStage || profile?.growthStage || "vegetative"
  );
  const [season, setSeason] = useState<SeasonOption>(
    prefillInput?.season || "rabi"
  );
  const [soilType, setSoilType] = useState<SoilTypeOption>(
    prefillInput?.soilType || profile?.soilType || "loamy"
  );
  const [irrigationMethod, setIrrigationMethod] =
    useState<IrrigationMethodOption>(
      prefillInput?.irrigationMethod || profile?.irrigationMethod || "flood"
    );
  const [waterAvailability, setWaterAvailability] =
    useState<WaterAvailabilityOption>(
      prefillInput?.waterAvailability ||
        profile?.waterAvailability ||
        "sufficient"
    );

  const [validationError, setValidationError] = useState<string | null>(null);
  const [lastSubmitted, setLastSubmitted] = useState<IrrigationInput | null>(
    prefillInput || null
  );

  useEffect(() => {
    if (prefillInput) {
      setCrop(prefillInput.crop);
      setCustomCrop(prefillInput.customCrop || "");
      setLandArea(String(prefillInput.landArea));
      setAreaUnit(prefillInput.areaUnit);
      setGrowthStage(prefillInput.growthStage);
      setSeason(prefillInput.season);
      setSoilType(prefillInput.soilType);
      setIrrigationMethod(prefillInput.irrigationMethod);
      setWaterAvailability(prefillInput.waterAvailability);
      setLastSubmitted(prefillInput);
    }
  }, [prefillInput]);

  const recommendation: IrrigationRecommendation | null = lastSubmitted
    ? generateIrrigationPlan(lastSubmitted, language)
    : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const parsedArea = Number(landArea);
    if (!landArea.trim() || Number.isNaN(parsedArea) || parsedArea <= 0) {
      setValidationError(t.irrigation.validationArea);
      return;
    }

    if (crop === "other" && !customCrop.trim()) {
      setValidationError(t.irrigation.validationCustomCrop);
      return;
    }

    const input: IrrigationInput = {
      crop,
      customCrop: crop === "other" ? customCrop.trim() : undefined,
      landArea: parsedArea,
      areaUnit,
      growthStage,
      season,
      soilType,
      irrigationMethod,
      waterAvailability,
    };

    setLastSubmitted(input);

    const cropLabel =
      crop === "other" ? customCrop.trim() : t.options.crops[crop];
    const plan = generateIrrigationPlan(input, language);

    onSaveActivity({
      type: "irrigation",
      summaryTitle: `${cropLabel} · ${parsedArea} ${t.options.areaUnits[areaUnit]}`,
      summaryDetail: `${plan.estimatedLitresPerCycle.toLocaleString("en-IN")} L / ${plan.frequencyDaysMin}–${plan.frequencyDaysMax} d`,
      payload: input,
    });
  };

  const buildReadAloud = (rec: IrrigationRecommendation) => {
    return [
      `${t.irrigation.results.timing}: ${rec.suggestedTiming}`,
      `${t.irrigation.results.waterReq}: ${rec.estimatedLitresMin.toLocaleString("en-IN")} to ${rec.estimatedLitresMax.toLocaleString("en-IN")} Litres`,
      `${t.irrigation.results.frequency}: ${t.irrigation.results.everyDays
        .replace("{min}", String(rec.frequencyDaysMin))
        .replace("{max}", String(rec.frequencyDaysMax))}`,
      rec.practicalTips.join(". "),
    ].join("\n\n");
  };

  return (
    <div className="space-y-6">
      <BackToHome onClick={onBackHome} />

      <div className="space-y-1.5">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#214B3D] tracking-tight">
          {t.irrigation.title}
        </h1>
        <p className="text-sm sm:text-base text-[#71877D] max-w-3xl">
          {t.irrigation.subtitle}
        </p>
      </div>

      {profile && (
        <div className="bg-[#E3F0E8] border border-[#D3E3D8] rounded-2xl px-4 py-3 text-xs sm:text-sm text-[#214B3D] flex items-center gap-2.5">
          <Sprout className="w-4 h-4 text-[#39785C] shrink-0" />
          <span>{t.irrigation.prefilledNotice}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-5 bg-white border border-[#D3E3D8] rounded-2xl p-5 sm:p-6 space-y-4 shadow-[0_2px_10px_rgba(33,75,61,0.03)]"
        >
          <div>
            <label
              htmlFor="irr-crop"
              className="block text-sm font-bold text-[#214B3D] mb-1.5"
            >
              {t.irrigation.cropLabel}
            </label>
            <select
              id="irr-crop"
              value={crop}
              onChange={(e) => setCrop(e.target.value as CropOption)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3E3D8] bg-white text-sm text-[#214B3D] min-h-[44px]"
            >
              {(Object.keys(t.options.crops) as CropOption[]).map((key) => (
                <option key={key} value={key}>
                  {t.options.crops[key]}
                </option>
              ))}
            </select>
          </div>

          {crop === "other" && (
            <div>
              <label
                htmlFor="irr-custom-crop"
                className="block text-sm font-bold text-[#214B3D] mb-1.5"
              >
                {t.irrigation.customCropLabel}
              </label>
              <input
                id="irr-custom-crop"
                type="text"
                value={customCrop}
                onChange={(e) => setCustomCrop(e.target.value)}
                placeholder={t.irrigation.customCropPlaceholder}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3E3D8] bg-white text-sm text-[#214B3D] min-h-[44px]"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="irr-area"
                className="block text-sm font-bold text-[#214B3D] mb-1.5"
              >
                {t.irrigation.areaLabel}
              </label>
              <input
                id="irr-area"
                type="number"
                step="0.1"
                min="0.01"
                value={landArea}
                onChange={(e) => setLandArea(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3E3D8] bg-white text-sm text-[#214B3D] min-h-[44px]"
              />
              <p className="text-xs text-[#71877D] mt-1">{t.irrigation.areaHelp}</p>
            </div>

            <div>
              <label
                htmlFor="irr-unit"
                className="block text-sm font-bold text-[#214B3D] mb-1.5"
              >
                {t.irrigation.areaUnitLabel}
              </label>
              <select
                id="irr-unit"
                value={areaUnit}
                onChange={(e) => setAreaUnit(e.target.value as AreaUnit)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3E3D8] bg-white text-sm text-[#214B3D] min-h-[44px]"
              >
                <option value="acres">{t.options.areaUnits.acres}</option>
                <option value="hectares">{t.options.areaUnits.hectares}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="irr-stage"
                className="block text-sm font-bold text-[#214B3D] mb-1.5"
              >
                {t.irrigation.stageLabel}
              </label>
              <select
                id="irr-stage"
                value={growthStage}
                onChange={(e) =>
                  setGrowthStage(e.target.value as GrowthStageOption)
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3E3D8] bg-white text-sm text-[#214B3D] min-h-[44px]"
              >
                {(Object.keys(t.options.stages) as GrowthStageOption[]).map(
                  (key) => (
                    <option key={key} value={key}>
                      {t.options.stages[key]}
                    </option>
                  )
                )}
              </select>
              <p className="text-xs text-[#71877D] mt-1">
                {t.irrigation.stageHelp}
              </p>
            </div>

            <div>
              <label
                htmlFor="irr-season"
                className="block text-sm font-bold text-[#214B3D] mb-1.5"
              >
                {t.irrigation.seasonLabel}
              </label>
              <select
                id="irr-season"
                value={season}
                onChange={(e) => setSeason(e.target.value as SeasonOption)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3E3D8] bg-white text-sm text-[#214B3D] min-h-[44px]"
              >
                {(Object.keys(t.options.seasons) as SeasonOption[]).map((key) => (
                  <option key={key} value={key}>
                    {t.options.seasons[key]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="irr-soil"
              className="block text-sm font-bold text-[#214B3D] mb-1.5"
            >
              {t.irrigation.soilLabel}
            </label>
            <select
              id="irr-soil"
              value={soilType}
              onChange={(e) => setSoilType(e.target.value as SoilTypeOption)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3E3D8] bg-white text-sm text-[#214B3D] min-h-[44px]"
            >
              {(Object.keys(t.options.soils) as SoilTypeOption[]).map((key) => (
                <option key={key} value={key}>
                  {t.options.soils[key]}
                </option>
              ))}
            </select>
            <p className="text-xs text-[#71877D] mt-1">{t.irrigation.soilHelp}</p>
          </div>

          <div>
            <label
              htmlFor="irr-method"
              className="block text-sm font-bold text-[#214B3D] mb-1.5"
            >
              {t.irrigation.methodLabel}
            </label>
            <select
              id="irr-method"
              value={irrigationMethod}
              onChange={(e) =>
                setIrrigationMethod(e.target.value as IrrigationMethodOption)
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3E3D8] bg-white text-sm text-[#214B3D] min-h-[44px]"
            >
              {(Object.keys(t.options.methods) as IrrigationMethodOption[]).map(
                (key) => (
                  <option key={key} value={key}>
                    {t.options.methods[key]}
                  </option>
                )
              )}
            </select>
            <p className="text-xs text-[#71877D] mt-1">
              {t.irrigation.methodHelp}
            </p>
          </div>

          <div>
            <label
              htmlFor="irr-avail"
              className="block text-sm font-bold text-[#214B3D] mb-1.5"
            >
              {t.irrigation.availabilityLabel}
            </label>
            <select
              id="irr-avail"
              value={waterAvailability}
              onChange={(e) =>
                setWaterAvailability(e.target.value as WaterAvailabilityOption)
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3E3D8] bg-white text-sm text-[#214B3D] min-h-[44px]"
            >
              {(
                Object.keys(t.options.availability) as WaterAvailabilityOption[]
              ).map((key) => (
                <option key={key} value={key}>
                  {t.options.availability[key]}
                </option>
              ))}
            </select>
          </div>

          {validationError && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full px-5 py-3.5 rounded-xl bg-[#39785C] text-white text-base font-semibold hover:bg-[#2f634c] transition-colors min-h-[48px]"
          >
            {t.irrigation.generateBtn}
          </button>
        </form>

        <section className="lg:col-span-7 space-y-4">
          {!recommendation ? (
            <div className="bg-white border border-[#D3E3D8] rounded-2xl p-8 text-center space-y-2">
              <Sprout className="w-8 h-8 text-[#39785C] mx-auto" />
              <h2 className="text-lg font-bold text-[#214B3D]">
                {t.irrigation.title}
              </h2>
              <p className="text-sm text-[#71877D] max-w-md mx-auto">
                {t.irrigation.subtitle}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm text-amber-950 space-y-1">
                  <p className="font-bold">{t.irrigation.disclaimerTitle}</p>
                  <p>{t.irrigation.disclaimerBody}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-[#D3E3D8] rounded-2xl p-4">
                <span className="text-sm font-bold text-[#214B3D]">
                  {lastSubmitted?.crop === "other"
                    ? lastSubmitted.customCrop
                    : lastSubmitted
                      ? t.options.crops[lastSubmitted.crop]
                      : ""}{" "}
                  · {lastSubmitted?.landArea}{" "}
                  {lastSubmitted
                    ? t.options.areaUnits[lastSubmitted.areaUnit]
                    : ""}
                </span>
                <ReadAloudButton
                  text={buildReadAloud(recommendation)}
                  itemId="irrigation-plan"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white border border-[#D3E3D8] rounded-2xl p-5 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-[#4D91B5]">
                    <Droplets className="w-4 h-4 shrink-0" />
                    <h3>{t.irrigation.results.waterReq}</h3>
                  </div>
                  <p className="text-2xl font-bold text-[#214B3D] font-mono-tabular">
                    {recommendation.estimatedLitresMin.toLocaleString("en-IN")} –{" "}
                    {recommendation.estimatedLitresMax.toLocaleString("en-IN")} L
                  </p>
                  <p className="text-xs text-[#71877D]">
                    {t.irrigation.results.depthApprox.replace(
                      "{mm}",
                      String(recommendation.estimatedDepthMm)
                    )}
                  </p>
                </div>

                <div className="bg-white border border-[#D3E3D8] rounded-2xl p-5 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-[#39785C]">
                    <CalendarClock className="w-4 h-4 shrink-0" />
                    <h3>{t.irrigation.results.frequency}</h3>
                  </div>
                  <p className="text-2xl font-bold text-[#214B3D] tabular-nums">
                    {t.irrigation.results.everyDays
                      .replace("{min}", String(recommendation.frequencyDaysMin))
                      .replace("{max}", String(recommendation.frequencyDaysMax))}
                  </p>
                  <p className="text-xs text-[#71877D]">
                    {lastSubmitted
                      ? t.options.methods[lastSubmitted.irrigationMethod]
                      : ""}
                  </p>
                </div>
              </div>

              <div className="bg-white border border-[#D3E3D8] rounded-2xl p-5 space-y-2">
                <h3 className="text-sm font-bold text-[#39785C]">
                  {t.irrigation.results.timing}
                </h3>
                <p className="text-sm text-[#214B3D] leading-relaxed">
                  {recommendation.suggestedTiming}
                </p>
              </div>

              <div className="bg-white border border-[#D3E3D8] rounded-2xl p-5 space-y-2.5">
                <h3 className="text-sm font-bold text-[#214B3D]">
                  {t.irrigation.results.practicalTips}
                </h3>
                <ul className="space-y-2 text-sm text-[#214B3D] list-disc pl-5">
                  {recommendation.practicalTips.map((tip, idx) => (
                    <li key={idx}>{tip}</li>
                  ))}
                </ul>
              </div>

              <div className="bg-white border border-[#D3E3D8] rounded-2xl p-5 space-y-3">
                <h3 className="text-sm font-bold text-[#39785C]">
                  {t.irrigation.results.waterSaving}
                </h3>
                <div className="space-y-3">
                  {recommendation.waterSavingAdvice.map((advice, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl bg-[#EDF5EF] border border-[#D3E3D8] p-3.5 space-y-1"
                    >
                      <p className="text-sm font-semibold text-[#214B3D]">
                        {advice.title}
                      </p>
                      <p className="text-xs sm:text-sm text-[#71877D]">
                        {advice.reason}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border border-[#D3E3D8] rounded-2xl p-5 space-y-2">
                  <h3 className="text-sm font-bold text-[#214B3D]">
                    {t.irrigation.results.changingFactors}
                  </h3>
                  <ul className="space-y-1.5 text-xs sm:text-sm text-[#71877D] list-disc pl-5">
                    {recommendation.changingFactors.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-white border border-[#D3E3D8] rounded-2xl p-5 space-y-2">
                  <h3 className="text-sm font-bold text-[#214B3D]">
                    {t.irrigation.results.assumptions}
                  </h3>
                  <ul className="space-y-1.5 text-xs sm:text-sm text-[#71877D] list-disc pl-5">
                    {recommendation.assumptions.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                    {recommendation.limitations.map((item, idx) => (
                      <li key={`lim-${idx}`} className="text-amber-900">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
