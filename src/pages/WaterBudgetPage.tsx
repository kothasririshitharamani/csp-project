import React, { useEffect, useState } from "react";
import { AlertCircle, AlertTriangle, Calculator, Droplets, RotateCcw } from "lucide-react";
import { BackToHome } from "../components/BackToHome";
import { ReadAloudButton } from "../components/ReadAloudButton";
import { useLanguage } from "../hooks/useLanguage";
import { getTranslations } from "../i18n/translations";
import {
  AreaUnit,
  CropOption,
  FarmProfile,
  IrrigationMethodOption,
  RecentActivityItem,
  WaterBudgetInput,
  WaterBudgetResult,
  WaterUnit,
} from "../types/app";
import { calculateWaterBudget } from "../utils/waterBudgetCalculator";

interface WaterBudgetPageProps {
  profile: FarmProfile | null;
  onSaveActivity: (item: Omit<RecentActivityItem, "id" | "createdAt">) => void;
  prefillInput?: WaterBudgetInput | null;
  onBackHome: () => void;
}

export function WaterBudgetPage({
  profile,
  onSaveActivity,
  prefillInput,
  onBackHome,
}: WaterBudgetPageProps) {
  const { language } = useLanguage();
  const t = getTranslations(language);

  const [availableWater, setAvailableWater] = useState(
    prefillInput?.availableWater ? String(prefillInput.availableWater) : ""
  );
  const [waterUnit, setWaterUnit] = useState<WaterUnit>(
    prefillInput?.waterUnit || "kilolitres"
  );
  const [crop, setCrop] = useState<CropOption>(
    prefillInput?.crop || profile?.crop || "groundnut"
  );
  const [landArea, setLandArea] = useState(
    prefillInput?.landArea
      ? String(prefillInput.landArea)
      : profile?.landArea || "2"
  );
  const [areaUnit, setAreaUnit] = useState<AreaUnit>(
    prefillInput?.areaUnit || profile?.areaUnit || "acres"
  );
  const [irrigationMethod, setIrrigationMethod] =
    useState<IrrigationMethodOption>(
      prefillInput?.irrigationMethod || profile?.irrigationMethod || "drip"
    );
  const [knownPerIrrigation, setKnownPerIrrigation] = useState(
    prefillInput?.knownWaterPerIrrigationLitres
      ? String(prefillInput.knownWaterPerIrrigationLitres)
      : ""
  );
  const [planningDays, setPlanningDays] = useState(
    prefillInput?.planningDays ? String(prefillInput.planningDays) : "30"
  );

  const [error, setError] = useState<string | null>(null);
  const [submittedInput, setSubmittedInput] = useState<WaterBudgetInput | null>(
    prefillInput || null
  );

  useEffect(() => {
    if (prefillInput) {
      setAvailableWater(String(prefillInput.availableWater));
      setWaterUnit(prefillInput.waterUnit);
      setCrop(prefillInput.crop);
      setLandArea(String(prefillInput.landArea));
      setAreaUnit(prefillInput.areaUnit);
      setIrrigationMethod(prefillInput.irrigationMethod);
      setKnownPerIrrigation(
        prefillInput.knownWaterPerIrrigationLitres
          ? String(prefillInput.knownWaterPerIrrigationLitres)
          : ""
      );
      setPlanningDays(
        prefillInput.planningDays ? String(prefillInput.planningDays) : ""
      );
      setSubmittedInput(prefillInput);
    }
  }, [prefillInput]);

  const result: WaterBudgetResult | null = submittedInput
    ? calculateWaterBudget(submittedInput, language)
    : null;

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const waterVal = Number(availableWater);
    if (!availableWater.trim() || Number.isNaN(waterVal) || waterVal <= 0) {
      setError(t.budget.validationWater);
      return;
    }

    const areaVal = Number(landArea);
    if (!landArea.trim() || Number.isNaN(areaVal) || areaVal <= 0) {
      setError(t.budget.validationArea);
      return;
    }

    let knownVal: number | undefined;
    if (knownPerIrrigation.trim()) {
      const parsed = Number(knownPerIrrigation);
      if (Number.isNaN(parsed) || parsed <= 0) {
        setError(t.budget.validationKnownReq);
        return;
      }
      knownVal = parsed;
    }

    let daysVal: number | undefined;
    if (planningDays.trim()) {
      const parsed = Number(planningDays);
      if (Number.isNaN(parsed) || parsed <= 0) {
        setError(t.budget.validationPlanningDays);
        return;
      }
      daysVal = Math.round(parsed);
    }

    const input: WaterBudgetInput = {
      availableWater: waterVal,
      waterUnit,
      crop,
      landArea: areaVal,
      areaUnit,
      irrigationMethod,
      knownWaterPerIrrigationLitres: knownVal,
      planningDays: daysVal,
    };

    setSubmittedInput(input);
    const calc = calculateWaterBudget(input, language);

    onSaveActivity({
      type: "budget",
      summaryTitle: `${t.options.crops[crop]} · ${waterVal.toLocaleString("en-IN")} ${t.options.waterUnits[waterUnit]}`,
      summaryDetail: `${calc.possibleCycles} cycles · ~${calc.estimatedDaysLast} days`,
      payload: input,
    });
  };

  const handleReset = () => {
    setAvailableWater("");
    setKnownPerIrrigation("");
    setPlanningDays("");
    setError(null);
    setSubmittedInput(null);
  };

  const buildReadAloud = (res: WaterBudgetResult) => {
    return [
      `${t.budget.results.availableStandard}: ${res.availableWaterLitres.toLocaleString("en-IN")} Litres`,
      `${t.budget.results.perIrrigation}: ${res.waterPerIrrigationLitres.toLocaleString("en-IN")} Litres`,
      `${t.budget.results.possibleCycles}: ${res.possibleCycles}`,
      `${t.budget.results.daysLast}: ${res.estimatedDaysLast}`,
      t.budget.warningEstimate,
    ].join("\n\n");
  };

  return (
    <div className="space-y-6">
      <BackToHome onClick={onBackHome} />

      <div className="space-y-1.5">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#214B3D] tracking-tight">
          {t.budget.title}
        </h1>
        <p className="text-sm sm:text-base text-[#71877D] max-w-3xl">
          {t.budget.subtitle}
        </p>
      </div>

      {profile && (
        <div className="bg-[#E8F3F8] border border-[#C2DCE8] rounded-2xl px-4 py-3 text-xs sm:text-sm text-[#214B3D] flex items-center gap-2.5">
          <Droplets className="w-4 h-4 text-[#4D91B5] shrink-0" />
          <span>{t.budget.prefilledNotice}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={handleCalculate}
          className="lg:col-span-5 bg-white border border-[#D3E3D8] rounded-2xl p-5 sm:p-6 space-y-4 shadow-[0_2px_10px_rgba(33,75,61,0.03)]"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="wb-water"
                className="block text-sm font-bold text-[#214B3D] mb-1.5"
              >
                {t.budget.availableWaterLabel}
              </label>
              <input
                id="wb-water"
                type="number"
                step="any"
                min="0.01"
                value={availableWater}
                onChange={(e) => setAvailableWater(e.target.value)}
                placeholder="250"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3E3D8] bg-white text-sm text-[#214B3D] min-h-[44px]"
              />
            </div>

            <div>
              <label
                htmlFor="wb-unit"
                className="block text-sm font-bold text-[#214B3D] mb-1.5"
              >
                {t.budget.waterUnitLabel}
              </label>
              <select
                id="wb-unit"
                value={waterUnit}
                onChange={(e) => setWaterUnit(e.target.value as WaterUnit)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3E3D8] bg-white text-sm text-[#214B3D] min-h-[44px]"
              >
                {(Object.keys(t.options.waterUnits) as WaterUnit[]).map((u) => (
                  <option key={u} value={u}>
                    {t.options.waterUnits[u]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-xs text-[#71877D] -mt-2">
            {t.budget.availableWaterHelp}
          </p>

          <div>
            <label
              htmlFor="wb-crop"
              className="block text-sm font-bold text-[#214B3D] mb-1.5"
            >
              {t.budget.cropLabel}
            </label>
            <select
              id="wb-crop"
              value={crop}
              onChange={(e) => setCrop(e.target.value as CropOption)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3E3D8] bg-white text-sm text-[#214B3D] min-h-[44px]"
            >
              {(Object.keys(t.options.crops) as CropOption[]).map((c) => (
                <option key={c} value={c}>
                  {t.options.crops[c]}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="wb-area"
                className="block text-sm font-bold text-[#214B3D] mb-1.5"
              >
                {t.budget.areaLabel}
              </label>
              <input
                id="wb-area"
                type="number"
                step="0.1"
                min="0.01"
                value={landArea}
                onChange={(e) => setLandArea(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3E3D8] bg-white text-sm text-[#214B3D] min-h-[44px]"
              />
            </div>

            <div>
              <label
                htmlFor="wb-area-unit"
                className="block text-sm font-bold text-[#214B3D] mb-1.5"
              >
                {t.budget.areaUnitLabel}
              </label>
              <select
                id="wb-area-unit"
                value={areaUnit}
                onChange={(e) => setAreaUnit(e.target.value as AreaUnit)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3E3D8] bg-white text-sm text-[#214B3D] min-h-[44px]"
              >
                <option value="acres">{t.options.areaUnits.acres}</option>
                <option value="hectares">{t.options.areaUnits.hectares}</option>
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="wb-method"
              className="block text-sm font-bold text-[#214B3D] mb-1.5"
            >
              {t.budget.methodLabel}
            </label>
            <select
              id="wb-method"
              value={irrigationMethod}
              onChange={(e) =>
                setIrrigationMethod(e.target.value as IrrigationMethodOption)
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3E3D8] bg-white text-sm text-[#214B3D] min-h-[44px]"
            >
              {(Object.keys(t.options.methods) as IrrigationMethodOption[]).map(
                (m) => (
                  <option key={m} value={m}>
                    {t.options.methods[m]}
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <label
              htmlFor="wb-known"
              className="block text-sm font-bold text-[#214B3D] mb-1.5"
            >
              {t.budget.knownReqLabel}
            </label>
            <input
              id="wb-known"
              type="number"
              step="1"
              min="1"
              value={knownPerIrrigation}
              onChange={(e) => setKnownPerIrrigation(e.target.value)}
              placeholder="e.g., 45000"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3E3D8] bg-white text-sm text-[#214B3D] min-h-[44px]"
            />
            <p className="text-xs text-[#71877D] mt-1">{t.budget.knownReqHelp}</p>
          </div>

          <div>
            <label
              htmlFor="wb-days"
              className="block text-sm font-bold text-[#214B3D] mb-1.5"
            >
              {t.budget.planningDaysLabel}
            </label>
            <input
              id="wb-days"
              type="number"
              step="1"
              min="1"
              value={planningDays}
              onChange={(e) => setPlanningDays(e.target.value)}
              placeholder="30"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3E3D8] bg-white text-sm text-[#214B3D] min-h-[44px]"
            />
            <p className="text-xs text-[#71877D] mt-1">
              {t.budget.planningDaysHelp}
            </p>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center gap-2.5 pt-1">
            <button
              type="submit"
              className="flex-1 px-5 py-3.5 rounded-xl bg-[#4D91B5] text-white text-base font-semibold hover:bg-[#3f7d9e] transition-colors min-h-[48px]"
            >
              {t.budget.calculateBtn}
            </button>
            <button
              type="button"
              onClick={handleReset}
              aria-label={t.budget.resetBtn}
              className="px-4 py-3.5 rounded-xl border border-[#D3E3D8] bg-[#EDF5EF] text-[#214B3D] text-sm font-semibold hover:bg-[#E3F0E8] min-h-[48px] inline-flex items-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{t.budget.resetBtn}</span>
            </button>
          </div>
        </form>

        <section className="lg:col-span-7 space-y-4">
          {!result ? (
            <div className="bg-white border border-[#D3E3D8] rounded-2xl p-8 text-center space-y-2">
              <Calculator className="w-8 h-8 text-[#4D91B5] mx-auto" />
              <h2 className="text-lg font-bold text-[#214B3D]">
                {t.budget.title}
              </h2>
              <p className="text-sm text-[#71877D] max-w-md mx-auto">
                {t.budget.subtitle}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <p className="text-xs sm:text-sm text-amber-950">
                  {t.budget.warningEstimate}
                </p>
              </div>

              <div className="bg-white border border-[#D3E3D8] rounded-2xl p-5 sm:p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg font-bold text-[#214B3D]">
                    {t.options.crops[submittedInput!.crop]} ·{" "}
                    {submittedInput!.landArea}{" "}
                    {t.options.areaUnits[submittedInput!.areaUnit]}
                  </h2>
                  <ReadAloudButton
                    text={buildReadAloud(result)}
                    itemId="water-budget"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-xl bg-[#EDF5EF] border border-[#D3E3D8] p-4 space-y-1">
                    <div className="text-xs font-semibold text-[#71877D]">
                      {t.budget.results.availableStandard}
                    </div>
                    <div className="text-xl font-bold text-[#214B3D] font-mono-tabular">
                      {result.availableWaterLitres.toLocaleString("en-IN")} L
                    </div>
                    <div className="text-xs text-[#71877D] font-mono-tabular">
                      ({result.availableWaterKilolitres.toLocaleString("en-IN")} kL / m³)
                    </div>
                  </div>

                  <div className="rounded-xl bg-[#EDF5EF] border border-[#D3E3D8] p-4 space-y-1">
                    <div className="text-xs font-semibold text-[#71877D]">
                      {t.budget.results.perIrrigation}
                    </div>
                    <div className="text-xl font-bold text-[#214B3D] font-mono-tabular">
                      {result.waterPerIrrigationLitres.toLocaleString("en-IN")} L
                    </div>
                    <div className="text-xs text-[#71877D]">
                      {t.options.methods[submittedInput!.irrigationMethod]}
                    </div>
                  </div>

                  <div className="rounded-xl bg-[#E8F3F8] border border-[#C2DCE8] p-4 space-y-1">
                    <div className="text-xs font-semibold text-[#316886]">
                      {t.budget.results.possibleCycles}
                    </div>
                    <div className="text-2xl font-bold text-[#214B3D] font-mono-tabular">
                      {result.possibleCycles}
                    </div>
                  </div>

                  <div className="rounded-xl bg-[#E3F0E8] border border-[#C3DBC9] p-4 space-y-1">
                    <div className="text-xs font-semibold text-[#39785C]">
                      {t.budget.results.daysLast}
                    </div>
                    <div className="text-2xl font-bold text-[#214B3D] font-mono-tabular">
                      ~{result.estimatedDaysLast}
                    </div>
                  </div>
                </div>

                {submittedInput?.planningDays &&
                  result.shortageLitres !== null && (
                    <div
                      className={`rounded-xl p-4 border ${
                        result.shortageLitres > 0
                          ? "bg-red-50 border-red-200 text-red-900"
                          : "bg-[#E3F0E8] border-[#C3DBC9] text-[#214B3D]"
                      }`}
                    >
                      <div className="text-xs font-semibold mb-1">
                        {result.shortageLitres > 0
                          ? t.budget.results.shortageTitle.replace(
                              "{days}",
                              String(submittedInput.planningDays)
                            )
                          : t.budget.results.surplusTitle.replace(
                              "{days}",
                              String(submittedInput.planningDays)
                            )}
                      </div>
                      <div className="text-xl font-bold font-mono-tabular">
                        {result.shortageLitres > 0
                          ? `-${result.shortageLitres.toLocaleString("en-IN")} L`
                          : `+${(result.surplusLitres ?? 0).toLocaleString("en-IN")} L`}
                      </div>
                      <p className="text-xs mt-1">
                        {result.shortageLitres > 0
                          ? t.budget.results.shortageStatus
                          : t.budget.results.sufficientStatus}
                      </p>
                    </div>
                  )}
              </div>

              <div className="bg-white border border-[#D3E3D8] rounded-2xl p-5 space-y-3">
                <h3 className="text-sm font-bold text-[#214B3D]">
                  {t.budget.results.formulaTitle}
                </h3>
                <div className="rounded-xl bg-[#EDF5EF] border border-[#D3E3D8] p-3.5 space-y-1.5 text-xs sm:text-sm text-[#214B3D] font-mono-tabular">
                  <p>{result.formulaCycles}</p>
                  <p>{result.formulaDays}</p>
                </div>
                <ul className="space-y-1.5 text-xs sm:text-sm text-[#71877D] list-disc pl-5">
                  {result.assumptions.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="bg-white border border-[#D3E3D8] rounded-2xl p-5 space-y-2.5">
                <h3 className="text-sm font-bold text-[#39785C]">
                  {t.budget.results.recommendationsTitle}
                </h3>
                <ul className="space-y-2 text-sm text-[#214B3D] list-disc pl-5">
                  {t.budget.results.recommendations.map((rec, idx) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
