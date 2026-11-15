import {
  CropOption,
  GrowthStageOption,
  IrrigationInput,
  IrrigationMethodOption,
  IrrigationRecommendation,
  Language,
  SeasonOption,
  SoilTypeOption,
  WaterAvailabilityOption,
} from "../types/app";

const ACRES_PER_HECTARE = 2.47105;
const SQ_METERS_PER_ACRE = 4046.86;

const CROP_BASELINES: Record<
  CropOption,
  {
    depthMm: number;
    intervalDays: number;
    note: Record<Language, string>;
  }
> = {
  paddy: {
    depthMm: 50,
    intervalDays: 4,
    note: {
      en: "Maintain shallow standing water (2–5 cm) at transplanting, active tillering, and flowering; alternate wetting and drying saves water without harming yield.",
      te: "నాట్లు, పిలకలు వేసే దశ మరియు పూత దశలో 2–5 సెం.మీ. లోతు నీరు ఉంచండి; ఆరబెట్టి నీరు పెట్టే విధానం (AWD) నీటిని ఆదా చేస్తుంది.",
      hi: "रोपाई, कल्ले निकलने और फूल आने के समय खेत में हल्का पानी (2–5 सेमी) रखें; बारी-बारी से सूखने और सिंचाई की विधि (AWD) पानी बचाती है।",
    },
  },
  maize: {
    depthMm: 40,
    intervalDays: 8,
    note: {
      en: "Tasseling, silking, and grain-filling are the most water-sensitive stages in maize.",
      te: "మొక్కజొన్నలో పూత (టాసెలింగ్), కంకి మరియు గింజ పట్టే దశల్లో తేమ లోపం లేకుండా చూడాలి.",
      hi: "मक्का में नर मंजरी निकलने, रेशे आने और दाना भरने की अवस्था में पानी की कमी न होने दें।",
    },
  },
  cotton: {
    depthMm: 45,
    intervalDays: 10,
    note: {
      en: "Square formation, flowering, and boll development require steady soil moisture without waterlogging.",
      te: "పత్తిలో మొగ్గ, పూత మరియు కాయ పెరుగుదల దశల్లో నీరు నిలవకుండా తగిన తేమ ఉంచాలి.",
      hi: "कपास में कलियाँ बनने, फूल आने और टिंडे विकसित होने के समय जलभराव के बिना नियमित नमी बनाए रखें।",
    },
  },
  groundnut: {
    depthMm: 35,
    intervalDays: 8,
    note: {
      en: "Flowering, pegging, and pod filling need even moisture so pegs can enter soft soil.",
      te: "వేరుశనగలో పూత, ఊడలు దిగే దశ మరియు కాయ పట్టే దశల్లో మట్టి మృదువుగా ఉండేలా తేమ అవసరం.",
      hi: "मूंगफली में फूल आने, सुइयाँ जमीन में जाने और फली भरने के समय नरम मिट्टी के लिए समान नमी आवश्यक है।",
    },
  },
  chilli: {
    depthMm: 30,
    intervalDays: 6,
    note: {
      en: "Chilli needs light, frequent irrigation during flowering and fruit set; avoid water stagnation to prevent root rot.",
      te: "మిరపలో పూత మరియు కాయ దశలో తక్కువ పరిమాణంలో తరచుగా నీరు పెట్టాలి; నీరు నిలిస్తే వేరు కుళ్లు వస్తుంది.",
      hi: "मिर्च में फूल और फल लगते समय हल्की व बार-बार सिंचाई करें; जड़ सड़न से बचने के लिए पानी जमा न होने दें।",
    },
  },
  sugarcane: {
    depthMm: 55,
    intervalDays: 9,
    note: {
      en: "Tillering and grand growth phases have high water demand; trash mulching between rows lowers evaporation.",
      te: "చెరకులో పిలకల మరియు ఎదుగుదల దశలో నీటి అవసరం ఎక్కువ; చెత్త ఆచ్ఛాదన (మల్చింగ్) ఆవిరి నష్టాన్ని తగ్గిస్తుంది.",
      hi: "गन्ने में कल्ले निकलने और बढ़वार की अवस्था में पानी की मांग अधिक होती है; सूखी पत्तियों की मल्चिंग से नमी बचती है।",
    },
  },
  pulses: {
    depthMm: 30,
    intervalDays: 12,
    note: {
      en: "Branching and pod-filling are the key stages; excess irrigation causes excessive vegetative growth and root disease.",
      te: "పప్పుధాన్యాలలో కొమ్మలు మరియు కాయ పట్టే దశ ముఖ్యం; అధిక నీరు పెడితే వేరు రోగాలు వస్తాయి.",
      hi: "दलहन फसलों में शाखाएँ बनने और फली भरने की अवस्था मुख्य है; अधिक पानी से जड़ रोग बढ़ सकते हैं।",
    },
  },
  other: {
    depthMm: 38,
    intervalDays: 8,
    note: {
      en: "Prioritise flowering and fruit/grain formation stages and verify soil moisture at 10–15 cm depth before watering.",
      te: "పూత మరియు కాయ/గింజ దశలకు ప్రాధాన్యత ఇచ్చి, 10–15 సెం.మీ. లోతులో తేమ చూసి నీరు పెట్టండి.",
      hi: "फूल आने और फल/दाना बनने की अवस्था को प्राथमिकता दें और सिंचाई से पहले 10–15 सेमी गहराई की नमी जांचें।",
    },
  },
};

const STAGE_FACTORS: Record<GrowthStageOption, number> = {
  initial: 0.7,
  vegetative: 0.95,
  flowering: 1.2,
  maturity: 0.75,
  unknown: 1.0,
};

const SEASON_FACTORS: Record<SeasonOption, { depthMult: number; freqMult: number }> = {
  kharif: { depthMult: 0.85, freqMult: 1.25 },
  rabi: { depthMult: 1.0, freqMult: 1.0 },
  summer: { depthMult: 1.2, freqMult: 0.8 },
};

const SOIL_FACTORS: Record<
  SoilTypeOption,
  { depthMult: number; freqMult: number; note: Record<Language, string> }
> = {
  sandy: {
    depthMult: 0.78,
    freqMult: 0.7,
    note: {
      en: "Sandy soil drains rapidly, so apply lighter irrigations more frequently.",
      te: "ఇసుక నేల త్వరగా ఆరిపోతుంది కాబట్టి తక్కువ నీరు తరచుగా పెట్టాలి.",
      hi: "रेतीली मिट्टी से पानी जल्दी निकल जाता है, इसलिए हल्की सिंचाई कम अंतराल पर करें।",
    },
  },
  clay: {
    depthMult: 1.15,
    freqMult: 1.25,
    note: {
      en: "Clay soil holds moisture longer; allow surface drainage to prevent waterlogging.",
      te: "బంకమట్టి నేల తేమను ఎక్కువ సేపు ఉంచుతుంది; నీరు నిలవకుండా డ్రైనేజీ చూడాలి.",
      hi: "चिकनी मिट्टी नमी देर तक रखती है; जलभराव रोकने के लिए जल निकासी बनाए रखें।",
    },
  },
  loamy: {
    depthMult: 1.0,
    freqMult: 1.0,
    note: {
      en: "Loamy soil has balanced infiltration and water retention.",
      te: "గరప/లోమ్ నేల నీటిని సమానంగా ఇంకించుకుని పట్టి ఉంచుతుంది.",
      hi: "दोमट मिट्टी में पानी का सोखना और धारण करना संतुलित रहता है।",
    },
  },
  black: {
    depthMult: 1.15,
    freqMult: 1.3,
    note: {
      en: "Black cotton soil swells when wet and cracks when dry; avoid deep cracking before irrigating.",
      te: "నల్లరేగడి నేల తడిసినప్పుడు ఉబ్బి, ఎండినప్పుడు పగుళ్లు ఇస్తుంది; లోతైన పగుళ్లు రాకముందే తేమ ఇవ్వాలి.",
      hi: "काली मिट्टी सूखने पर दरारें बनाती है; गहरी दरारें पड़ने से पहले ही हल्की सिंचाई कर दें।",
    },
  },
  red: {
    depthMult: 0.88,
    freqMult: 0.85,
    note: {
      en: "Red soil tends to crust and dry faster; mulching helps retain moisture.",
      te: "ఎర్ర నేల పైభాగం త్వరగా గట్టిపడి ఆరిపోతుంది; మల్చింగ్ తేమను కాపాడుతుంది.",
      hi: "लाल मिट्टी की ऊपरी परत जल्दी सूख कर सख्त हो जाती है; मल्चिंग से नमी बनी रहती है।",
    },
  },
  unknown: {
    depthMult: 1.0,
    freqMult: 1.0,
    note: {
      en: "Soil type not specified; check moisture 10 cm below surface by squeezing a soil ball before irrigating.",
      te: "నేల రకం తెలియదు కాబట్టి 10 సెం.మీ. లోతు మట్టిని చేతితో నొక్కి తేమ ఉందో లేదో చూసి నీరు పెట్టండి.",
      hi: "मिट्टी का प्रकार अज्ञात है; सिंचाई से पहले 10 सेमी गहराई की मिट्टी हाथ से दबाकर नमी जांचें।",
    },
  },
};

const METHOD_EFFICIENCY: Record<
  IrrigationMethodOption,
  {
    efficiency: number;
    depthFactor: number;
    freqFactor: number;
    label: Record<Language, string>;
  }
> = {
  drip: {
    efficiency: 0.9,
    depthFactor: 0.6,
    freqFactor: 0.45,
    label: {
      en: "Drip irrigation (~90% application efficiency, frequent small doses near roots)",
      te: "బిందు సేద్యం (~90% సామర్థ్యం, వేర్ల వద్ద తక్కువ నీరు తరచుగా అందుతుంది)",
      hi: "ड्रिप सिंचाई (~90% दक्षता, जड़ों के पास कम मात्रा में नियमित पानी)",
    },
  },
  sprinkler: {
    efficiency: 0.75,
    depthFactor: 0.8,
    freqFactor: 0.8,
    label: {
      en: "Sprinkler irrigation (~75% application efficiency)",
      te: "స్ప్రింక్లర్ విధానం (~75% సామర్థ్యం)",
      hi: "स्प्रिंकलर सिंचाई (~75% दक्षता)",
    },
  },
  flood: {
    efficiency: 0.55,
    depthFactor: 1.15,
    freqFactor: 1.0,
    label: {
      en: "Flood / furrow irrigation (~55% application efficiency due to seepage & evaporation)",
      te: "కాలువ / ఫ్లడ్ విధానం (~55% సామర్థ్యం, ఆవిరి మరియు ఇంకిపోయే నష్టం ఎక్కువ)",
      hi: "खुली / क्यारी सिंचाई (~55% दक्षता, रिसाव और वाष्पीकरण से अधिक नुकसान)",
    },
  },
  unknown: {
    efficiency: 0.65,
    depthFactor: 1.0,
    freqFactor: 1.0,
    label: {
      en: "Assumed moderate application efficiency (~65%) since method is not specified",
      te: "విధానం తెలియదు కాబట్టి సగటు ~65% సామర్థ్యాన్ని అంచనాగా తీసుకున్నాము",
      hi: "सिंचाई विधि अज्ञात होने के कारण औसत ~65% दक्षता मानी गई है",
    },
  },
};

const AVAILABILITY_ADJUSTMENT: Record<
  WaterAvailabilityOption,
  { scale: number; freqStretch: number }
> = {
  sufficient: { scale: 1.0, freqStretch: 1.0 },
  limited: { scale: 0.82, freqStretch: 1.15 },
  very_limited: { scale: 0.65, freqStretch: 1.3 },
};

export function getAreaInAcres(area: number, unit: "acres" | "hectares"): number {
  return unit === "hectares" ? area * ACRES_PER_HECTARE : area;
}

export function estimateWaterPerIrrigationLitres(params: {
  crop: CropOption;
  landArea: number;
  areaUnit: "acres" | "hectares";
  irrigationMethod: IrrigationMethodOption;
  season?: SeasonOption;
  soilType?: SoilTypeOption;
  growthStage?: GrowthStageOption;
  waterAvailability?: WaterAvailabilityOption;
}): {
  grossLitres: number;
  netDepthMm: number;
  assumedIntervalDays: number;
} {
  const cropBase = CROP_BASELINES[params.crop];
  const stageFactor = STAGE_FACTORS[params.growthStage || "vegetative"];
  const seasonFactor = SEASON_FACTORS[params.season || "rabi"];
  const soilFactor = SOIL_FACTORS[params.soilType || "loamy"];
  const methodInfo = METHOD_EFFICIENCY[params.irrigationMethod];
  const availInfo = AVAILABILITY_ADJUSTMENT[params.waterAvailability || "sufficient"];

  const netDepthMm =
    cropBase.depthMm *
    stageFactor *
    seasonFactor.depthMult *
    soilFactor.depthMult *
    methodInfo.depthFactor *
    availInfo.scale;

  const grossDepthMm = netDepthMm / methodInfo.efficiency;
  const acres = getAreaInAcres(params.landArea, params.areaUnit);
  const areaSqM = acres * SQ_METERS_PER_ACRE;
  const grossLitres = Math.round(grossDepthMm * areaSqM);

  const rawInterval =
    cropBase.intervalDays *
    seasonFactor.freqMult *
    soilFactor.freqMult *
    methodInfo.freqFactor *
    availInfo.freqStretch;

  const assumedIntervalDays = Math.max(1, Math.round(rawInterval));

  return {
    grossLitres,
    netDepthMm: Math.round(netDepthMm * 10) / 10,
    assumedIntervalDays,
  };
}

export function generateIrrigationPlan(
  input: IrrigationInput,
  language: Language
): IrrigationRecommendation {
  const cropBase = CROP_BASELINES[input.crop];
  const soilInfo = SOIL_FACTORS[input.soilType];
  const methodInfo = METHOD_EFFICIENCY[input.irrigationMethod];

  const calc = estimateWaterPerIrrigationLitres({
    crop: input.crop,
    landArea: input.landArea,
    areaUnit: input.areaUnit,
    irrigationMethod: input.irrigationMethod,
    season: input.season,
    soilType: input.soilType,
    growthStage: input.growthStage,
    waterAvailability: input.waterAvailability,
  });

  const minLitres = Math.round(calc.grossLitres * 0.88);
  const maxLitres = Math.round(calc.grossLitres * 1.12);

  const freqMin = Math.max(1, calc.assumedIntervalDays - (calc.assumedIntervalDays > 3 ? 1 : 0));
  const freqMax = calc.assumedIntervalDays + (calc.assumedIntervalDays >= 5 ? 2 : 1);

  const suggestedTiming =
    input.season === "summer"
      ? {
          en: "Irrigate only in cool hours: 5:30 AM – 8:30 AM or after 5:30 PM to minimize evaporation.",
          te: "ఉదయం 5:30 – 8:30 లేదా సాయంత్రం 5:30 తర్వాత మాత్రమే నీరు పెట్టండి (ఎండ వేడి తక్కువగా ఉన్నప్పుడు).",
          hi: "केवल ठंडे समय में सिंचाई करें: सुबह 5:30 – 8:30 या शाम 5:30 के बाद ताकि पानी कम उड़े।",
        }[language]
      : {
          en: "Prefer early morning (6:00 AM – 9:30 AM) or late afternoon (after 4:30 PM).",
          te: "ఉదయం 6:00 – 9:30 లేదా సాయంత్రం 4:30 తర్వాత నీరు పెట్టడం మంచిది.",
          hi: "सुबह 6:00 – 9:30 या शाम 4:30 के बाद सिंचाई करना बेहतर रहता है।",
        }[language];

  const practicalTips: string[] = [
    cropBase.note[language],
    soilInfo.note[language],
    {
      en: "Check soil moisture 10–15 cm below the surface before pumping — if soil forms a moist ball in your hand, delay watering by 1–2 days.",
      te: "నీరు పెట్టే ముందు 10–15 సెం.మీ. లోతు మట్టిని తవ్వి చూడండి — మట్టి ముద్ద కడితే మరొక రోజు వేచి చూడవచ్చు.",
      hi: "पंप चलाने से पहले 10–15 सेमी गहराई की मिट्टी हाथ में दबाकर देखें — यदि नम लड्डू बने तो 1–2 दिन सिंचाई टालें।",
    }[language],
  ];

  if (input.waterAvailability === "very_limited" || input.waterAvailability === "limited") {
    practicalTips.push(
      {
        en: "Because water is limited, use alternate-furrow irrigation or prioritise critical flowering and grain/pod-filling stages.",
        te: "నీటి లభ్యత తక్కువగా ఉన్నందున, ప్రత్యామ్నాయ సాళ్ల పద్ధతి (alternate furrow irrigation) పాటించి ముఖ్యమైన పూత/కాయ దశలకు నీరు ఆదా చేయండి.",
        hi: "पानी सीमित होने के कारण एकांतर नाली सिंचाई (एक छोड़कर एक कतार) अपनाएँ और फूल व दाना भरने की अवस्था को प्राथमिकता दें।",
      }[language]
    );
  }

  const waterSavingAdvice: Array<{ title: string; reason: string }> = [];

  if (input.irrigationMethod === "flood" || input.irrigationMethod === "unknown") {
    waterSavingAdvice.push({
      title: {
        en: "Switch from open flooding to furrow/bed irrigation or drip where feasible",
        te: "సాళ్లలో లేదా బెడ్ విధానంలో నీరు ఇవ్వడం / డ్రిప్ పరిశీలించండి",
        hi: "जहाँ संभव हो खुली सिंचाई की जगह मेड़/नाली या ड्रिप अपनाएँ",
      }[language],
      reason: {
        en: "Open flooding loses roughly 40–45% of water to deep percolation and evaporation; targeted furrows or drip keep water in the root zone.",
        te: "ఓపెన్ ఫ్లడ్ విధానంలో దాదాపు 40–45% నీరు ఆవిరి మరియు ఇంకిపోవడం వల్ల వృథా అవుతుంది; డ్రిప్ లేదా సాళ్ల విధానం నీటిని వేర్ల వద్దే ఉంచుతుంది.",
        hi: "खुली सिंचाई में लगभग 40–45% पानी रिसाव और वाष्पीकरण में बर्बाद हो जाता है; नाली या ड्रिप से पानी सीधे जड़ों को मिलता है।",
      }[language],
    });
  } else if (input.irrigationMethod === "drip") {
    waterSavingAdvice.push({
      title: {
        en: "Flush drip laterals and inspect emitters weekly for clogs or leaks",
        te: "డ్రిప్ ఫిల్టర్లు మరియు డ్రిప్పర్ లీకేజీలను వారానికోసారి తనిఖీ చేయండి",
        hi: "हर सप्ताह ड्रिप फिल्टर साफ करें और पाइप लीक व बंद ड्रिपर जांचें",
      }[language],
      reason: {
        en: "Even a few damaged emitters cause over-watering in one spot and dry stress elsewhere.",
        te: "ఒకే లైన్ లీక్ అయినా పొలంలో అసమాన తడి ఏర్పడి నీరు వృథా అవుతుంది.",
        hi: "कुछ पाइप लीक होने पर एक जगह पानी बहता है और दूसरी जगह पौधे सूखे रह जाते हैं।",
      }[language],
    });
  } else {
    waterSavingAdvice.push({
      title: {
        en: "Operate sprinklers only during calm morning or evening winds",
        te: "గాలి తక్కువగా ఉన్న ఉదయం/సాయంత్రం వేళల్లో స్ప్రింక్లర్లు నడపండి",
        hi: "स्प्रिंकलर केवल शांत हवा वाले सुबह या शाम के समय चलाएँ",
      }[language],
      reason: {
        en: "High midday winds blow water droplets off target and increase evaporation loss.",
        te: "గాలి వేగం ఎక్కువగా ఉంటే నీటి తుంపర్లు గాలిలో ఎగిరి ఆవిరైపోతాయి.",
        hi: "दोपहर की तेज हवा में पानी की बूंदें उड़ जाती हैं और वाष्पीकरण बढ़ता है।",
      }[language],
    });
  }

  waterSavingAdvice.push({
    title: {
      en: "Apply crop-residue or dry-straw mulch along crop rows",
      te: "పంట వ్యర్థాలు / ఎండు గడ్డితో మల్చింగ్ (ఆచ్ఛాదన) చేయండి",
      hi: "फसल की कतारों के बीच सूखे पुआल या फसल अवशेष से मल्चिंग करें",
    }[language],
    reason: {
      en: "Mulch shades the soil surface, lowers evaporation loss, and suppresses moisture-stealing weeds.",
      te: "మల్చింగ్ ఎండ వేడిని తగ్గించి నేలలో తేమను ఎక్కువ రోజులు నిలుపుతుంది మరియు కలుపును తగ్గిస్తుంది.",
      hi: "मल्चिंग मिट्टी को धूप से बचाकर नमी लंबे समय तक रोकती है और खरपतवार भी कम करती है।",
    }[language],
  });

  if (input.season === "kharif") {
    waterSavingAdvice.push({
      title: {
        en: "Skip or delay scheduled irrigation after meaningful rainfall",
        te: "వర్షపాతం తర్వాత నీటిపారుదల వాయిదా వేయండి",
        hi: "अच्छी बारिश के बाद तय सिंचाई को टाल दें या कम करें",
      }[language],
      reason: {
        en: "Kharif showers recharge root-zone moisture; extra pumping wastes water and risks root rot.",
        te: "ఖరీఫ్ వర్షాలు నేల తేమను నింపుతాయి; అదనపు నీరు పెడితే వేర్లు కుళ్లిపోవచ్చు.",
        hi: "खरीफ की बारिश जड़ों में नमी भर देती है; अतिरिक्त पानी से जड़ सड़न का खतरा बढ़ता है।",
      }[language],
    });
  }

  const changingFactors: string[] = {
    en: [
      "Recent rainfall and upcoming 3-day rain forecast.",
      "Daily peak temperature and strong dry winds.",
      "Field slope, effective root depth, and local groundwater level.",
      "Plant spacing and weed competition.",
    ],
    te: [
      "ఇటీవలి వర్షపాతం మరియు రాబోయే 3 రోజుల వాతావరణ సూచన.",
      "రోజువారీ గరిష్ట ఉష్ణోగ్రత మరియు బలమైన గాలులు.",
      "పొలం వాలు, నేల లోతు మరియు భూగర్భ జల మట్టం.",
      "వరుసల మధ్య ఎడం మరియు కలుపు ఉధృతి.",
    ],
    hi: [
      "हाल की बारिश और अगले 3 दिनों का वर्षा पूर्वानुमान।",
      "दिन का अधिकतम तापमान और तेज सूखी हवाएँ।",
      "खेत की ढलान, मिट्टी की गहराई और भूजल स्तर।",
      "पौधों के बीच की दूरी और खरपतवार की मात्रा।",
    ],
  }[language];

  const acresRounded = Math.round(getAreaInAcres(input.landArea, input.areaUnit) * 100) / 100;
  const sqMFormatted = Math.round(acresRounded * SQ_METERS_PER_ACRE).toLocaleString("en-IN");

  const assumptions: string[] = {
    en: [
      `Calculated land area: ${acresRounded} acres (${sqMFormatted} sq.m).`,
      `Estimated net irrigation depth: ~${calc.netDepthMm} mm per cycle.`,
      `Method efficiency assumption: ${methodInfo.label.en}.`,
      `Estimates are planning guidance only and do not replace local Mandal Agricultural Officer advisories.`,
    ],
    te: [
      `లెక్కించిన భూమి విస్తీర్ణం: ${acresRounded} ఎకరాలు (${sqMFormatted} చ.మీ.).`,
      `అంచనా వేసిన నికర నీటి లోతు: ~${calc.netDepthMm} మి.మీ./విడత.`,
      `నీటిపారుదల విధానం సామర్థ్యం: ${methodInfo.label.te}.`,
      `ఈ అంచనాలు సాధారణ వ్యవసాయ ప్రణాళిక కోసం మాత్రమే — అధికారిక వ్యవసాయ శాఖ సలహాలకు ప్రత్యామ్నాయం కాదు.`,
    ],
    hi: [
      `गणना किया गया क्षेत्रफल: ${acresRounded} एकड़ (${sqMFormatted} वर्ग मीटर)।`,
      `अनुमानित शुद्ध सिंचाई गहराई: ~${calc.netDepthMm} मिमी प्रति सिंचाई।`,
      `सिंचाई विधि दक्षता अनुमान: ${methodInfo.label.hi}।`,
      `ये अनुमान केवल योजना मार्गदर्शन हैं; आधिकारिक सलाह के लिए स्थानीय कृषि अधिकारी से संपर्क करें।`,
    ],
  }[language];

  const limitations: string[] = [];
  if (input.soilType === "unknown") {
    limitations.push(
      {
        en: "Soil type was marked Unknown, so average water-holding capacity was assumed; sandy or clay fields will shift intervals.",
        te: "నేల రకం 'తెలియదు' అని ఎంచుకున్నందున సగటు నేల తేమ నిల్వను పరిగణించాము; ఇసుక లేదా నల్లరేగడి నేలల్లో విరామం మారుతుంది.",
        hi: "मिट्टी का प्रकार अज्ञात होने से औसत जल धारण क्षमता मानी गई है; रेतीली या चिकनी मिट्टी में अंतराल बदलेगा।",
      }[language]
    );
  }
  if (input.growthStage === "unknown") {
    limitations.push(
      {
        en: "Growth stage was marked Unknown; flowering and grain-filling typically need 15–20% more moisture than early or late stages.",
        te: "పంట దశ తెలియకపోవడం వల్ల మధ్యస్థ నీటి అవసరాన్ని తీసుకున్నాము; పూత దశలో 15–20% ఎక్కువ తేమ అవసరం కావచ్చు.",
        hi: "फसल अवस्था अज्ञात होने से मध्यम अनुमान लिया गया है; फूल और दाने की अवस्था में 15–20% अधिक नमी लगती है।",
      }[language]
    );
  }
  if (input.irrigationMethod === "unknown") {
    limitations.push(
      {
        en: "Irrigation method was marked Unknown, so a moderate 65% delivery efficiency was assumed.",
        te: "నీటిపారుదల విధానం తెలియదు కాబట్టి సగటు 65% సామర్థ్యాన్ని అంచనా వేశాము.",
        hi: "सिंचाई विधि अज्ञात होने के कारण 65% औसत दक्षता मानी गई है।",
      }[language]
    );
  }
  if (input.crop === "other") {
    limitations.push(
      {
        en: "Custom crop uses a moderate general baseline; adjust with local agricultural officer guidance for your specific variety.",
        te: "'ఇతర పంట' ఎంచుకున్నందున సాధారణ పంట సగటును వాడాము; మీ పంట ప్రకారం స్థానిక వ్యవసాయ నిపుణుడిని సంప్రదించండి.",
        hi: "अन्य फसल के लिए सामान्य औसत लिया गया है; अपनी किस्म के अनुसार स्थानीय कृषि अधिकारी से सलाह लें।",
      }[language]
    );
  }

  return {
    estimatedLitresPerCycle: calc.grossLitres,
    estimatedLitresMin: minLitres,
    estimatedLitresMax: maxLitres,
    estimatedDepthMm: calc.netDepthMm,
    frequencyDaysMin: freqMin,
    frequencyDaysMax: freqMax,
    suggestedTiming,
    practicalTips,
    waterSavingAdvice,
    changingFactors,
    assumptions,
    limitations,
  };
}
