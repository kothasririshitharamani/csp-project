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

export interface WeatherForecastItem {
  timeLabel: string;
  isoTime: string;
  tempC: number;
  conditionKey: WeatherConditionKey;
  conditionEn: string;
  conditionTe: string;
  conditionHi: string;
  rainProbabilityPct: number | null;
  expectedRainfallMm: number;
  windSpeedKmh: number;
  humidityPct: number;
}

export interface DailyForecastItem {
  date: string;
  conditionKey: WeatherConditionKey;
  conditionEn: string;
  conditionTe: string;
  conditionHi: string;
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
  titleEn: string;
  titleTe: string;
  titleHi: string;
  detailEn: string;
  detailTe: string;
  detailHi: string;
}

export interface CurrentWeatherPayload {
  tempC: number;
  feelsLikeC: number;
  humidityPct: number;
  precipitationMm: number;
  rainMm: number;
  weatherCode: number;
  conditionKey: WeatherConditionKey;
  conditionEn: string;
  conditionTe: string;
  conditionHi: string;
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
  assumptions: {
    en: string[];
    te: string[];
    hi: string[];
  };
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const GEOCODE_CACHE = new Map<string, CacheEntry<GeocodeResultItem[]>>();
const WEATHER_CACHE = new Map<string, CacheEntry<WeatherResponsePayload>>();

const GEOCODE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const WEATHER_TTL_MS = 10 * 60 * 1000; // 10 minutes
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
  return true; // Open-Meteo public API requires no API key
}

export function describeWmoCode(code: number): {
  key: WeatherConditionKey;
  en: string;
  te: string;
  hi: string;
} {
  if (code === 0) {
    return {
      key: "clear",
      en: "Clear sky",
      te: "నిర్మలమైన ఆకాశం",
      hi: "साफ आसमान",
    };
  }
  if (code === 1) {
    return {
      key: "clear",
      en: "Mainly clear",
      te: "ఎక్కువగా ఎండ",
      hi: "मुख्यतः साफ",
    };
  }
  if (code === 2) {
    return {
      key: "partly_cloudy",
      en: "Partly cloudy",
      te: "పాక్షికంగా మేఘావృతం",
      hi: "आंशिक रूप से बादल",
    };
  }
  if (code === 3) {
    return {
      key: "cloudy",
      en: "Overcast",
      te: "దట్టమైన మేఘాలు",
      hi: "घने बादल",
    };
  }
  if (code === 45 || code === 48) {
    return {
      key: "fog",
      en: "Fog / Mist",
      te: "పొగమంచు",
      hi: "कोहरा / धुंध",
    };
  }
  if (code >= 51 && code <= 57) {
    return {
      key: "drizzle",
      en: "Drizzle",
      te: "చిరు జల్లులు",
      hi: "हल्की बूंदाबांदी",
    };
  }
  if (code === 61 || code === 80) {
    return {
      key: "rain",
      en: "Light rain",
      te: "తేలికపాటి వర్షం",
      hi: "हल्की बारिश",
    };
  }
  if (code === 63 || code === 81 || code === 66) {
    return {
      key: "rain",
      en: "Moderate rain",
      te: "మోస్తరు వర్షం",
      hi: "मध्यम बारिश",
    };
  }
  if (code === 65 || code === 67 || code === 82) {
    return {
      key: "heavy_rain",
      en: "Heavy rain",
      te: "భారీ వర్షం",
      hi: "तेज बारिश",
    };
  }
  if (code >= 95 && code <= 99) {
    return {
      key: "thunderstorm",
      en: "Thunderstorm",
      te: "ఉరుములతో కూడిన వర్షం",
      hi: "आंधी और गरज के साथ बारिश",
    };
  }
  return {
    key: "partly_cloudy",
    en: "Variable sky",
    te: "మారుతున్న వాతావరణం",
    hi: "बदलता मौसम",
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

    // If user typed "Village, District" (e.g., "Amaravathi, Guntur"), use trailing segment as district hint
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
        // Deduplicate by coordinate rounded to 3 decimals
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

  // Try Village -> Mandal -> District in order, preferring matches inside farmer's state/district
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

  if (peakRainProb >= 45 || next24hRainMm >= 3) {
    items.push({
      type: "rain_irrigation",
      severity: "info",
      titleEn: "Rain is expected — review irrigation schedule",
      titleTe: "వర్షం అవకాశం ఉంది — నీటిపారుదల ముందుగా సరిచూడండి",
      titleHi: "बारिश की संभावना है — सिंचाई का समय जांचें",
      detailEn: `Forecast rain probability reaches ${Math.round(peakRainProb)}% (approx. ${next24hRainMm.toFixed(1)} mm over 24 hours). Rain is not guaranteed; check the forecast and soil moisture before running pumps.`,
      detailTe: `రాబోయే 24 గంటల్లో వర్షం అవకాశం ${Math.round(peakRainProb)}% వరకు (సుమారు ${next24hRainMm.toFixed(1)} మి.మీ.) ఉంది. వర్షం ఖచ్చితమని భావించకుండా నేల తేమ చూసి నీటిపారుదల నిర్ణయించండి.`,
      detailHi: `अगले 24 घंटों में बारिश की संभावना ${Math.round(peakRainProb)}% तक (लगभग ${next24hRainMm.toFixed(1)} मिमी) है। बारिश निश्चित नहीं मानी जा सकती; पंप चलाने से पहले मिट्टी की नमी जांचें।`,
    });
  }

  if (next24hRainMm >= 25 || maxDailyRainMm >= 35) {
    items.push({
      type: "drainage_warning",
      severity: "warning",
      titleEn: "Heavy rainfall forecast requires field drainage check",
      titleTe: "భారీ వర్ష సూచన — పొలం నీరు బయటకు పోయే మార్గాలు సిద్ధం చేయండి",
      titleHi: "तेज बारिश का अनुमान — खेत की जल निकासी जांचें",
      detailEn: `Model estimates indicate ${Math.max(next24hRainMm, maxDailyRainMm).toFixed(1)} mm rainfall potential. Clear field bund outlets and drainage trenches to avoid waterlogging near roots.`,
      detailTe: `సుమారు ${Math.max(next24hRainMm, maxDailyRainMm).toFixed(1)} మి.మీ. వర్షపాత అవకాశం ఉంది. వేర్ల వద్ద నీరు నిలవకుండా గట్లు మరియు డ్రైనేజీ కాలువలను శుభ్రం చేయండి.`,
      detailHi: `लगभग ${Math.max(next24hRainMm, maxDailyRainMm).toFixed(1)} मिमी बारिश का अनुमान है। जड़ों के पास जलभराव से बचने के लिए मेड़ और नालियाँ साफ रखें।`,
    });
  }

  if (peakTempC >= 34) {
    items.push({
      type: "heat_demand",
      severity: "caution",
      titleEn: "High temperatures may increase crop water demand",
      titleTe: "అధిక ఉష్ణోగ్రతల వల్ల పంటకు నీటి అవసరం పెరగవచ్చు",
      titleHi: "उच्च तापमान से फसल की पानी की मांग बढ़ सकती है",
      detailEn: `Temperatures may reach ${peakTempC.toFixed(1)}°C (current ${current.tempC.toFixed(1)}°C, feels like ${current.feelsLikeC.toFixed(1)}°C). Irrigate early morning or evening to lower evaporation loss.`,
      detailTe: `ఉష్ణోగ్రత ${peakTempC.toFixed(1)}°C వరకు ఉండవచ్చు (ప్రస్తుతం ${current.tempC.toFixed(1)}°C). నీరు ఆవిరైపోకుండా ఉదయం లేదా సాయంత్రం నీరు పెట్టండి.`,
      detailHi: `तापमान ${peakTempC.toFixed(1)}°C तक जा सकता है (अभी ${current.tempC.toFixed(1)}°C)। वाष्पीकरण कम करने के लिए सुबह जल्दी या शाम को सिंचाई करें।`,
    });
  }

  if (peakWindKmh >= 18) {
    items.push({
      type: "wind_spraying",
      severity: "caution",
      titleEn: "Strong winds may affect spraying activities",
      titleTe: "బలమైన గాలులు మందుల పిచికారీ & స్ప్రింక్లర్లపై ప్రభావం చూపుతాయి",
      titleHi: "तेज हवाएं छिड़काव कार्यों को प्रभावित कर सकती हैं",
      detailEn: `Wind speeds may reach ${peakWindKmh.toFixed(1)} km/h (current ${current.windSpeedKmh.toFixed(1)} km/h ${current.windDirectionCardinal}). Postpone foliar spraying or overhead sprinklers during gusty periods.`,
      detailTe: `గాలి వేగం గంటకు ${peakWindKmh.toFixed(1)} కి.మీ. వరకు ఉంది. గాలి తక్కువగా ఉన్న ఉదయ వేళల్లో మాత్రమే పిచికారీ చేయండి.`,
      detailHi: `हवा की गति ${peakWindKmh.toFixed(1)} किमी/घंटा तक रह सकती है। तेज हवा के समय छिड़काव या स्प्रिंकलर सिंचाई टालें।`,
    });
  }

  if (current.humidityPct < 38 && peakRainProb < 25) {
    items.push({
      type: "dry_warm",
      severity: "info",
      titleEn: "Low humidity — conserve root-zone soil moisture",
      titleTe: "గాలిలో తేమ తక్కువ — వేర్ల వద్ద మల్చింగ్‌తో తేమను కాపాడండి",
      titleHi: "कम नमी — मिट्टी की नमी बचाने पर ध्यान दें",
      detailEn: `Relative humidity is ${current.humidityPct}% with low rain chances. Light mulching and checking 10–15 cm root-zone moisture help reduce moisture stress.`,
      detailTe: `గాలిలో తేమ ${current.humidityPct}% గా ఉంది. ఎండు గడ్డి మల్చింగ్ వేయడం ద్వారా నేల తేమ త్వరగా ఆరిపోకుండా చూడవచ్చు.`,
      detailHi: `नमी ${current.humidityPct}% है और बारिश की संभावना कम है। मल्चिंग और 10–15 सेमी जड़-क्षेत्र नमी की जांच से सिंचाई की बचत होगी।`,
    });
  }

  if (items.length === 0) {
    items.push({
      type: "general",
      severity: "info",
      titleEn: "Moderate weather for routine field & irrigation work",
      titleTe: "సాధారణ వ్యవసాయ పనులకు అనుకూల వాతావరణం",
      titleHi: "नियमित खेती और सिंचाई कार्यों के लिए अनुकूल मौसम",
      detailEn: `Current temperature is ${current.tempC.toFixed(1)}°C with ${current.humidityPct}% humidity and ${current.windSpeedKmh.toFixed(1)} km/h wind. Inspect topsoil moisture by hand before starting irrigation.`,
      detailTe: `ప్రస్తుత ఉష్ణోగ్రత ${current.tempC.toFixed(1)}°C, తేమ ${current.humidityPct}%. మోటారు వేసే ముందు చేతితో మట్టి తేమను తనిఖీ చేయండి.`,
      detailHi: `वर्तमान तापमान ${current.tempC.toFixed(1)}°C और नमी ${current.humidityPct}% है। सिंचाई शुरू करने से पहले हाथ से मिट्टी की नमी जांचें।`,
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

    // Next 24h cumulative rain & upcoming 3-hour interval forecast slots (6 slots = next 18 hours)
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
        conditionEn: wmo.en,
        conditionTe: wmo.te,
        conditionHi: wmo.hi,
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
        conditionEn: wmo.en,
        conditionTe: wmo.te,
        conditionHi: wmo.hi,
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
      conditionEn: currentWmo.en,
      conditionTe: currentWmo.te,
      conditionHi: currentWmo.hi,
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
