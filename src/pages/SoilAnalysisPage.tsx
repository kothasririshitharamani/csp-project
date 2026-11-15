import React, { useCallback, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Eraser,
  ImagePlus,
  Loader2,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";
import { BackToHome } from "../components/BackToHome";
import { ReadAloudButton } from "../components/ReadAloudButton";
import {
  VoiceInputControl,
  VoiceInputControlHandle,
} from "../components/VoiceInputControl";
import { useLanguage } from "../hooks/useLanguage";
import { SpeechState } from "../hooks/useSpeechRecognition";
import { getTranslations } from "../i18n/translations";
import { FarmProfile, SoilAnalysisResult } from "../types/app";
import { safeJsonFetch } from "../utils/apiClient";

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

interface SoilAnalysisPageProps {
  profile: FarmProfile | null;
  onBackHome: () => void;
}

export function SoilAnalysisPage({ profile, onBackHome }: SoilAnalysisPageProps) {
  const { language } = useLanguage();
  const t = getTranslations(language);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const voiceRef = useRef<VoiceInputControlHandle | null>(null);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [speechState, setSpeechState] = useState<SpeechState>("ready");
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SoilAnalysisResult | null>(null);

  const handleVoiceTranscript = useCallback((text: string) => {
    setDescription(text);
  }, []);

  const symptomOptions = [
    { id: "cracking", label: t.soil.symptoms.cracking },
    { id: "waterlogging", label: t.soil.symptoms.waterlogging },
    { id: "very_dry", label: t.soil.symptoms.very_dry },
    { id: "poor_growth", label: t.soil.symptoms.poor_growth },
    { id: "unusual_colour", label: t.soil.symptoms.unusual_colour },
  ];

  const handleFile = (file: File) => {
    setError(null);
    if (!ALLOWED_MIME_TYPES.has(file.type.toLowerCase())) {
      setError(t.soil.invalidFileType);
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError(t.soil.fileTooLarge);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      if (!dataUrl) {
        setError(t.soil.invalidFileType);
        return;
      }
      setImagePreview(dataUrl);
      setImageBase64(dataUrl);
      setMimeType(file.type);
      setFileName(file.name);
      setResult(null);
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const toggleSymptom = (symptomLabel: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(symptomLabel)
        ? prev.filter((item) => item !== symptomLabel)
        : [...prev, symptomLabel]
    );
  };

  const removeImage = () => {
    setImagePreview(null);
    setImageBase64(null);
    setMimeType(null);
    setFileName("");
    setResult(null);
    setError(null);
  };

  const handleAnalyze = async () => {
    if (!imageBase64 || !mimeType) {
      setError(t.soil.noImageError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await safeJsonFetch<{
        ok: boolean;
        result: SoilAnalysisResult;
      }>("/api/soil/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64,
          mimeType,
          description: description.trim() || undefined,
          symptoms: selectedSymptoms,
          language,
          farmContext: profile
            ? {
                village: profile.village,
                district: profile.district,
                state: profile.state,
                crop:
                  profile.crop === "other" && profile.customCrop
                    ? profile.customCrop
                    : t.options.crops[profile.crop],
                soilType: t.options.soils[profile.soilType],
              }
            : undefined,
        }),
      });

      setResult(data.result);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Unable to analyze soil image. Please try again.";
      setError(msg);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const buildReadAloudText = (res: SoilAnalysisResult) => {
    return [
      `${t.soil.sections.characteristics}: ${res.visibleCharacteristics}`,
      `${t.soil.sections.moisture}: ${res.moistureCondition}`,
      `${t.soil.sections.drainage}: ${res.drainageAndRetentionSigns}`,
      `${t.soil.sections.concerns}: ${res.concernsToCheck.join(". ")}`,
      `${t.soil.sections.practices}: ${res.waterManagementPractices.join(". ")}`,
      `${t.soil.sections.nextSteps}: ${res.practicalNextSteps.join(". ")}`,
      res.preliminaryDisclaimer,
    ].join("\n\n");
  };

  return (
    <div className="space-y-6">
      <BackToHome onClick={onBackHome} />

      <div className="space-y-1.5">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#214B3D] tracking-tight">
          {t.soil.title}
        </h1>
        <p className="text-sm sm:text-base text-[#71877D] max-w-3xl">
          {t.soil.subtitle}
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="text-xs sm:text-sm text-amber-950 space-y-1">
          <p className="font-bold">{t.soil.noticeTitle}</p>
          <p>{t.soil.noticeBody}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <section className="lg:col-span-5 bg-white border border-[#D3E3D8] rounded-2xl p-5 sm:p-6 space-y-5 shadow-[0_2px_10px_rgba(33,75,61,0.03)]">
          <div className="space-y-2">
            <label className="block text-sm font-bold text-[#214B3D]">
              {t.soil.uploadLabel}
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileInputChange}
              className="hidden"
            />

            {!imagePreview ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                className={`cursor-pointer rounded-2xl border-2 border-dashed p-6 sm:p-8 text-center transition-colors ${
                  isDragging
                    ? "border-[#39785C] bg-[#E3F0E8]"
                    : "border-[#D3E3D8] bg-[#EDF5EF]/70 hover:border-[#39785C] hover:bg-[#E3F0E8]/60"
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-white border border-[#D3E3D8] flex items-center justify-center mx-auto mb-3">
                  <ImagePlus className="w-6 h-6 text-[#39785C]" />
                </div>
                <p className="text-sm font-semibold text-[#214B3D]">
                  {t.soil.dragDrop}
                </p>
                <p className="text-xs text-[#71877D] mt-1">{t.soil.fileHelp}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-xl overflow-hidden border border-[#D3E3D8] bg-[#EDF5EF]">
                  <img
                    src={imagePreview}
                    alt={fileName || "Uploaded soil preview"}
                    className="w-full max-h-72 object-cover"
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-[#71877D] truncate max-w-[200px]">
                    {fileName}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#EDF5EF] border border-[#D3E3D8] text-xs font-semibold text-[#214B3D] hover:bg-[#E3F0E8] min-h-[40px]"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{t.soil.replaceImage}</span>
                    </button>
                    <button
                      type="button"
                      onClick={removeImage}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#D3E3D8] text-xs font-semibold text-red-700 hover:bg-red-50 min-h-[40px]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{t.soil.removeImage}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-[#214B3D]">
              {t.soil.symptomsLabel}
            </label>
            <div className="flex flex-wrap gap-2">
              {symptomOptions.map((sym) => {
                const active = selectedSymptoms.includes(sym.label);
                return (
                  <button
                    key={sym.id}
                    type="button"
                    onClick={() => toggleSymptom(sym.label)}
                    className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium border transition-colors min-h-[40px] ${
                      active
                        ? "bg-[#39785C] text-white border-[#39785C]"
                        : "bg-[#EDF5EF] text-[#214B3D] border-[#D3E3D8] hover:bg-[#E3F0E8]"
                    }`}
                  >
                    {sym.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="soil-description"
              className="block text-sm font-bold text-[#214B3D]"
            >
              {t.soil.descriptionLabel}
            </label>
            <textarea
              id="soil-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.soil.descriptionPlaceholder}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3E3D8] bg-white text-sm text-[#214B3D]"
            />
            <VoiceInputControl
              ref={voiceRef}
              compact
              onTranscriptChange={handleVoiceTranscript}
              onStateChange={setSpeechState}
            />
            <button
              type="button"
              disabled={
                !description.length &&
                speechState !== "listening" &&
                speechState !== "processing" &&
                speechState !== "recognized" &&
                speechState !== "no_speech" &&
                speechState !== "network_error" &&
                speechState !== "error" &&
                speechState !== "permission_denied"
              }
              onClick={() => {
                voiceRef.current?.reset();
                setDescription("");
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#D3E3D8] bg-white text-xs font-semibold text-[#214B3D] hover:bg-[#E3F0E8] disabled:opacity-45 disabled:cursor-not-allowed min-h-[38px]"
            >
              <Eraser className="w-3.5 h-3.5 text-[#71877D]" />
              <span>{t.faq.removeTextBtn}</span>
            </button>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3.5 text-sm text-red-900 space-y-2">
              <p>{error}</p>
              {imageBase64 && (
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-red-300 text-xs font-semibold text-red-800 hover:bg-red-100 min-h-[40px]"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{t.soil.retryBtn}</span>
                </button>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={handleAnalyze}
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-[#39785C] text-white text-base font-semibold hover:bg-[#2f634c] disabled:opacity-60 transition-colors min-h-[48px]"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{t.soil.analyzingBtn}</span>
              </>
            ) : (
              <span>{t.soil.analyzeBtn}</span>
            )}
          </button>
        </section>

        <section className="lg:col-span-7 space-y-4">
          {loading ? (
            <div className="bg-white border border-[#D3E3D8] rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-3 text-[#39785C] font-semibold">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{t.soil.analyzingBtn}</span>
              </div>
              <div className="space-y-3 animate-pulse">
                <div className="h-20 bg-[#EDF5EF] rounded-xl" />
                <div className="h-20 bg-[#EDF5EF] rounded-xl" />
                <div className="h-24 bg-[#EDF5EF] rounded-xl" />
              </div>
            </div>
          ) : !result ? (
            <div className="bg-white border border-[#D3E3D8] rounded-2xl p-8 text-center space-y-2">
              <h2 className="text-lg font-bold text-[#214B3D]">
                {t.soil.emptyTitle}
              </h2>
              <p className="text-sm text-[#71877D] max-w-md mx-auto">
                {t.soil.emptyBody}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-[#D3E3D8] rounded-2xl p-4">
                <div className="flex items-center gap-2 text-sm font-bold text-[#39785C]">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span>{t.soil.title}</span>
                </div>
                <ReadAloudButton
                  text={buildReadAloudText(result)}
                  itemId="soil-result"
                  forceLanguage={language}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border border-[#D3E3D8] rounded-2xl p-5 space-y-2">
                  <h3 className="text-sm font-bold text-[#39785C]">
                    {t.soil.sections.characteristics}
                  </h3>
                  <p className="text-sm text-[#214B3D] leading-relaxed">
                    {result.visibleCharacteristics}
                  </p>
                </div>

                <div className="bg-white border border-[#D3E3D8] rounded-2xl p-5 space-y-2">
                  <h3 className="text-sm font-bold text-[#4D91B5]">
                    {t.soil.sections.moisture}
                  </h3>
                  <p className="text-sm text-[#214B3D] leading-relaxed">
                    {result.moistureCondition}
                  </p>
                </div>
              </div>

              <div className="bg-white border border-[#D3E3D8] rounded-2xl p-5 space-y-2">
                <h3 className="text-sm font-bold text-[#214B3D]">
                  {t.soil.sections.drainage}
                </h3>
                <p className="text-sm text-[#214B3D] leading-relaxed">
                  {result.drainageAndRetentionSigns}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border border-[#D3E3D8] rounded-2xl p-5 space-y-2.5">
                  <h3 className="text-sm font-bold text-[#B45309]">
                    {t.soil.sections.concerns}
                  </h3>
                  <ul className="space-y-2 text-sm text-[#214B3D] list-disc pl-5">
                    {result.concernsToCheck.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-white border border-[#D3E3D8] rounded-2xl p-5 space-y-2.5">
                  <h3 className="text-sm font-bold text-[#39785C]">
                    {t.soil.sections.practices}
                  </h3>
                  <ul className="space-y-2 text-sm text-[#214B3D] list-disc pl-5">
                    {result.waterManagementPractices.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="bg-white border border-[#D3E3D8] rounded-2xl p-5 space-y-2.5">
                <h3 className="text-sm font-bold text-[#214B3D]">
                  {t.soil.sections.nextSteps}
                </h3>
                <ul className="space-y-2 text-sm text-[#214B3D] list-disc pl-5">
                  {result.practicalNextSteps.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="bg-[#EDF5EF] border border-[#D3E3D8] rounded-2xl p-4 text-xs sm:text-sm text-[#214B3D]">
                {result.preliminaryDisclaimer}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
