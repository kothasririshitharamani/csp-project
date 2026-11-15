import { Language, WaterBudgetInput, WaterBudgetResult, WaterUnit } from "../types/app";
import { estimateWaterPerIrrigationLitres } from "./irrigationCalculator";

export function convertToLitres(quantity: number, unit: WaterUnit): number {
  if (unit === "kilolitres" || unit === "cubic_metres") {
    return quantity * 1000;
  }
  return quantity;
}

export function calculateWaterBudget(
  input: WaterBudgetInput,
  language: Language
): WaterBudgetResult {
  const availableWaterLitres = Math.round(
    convertToLitres(input.availableWater, input.waterUnit)
  );
  const availableWaterKilolitres =
    Math.round((availableWaterLitres / 1000) * 100) / 100;

  const baseline = estimateWaterPerIrrigationLitres({
    crop: input.crop,
    landArea: input.landArea,
    areaUnit: input.areaUnit,
    irrigationMethod: input.irrigationMethod,
  });

  const usedKnownPerIrrigation =
    typeof input.knownWaterPerIrrigationLitres === "number" &&
    input.knownWaterPerIrrigationLitres > 0;

  const waterPerIrrigationLitres = usedKnownPerIrrigation
    ? Math.round(input.knownWaterPerIrrigationLitres!)
    : baseline.grossLitres;

  const possibleCycles =
    waterPerIrrigationLitres > 0
      ? Math.floor((availableWaterLitres / waterPerIrrigationLitres) * 10) / 10
      : 0;

  const assumedIntervalDays = baseline.assumedIntervalDays;
  const estimatedDaysLast = Math.floor(possibleCycles * assumedIntervalDays);

  let requiredCyclesForPlanningDays: number | null = null;
  let requiredWaterForPlanningDaysLitres: number | null = null;
  let shortageLitres: number | null = null;
  let surplusLitres: number | null = null;

  if (typeof input.planningDays === "number" && input.planningDays > 0) {
    requiredCyclesForPlanningDays = Math.max(
      1,
      Math.ceil(input.planningDays / assumedIntervalDays)
    );
    requiredWaterForPlanningDaysLitres =
      requiredCyclesForPlanningDays * waterPerIrrigationLitres;
    const diff = availableWaterLitres - requiredWaterForPlanningDaysLitres;
    if (diff < 0) {
      shortageLitres = Math.abs(diff);
      surplusLitres = 0;
    } else {
      shortageLitres = 0;
      surplusLitres = diff;
    }
  }

  const fmt = (n: number) => n.toLocaleString("en-IN");

  const formulaCycles = {
    en: `Available irrigation cycles = Available water (${fmt(availableWaterLitres)} L) ÷ Water per irrigation (${fmt(waterPerIrrigationLitres)} L) = ${possibleCycles}`,
    te: `సాధ్యమయ్యే విడతలు = అందుబాటులో ఉన్న నీరు (${fmt(availableWaterLitres)} లీ.) ÷ ఒక్కో తడికి అవసరమైన నీరు (${fmt(waterPerIrrigationLitres)} లీ.) = ${possibleCycles}`,
    hi: `संभव सिंचाई चक्र = उपलब्ध पानी (${fmt(availableWaterLitres)} ली.) ÷ प्रति सिंचाई पानी (${fmt(waterPerIrrigationLitres)} ली.) = ${possibleCycles}`,
  }[language];

  const formulaDays = {
    en: `Approximate days = ${possibleCycles} cycles × Assumed interval (${assumedIntervalDays} days) ≈ ${estimatedDaysLast} days`,
    te: `అంచనా రోజులు = ${possibleCycles} విడతలు × సగటు విరామం (${assumedIntervalDays} రోజులు) ≈ ${estimatedDaysLast} రోజులు`,
    hi: `अनुमानित दिन = ${possibleCycles} चक्र × औसत अंतराल (${assumedIntervalDays} दिन) ≈ ${estimatedDaysLast} दिन`,
  }[language];

  const assumptions: string[] = {
    en: [
      `Unit conversion: 1 Kilolitre = 1,000 Litres; 1 Cubic metre (m³) = 1,000 Litres.`,
      usedKnownPerIrrigation
        ? `Water per irrigation uses your entered value of ${fmt(waterPerIrrigationLitres)} L.`
        : `Water per irrigation (${fmt(waterPerIrrigationLitres)} L) was estimated from your crop, land area, and irrigation method.`,
      `Assumed average irrigation interval is ${assumedIntervalDays} days (shifts with rainfall and heat).`,
    ],
    te: [
      `యూనిట్ మార్పిడి: 1 కిలోలీటర్ = 1,000 లీటర్లు; 1 ఘనపు మీటర్ (m³) = 1,000 లీటర్లు.`,
      usedKnownPerIrrigation
        ? `ఒక్కో విడతకు నీటి అవసరం మీరు నమోదు చేసిన ${fmt(waterPerIrrigationLitres)} లీటర్ల ఆధారంగా లెక్కించబడింది.`
        : `ఒక్కో విడతకు నీటి అవసరం (${fmt(waterPerIrrigationLitres)} లీ.) మీ పంట, విస్తీర్ణం మరియు నీటిపారుదల విధానం ఆధారంగా అంచనా వేయబడింది.`,
      `సగటు తడి విరామం ${assumedIntervalDays} రోజులుగా తీసుకోబడింది (వేసవి ఎండ లేదా వర్షాన్ని బట్టి మారుతుంది).`,
    ],
    hi: [
      `इकाई रूपांतरण: 1 किलोलीटर = 1,000 लीटर; 1 घन मीटर (m³) = 1,000 लीटर।`,
      usedKnownPerIrrigation
        ? `प्रति सिंचाई पानी आपके द्वारा दर्ज मान (${fmt(waterPerIrrigationLitres)} ली.) पर आधारित है।`
        : `प्रति सिंचाई पानी (${fmt(waterPerIrrigationLitres)} ली.) आपकी फसल, भूमि और सिंचाई विधि से अनुमानित है।`,
      `औसत सिंचाई अंतराल ${assumedIntervalDays} दिन माना गया है (बारिश और गर्मी के अनुसार बदलता है)।`,
    ],
  }[language];

  return {
    availableWaterLitres,
    availableWaterKilolitres,
    waterPerIrrigationLitres,
    usedKnownPerIrrigation,
    possibleCycles,
    assumedIntervalDays,
    estimatedDaysLast,
    requiredCyclesForPlanningDays,
    requiredWaterForPlanningDaysLitres,
    shortageLitres,
    surplusLitres,
    formulaCycles,
    formulaDays,
    assumptions,
  };
}
