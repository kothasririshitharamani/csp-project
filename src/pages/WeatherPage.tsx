import React, { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSun,
  Compass,
  Droplets,
  Info,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  Sun,
  Thermometer,
  Wind,
} from "lucide-react";
import { BackToHome } from "../components/BackToHome";
import { ReadAloudButton } from "../components/ReadAloudButton";
import { useLanguage } from "../hooks/useLanguage";
import { getTranslations } from "../i18n/translations";
import { FarmProfile, Language } from "../types/app";
import { safeJsonFetch } from "../utils/apiClient";

type WeatherConditionKey =
  | "clear"
  | "partly_cloudy"
  | "cloudy"
  | "fog"
  | "drizzle"
  | "rain"
  | "heavy_rain"
  | "thunderstorm";

interface GeocodeCandidate {
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  state: string;
  district: string;
  timezone: string;
  displayLabel: string;
}

interface WeatherForecastItem {
  timeLabel: string;
  isoTime: string;
  tempC: number;
  conditionKey: WeatherConditionKey;
  conditionLabels: Record<Language, string>;
  rainProbabilityPct: number | null;
  expectedRainfallMm: number;
  windSpeedKmh: number;
  humidityPct: number;
}

interface DailyForecastItem {
  date: string;
  conditionKey: WeatherConditionKey;
  conditionLabels: Record<Language, string>;
  tempMinC: number;
  tempMaxC: number;
  rainProbabilityMaxPct: number | null;
  precipitationSumMm: number;
  windSpeedMaxKmh: number;
}

interface WeatherInterpretationItem {
  type: string;
  severity: "info" | "caution" | "warning";
  titles: Record<Language, string>;
  details: Record<Language, string>;
}

interface LiveWeatherData {
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
  current: {
    tempC: number;
    feelsLikeC: number;
    humidityPct: number;
    precipitationMm: number;
    rainMm: number;
    weatherCode: number;
    conditionKey: WeatherConditionKey;
    conditionLabels: Record<Language, string>;
    windSpeedKmh: number;
    windDirectionDeg: number;
    windDirectionCardinal: string;
    rainProbabilityPct: number | null;
    expectedRainfallNext24hMm: number;
  };
  forecast: WeatherForecastItem[];
  dailyForecast: DailyForecastItem[];
  interpretations: WeatherInterpretationItem[];
  assumptions: Record<Language, string[]>;
}

function WeatherConditionIcon({
  conditionKey,
  className = "w-5 h-5",
}: {
  conditionKey: WeatherConditionKey;
  className?: string;
}) {
  switch (conditionKey) {
    case "clear":
      return <Sun className={`${className} text-[#B45309]`} />;
    case "partly_cloudy":
      return <CloudSun className={`${className} text-[#39785C]`} />;
    case "cloudy":
      return <Cloud className={`${className} text-[#71877D]`} />;
    case "fog":
      return <CloudFog className={`${className} text-[#71877D]`} />;
    case "drizzle":
      return <CloudDrizzle className={`${className} text-[#4D91B5]`} />;
    case "rain":
    case "heavy_rain":
      return <CloudRain className={`${className} text-[#4D91B5]`} />;
    case "thunderstorm":
      return <CloudLightning className={`${className} text-[#B45309]`} />;
    default:
      return <CloudSun className={`${className} text-[#39785C]`} />;
  }
}

function pickConditionLabel(
  item: { conditionLabels: Record<Language, string> },
  language: Language
): string {
  return item.conditionLabels?.[language] || item.conditionLabels?.en || "";
}

interface WeatherPageProps {
  profile: FarmProfile | null;
  onBackHome: () => void;
}

export function WeatherPage({ profile, onBackHome }: WeatherPageProps) {
  const { language } = useLanguage();
  const t = getTranslations(language);

  const defaultLocationText = profile
    ? [profile.village, profile.mandal, profile.district]
        .map((s) => s.trim())
        .filter(Boolean)
        .join(", ")
    : "";

  const [searchInput, setSearchInput] = useState(defaultLocationText);
  const [candidates, setCandidates] = useState<GeocodeCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weatherData, setWeatherData] = useState<LiveWeatherData | null>(null);
  const [lastQuery, setLastQuery] = useState<{
    lat?: number;
    lon?: number;
    location?: string;
    label?: string;
    village?: string;
    mandal?: string;
    district?: string;
    state?: string;
  } | null>(null);

  const loadByCoordinates = useCallback(
    async (
      lat: number,
      lon: number,
      label?: string,
      refresh = false
    ) => {
      setLoading(true);
      setError(null);
      setLastQuery({ lat, lon, label });
      try {
        const params = new URLSearchParams({
          lat: String(lat),
          lon: String(lon),
        });
        if (label) params.set("location", label);
        if (refresh) params.set("refresh", "true");

        const data = await safeJsonFetch<LiveWeatherData>(
          `/api/weather?${params.toString()}`
        );
        setWeatherData(data);
      } catch (err) {
        setError(
          err instanceof Error && err.message
            ? err.message
            : t.weather.unavailableFallback
        );
      } finally {
        setLoading(false);
      }
    },
    [t.weather.unavailableFallback]
  );

  const searchAndLoadWeather = useCallback(
    async (
      query: {
        location?: string;
        village?: string;
        mandal?: string;
        district?: string;
        state?: string;
      },
      refresh = false
    ) => {
      setLoading(true);
      setError(null);
      setCandidates([]);
      setLastQuery(query);

      try {
        // Step 1: Geocode the entered/saved location via /api/weather/geocode
        const geoParams = new URLSearchParams();
        if (query.location?.trim()) {
          geoParams.set("location", query.location.trim());
        }
        if (query.village?.trim()) geoParams.set("village", query.village.trim());
        if (query.mandal?.trim()) geoParams.set("mandal", query.mandal.trim());
        if (query.district?.trim()) {
          geoParams.set("district", query.district.trim());
        }
        if (query.state?.trim()) geoParams.set("state", query.state.trim());

        const geoRes = await safeJsonFetch<{
          ok: true;
          results: GeocodeCandidate[];
          resolvedFallback?: boolean;
        }>(`/api/weather/geocode?${geoParams.toString()}`);

        if (!geoRes.results || geoRes.results.length === 0) {
          throw new Error(
            "Location not found. Try searching your nearest mandal, town, or district name."
          );
        }

        if (geoRes.results.length > 1) {
          setCandidates(geoRes.results.slice(0, 5));
        }

        const primary = geoRes.results[0];
        const weatherParams = new URLSearchParams({
          lat: String(primary.latitude),
          lon: String(primary.longitude),
          location: primary.displayLabel,
        });
        if (refresh) weatherParams.set("refresh", "true");

        const data = await safeJsonFetch<LiveWeatherData>(
          `/api/weather?${weatherParams.toString()}`
        );
        setWeatherData({
          ...data,
          resolvedFallback: Boolean(geoRes.resolvedFallback),
        });
      } catch (err) {
        setError(
          err instanceof Error && err.message
            ? err.message
            : t.weather.unavailableFallback
        );
      } finally {
        setLoading(false);
      }
    },
    [t.weather.unavailableFallback]
  );

  // Auto-load saved farmer profile location once on mount
  useEffect(() => {
    if (profile && (profile.village || profile.mandal || profile.district)) {
      searchAndLoadWeather({
        village: profile.village,
        mandal: profile.mandal,
        district: profile.district,
        state: profile.state,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.village, profile?.mandal, profile?.district, profile?.state]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) {
      setError(t.weather.enterLocationError);
      return;
    }
    searchAndLoadWeather({
      location: searchInput.trim(),
      state: profile?.state,
    });
  };

  const handleLoadSavedLocation = () => {
    if (!profile) return;
    setSearchInput(defaultLocationText);
    searchAndLoadWeather({
      village: profile.village,
      mandal: profile.mandal,
      district: profile.district,
      state: profile.state,
    });
  };

  const handleRetryLastQuery = () => {
    if (!lastQuery) return;
    if (
      typeof lastQuery.lat === "number" &&
      typeof lastQuery.lon === "number"
    ) {
      loadByCoordinates(lastQuery.lat, lastQuery.lon, lastQuery.label, true);
    } else {
      searchAndLoadWeather(lastQuery, true);
    }
  };

  const handleRefresh = () => {
    if (weatherData?.coordinates) {
      loadByCoordinates(
        weatherData.coordinates.latitude,
        weatherData.coordinates.longitude,
        weatherData.locationLabel,
        true
      );
      return;
    }
    handleRetryLastQuery();
  };

  const handleUseGps = () => {
    if (!("geolocation" in navigator)) {
      setError(t.weather.gpsUnsupported);
      return;
    }
    setLoading(true);
    setError(null);
    setCandidates([]);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        loadByCoordinates(
          pos.coords.latitude,
          pos.coords.longitude,
          undefined,
          true
        );
      },
      () => {
        setLoading(false);
        setError(t.weather.gpsDenied);
      },
      { timeout: 10000 }
    );
  };

  const pickInterpTitle = (item: WeatherInterpretationItem) =>
    item.titles?.[language] || item.titles?.en || "";

  const pickInterpDetail = (item: WeatherInterpretationItem) =>
    item.details?.[language] || item.details?.en || "";

  const buildReadAloud = (data: LiveWeatherData) => {
    const cond = pickConditionLabel(data.current, language);
    const interps = data.interpretations
      .map((i) => `${pickInterpTitle(i)}. ${pickInterpDetail(i)}`)
      .join(" ");
    return `${data.locationLabel}. ${cond}. ${t.weather.metrics.temp}: ${data.current.tempC}°C. ${t.weather.metrics.humidity}: ${data.current.humidityPct}%. ${t.weather.metrics.wind}: ${data.current.windSpeedKmh} km/h. ${interps}`;
  };

  return (
    <div className="space-y-6">
      <BackToHome onClick={onBackHome} />

      <div className="space-y-1.5">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#214B3D] tracking-tight">
          {t.weather.title}
        </h1>
        <p className="text-sm sm:text-base text-[#71877D] max-w-3xl">
          {t.weather.subtitle}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-[#D3E3D8] rounded-2xl p-5 sm:p-6 space-y-4 shadow-[0_2px_10px_rgba(33,75,61,0.03)]"
      >
        {defaultLocationText && (
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm bg-[#EDF5EF] border border-[#D3E3D8] rounded-xl px-3.5 py-2.5 text-[#214B3D]">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#39785C] shrink-0" />
              <span>
                {t.weather.savedLocationNote.replace(
                  "{location}",
                  defaultLocationText
                )}
              </span>
            </div>
            <button
              type="button"
              disabled={loading}
              onClick={handleLoadSavedLocation}
              className="text-xs font-semibold text-[#39785C] hover:underline"
            >
              {t.weather.savedLocationBtn}
            </button>
          </div>
        )}

        <div>
          <label
            htmlFor="weather-location-search"
            className="block text-sm font-bold text-[#214B3D] mb-1.5"
          >
            {t.weather.searchLabel}
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-[#71877D] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="weather-location-search"
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t.weather.searchPlaceholder}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#D3E3D8] bg-white text-sm sm:text-base text-[#214B3D] min-h-[48px]"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#4D91B5] text-white text-sm font-semibold hover:bg-[#3f7d9e] disabled:opacity-60 min-h-[44px]"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CloudSun className="w-4 h-4" />
            )}
            <span>{t.weather.getWeatherBtn}</span>
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={handleUseGps}
            className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-[#EDF5EF] border border-[#D3E3D8] text-[#214B3D] text-sm font-semibold hover:bg-[#E3F0E8] min-h-[44px]"
          >
            <Compass className="w-4 h-4 text-[#39785C]" />
            <span>{t.weather.useGpsBtn}</span>
          </button>

          {weatherData && (
            <button
              type="button"
              disabled={loading}
              onClick={handleRefresh}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-white border border-[#D3E3D8] text-[#39785C] text-sm font-semibold hover:bg-[#EDF5EF] min-h-[44px]"
            >
              <RefreshCw className="w-4 h-4" />
              <span>{t.weather.refreshBtn}</span>
            </button>
          )}
        </div>

        {candidates.length > 1 && (
          <div className="pt-1 space-y-2">
            <p className="text-xs font-semibold text-[#71877D]">
              {t.weather.chooseMatchLabel}
            </p>
            <div className="flex flex-wrap gap-2">
              {candidates.map((c, idx) => {
                const isSelected =
                  weatherData &&
                  Math.abs(weatherData.coordinates.latitude - c.latitude) <
                    0.02 &&
                  Math.abs(weatherData.coordinates.longitude - c.longitude) <
                    0.02;
                return (
                  <button
                    key={`${c.latitude}-${c.longitude}-${idx}`}
                    type="button"
                    disabled={loading}
                    onClick={() =>
                      loadByCoordinates(c.latitude, c.longitude, c.displayLabel)
                    }
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                      isSelected
                        ? "bg-[#39785C] text-white border-[#39785C]"
                        : "bg-[#EDF5EF] text-[#214B3D] border-[#D3E3D8] hover:bg-[#E3F0E8]"
                    }`}
                  >
                    {c.displayLabel}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-3.5 text-sm text-red-900 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            {lastQuery && (
              <button
                type="button"
                onClick={handleRetryLastQuery}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-red-300 text-xs font-semibold text-red-800 hover:bg-red-100"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{t.weather.retryBtn}</span>
              </button>
            )}
          </div>
        )}
      </form>

      {loading && (
        <div className="bg-white border border-[#D3E3D8] rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-[#4D91B5] font-semibold">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>{t.weather.loadingMessage}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 animate-pulse">
            <div className="h-24 bg-[#EDF5EF] rounded-xl" />
            <div className="h-24 bg-[#EDF5EF] rounded-xl" />
            <div className="h-24 bg-[#EDF5EF] rounded-xl" />
          </div>
        </div>
      )}

      {weatherData && !loading && (
        <div className="space-y-5">
          {weatherData.resolvedFallback && (
            <div className="bg-[#E8F3F8] border border-[#C2DCE8] rounded-2xl p-3.5 flex items-start gap-2.5 text-xs sm:text-sm text-[#214B3D]">
              <Info className="w-4 h-4 text-[#4D91B5] shrink-0 mt-0.5" />
              <span>
                {t.weather.fallbackResolvedNote.replace(
                  "{resolved}",
                  weatherData.locationLabel
                )}
              </span>
            </div>
          )}

          {/* Current Weather Summary */}
          <div className="bg-white border border-[#D3E3D8] rounded-2xl p-5 sm:p-6 space-y-5 shadow-[0_2px_10px_rgba(33,75,61,0.03)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#39785C]">
                  <MapPin className="w-4 h-4 shrink-0" />
                  <span>{t.weather.liveLabel}</span>
                  <span className="text-[#71877D] font-normal">
                    ({weatherData.coordinates.latitude.toFixed(2)}°N,{" "}
                    {weatherData.coordinates.longitude.toFixed(2)}°E)
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-[#214B3D]">
                  {weatherData.locationLabel}
                </h2>
                <p className="text-xs text-[#71877D]">
                  {t.weather.lastUpdatedLabel}:{" "}
                  {new Date(weatherData.fetchedAt).toLocaleString()} (
                  {weatherData.timezone})
                  {weatherData.cached ? ` · ${t.weather.cachedBadge}` : ""}
                </p>
              </div>

              <ReadAloudButton
                text={buildReadAloud(weatherData)}
                itemId="weather-summary"
                forceLanguage={language}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="rounded-xl bg-[#EDF5EF] border border-[#D3E3D8] p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-[#71877D]">
                  <Thermometer className="w-3.5 h-3.5 text-[#B45309]" />
                  <span>{t.weather.metrics.temp}</span>
                </div>
                <div className="text-xl font-bold text-[#214B3D] tabular-nums">
                  {weatherData.current.tempC}°C
                </div>
                <div className="text-[11px] text-[#71877D] tabular-nums">
                  {t.weather.metrics.feelsLike}:{" "}
                  {weatherData.current.feelsLikeC}°C
                </div>
              </div>

              <div className="rounded-xl bg-[#EDF5EF] border border-[#D3E3D8] p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-[#71877D]">
                  <WeatherConditionIcon
                    conditionKey={weatherData.current.conditionKey}
                    className="w-4 h-4"
                  />
                  <span>{t.weather.metrics.condition}</span>
                </div>
                <div className="text-sm sm:text-base font-bold text-[#214B3D] leading-snug">
                  {pickConditionLabel(weatherData.current, language)}
                </div>
              </div>

              <div className="rounded-xl bg-[#EDF5EF] border border-[#D3E3D8] p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-[#71877D]">
                  <CloudRain className="w-3.5 h-3.5 text-[#4D91B5]" />
                  <span>{t.weather.metrics.rainProb}</span>
                </div>
                <div className="text-xl font-bold text-[#214B3D] tabular-nums">
                  {weatherData.current.rainProbabilityPct !== null
                    ? `${weatherData.current.rainProbabilityPct}%`
                    : t.weather.metrics.unavailable}
                </div>
              </div>

              <div className="rounded-xl bg-[#EDF5EF] border border-[#D3E3D8] p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-[#71877D]">
                  <Droplets className="w-3.5 h-3.5 text-[#4D91B5]" />
                  <span>{t.weather.metrics.expectedRain}</span>
                </div>
                <div className="text-xl font-bold text-[#214B3D] tabular-nums">
                  {weatherData.current.expectedRainfallNext24hMm} mm
                </div>
                <div className="text-[11px] text-[#71877D] tabular-nums">
                  {t.weather.metrics.currentPrecip}:{" "}
                  {weatherData.current.precipitationMm} mm
                </div>
              </div>

              <div className="rounded-xl bg-[#EDF5EF] border border-[#D3E3D8] p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-[#71877D]">
                  <Wind className="w-3.5 h-3.5 text-[#39785C]" />
                  <span>{t.weather.metrics.wind}</span>
                </div>
                <div className="text-xl font-bold text-[#214B3D] tabular-nums">
                  {weatherData.current.windSpeedKmh} km/h
                </div>
                <div className="text-[11px] text-[#71877D]">
                  {t.weather.metrics.windDir}:{" "}
                  {weatherData.current.windDirectionCardinal} (
                  {weatherData.current.windDirectionDeg}°)
                </div>
              </div>

              <div className="rounded-xl bg-[#EDF5EF] border border-[#D3E3D8] p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-[#71877D]">
                  <Droplets className="w-3.5 h-3.5 text-[#39785C]" />
                  <span>{t.weather.metrics.humidity}</span>
                </div>
                <div className="text-xl font-bold text-[#214B3D] tabular-nums">
                  {weatherData.current.humidityPct}%
                </div>
              </div>
            </div>
          </div>

          {/* Irrigation-Related Weather Guidance */}
          {weatherData.interpretations.length > 0 && (
            <div className="bg-white border border-[#D3E3D8] rounded-2xl p-5 sm:p-6 space-y-3">
              <h3 className="text-base font-bold text-[#214B3D]">
                {t.weather.interpretationsTitle}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {weatherData.interpretations.map((item, idx) => (
                  <div
                    key={idx}
                    className={`rounded-xl border p-4 space-y-1 ${
                      item.severity === "warning"
                        ? "bg-red-50 border-red-200"
                        : item.severity === "caution"
                          ? "bg-amber-50 border-amber-200"
                          : "bg-[#EDF5EF] border-[#D3E3D8]"
                    }`}
                  >
                    <p className="text-sm font-bold text-[#214B3D]">
                      {pickInterpTitle(item)}
                    </p>
                    <p className="text-xs sm:text-sm text-[#214B3D] leading-relaxed">
                      {pickInterpDetail(item)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hourly Forecast */}
          {weatherData.forecast.length > 0 && (
            <div className="bg-white border border-[#D3E3D8] rounded-2xl p-5 sm:p-6 space-y-3">
              <h3 className="text-base font-bold text-[#214B3D]">
                {t.weather.hourlyForecastTitle}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {weatherData.forecast.map((slot, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl bg-[#EDF5EF] border border-[#D3E3D8] p-3.5 space-y-1.5 text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#39785C] tabular-nums">
                        {slot.timeLabel} IST
                      </span>
                      <WeatherConditionIcon
                        conditionKey={slot.conditionKey}
                        className="w-4 h-4"
                      />
                    </div>
                    <div className="font-bold text-[#214B3D] text-base tabular-nums">
                      {slot.tempC}°C
                    </div>
                    <div className="text-xs text-[#214B3D] truncate">
                      {pickConditionLabel(slot, language)}
                    </div>
                    <div className="text-xs text-[#71877D] tabular-nums">
                      {t.weather.metrics.rainProb}:{" "}
                      {slot.rainProbabilityPct !== null
                        ? `${slot.rainProbabilityPct}%`
                        : "—"}
                    </div>
                    <div className="text-[11px] text-[#71877D] tabular-nums">
                      {slot.expectedRainfallMm} mm · {slot.windSpeedKmh} km/h
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5-Day Daily Forecast */}
          {weatherData.dailyForecast.length > 0 && (
            <div className="bg-white border border-[#D3E3D8] rounded-2xl p-5 sm:p-6 space-y-3">
              <h3 className="text-base font-bold text-[#214B3D]">
                {t.weather.dailyForecastTitle}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {weatherData.dailyForecast.map((day) => (
                  <div
                    key={day.date}
                    className="rounded-xl bg-[#EDF5EF] border border-[#D3E3D8] p-3.5 space-y-1.5 text-xs sm:text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#214B3D] tabular-nums">
                        {day.date}
                      </span>
                      <WeatherConditionIcon
                        conditionKey={day.conditionKey}
                        className="w-4 h-4"
                      />
                    </div>
                    <div className="text-xs text-[#214B3D]">
                      {pickConditionLabel(day, language)}
                    </div>
                    <div className="font-semibold text-[#214B3D] tabular-nums">
                      {t.weather.minTemp}: {day.tempMinC}°C ·{" "}
                      {t.weather.maxTemp}: {day.tempMaxC}°C
                    </div>
                    <div className="text-xs text-[#71877D] tabular-nums">
                      {t.weather.metrics.rainProb}:{" "}
                      {day.rainProbabilityMaxPct !== null
                        ? `${day.rainProbabilityMaxPct}%`
                        : "—"}{" "}
                      · {day.precipitationSumMm} mm
                    </div>
                    <div className="text-xs text-[#71877D] tabular-nums">
                      {t.weather.metrics.wind}: {day.windSpeedMaxKmh} km/h
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stated Assumptions */}
          <div className="bg-[#EDF5EF] border border-[#D3E3D8] rounded-2xl p-4 sm:p-5 space-y-2">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-[#214B3D]">
              <Info className="w-4 h-4 text-[#39785C] shrink-0" />
              <span>{t.weather.assumptionsTitle}</span>
            </div>
            <ul className="list-disc pl-5 text-xs sm:text-sm text-[#71877D] space-y-1">
              {(weatherData.assumptions?.[language] ||
                weatherData.assumptions?.en ||
                []).map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
