import {
  Language,
  WaterBudgetInput,
  WaterBudgetResult,
  WaterUnit,
} from "../types/app";
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
  const aw = fmt(availableWaterLitres);
  const wpi = fmt(waterPerIrrigationLitres);

  const formulaCycles: Record<Language, string> = {
    en: `Available irrigation cycles = Available water (${aw} L) ÷ Water per irrigation (${wpi} L) = ${possibleCycles}`,
    te: `సాధ్యమయ్యే విడతలు = అందుబాటులో ఉన్న నీరు (${aw} లీ.) ÷ ఒక్కో తడికి అవసరమైన నీరు (${wpi} లీ.) = ${possibleCycles}`,
    ta: `பாசன சுழற்சிகள் = கிடைக்கும் நீர் (${aw} லிட்டர்) ÷ ஒரு பாசன நீர் (${wpi} லிட்டர்) = ${possibleCycles}`,
    ml: `സാധ്യമായ നന തവണകൾ = ലഭ്യമായ വെള്ളം (${aw} ലി.) ÷ ഒരു നനയ്ക്കുള്ള വെള്ളം (${wpi} ലി.) = ${possibleCycles}`,
    hi: `संभव सिंचाई चक्र = उपलब्ध पानी (${aw} ली.) ÷ प्रति सिंचाई पानी (${wpi} ली.) = ${possibleCycles}`,
    kn: `ಸಾಧ್ಯವಿರುವ ನೀರಾವರಿ ಚಕ್ರಗಳು = ಲಭ್ಯವಿರುವ ನೀರು (${aw} ಲೀ.) ÷ ಪ್ರತಿ ನೀರಾವರಿ ನೀರು (${wpi} ಲೀ.) = ${possibleCycles}`,
    bn: `সম্ভাব্য সেচ চক্র = উপলব্ধ জল (${aw} লি.) ÷ প্রতি সেচে জল (${wpi} লি.) = ${possibleCycles}`,
    mr: `शक्य सिंचन पाळ्या = उपलब्ध पाणी (${aw} लि.) ÷ प्रति पाळी पाणी (${wpi} लि.) = ${possibleCycles}`,
  };

  const formulaDays: Record<Language, string> = {
    en: `Approximate days = ${possibleCycles} cycles × Assumed interval (${assumedIntervalDays} days) ≈ ${estimatedDaysLast} days`,
    te: `అంచనా రోజులు = ${possibleCycles} విడతలు × సగటు విరామం (${assumedIntervalDays} రోజులు) ≈ ${estimatedDaysLast} రోజులు`,
    ta: `தோராய நாட்கள் = ${possibleCycles} சுழற்சிகள் × சராசரி இடைவெளி (${assumedIntervalDays} நாட்கள்) ≈ ${estimatedDaysLast} நாட்கள்`,
    ml: `ഏകദേശ ദിവസങ്ങൾ = ${possibleCycles} തവണ × ശരാശരി ഇടവേള (${assumedIntervalDays} ദിവസം) ≈ ${estimatedDaysLast} ദിവസങ്ങൾ`,
    hi: `अनुमानित दिन = ${possibleCycles} चक्र × औसत अंतराल (${assumedIntervalDays} दिन) ≈ ${estimatedDaysLast} दिन`,
    kn: `ಅಂದಾಜು ದಿನಗಳು = ${possibleCycles} ಚಕ್ರಗಳು × ಸರಾಸರಿ ಅಂತರ (${assumedIntervalDays} ದಿನಗಳು) ≈ ${estimatedDaysLast} ದಿನಗಳು`,
    bn: `আনুমানিক দিন = ${possibleCycles} চক্র × গড় বিরতি (${assumedIntervalDays} দিন) ≈ ${estimatedDaysLast} দিন`,
    mr: `अंदाजे दिवस = ${possibleCycles} पाळ्या × सरासरी अंतर (${assumedIntervalDays} दिवस) ≈ ${estimatedDaysLast} दिवस`,
  };

  const assumptionsMap: Record<Language, string[]> = {
    en: [
      `Unit conversion: 1 Kilolitre = 1,000 Litres; 1 Cubic metre (m³) = 1,000 Litres.`,
      usedKnownPerIrrigation
        ? `Water per irrigation uses your entered value of ${wpi} L.`
        : `Water per irrigation (${wpi} L) was estimated from your crop, land area, and irrigation method.`,
      `Assumed average irrigation interval is ${assumedIntervalDays} days (shifts with rainfall and heat).`,
    ],
    te: [
      `యూనిట్ మార్పిడి: 1 కిలోలీటర్ = 1,000 లీటర్లు; 1 ఘనపు మీటర్ (m³) = 1,000 లీటర్లు.`,
      usedKnownPerIrrigation
        ? `ఒక్కో విడతకు నీటి అవసరం మీరు నమోదు చేసిన ${wpi} లీటర్ల ఆధారంగా లెక్కించబడింది.`
        : `ఒక్కో విడతకు నీటి అవసరం (${wpi} లీ.) మీ పంట, విస్తీర్ణం మరియు నీటిపారుదల విధానం ఆధారంగా అంచనా వేయబడింది.`,
      `సగటు తడి విరామం ${assumedIntervalDays} రోజులుగా తీసుకోబడింది (వేసవి ఎండ లేదా వర్షాన్ని బట్టి మారుతుంది).`,
    ],
    ta: [
      `அலகு மாற்றம்: 1 கிலோலிட்டர் = 1,000 லிட்டர்; 1 கன மீட்டர் (m³) = 1,000 லிட்டர்.`,
      usedKnownPerIrrigation
        ? `ஒரு பாசன நீர் அளவு நீங்கள் உள்ளிட்ட ${wpi} லிட்டர் அடிப்படையில் கணக்கிடப்பட்டது.`
        : `ஒரு பாசன நீர் அளவு (${wpi} லிட்டர்) உங்கள் பயிர், நில அளவு மற்றும் பாசன முறையிலிருந்து மதிப்பிடப்பட்டது.`,
      `சராசரி பாசன இடைவெளி ${assumedIntervalDays} நாட்கள் என எடுத்துக்கொள்ளப்பட்டது (மழை மற்றும் வெப்பத்திற்கு ஏற்ப மாறும்).`,
    ],
    ml: [
      `യൂണിറ്റ് മാറ്റം: 1 കിലോലിറ്റർ = 1,000 ലിറ്റർ; 1 ക്യുബിക് മീറ്റർ (m³) = 1,000 ലിറ്റർ.`,
      usedKnownPerIrrigation
        ? `ഒരു നനയ്ക്കുള്ള വെള്ളം നിങ്ങൾ നൽകിയ ${wpi} ലിറ്റർ അടിസ്ഥാനമാക്കിയാണ്.`
        : `ഒരു നനയ്ക്കുള്ള വെള്ളം (${wpi} ലി.) വിള, സ്ഥലം, നന രീതി എന്നിവയിൽ നിന്ന് കണക്കാക്കിയതാണ്.`,
      `ശരാശരി നന ഇടവേള ${assumedIntervalDays} ദിവസമായി കണക്കാക്കുന്നു (മഴയും ചൂടും അനുസരിച്ച് മാറും).`,
    ],
    hi: [
      `इकाई रूपांतरण: 1 किलोलीटर = 1,000 लीटर; 1 घन मीटर (m³) = 1,000 लीटर।`,
      usedKnownPerIrrigation
        ? `प्रति सिंचाई पानी आपके द्वारा दर्ज मान (${wpi} ली.) पर आधारित है।`
        : `प्रति सिंचाई पानी (${wpi} ली.) आपकी फसल, भूमि और सिंचाई विधि से अनुमानित है।`,
      `औसत सिंचाई अंतराल ${assumedIntervalDays} दिन माना गया है (बारिश और गर्मी के अनुसार बदलता है)।`,
    ],
    kn: [
      `ಘಟಕ ಪರಿವರ್ತನೆ: 1 ಕಿಲೋಲೀಟರ್ = 1,000 ಲೀಟರ್; 1 ಘನ ಮೀಟರ್ (m³) = 1,000 ಲೀಟರ್.`,
      usedKnownPerIrrigation
        ? `ಪ್ರತಿ ನೀರಾವರಿ ನೀರು ನೀವು ನಮೂದಿಸಿದ ${wpi} ಲೀ. ಮೌಲ್ಯವನ್ನು ಆಧರಿಸಿದೆ.`
        : `ಪ್ರತಿ ನೀರಾವರಿ ನೀರು (${wpi} ಲೀ.) ನಿಮ್ಮ ಬೆಳೆ, ವಿಸ್ತೀರ್ಣ ಮತ್ತು ವಿಧಾನದಿಂದ ಅಂದಾಜು ಮಾಡಲಾಗಿದೆ.`,
      `ಸರಾಸರಿ ನೀರಾವರಿ ಅಂತರ ${assumedIntervalDays} ದಿನಗಳು ಎಂದು ಊಹಿಸಲಾಗಿದೆ (ಮಳೆ ಮತ್ತು ಬಿಸಿಲಿಗೆ ತಕ್ಕಂತೆ ಬದಲಾಗುತ್ತದೆ).`,
    ],
    bn: [
      `একক রূপান্তর: ১ কিলোলিটার = ১,০০০ লিটার; ১ ঘন মিটার (m³) = ১,০০০ লিটার।`,
      usedKnownPerIrrigation
        ? `প্রতি সেচের জল আপনার দেওয়া ${wpi} লিটার মানের ওপর ভিত্তি করে হিসাব হয়েছে।`
        : `প্রতি সেচের জল (${wpi} লি.) আপনার ফসল, জমি ও সেচ পদ্ধতি থেকে অনুমান করা হয়েছে।`,
      `গড় সেচ বিরতি ${assumedIntervalDays} দিন ধরা হয়েছে (বৃষ্টি ও গরমের ওপর নির্ভর করে বদলায়)।`,
    ],
    mr: [
      `एकक रूपांतरण: १ किलोलीटर = १,००० लिटर; १ घन मीटर (m³) = १,००० लिटर.`,
      usedKnownPerIrrigation
        ? `प्रति पाळी पाणी तुम्ही दिलेल्या ${wpi} लि. मूल्यावर आधारित आहे.`
        : `प्रति पाळी पाणी (${wpi} लि.) तुमच्या पीक, क्षेत्रफळ आणि सिंचन पद्धतीवरून अंदाजित केले आहे.`,
      `सरासरी सिंचन अंतर ${assumedIntervalDays} दिवस मानले आहे (पाऊस व उष्णतेनुसार बदलते).`,
    ],
  };

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
    formulaCycles: formulaCycles[language],
    formulaDays: formulaDays[language],
    assumptions: assumptionsMap[language],
  };
}
