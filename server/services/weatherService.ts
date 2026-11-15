import { SupportedLanguage } from "./authService.ts";

export type WeatherConditionKey =
  | "clear"
  | "partly_cloudy"
  | "cloudy"
  | "fog"
  | "drizzle"
  | "rain"
  | "heavy_rain"
  | "thunderstorm";

export interface GeocodeResultItem {
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  state: string;
  district: string;
  timezone: string;
  displayLabel: string;
}

export type LocalizedStringMap = Record<SupportedLanguage, string>;

export interface WeatherForecastItem {
  timeLabel: string;
  isoTime: string;
  tempC: number;
  conditionKey: WeatherConditionKey;
  conditionLabels: LocalizedStringMap;
  rainProbabilityPct: number | null;
  expectedRainfallMm: number;
  windSpeedKmh: number;
  humidityPct: number;
}

export interface DailyForecastItem {
  date: string;
  conditionKey: WeatherConditionKey;
  conditionLabels: LocalizedStringMap;
  tempMinC: number;
  tempMaxC: number;
  rainProbabilityMaxPct: number | null;
  precipitationSumMm: number;
  windSpeedMaxKmh: number;
}

export interface WeatherInterpretationItem {
  type:
    | "rain_irrigation"
    | "heat_demand"
    | "wind_spraying"
    | "drainage_warning"
    | "dry_warm"
    | "general";
  severity: "info" | "caution" | "warning";
  titles: LocalizedStringMap;
  details: LocalizedStringMap;
}

export interface CurrentWeatherPayload {
  tempC: number;
  feelsLikeC: number;
  humidityPct: number;
  precipitationMm: number;
  rainMm: number;
  weatherCode: number;
  conditionKey: WeatherConditionKey;
  conditionLabels: LocalizedStringMap;
  windSpeedKmh: number;
  windDirectionDeg: number;
  windDirectionCardinal: string;
  rainProbabilityPct: number | null;
  expectedRainfallNext24hMm: number;
}

export interface WeatherResponsePayload {
  ok: true;
  provider: "open-meteo";
  status: "live";
  locationLabel: string;
  resolvedLocationName: string;
  resolvedFallback: boolean;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  timezone: string;
  observedAt: string;
  fetchedAt: string;
  cached: boolean;
  current: CurrentWeatherPayload;
  forecast: WeatherForecastItem[];
  dailyForecast: DailyForecastItem[];
  interpretations: WeatherInterpretationItem[];
  assumptions: Record<SupportedLanguage, string[]>;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const GEOCODE_CACHE = new Map<string, CacheEntry<GeocodeResultItem[]>>();
const WEATHER_CACHE = new Map<string, CacheEntry<WeatherResponsePayload>>();

const GEOCODE_TTL_MS = 6 * 60 * 60 * 1000;
const WEATHER_TTL_MS = 10 * 60 * 1000;
const MAX_CACHE_ENTRIES = 120;

function setBoundedCache<T>(
  map: Map<string, CacheEntry<T>>,
  key: string,
  value: T,
  ttlMs: number
): void {
  if (map.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = map.keys().next().value;
    if (oldestKey) map.delete(oldestKey);
  }
  map.set(key, { value, expiresAt: Date.now() + ttlMs });
}

function getValidCache<T>(
  map: Map<string, CacheEntry<T>>,
  key: string
): T | null {
  const entry = map.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    map.delete(key);
    return null;
  }
  return entry.value;
}

export function isWeatherConfigured(): boolean {
  return true;
}

export function describeWmoCode(code: number): {
  key: WeatherConditionKey;
  labels: LocalizedStringMap;
} {
  if (code === 0) {
    return {
      key: "clear",
      labels: {
        en: "Clear sky",
        te: "నిర్మలమైన ఆకాశం",
        hi: "साफ आसमान",
        ta: "தெளிவான வானம்",
        ml: "തെളിഞ്ഞ ആകാശം",
        kn: "ಸ್ಪಷ್ಟ ಆಕಾಶ",
        bn: "পরিষ্কার আকাশ",
        mr: "स्वच्छ आकाश",
      },
    };
  }
  if (code === 1) {
    return {
      key: "clear",
      labels: {
        en: "Mainly clear",
        te: "ఎక్కువగా ఎండ",
        hi: "मुख्यतः साफ",
        ta: "பெரும்பாலும் தெளிவு",
        ml: "പ്രധാനമായും തെളിഞ്ഞത്",
        kn: "ಮುಖ್ಯವಾಗಿ ಸ್ಪಷ್ಟ",
        bn: "প্রধানত পরিষ্কার",
        mr: "मुख्यतः स्वच्छ",
      },
    };
  }
  if (code === 2) {
    return {
      key: "partly_cloudy",
      labels: {
        en: "Partly cloudy",
        te: "పాక్షికంగా మేఘావృతం",
        hi: "आंशिक रूप से बादल",
        ta: "பகுதி மேகமூட்டம்",
        ml: "ഭാഗികമായി മേഘാവൃതം",
        kn: "ಭಾಗಶಃ ಮೋಡ",
        bn: "আংশিক মেঘলা",
        mr: "अंशतः ढगाळ",
      },
    };
  }
  if (code === 3) {
    return {
      key: "cloudy",
      labels: {
        en: "Overcast",
        te: "దట్టమైన మేఘాలు",
        hi: "घने बादल",
        ta: "மேகமூட்டம்",
        ml: "മൂടിക്കെട്ടിയ ആകാശം",
        kn: "ದಟ್ಟ ಮೋಡ",
        bn: "ঘন মেঘলা",
        mr: "दाट ढगाळ",
      },
    };
  }
  if (code === 45 || code === 48) {
    return {
      key: "fog",
      labels: {
        en: "Fog / Mist",
        te: "పొగమంచు",
        hi: "कोहरा / धुंध",
        ta: "மூடுபனி",
        ml: "മൂടൽമഞ്ഞ്",
        kn: "ಮಂಜು",
        bn: "কুয়াশা",
        mr: "धुके",
      },
    };
  }
  if (code >= 51 && code <= 57) {
    return {
      key: "drizzle",
      labels: {
        en: "Drizzle",
        te: "చిరు జల్లులు",
        hi: "हल्की बूंदाबांदी",
        ta: "தூறல் மழை",
        ml: "ചാറ്റൽ മഴ",
        kn: "ತುಂತುರು ಮಳೆ",
        bn: "গুঁড়ি গুঁড়ি বৃষ্টি",
        mr: "रिमझिम पाऊस",
      },
    };
  }
  if (code === 61 || code === 80) {
    return {
      key: "rain",
      labels: {
        en: "Light rain",
        te: "తేలికపాటి వర్షం",
        hi: "हल्की बारिश",
        ta: "லேசான மழை",
        ml: "ചെറിയ മഴ",
        kn: "ಸಣ್ಣ ಮಳೆ",
        bn: "হালকা বৃষ্টি",
        mr: "हलका पाऊस",
      },
    };
  }
  if (code === 63 || code === 81 || code === 66) {
    return {
      key: "rain",
      labels: {
        en: "Moderate rain",
        te: "మోస్తరు వర్షం",
        hi: "मध्यम बारिश",
        ta: "மிதமான மழை",
        ml: "മിതമായ മഴ",
        kn: "ಮಧ್ಯಮ ಮಳೆ",
        bn: "মাঝারি বৃষ্টি",
        mr: "मध्यम पाऊस",
      },
    };
  }
  if (code === 65 || code === 67 || code === 82) {
    return {
      key: "heavy_rain",
      labels: {
        en: "Heavy rain",
        te: "భారీ వర్షం",
        hi: "तेज बारिश",
        ta: "கனமழை",
        ml: "ശക്തമായ മഴ",
        kn: "ಭಾರೀ ಮಳೆ",
        bn: "ভারী বৃষ্টি",
        mr: "मुसळधार पाऊस",
      },
    };
  }
  if (code >= 95 && code <= 99) {
    return {
      key: "thunderstorm",
      labels: {
        en: "Thunderstorm",
        te: "ఉరుములతో కూడిన వర్షం",
        hi: "आंधी और गरज के साथ बारिश",
        ta: "இடியுடன் கூடிய மழை",
        ml: "ഇടിയോട് കൂടിയ മഴ",
        kn: "ಗುಡುಗು ಸಹಿತ ಮಳೆ",
        bn: "বজ্রসহ বৃষ্টি",
        mr: "विजांच्या कडकडाटासह पाऊस",
      },
    };
  }
  return {
    key: "partly_cloudy",
    labels: {
      en: "Variable sky",
      te: "మారుతున్న వాతావరణం",
      hi: "बदलता मौसम",
      ta: "மாறும் வானிலை",
      ml: "മാറുന്ന കാലാവസ്ഥ",
      kn: "ಬದಲಾಗುವ ಹವಾಮಾನ",
      bn: "পরিবর্তনশীল আকাশ",
      mr: "बदलणारे हवामान",
    },
  };
}

function degreesToCardinal(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const normalized = ((deg % 360) + 360) % 360;
  return dirs[Math.round(normalized / 45) % 8];
}

function sanitizePlaceToken(raw?: string): string {
  if (!raw) return "";
  return raw
    .replace(/\b(district|dist\.?|mandal|taluk|tehsil|village|india)\b/gi, "")
    .replace(/జిల్లా|మండలం|గ్రామం|जिला|गांव|गाँव/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeForCompare(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function buildIndianSpellingVariants(token: string): string[] {
  const base = sanitizePlaceToken(token);
  if (!base) return [];
  const variants = [base];
  const simplified = base
    .replace(/th/gi, "t")
    .replace(/dh/gi, "d")
    .replace(/ee/gi, "i")
    .replace(/oo/gi, "u");
  if (simplified.toLowerCase() !== base.toLowerCase()) {
    variants.push(simplified);
  }
  return variants;
}

async function queryOpenMeteoGeocode(
  searchName: string,
  countryFilter = true
): Promise<GeocodeResultItem[]> {
  const cleaned = sanitizePlaceToken(searchName);
  if (!cleaned) return [];

  const cacheKey = `${cleaned.toLowerCase()}|${countryFilter ? "IN" : "ANY"}`;
  const cached = getValidCache(GEOCODE_CACHE, cacheKey);
  if (cached) return cached;

  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", cleaned);
  url.searchParams.set("count", "20");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");
  if (countryFilter) {
    url.searchParams.set("countryCode", "IN");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(url.toString(), { signal: controller.signal });
    if (res.status === 429) {
      const err = new Error(
        "Weather geocoding rate limit reached. Please wait a moment and retry."
      );
      (err as Error & { status?: number }).status = 429;
      throw err;
    }
    if (!res.ok) {
      const err = new Error(
        "Live weather information is temporarily unavailable. Please retry."
      );
      (err as Error & { status?: number }).status = 502;
      throw err;
    }

    const json = (await res.json()) as {
      results?: Array<{
        name?: string;
        latitude?: number;
        longitude?: number;
        country?: string;
        admin1?: string;
        admin2?: string;
        timezone?: string;
      }>;
    };

    const list: GeocodeResultItem[] = (json.results || [])
      .filter(
        (r) =>
          typeof r.latitude === "number" &&
          typeof r.longitude === "number" &&
          r.name
      )
      .map((r) => {
        const parts = [r.name, r.admin2, r.admin1, r.country].filter(Boolean);
        return {
          name: r.name!,
          latitude: r.latitude!,
          longitude: r.longitude!,
          country: r.country || "India",
          state: r.admin1 || "",
          district: r.admin2 || "",
          timezone: r.timezone || "Asia/Kolkata",
          displayLabel: parts.join(", "),
        };
      });

    setBoundedCache(GEOCODE_CACHE, cacheKey, list, GEOCODE_TTL_MS);
    return list;
  } catch (error) {
    if ((error as Error & { name?: string }).name === "AbortError") {
      const err = new Error(
        "Live weather information is temporarily unavailable. Please retry."
      );
      (err as Error & { status?: number }).status = 504;
      throw err;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function candidateMatchesHints(
  item: GeocodeResultItem,
  hints: { state?: string; district?: string }
): { stateMatch: boolean; districtMatch: boolean } {
  const stateHint = normalizeForCompare(sanitizePlaceToken(hints.state));
  const districtHint = normalizeForCompare(sanitizePlaceToken(hints.district));
  const itemState = normalizeForCompare(item.state);
  const itemDist = normalizeForCompare(item.district);
  const itemName = normalizeForCompare(item.name);

  return {
    stateMatch: Boolean(stateHint && itemState.includes(stateHint)),
    districtMatch: Boolean(
      districtHint &&
        (itemDist.includes(districtHint) || itemName.includes(districtHint))
    ),
  };
}

function rankGeocodeCandidates(
  candidates: GeocodeResultItem[],
  hints: { state?: string; district?: string }
): GeocodeResultItem[] {
  if (!hints.state && !hints.district) return candidates;

  return [...candidates].sort((a, b) => {
    const score = (item: GeocodeResultItem) => {
      const { stateMatch, districtMatch } = candidateMatchesHints(item, hints);
      let s = 0;
      if (stateMatch) s += 3;
      if (districtMatch) s += 4;
      return s;
    };
    return score(b) - score(a);
  });
}

export async function geocodeFarmerLocation(params: {
  location?: string;
  village?: string;
  mandal?: string;
  district?: string;
  state?: string;
}): Promise<{
  results: GeocodeResultItem[];
  resolvedFallback: boolean;
}> {
  const rawLocation = params.location?.trim();
  const hints = { state: params.state, district: params.district };

  if (rawLocation) {
    const segments = rawLocation
      .split(",")
      .map((s) => sanitizePlaceToken(s))
      .filter(Boolean);

    const derivedHints = {
      state: hints.state,
      district:
        hints.district ||
        (segments.length >= 2 ? segments[segments.length - 1] : undefined),
    };

    const attempts =
      segments.length > 1 ? segments : [sanitizePlaceToken(rawLocation)];

    for (let i = 0; i < attempts.length; i++) {
      const variants = buildIndianSpellingVariants(attempts[i]);
      let collected: GeocodeResultItem[] = [];
      for (const variant of variants) {
        const matches = await queryOpenMeteoGeocode(variant, true);
        collected = [...collected, ...matches];
      }
      if (collected.length > 0) {
        const ranked = rankGeocodeCandidates(collected, derivedHints);
        const seen = new Set<string>();
        const unique = ranked.filter((c) => {
          const key = `${c.latitude.toFixed(3)},${c.longitude.toFixed(3)}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        return {
          results: unique,
          resolvedFallback: i > 0,
        };
      }
    }

    for (let i = 0; i < attempts.length; i++) {
      const matches = await queryOpenMeteoGeocode(attempts[i], false);
      if (matches.length > 0) {
        return {
          results: rankGeocodeCandidates(matches, derivedHints),
          resolvedFallback: i > 0,
        };
      }
    }
    return { results: [], resolvedFallback: false };
  }

  const orderedQueries = [params.village, params.mandal, params.district]
    .map((q) => sanitizePlaceToken(q))
    .filter(Boolean);

  const uniqueQueries = [...new Set(orderedQueries)];
  let bestUnmatchedFallback: GeocodeResultItem[] = [];

  for (let i = 0; i < uniqueQueries.length; i++) {
    const variants = buildIndianSpellingVariants(uniqueQueries[i]);
    let collected: GeocodeResultItem[] = [];
    for (const variant of variants) {
      const matches = await queryOpenMeteoGeocode(variant, true);
      collected = [...collected, ...matches];
    }

    if (collected.length > 0) {
      const ranked = rankGeocodeCandidates(collected, hints);
      const top = ranked[0];
      const matchInfo = candidateMatchesHints(top, hints);

      if (matchInfo.districtMatch || matchInfo.stateMatch || (!hints.state && !hints.district)) {
        const seen = new Set<string>();
        const unique = ranked.filter((c) => {
          const key = `${c.latitude.toFixed(3)},${c.longitude.toFixed(3)}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        return {
          results: unique,
          resolvedFallback: i > 0,
        };
      }

      if (bestUnmatchedFallback.length === 0) {
        bestUnmatchedFallback = ranked;
      }
    }
  }

  if (bestUnmatchedFallback.length > 0) {
    return { results: bestUnmatchedFallback, resolvedFallback: true };
  }

  return { results: [], resolvedFallback: false };
}

function buildAgriculturalInterpretations(params: {
  current: CurrentWeatherPayload;
  hourlyForecast: WeatherForecastItem[];
  dailyForecast: DailyForecastItem[];
}): WeatherInterpretationItem[] {
  const items: WeatherInterpretationItem[] = [];
  const { current, hourlyForecast, dailyForecast } = params;

  const maxHourlyRainProb = Math.max(
    current.rainProbabilityPct ?? 0,
    ...hourlyForecast.map((h) => h.rainProbabilityPct ?? 0)
  );
  const maxDailyRainProb = Math.max(
    0,
    ...dailyForecast.slice(0, 2).map((d) => d.rainProbabilityMaxPct ?? 0)
  );
  const peakRainProb = Math.max(maxHourlyRainProb, maxDailyRainProb);
  const next24hRainMm = current.expectedRainfallNext24hMm;
  const maxDailyRainMm = Math.max(
    0,
    ...dailyForecast.slice(0, 2).map((d) => d.precipitationSumMm)
  );
  const peakTempC = Math.max(
    current.tempC,
    dailyForecast[0]?.tempMaxC ?? current.tempC
  );
  const peakWindKmh = Math.max(
    current.windSpeedKmh,
    ...hourlyForecast.slice(0, 4).map((h) => h.windSpeedKmh)
  );

  const probPct = Math.round(peakRainProb);
  const rain24 = next24hRainMm.toFixed(1);
  const heavyMm = Math.max(next24hRainMm, maxDailyRainMm).toFixed(1);
  const peakT = peakTempC.toFixed(1);
  const curT = current.tempC.toFixed(1);
  const windKmh = peakWindKmh.toFixed(1);
  const hum = current.humidityPct;

  if (peakRainProb >= 45 || next24hRainMm >= 3) {
    items.push({
      type: "rain_irrigation",
      severity: "info",
      titles: {
        en: "Rain is expected — review irrigation schedule",
        te: "వర్షం అవకాశం ఉంది — నీటిపారుదల ముందుగా సరిచూడండి",
        hi: "बारिश की संभावना है — सिंचाई का समय जांचें",
        ta: "மழைக்கு வாய்ப்பு — பாசன நேரத்தை சரிபார்க்கவும்",
        ml: "മഴയ്ക്ക് സാധ്യത — നനയ്ക്കൽ സമയം പരിശോധിക്കുക",
        kn: "ಮಳೆ ನಿರೀಕ್ಷೆ — ನೀರಾವರಿ ವೇಳಾಪಟ್ಟಿ ಪರಿಶೀಲಿಸಿ",
        bn: "বৃষ্টির সম্ভাবনা — সেচের সময়সূচি দেখে নিন",
        mr: "पावसाची शक्यता — सिंचनाचे वेळापत्रक तपासा",
      },
      details: {
        en: `Forecast rain probability reaches ${probPct}% (approx. ${rain24} mm over 24 hours). Rain is not guaranteed; check soil moisture before running pumps.`,
        te: `రాబోయే 24 గంటల్లో వర్షం అవకాశం ${probPct}% వరకు (సుమారు ${rain24} మి.మీ.) ఉంది. నేల తేమ చూసి నీటిపారుదల నిర్ణయించండి.`,
        hi: `अगले 24 घंटों में बारिश की संभावना ${probPct}% तक (लगभग ${rain24} मिमी) है। पंप चलाने से पहले मिट्टी की नमी जांचें।`,
        ta: `அடுத்த 24 மணி நேரத்தில் மழை வாய்ப்பு ${probPct}% (சுமார் ${rain24} மி.மீ) உள்ளது. மண் ஈரப்பதம் பார்த்து நீர் பாய்ச்சவும்.`,
        ml: `അടുത്ത 24 മണിക്കൂറിൽ മഴ സാധ്യത ${probPct}% (ഏകദേശം ${rain24} മി.മീ) ആണ്. മണ്ണിലെ ഈർപ്പം നോക്കി നനയ്ക്കുക.`,
        kn: `ಮುಂದಿನ 24 ಗಂಟೆಗಳಲ್ಲಿ ಮಳೆ ಸಾಧ್ಯತೆ ${probPct}% (ಸುಮಾರು ${rain24} ಮಿ.ಮೀ) ಇದೆ. ಮಣ್ಣಿನ ತೇವಾಂಶ ನೋಡಿ ನೀರು ಹಾಯಿಸಿ.`,
        bn: `আগামী ২৪ ঘণ্টায় বৃষ্টির সম্ভাবনা ${probPct}% (প্রায় ${rain24} মিমি)। পাম্প চালানোর আগে মাটির আর্দ্রতা দেখে নিন।`,
        mr: `पुढील २४ तासांत पावसाची शक्यता ${probPct}% (सुमारे ${rain24} मिमी) आहे. पंप सुरू करण्यापूर्वी जमिनीतील ओलावा तपासा.`,
      },
    });
  }

  if (next24hRainMm >= 25 || maxDailyRainMm >= 35) {
    items.push({
      type: "drainage_warning",
      severity: "warning",
      titles: {
        en: "Heavy rainfall forecast requires field drainage check",
        te: "భారీ వర్ష సూచన — పొలం నీరు బయటకు పోయే మార్గాలు సిద్ధం చేయండి",
        hi: "तेज बारिश का अनुमान — खेत की जल निकासी जांचें",
        ta: "கனமழை முன்னறிவிப்பு — வயல் வடிகால் அமைப்பைச் சரிபார்க்கவும்",
        ml: "ശക്തമായ മഴ മുന്നറിയിപ്പ് — വയലിലെ നീർവാർച്ച പരിശോധിക്കുക",
        kn: "ಭಾರೀ ಮಳೆ ಮುನ್ಸೂಚನೆ — ಹೊಲದ ನೀರು ಬಸಿದುಹೋಗುವ ದಾರಿ ಸ್ವಚ್ಛಗೊಳಿಸಿ",
        bn: "ভারী বৃষ্টির পূর্বাভাস — জমির নিকাশি ব্যবস্থা পরিষ্কার রাখুন",
        mr: "मुसळधार पावसाचा अंदाज — शेतातील निचरा व्यवस्था तपासा",
      },
      details: {
        en: `Model estimates indicate ${heavyMm} mm rainfall potential. Clear bund outlets and drainage trenches to avoid waterlogging near roots.`,
        te: `సుమారు ${heavyMm} మి.మీ. వర్షపాత అవకాశం ఉంది. వేర్ల వద్ద నీరు నిలవకుండా గట్లు మరియు డ్రైనేజీ కాలువలను శుభ్రం చేయండి.`,
        hi: `लगभग ${heavyMm} मिमी बारिश का अनुमान है। जड़ों के पास जलभराव से बचने के लिए मेड़ और नालियाँ साफ रखें।`,
        ta: `சுமார் ${heavyMm} மி.மீ மழை பெய்யக்கூடும். வேர்களில் நீர் தேங்காமல் இருக்க வரப்பு மற்றும் வடிகால்களைச் சுத்தம் செய்யவும்.`,
        ml: `ഏകദേശം ${heavyMm} മി.മീ മഴയ്ക്ക് സാധ്യതയുണ്ട്. വേരുകളിൽ വെള്ളം കെട്ടിനിൽക്കാതിരിക്കാൻ നീർച്ചാലുകൾ വൃത്തിയാക്കുക.`,
        kn: `ಸುಮಾರು ${heavyMm} ಮಿ.ಮೀ ಮಳೆ ಸಾಧ್ಯತೆ ಇದೆ. ಬೇರುಗಳ ಬಳಿ ನೀರು ನಿಲ್ಲದಂತೆ ಬದು ಮತ್ತು ಕಾಲುವೆಗಳನ್ನು ಸ್ವಚ್ಛಗೊಳಿಸಿ.`,
        bn: `প্রায় ${heavyMm} মিমি বৃষ্টির সম্ভাবনা রয়েছে। শিকড়ের কাছে জল জমা এড়াতে আইল ও নিকাশি নালা পরিষ্কার রাখুন।`,
        mr: `सुमारे ${heavyMm} मिमी पावसाचा अंदाज आहे. मुळांजवळ पाणी साचू नये म्हणून बांध व चर मोकळे ठेवा.`,
      },
    });
  }

  if (peakTempC >= 34) {
    items.push({
      type: "heat_demand",
      severity: "caution",
      titles: {
        en: "High temperatures may increase crop water demand",
        te: "అధిక ఉష్ణోగ్రతల వల్ల పంటకు నీటి అవసరం పెరగవచ్చు",
        hi: "उच्च तापमान से फसल की पानी की मांग बढ़ सकती है",
        ta: "அதிக வெப்பத்தால் பயிரின் நீர் தேவை அதிகரிக்கலாம்",
        ml: "ഉയർന്ന ചൂട് കാരണം വിളകൾക്ക് കൂടുതൽ വെള്ളം ആവശ്യമായേക്കാം",
        kn: "ಹೆಚ್ಚಿನ ತಾಪಮಾನದಿಂದ ಬೆಳೆಗಳಿಗೆ ನೀರಿನ ಬೇಡಿಕೆ ಹೆಚ್ಚಾಗಬಹುದು",
        bn: "উচ্চ তাপমাত্রায় ফসলের জলের চাহিদা বাড়তে পারে",
        mr: "वाढलेल्या तापमानामुळे पिकाची पाण्याची गरज वाढू शकते",
      },
      details: {
        en: `Temperatures may reach ${peakT}°C (current ${curT}°C). Irrigate early morning or evening to lower evaporation loss.`,
        te: `ఉష్ణోగ్రత ${peakT}°C వరకు ఉండవచ్చు (ప్రస్తుతం ${curT}°C). నీరు ఆవిరైపోకుండా ఉదయం లేదా సాయంత్రం నీరు పెట్టండి.`,
        hi: `तापमान ${peakT}°C तक जा सकता है (अभी ${curT}°C)। वाष्पीकरण कम करने के लिए सुबह जल्दी या शाम को सिंचाई करें।`,
        ta: `வெப்பநிலை ${peakT}°C வரை உயரலாம் (தற்போது ${curT}°C). ஆவியாதலைக் குறைக்க காலை அல்லது மாலையில் நீர் பாய்ச்சவும்.`,
        ml: `താപനില ${peakT}°C വരെ ഉയരാം (ഇപ്പോൾ ${curT}°C). ബാഷ്പീകരണം കുറയ്ക്കാൻ രാവിലെയോ വൈകുന്നേരമോ നനയ്ക്കുക.`,
        kn: `ತಾಪಮಾನ ${peakT}°C ವರೆಗೆ ತಲುಪಬಹುದು (ಪ್ರಸ್ತುತ ${curT}°C). ಆವಿಯಾಗುವಿಕೆ ತಗ್ಗಿಸಲು ಬೆಳಿಗ್ಗೆ ಅಥವಾ ಸಂಜೆ ನೀರು ಹಾಯಿಸಿ.`,
        bn: `তাপমাত্রা ${peakT}°C পর্যন্ত উঠতে পারে (এখন ${curT}°C)। বাষ্পীভবন কমাতে ভোরে বা সন্ধ্যায় সেচ দিন।`,
        mr: `तापमान ${peakT}°C पर्यंत जाऊ शकते (सध्या ${curT}°C). बाष्पीभवन कमी करण्यासाठी सकाळी लवकर किंवा संध्याकाळी सिंचन करा.`,
      },
    });
  }

  if (peakWindKmh >= 18) {
    items.push({
      type: "wind_spraying",
      severity: "caution",
      titles: {
        en: "Strong winds may affect spraying activities",
        te: "బలమైన గాలులు మందుల పిచికారీ & స్ప్రింక్లర్లపై ప్రభావం చూపుతాయి",
        hi: "तेज हवाएं छिड़काव कार्यों को प्रभावित कर सकती हैं",
        ta: "பலத்த காற்று தெளிப்புப் பணிகளைப் பாதிக்கலாம்",
        ml: "ശക്തമായ കാറ്റ് മരുന്നുതളിക്കലിനെ ബാധിച്ചേക്കാം",
        kn: "ಜೋರಾದ ಗಾಳಿ ಸಿಂಪಡಣೆ ಕೆಲಸದ ಮೇಲೆ ಪರಿಣಾಮ ಬೀರಬಹುದು",
        bn: "দমকা হাওয়া স্প্রে করার কাজে প্রভাব ফেলতে পারে",
        mr: "जोरदार वाऱ्यामुळे फवारणी कामात अडथळा येऊ शकतो",
      },
      details: {
        en: `Wind speeds may reach ${windKmh} km/h. Postpone foliar spraying or overhead sprinklers during gusty periods.`,
        te: `గాలి వేగం గంటకు ${windKmh} కి.మీ. వరకు ఉంది. గాలి తక్కువగా ఉన్న ఉదయ వేళల్లో మాత్రమే పిచికారీ చేయండి.`,
        hi: `हवा की गति ${windKmh} किमी/घंटा तक रह सकती है। तेज हवा के समय छिड़काव या स्प्रिंकलर सिंचाई टालें।`,
        ta: `காற்றின் வேகம் மணிக்கு ${windKmh} கி.மீ வரை இருக்கலாம். காற்று வீசும் நேரத்தில் மருந்து தெளிப்பதைத் தவிர்க்கவும்.`,
        ml: `കാറ്റിന്റെ വേഗത മണിക്കൂറിൽ ${windKmh} കി.മീ വരെയാകാം. കാറ്റുള്ള സമയത്ത് തളിക്കൽ ഒഴിവാക്കുക.`,
        kn: `ಗಾಳಿಯ ವೇಗ ಗಂಟೆಗೆ ${windKmh} ಕಿ.ಮೀ ತಲುಪಬಹುದು. ಗಾಳಿ ಹೆಚ್ಚಿರುವಾಗ ಸಿಂಪಡಣೆ ಮುಂದೂಡಿ.`,
        bn: `বাতাসের গতি ঘণ্টায় ${windKmh} কিমি পর্যন্ত হতে পারে। দমকা হাওয়ার সময় স্প্রে বা স্প্রিংকলার বন্ধ রাখুন।`,
        mr: `वाऱ्याचा वेग ताशी ${windKmh} किमी पर्यंत असू शकतो. वेगवान वाऱ्याच्या वेळी फवारणी किंवा तुषार सिंचन टाळा.`,
      },
    });
  }

  if (hum < 38 && peakRainProb < 25) {
    items.push({
      type: "dry_warm",
      severity: "info",
      titles: {
        en: "Low humidity — conserve root-zone soil moisture",
        te: "గాలిలో తేమ తక్కువ — వేర్ల వద్ద మల్చింగ్‌తో తేమను కాపాడండి",
        hi: "कम नमी — मिट्टी की नमी बचाने पर ध्यान दें",
        ta: "குறைந்த ஈரப்பதம் — வேர்ப்பகுதி ஈரத்தைக் காக்கவும்",
        ml: "കുറഞ്ഞ ആർദ്രത — വേരിന് ചുറ്റുമുള്ള ഈർപ്പം സംരക്ഷിക്കുക",
        kn: "ಕಡಿಮೆ ತೇವಾಂಶ — ಬೇರು ವಲಯದ ಮಣ್ಣಿನ ತೇವ ಉಳಿಸಿ",
        bn: "কম আর্দ্রতা — শিকড়ের কাছের মাটির রস ধরে রাখুন",
        mr: "कमी आर्द्रता — मुळांजवळील जमिनीचा ओलावा टिकवा",
      },
      details: {
        en: `Relative humidity is ${hum}% with low rain chances. Light mulching and checking 10–15 cm root-zone moisture help reduce moisture stress.`,
        te: `గాలిలో తేమ ${hum}% గా ఉంది. ఎండు గడ్డి మల్చింగ్ వేయడం ద్వారా నేల తేమ త్వరగా ఆరిపోకుండా చూడవచ్చు.`,
        hi: `नमी ${hum}% है और बारिश की संभावना कम है। मल्चिंग और 10–15 सेमी जड़-क्षेत्र नमी की जांच से सिंचाई की बचत होगी।`,
        ta: `காற்றின் ஈரப்பதம் ${hum}% ஆக உள்ளது. மூடாக்கு அமைப்பதன் மூலம் மண் ஈரப்பதத்தைத் தக்கவைக்கலாம்.`,
        ml: `അന്തരീക്ഷ ഈർപ്പം ${hum}% ആണ്. പുതയിടുന്നത് മണ്ണിലെ ഈർപ്പം പെട്ടെന്ന് നഷ്ടപ്പെടുന്നത് തടയാൻ സഹായിക്കും.`,
        kn: `ಗಾಳಿಯಲ್ಲಿ ತೇವಾಂಶ ${hum}% ಇದೆ. ಒಣ ಹುಲ್ಲಿನ ಹೊದಿಕೆ (ಮಲ್ಚಿಂಗ್) ಮಣ್ಣಿನ ತೇವಾಂಶ ಉಳಿಸಲು ಸಹಾಯ ಮಾಡುತ್ತದೆ.`,
        bn: `বাতাসে আর্দ্রতা ${hum}% এবং বৃষ্টির সম্ভাবনা কম। মালচিং করলে মাটির আর্দ্রতা সহজে নষ্ট হবে না।`,
        mr: `हवेतील आर्द्रता ${hum}% असून पावसाची शक्यता कमी आहे. आच्छादन केल्यास जमिनीतील ओलावा टिकून राहतो.`,
      },
    });
  }

  if (items.length === 0) {
    items.push({
      type: "general",
      severity: "info",
      titles: {
        en: "Moderate weather for routine field & irrigation work",
        te: "సాధారణ వ్యవసాయ పనులకు అనుకూల వాతావరణం",
        hi: "नियमित खेती और सिंचाई कार्यों के लिए अनुकूल मौसम",
        ta: "வழக்கமான விவசாயம் மற்றும் பாசனப் பணிகளுக்கு உகந்த வானிலை",
        ml: "സാധാരണ കൃഷി, നനയ്ക്കൽ ജോലികൾക്ക് അനുയോജ്യമായ കാലാവസ്ഥ",
        kn: "ದೈನಂದಿನ ಕೃಷಿ ಮತ್ತು ನೀರಾವರಿ ಕೆಲಸಗಳಿಗೆ ಅನುಕೂಲಕರ ಹವಾಮಾನ",
        bn: "নিয়মিত চাষ ও সেচের কাজের জন্য অনুকূল আবহাওয়া",
        mr: "नियमित शेती व सिंचन कामांसाठी अनुकूल हवामान",
      },
      details: {
        en: `Current temperature is ${curT}°C with ${hum}% humidity and ${current.windSpeedKmh.toFixed(1)} km/h wind. Inspect topsoil moisture by hand before starting irrigation.`,
        te: `ప్రస్తుత ఉష్ణోగ్రత ${curT}°C, తేమ ${hum}%. మోటారు వేసే ముందు చేతితో మట్టి తేమను తనిఖీ చేయండి.`,
        hi: `वर्तमान तापमान ${curT}°C और नमी ${hum}% है। सिंचाई शुरू करने से पहले हाथ से मिट्टी की नमी जांचें।`,
        ta: `தற்போதைய வெப்பநிலை ${curT}°C மற்றும் ஈரப்பதம் ${hum}%. பாசனம் தொடங்கும் முன் மண் ஈரப்பதத்தைக் கையால் சோதிக்கவும்.`,
        ml: `നിലവിലെ താപനില ${curT}°C ഉം ഈർപ്പം ${hum}% ഉം ആണ്. നനയ്ക്കുന്നതിന് മുമ്പ് മണ്ണിലെ ഈർപ്പം കൈകൊണ്ട് പരിശോധിക്കുക.`,
        kn: `ಪ್ರಸ್ತುತ ತಾಪಮಾನ ${curT}°C ಮತ್ತು ತೇವಾಂಶ ${hum}% ಇದೆ. ನೀರು ಹಾಯಿಸುವ ಮೊದಲು ಕೈಯಿಂದ ಮಣ್ಣಿನ ತೇವಾಂಶ ಪರೀಕ್ಷಿಸಿ.`,
        bn: `বর্তমান তাপমাত্রা ${curT}°C এবং আর্দ্রতা ${hum}%। সেচ শুরু করার আগে হাত দিয়ে মাটির আর্দ্রতা দেখে নিন।`,
        mr: `सध्याचे तापमान ${curT}°C आणि आर्द्रता ${hum}% आहे. सिंचन सुरू करण्यापूर्वी हाताने मातीतील ओलावा तपासा.`,
      },
    });
  }

  return items;
}

export async function fetchOpenMeteoWeather(params: {
  latitude: number;
  longitude: number;
  locationLabel: string;
  resolvedLocationName: string;
  resolvedFallback?: boolean;
  bypassCache?: boolean;
}): Promise<WeatherResponsePayload> {
  const { latitude, longitude } = params;
  if (
    typeof latitude !== "number" ||
    Number.isNaN(latitude) ||
    typeof longitude !== "number" ||
    Number.isNaN(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    const err = new Error("Invalid latitude or longitude coordinates.");
    (err as Error & { status?: number }).status = 400;
    throw err;
  }

  const cacheKey = `${latitude.toFixed(2)},${longitude.toFixed(2)}`;
  if (!params.bypassCache) {
    const cached = getValidCache(WEATHER_CACHE, cacheKey);
    if (cached) {
      return {
        ...cached,
        locationLabel: params.locationLabel || cached.locationLabel,
        resolvedLocationName:
          params.resolvedLocationName || cached.resolvedLocationName,
        resolvedFallback: Boolean(params.resolvedFallback),
        cached: true,
      };
    }
  }

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set(
    "current",
    "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m,wind_direction_10m"
  );
  url.searchParams.set(
    "hourly",
    "temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m"
  );
  url.searchParams.set(
    "daily",
    "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max"
  );
  url.searchParams.set("timezone", "Asia/Kolkata");
  url.searchParams.set("forecast_days", "5");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 14000);

  try {
    const res = await fetch(url.toString(), { signal: controller.signal });
    if (res.status === 429) {
      const err = new Error(
        "Weather service is temporarily busy. Please retry in a few moments."
      );
      (err as Error & { status?: number }).status = 429;
      throw err;
    }
    if (!res.ok) {
      const err = new Error(
        "Live weather information is temporarily unavailable. Please retry."
      );
      (err as Error & { status?: number }).status = 502;
      throw err;
    }

    const data = (await res.json()) as {
      timezone?: string;
      current?: {
        time?: string;
        temperature_2m?: number;
        relative_humidity_2m?: number;
        apparent_temperature?: number;
        precipitation?: number;
        rain?: number;
        weather_code?: number;
        wind_speed_10m?: number;
        wind_direction_10m?: number;
      };
      hourly?: {
        time?: string[];
        temperature_2m?: number[];
        relative_humidity_2m?: number[];
        precipitation_probability?: Array<number | null>;
        precipitation?: number[];
        weather_code?: number[];
        wind_speed_10m?: number[];
      };
      daily?: {
        time?: string[];
        weather_code?: number[];
        temperature_2m_max?: number[];
        temperature_2m_min?: number[];
        precipitation_sum?: number[];
        precipitation_probability_max?: Array<number | null>;
        wind_speed_10m_max?: number[];
      };
    };

    if (!data.current || typeof data.current.temperature_2m !== "number") {
      const err = new Error(
        "Live weather information is temporarily unavailable. Please retry."
      );
      (err as Error & { status?: number }).status = 502;
      throw err;
    }

    const currentTimeStr = data.current.time || "";
    const hourlyTimes = data.hourly?.time || [];
    let startIdx = hourlyTimes.findIndex((t) => t >= currentTimeStr);
    if (startIdx < 0) startIdx = 0;

    let next24hRainMm = 0;
    for (let i = startIdx; i < Math.min(startIdx + 24, hourlyTimes.length); i++) {
      next24hRainMm += data.hourly?.precipitation?.[i] ?? 0;
    }

    const hourlyForecast: WeatherForecastItem[] = [];
    for (
      let i = startIdx + 1;
      i < Math.min(startIdx + 25, hourlyTimes.length) && hourlyForecast.length < 6;
      i += 3
    ) {
      const iso = hourlyTimes[i];
      const wmo = describeWmoCode(data.hourly?.weather_code?.[i] ?? 0);
      hourlyForecast.push({
        timeLabel: iso.slice(11, 16),
        isoTime: iso,
        tempC: Math.round((data.hourly?.temperature_2m?.[i] ?? 0) * 10) / 10,
        conditionKey: wmo.key,
        conditionLabels: wmo.labels,
        rainProbabilityPct:
          typeof data.hourly?.precipitation_probability?.[i] === "number"
            ? data.hourly!.precipitation_probability![i]!
            : null,
        expectedRainfallMm:
          Math.round((data.hourly?.precipitation?.[i] ?? 0) * 10) / 10,
        windSpeedKmh:
          Math.round((data.hourly?.wind_speed_10m?.[i] ?? 0) * 10) / 10,
        humidityPct: Math.round(data.hourly?.relative_humidity_2m?.[i] ?? 0),
      });
    }

    const dailyTimes = data.daily?.time || [];
    const dailyForecast: DailyForecastItem[] = dailyTimes.map((dateStr, idx) => {
      const wmo = describeWmoCode(data.daily?.weather_code?.[idx] ?? 0);
      return {
        date: dateStr,
        conditionKey: wmo.key,
        conditionLabels: wmo.labels,
        tempMinC:
          Math.round((data.daily?.temperature_2m_min?.[idx] ?? 0) * 10) / 10,
        tempMaxC:
          Math.round((data.daily?.temperature_2m_max?.[idx] ?? 0) * 10) / 10,
        rainProbabilityMaxPct:
          typeof data.daily?.precipitation_probability_max?.[idx] === "number"
            ? data.daily!.precipitation_probability_max![idx]!
            : null,
        precipitationSumMm:
          Math.round((data.daily?.precipitation_sum?.[idx] ?? 0) * 10) / 10,
        windSpeedMaxKmh:
          Math.round((data.daily?.wind_speed_10m_max?.[idx] ?? 0) * 10) / 10,
      };
    });

    const currentWmo = describeWmoCode(data.current.weather_code ?? 0);
    const windDirDeg = Math.round(data.current.wind_direction_10m ?? 0);
    const currentRainProb =
      typeof data.hourly?.precipitation_probability?.[startIdx] === "number"
        ? data.hourly!.precipitation_probability![startIdx]!
        : dailyForecast[0]?.rainProbabilityMaxPct ?? null;

    const currentPayload: CurrentWeatherPayload = {
      tempC: Math.round(data.current.temperature_2m * 10) / 10,
      feelsLikeC:
        Math.round(
          (data.current.apparent_temperature ?? data.current.temperature_2m) *
            10
        ) / 10,
      humidityPct: Math.round(data.current.relative_humidity_2m ?? 0),
      precipitationMm:
        Math.round((data.current.precipitation ?? 0) * 10) / 10,
      rainMm: Math.round((data.current.rain ?? 0) * 10) / 10,
      weatherCode: data.current.weather_code ?? 0,
      conditionKey: currentWmo.key,
      conditionLabels: currentWmo.labels,
      windSpeedKmh: Math.round((data.current.wind_speed_10m ?? 0) * 10) / 10,
      windDirectionDeg: windDirDeg,
      windDirectionCardinal: degreesToCardinal(windDirDeg),
      rainProbabilityPct: currentRainProb,
      expectedRainfallNext24hMm: Math.round(next24hRainMm * 10) / 10,
    };

    const result: WeatherResponsePayload = {
      ok: true,
      provider: "open-meteo",
      status: "live",
      locationLabel: params.locationLabel,
      resolvedLocationName: params.resolvedLocationName,
      resolvedFallback: Boolean(params.resolvedFallback),
      coordinates: {
        latitude: Math.round(latitude * 10000) / 10000,
        longitude: Math.round(longitude * 10000) / 10000,
      },
      timezone: data.timezone || "Asia/Kolkata",
      observedAt: currentTimeStr || new Date().toISOString(),
      fetchedAt: new Date().toISOString(),
      cached: false,
      current: currentPayload,
      forecast: hourlyForecast,
      dailyForecast,
      interpretations: buildAgriculturalInterpretations({
        current: currentPayload,
        hourlyForecast,
        dailyForecast,
      }),
      assumptions: {
        en: [
          "Weather figures come from Open-Meteo model forecasts (~11 km grid) in Asia/Kolkata (IST) timezone.",
          "Rain probability indicates likelihood over a forecast window, not a guarantee of rainfall at your exact plot.",
          "Check root-zone moisture 10–15 cm deep by hand before starting or skipping irrigation.",
        ],
        te: [
          "వాతావరణ వివరాలు Open-Meteo నమూనా అంచనాల నుండి Asia/Kolkata (IST) సమయం ప్రకారం తీసుకోబడ్డాయి.",
          "వర్షం అవకాశం అనేది అంచనా శాతాన్ని మాత్రమే చూపుతుంది; పొలం వద్ద వాస్తవ వర్షానికి హామీ కాదు.",
          "నీరు పెట్టే ముందు 10–15 సెం.మీ. లోతు మట్టి తేమను చేతితో తనిఖీ చేయండి.",
        ],
        hi: [
          "मौसम के आंकड़े Open-Meteo मॉडल पूर्वानुमान से Asia/Kolkata (IST) समयानुसार लिए गए हैं।",
          "बारिश की संभावना केवल अनुमान को दर्शाती है; खेत पर बारिश की पक्की गारंटी नहीं है।",
          "सिंचाई शुरू करने या रोकने से पहले 10–15 सेमी गहरी मिट्टी की नमी हाथ से जांचें।",
        ],
        ta: [
          "வானிலை தகவல்கள் Open-Meteo கணிப்புகளில் இருந்து Asia/Kolkata (IST) நேரப்படி பெறப்படுகின்றன.",
          "மழை வாய்ப்பு என்பது கணிப்பு சதவீதம் மட்டுமே; உங்கள் வயலில் நிச்சயமாக மழை பெய்யும் என்பதற்கு உத்தரவாதமல்ல.",
          "பாசனம் தொடங்குவதற்கு முன் 10–15 செ.மீ ஆழத்தில் மண் ஈரப்பதத்தைக் கையால் சோதிக்கவும்.",
        ],
        ml: [
          "കാലാവസ്ഥാ വിവരങ്ങൾ Open-Meteo മോഡലിൽ നിന്നും Asia/Kolkata (IST) സമയക്രമത്തിൽ ശേഖരിച്ചവയാണ്.",
          "മഴ സാധ്യത പ്രവചനം മാത്രമാണ്; കൃഷിയിടത്തിൽ മഴ പെയ്യുമെന്ന് ഉറപ്പല്ല.",
          "നനയ്ക്കൽ തുടങ്ങുന്നതിന് മുമ്പ് 10–15 സെ.മീ ആഴത്തിലുള്ള മണ്ണിലെ ഈർപ്പം കൈകൊണ്ട് പരിശോധിക്കുക.",
        ],
        kn: [
          "ಹವಾಮಾನ ವಿವರಗಳು Open-Meteo ಮಾದರಿ ಮುನ್ಸೂಚನೆಯಿಂದ Asia/Kolkata (IST) ಸಮಯದ ಪ್ರಕಾರ ಬಂದಿವೆ.",
          "ಮಳೆ ಸಾಧ್ಯತೆ ಕೇವಲ ಮುನ್ಸೂಚನೆಯನ್ನು ತೋರಿಸುತ್ತದೆ; ಹೊಲದಲ್ಲಿ ಖಚಿತ ಮಳೆಯ ಭರವಸೆಯಲ್ಲ.",
          "ನೀರು ಹಾಯಿಸುವ ಮೊದಲು 10–15 ಸೆಂ.ಮೀ ಆಳದ ಮಣ್ಣಿನ ತೇವಾಂಶವನ್ನು ಕೈಯಿಂದ ಪರೀಕ್ಷಿಸಿ.",
        ],
        bn: [
          "আবহাওয়ার তথ্য Open-Meteo মডেল পূর্বাভাস থেকে Asia/Kolkata (IST) সময় অনুযায়ী নেওয়া হয়েছে।",
          "বৃষ্টির সম্ভাবনা কেবল পূর্বাভাস নির্দেশ করে; আপনার জমিতে নিশ্চিত বৃষ্টির গ্যারান্টি নয়।",
          "সেচ শুরু বা বন্ধ করার আগে ১০–১৫ সেমি গভীরে মাটির আর্দ্রতা হাত দিয়ে দেখে নিন।",
        ],
        mr: [
          "हवामान आकडेवारी Open-Meteo मॉडेल अंदाजावरून Asia/Kolkata (IST) वेळेनुसार घेतली आहे.",
          "पावसाची शक्यता ही केवळ अंदाज दर्शवते; तुमच्या शेतात पावसाची खात्री नाही.",
          "सिंचन सुरू करण्यापूर्वी किंवा थांबवण्यापूर्वी १०–१५ सेमी खोलीवरील ओलावा हाताने तपासा.",
        ],
      },
    };

    setBoundedCache(WEATHER_CACHE, cacheKey, result, WEATHER_TTL_MS);
    return result;
  } catch (error) {
    if ((error as Error & { name?: string }).name === "AbortError") {
      const err = new Error(
        "Live weather information is temporarily unavailable. Please retry."
      );
      (err as Error & { status?: number }).status = 504;
      throw err;
    }
    if ((error as Error & { status?: number }).status) {
      throw error;
    }
    const err = new Error(
      "Live weather information is temporarily unavailable. Please retry."
    );
    (err as Error & { status?: number }).status = 502;
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchWeatherForFarmer(params: {
  lat?: number;
  lon?: number;
  location?: string;
  village?: string;
  mandal?: string;
  district?: string;
  state?: string;
  refresh?: boolean;
}): Promise<WeatherResponsePayload> {
  const hasCoords =
    typeof params.lat === "number" &&
    !Number.isNaN(params.lat) &&
    typeof params.lon === "number" &&
    !Number.isNaN(params.lon);

  if (hasCoords) {
    const label =
      params.location?.trim() ||
      [params.village, params.mandal, params.district]
        .map((s) => s?.trim())
        .filter(Boolean)
        .join(", ") ||
      `GPS (${params.lat!.toFixed(3)}, ${params.lon!.toFixed(3)})`;

    return fetchOpenMeteoWeather({
      latitude: params.lat!,
      longitude: params.lon!,
      locationLabel: label,
      resolvedLocationName: label,
      resolvedFallback: false,
      bypassCache: params.refresh,
    });
  }

  const hasTextQuery = Boolean(
    params.location?.trim() ||
      params.village?.trim() ||
      params.mandal?.trim() ||
      params.district?.trim()
  );

  if (!hasTextQuery) {
    const err = new Error(
      "Please enter a village, mandal, town, or district name, or use GPS location."
    );
    (err as Error & { status?: number }).status = 400;
    throw err;
  }

  const { results, resolvedFallback } = await geocodeFarmerLocation({
    location: params.location,
    village: params.village,
    mandal: params.mandal,
    district: params.district,
    state: params.state,
  });

  if (results.length === 0) {
    const err = new Error(
      "Location not found. Try searching your nearest mandal, town, or district name."
    );
    (err as Error & { status?: number }).status = 404;
    throw err;
  }

  const best = results[0];
  const requestedLabel =
    params.location?.trim() ||
    [params.village, params.mandal, params.district]
      .map((s) => s?.trim())
      .filter(Boolean)
      .join(", ");

  return fetchOpenMeteoWeather({
    latitude: best.latitude,
    longitude: best.longitude,
    locationLabel: best.displayLabel,
    resolvedLocationName: requestedLabel || best.displayLabel,
    resolvedFallback,
    bypassCache: params.refresh,
  });
}
