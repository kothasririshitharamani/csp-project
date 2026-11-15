import React, { useState } from "react";
import {
  AlertCircle,
  Droplets,
  Info,
  Loader2,
  Sprout,
  User,
} from "lucide-react";
import { BackToHome } from "../components/BackToHome";
import { useLanguage } from "../hooks/useLanguage";
import { getTranslations } from "../i18n/translations";
import {
  AreaUnit,
  AuthUser,
  CropOption,
  GrowthStageOption,
  IrrigationMethodOption,
  SoilTypeOption,
  WaterAvailabilityOption,
  WaterSourceOption,
} from "../types/app";
import { safeJsonFetch } from "../utils/apiClient";

interface ProfileSetupPageProps {
  user: AuthUser;
  isEditMode: boolean;
  onProfileSaved: (updatedUser: AuthUser) => void;
  onCancelEdit?: () => void;
}

export function ProfileSetupPage({
  user,
  isEditMode,
  onProfileSaved,
  onCancelEdit,
}: ProfileSetupPageProps) {
  const { language } = useLanguage();
  const t = getTranslations(language);

  const existing = user.profile;

  const [farmerName, setFarmerName] = useState(
    existing?.farmerName || user.fullName || ""
  );
  const [village, setVillage] = useState(existing?.village || "");
  const [mandal, setMandal] = useState(existing?.mandal || "");
  const [district, setDistrict] = useState(existing?.district || "");
  const [stateName, setStateName] = useState(
    existing?.state || "Andhra Pradesh"
  );

  const [landArea, setLandArea] = useState(existing?.landArea || "");
  const [areaUnit, setAreaUnit] = useState<AreaUnit>(
    existing?.areaUnit || "acres"
  );
  const [crop, setCrop] = useState<CropOption>(existing?.crop || "paddy");
  const [customCrop, setCustomCrop] = useState(existing?.customCrop || "");
  const [otherCrops, setOtherCrops] = useState(existing?.otherCrops || "");
  const [growthStage, setGrowthStage] = useState<GrowthStageOption>(
    existing?.growthStage || "vegetative"
  );
  const [soilType, setSoilType] = useState<SoilTypeOption>(
    existing?.soilType || "loamy"
  );

  const [waterSource, setWaterSource] = useState<WaterSourceOption>(
    existing?.waterSource || "borewell"
  );
  const [irrigationMethod, setIrrigationMethod] =
    useState<IrrigationMethodOption>(existing?.irrigationMethod || "drip");
  const [waterAvailability, setWaterAvailability] =
    useState<WaterAvailabilityOption>(
      existing?.waterAvailability || "sufficient"
    );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedArea = Number(landArea);
    if (
      !farmerName.trim() ||
      !village.trim() ||
      !mandal.trim() ||
      !district.trim() ||
      Number.isNaN(parsedArea) ||
      parsedArea <= 0
    ) {
      setError(t.profileSetup.validationRequired);
      return;
    }

    if (crop === "other" && !customCrop.trim()) {
      setError(t.profileSetup.validationCustomCrop);
      return;
    }

    setLoading(true);
    try {
      const data = await safeJsonFetch<{ ok: boolean; user: AuthUser }>(
        "/api/profile",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            farmerName: farmerName.trim(),
            mobileNumber: user.mobileNumber,
            village: village.trim(),
            mandal: mandal.trim(),
            district: district.trim(),
            state: stateName.trim() || "Andhra Pradesh",
            landArea: String(parsedArea),
            areaUnit,
            crop,
            customCrop: crop === "other" ? customCrop.trim() : "",
            otherCrops: otherCrops.trim(),
            growthStage,
            soilType,
            waterSource,
            irrigationMethod,
            waterAvailability,
            preferredLanguage: language,
          }),
        }
      );

      onProfileSaved(data.user);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not save farmer details. Please retry."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {isEditMode && onCancelEdit && <BackToHome onClick={onCancelEdit} />}

      <div className="space-y-1.5">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#214B3D] tracking-tight">
          {isEditMode ? t.profileSetup.editTitle : t.profileSetup.setupTitle}
        </h1>
        <p className="text-sm sm:text-base text-[#71877D]">
          {isEditMode
            ? t.profileSetup.editSubtitle
            : t.profileSetup.setupSubtitle}
        </p>
      </div>

      <div className="inline-flex items-center gap-2 rounded-xl bg-[#E3F0E8] border border-[#D3E3D8] px-3.5 py-2 text-xs text-[#214B3D]">
        <Info className="w-4 h-4 text-[#39785C] shrink-0" />
        <span>{t.profileSetup.demoStorageNote}</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section A: Personal details */}
        <section className="bg-white border border-[#D3E3D8] rounded-2xl p-5 sm:p-6 space-y-4 shadow-[0_2px_10px_rgba(33,75,61,0.03)]">
          <div className="flex items-center gap-2 text-base font-bold text-[#39785C] border-b border-[#EDF5EF] pb-3">
            <User className="w-5 h-5 shrink-0" />
            <h2>{t.profileSetup.sectionA}</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="ps-name"
                className="block text-sm font-bold text-[#214B3D] mb-1.5"
              >
                {t.profileSetup.farmerName} *
              </label>
              <input
                id="ps-name"
                type="text"
                value={farmerName}
                onChange={(e) => setFarmerName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[#D3E3D8] bg-white text-base text-[#214B3D] min-h-[48px]"
              />
            </div>

            <div>
              <label
                htmlFor="ps-mobile"
                className="block text-sm font-bold text-[#214B3D] mb-1.5"
              >
                {t.profileSetup.mobileNumber}
              </label>
              <input
                id="ps-mobile"
                type="text"
                value={user.mobileNumber}
                readOnly
                className="w-full px-4 py-3 rounded-xl border border-[#D3E3D8] bg-[#EDF5EF] text-base text-[#71877D] min-h-[48px]"
              />
            </div>

            <div>
              <label
                htmlFor="ps-village"
                className="block text-sm font-bold text-[#214B3D] mb-1.5"
              >
                {t.profileSetup.village} *
              </label>
              <input
                id="ps-village"
                type="text"
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                placeholder={t.profileSetup.villagePlaceholder}
                className="w-full px-4 py-3 rounded-xl border border-[#D3E3D8] bg-white text-base text-[#214B3D] min-h-[48px]"
              />
            </div>

            <div>
              <label
                htmlFor="ps-mandal"
                className="block text-sm font-bold text-[#214B3D] mb-1.5"
              >
                {t.profileSetup.mandal} *
              </label>
              <input
                id="ps-mandal"
                type="text"
                value={mandal}
                onChange={(e) => setMandal(e.target.value)}
                placeholder={t.profileSetup.mandalPlaceholder}
                className="w-full px-4 py-3 rounded-xl border border-[#D3E3D8] bg-white text-base text-[#214B3D] min-h-[48px]"
              />
            </div>

            <div>
              <label
                htmlFor="ps-district"
                className="block text-sm font-bold text-[#214B3D] mb-1.5"
              >
                {t.profileSetup.district} *
              </label>
              <input
                id="ps-district"
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder={t.profileSetup.districtPlaceholder}
                className="w-full px-4 py-3 rounded-xl border border-[#D3E3D8] bg-white text-base text-[#214B3D] min-h-[48px]"
              />
            </div>

            <div>
              <label
                htmlFor="ps-state"
                className="block text-sm font-bold text-[#214B3D] mb-1.5"
              >
                {t.profileSetup.state}
              </label>
              <input
                id="ps-state"
                type="text"
                value={stateName}
                onChange={(e) => setStateName(e.target.value)}
                placeholder={t.profileSetup.statePlaceholder}
                className="w-full px-4 py-3 rounded-xl border border-[#D3E3D8] bg-white text-base text-[#214B3D] min-h-[48px]"
              />
            </div>
          </div>
        </section>

        {/* Section B: Farm details */}
        <section className="bg-white border border-[#D3E3D8] rounded-2xl p-5 sm:p-6 space-y-4 shadow-[0_2px_10px_rgba(33,75,61,0.03)]">
          <div className="flex items-center gap-2 text-base font-bold text-[#39785C] border-b border-[#EDF5EF] pb-3">
            <Sprout className="w-5 h-5 shrink-0" />
            <h2>{t.profileSetup.sectionB}</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="ps-area"
                  className="block text-sm font-bold text-[#214B3D] mb-1.5"
                >
                  {t.profileSetup.totalLand} *
                </label>
                <input
                  id="ps-area"
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={landArea}
                  onChange={(e) => setLandArea(e.target.value)}
                  placeholder="2.5"
                  className="w-full px-3.5 py-3 rounded-xl border border-[#D3E3D8] bg-white text-base text-[#214B3D] min-h-[48px]"
                />
              </div>

              <div>
                <label
                  htmlFor="ps-unit"
                  className="block text-sm font-bold text-[#214B3D] mb-1.5"
                >
                  {t.profileSetup.areaUnit}
                </label>
                <select
                  id="ps-unit"
                  value={areaUnit}
                  onChange={(e) => setAreaUnit(e.target.value as AreaUnit)}
                  className="w-full px-3.5 py-3 rounded-xl border border-[#D3E3D8] bg-white text-base text-[#214B3D] min-h-[48px]"
                >
                  <option value="acres">{t.options.areaUnits.acres}</option>
                  <option value="hectares">{t.options.areaUnits.hectares}</option>
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="ps-crop"
                className="block text-sm font-bold text-[#214B3D] mb-1.5"
              >
                {t.profileSetup.mainCrop} *
              </label>
              <select
                id="ps-crop"
                value={crop}
                onChange={(e) => setCrop(e.target.value as CropOption)}
                className="w-full px-4 py-3 rounded-xl border border-[#D3E3D8] bg-white text-base text-[#214B3D] min-h-[48px]"
              >
                {(Object.keys(t.options.crops) as CropOption[]).map((c) => (
                  <option key={c} value={c}>
                    {t.options.crops[c]}
                  </option>
                ))}
              </select>
            </div>

            {crop === "other" && (
              <div>
                <label
                  htmlFor="ps-custom-crop"
                  className="block text-sm font-bold text-[#214B3D] mb-1.5"
                >
                  {t.profileSetup.customCrop} *
                </label>
                <input
                  id="ps-custom-crop"
                  type="text"
                  value={customCrop}
                  onChange={(e) => setCustomCrop(e.target.value)}
                  placeholder={t.profileSetup.customCropPlaceholder}
                  className="w-full px-4 py-3 rounded-xl border border-[#D3E3D8] bg-white text-base text-[#214B3D] min-h-[48px]"
                />
              </div>
            )}

            <div>
              <label
                htmlFor="ps-other-crops"
                className="block text-sm font-bold text-[#214B3D] mb-1.5"
              >
                {t.profileSetup.otherCrops}
              </label>
              <input
                id="ps-other-crops"
                type="text"
                value={otherCrops}
                onChange={(e) => setOtherCrops(e.target.value)}
                placeholder={t.profileSetup.otherCropsPlaceholder}
                className="w-full px-4 py-3 rounded-xl border border-[#D3E3D8] bg-white text-base text-[#214B3D] min-h-[48px]"
              />
            </div>

            <div>
              <label
                htmlFor="ps-stage"
                className="block text-sm font-bold text-[#214B3D] mb-1.5"
              >
                {t.profileSetup.growthStage}
              </label>
              <select
                id="ps-stage"
                value={growthStage}
                onChange={(e) =>
                  setGrowthStage(e.target.value as GrowthStageOption)
                }
                className="w-full px-4 py-3 rounded-xl border border-[#D3E3D8] bg-white text-base text-[#214B3D] min-h-[48px]"
              >
                {(Object.keys(t.options.stages) as GrowthStageOption[]).map(
                  (s) => (
                    <option key={s} value={s}>
                      {t.options.stages[s]}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label
                htmlFor="ps-soil"
                className="block text-sm font-bold text-[#214B3D] mb-1.5"
              >
                {t.profileSetup.soilType}
              </label>
              <select
                id="ps-soil"
                value={soilType}
                onChange={(e) => setSoilType(e.target.value as SoilTypeOption)}
                className="w-full px-4 py-3 rounded-xl border border-[#D3E3D8] bg-white text-base text-[#214B3D] min-h-[48px]"
              >
                {(Object.keys(t.options.soils) as SoilTypeOption[]).map((s) => (
                  <option key={s} value={s}>
                    {t.options.soils[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Section C: Water details */}
        <section className="bg-white border border-[#D3E3D8] rounded-2xl p-5 sm:p-6 space-y-4 shadow-[0_2px_10px_rgba(33,75,61,0.03)]">
          <div className="flex items-center gap-2 text-base font-bold text-[#4D91B5] border-b border-[#EDF5EF] pb-3">
            <Droplets className="w-5 h-5 shrink-0" />
            <h2>{t.profileSetup.sectionC}</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="ps-water-source"
                className="block text-sm font-bold text-[#214B3D] mb-1.5"
              >
                {t.profileSetup.waterSource}
              </label>
              <select
                id="ps-water-source"
                value={waterSource}
                onChange={(e) =>
                  setWaterSource(e.target.value as WaterSourceOption)
                }
                className="w-full px-4 py-3 rounded-xl border border-[#D3E3D8] bg-white text-base text-[#214B3D] min-h-[48px]"
              >
                {(Object.keys(t.options.waterSources) as WaterSourceOption[]).map(
                  (ws) => (
                    <option key={ws} value={ws}>
                      {t.options.waterSources[ws]}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label
                htmlFor="ps-method"
                className="block text-sm font-bold text-[#214B3D] mb-1.5"
              >
                {t.profileSetup.irrigationMethod}
              </label>
              <select
                id="ps-method"
                value={irrigationMethod}
                onChange={(e) =>
                  setIrrigationMethod(e.target.value as IrrigationMethodOption)
                }
                className="w-full px-4 py-3 rounded-xl border border-[#D3E3D8] bg-white text-base text-[#214B3D] min-h-[48px]"
              >
                {(
                  Object.keys(t.options.methods) as IrrigationMethodOption[]
                ).map((m) => (
                  <option key={m} value={m}>
                    {t.options.methods[m]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="ps-avail"
                className="block text-sm font-bold text-[#214B3D] mb-1.5"
              >
                {t.profileSetup.waterAvailability}
              </label>
              <select
                id="ps-avail"
                value={waterAvailability}
                onChange={(e) =>
                  setWaterAvailability(
                    e.target.value as WaterAvailabilityOption
                  )
                }
                className="w-full px-4 py-3 rounded-xl border border-[#D3E3D8] bg-white text-base text-[#214B3D] min-h-[48px]"
              >
                {(
                  Object.keys(t.options.availability) as WaterAvailabilityOption[]
                ).map((a) => (
                  <option key={a} value={a}>
                    {t.options.availability[a]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-900 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#39785C] text-white text-base font-semibold hover:bg-[#2f634c] disabled:opacity-60 transition-colors min-h-[48px]"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>
              {loading ? t.profileSetup.savingBtn : t.profileSetup.saveBtn}
            </span>
          </button>

          {isEditMode && onCancelEdit && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="px-5 py-3.5 rounded-xl border border-[#D3E3D8] bg-white text-[#214B3D] text-sm font-semibold hover:bg-[#EDF5EF] min-h-[48px]"
            >
              {t.profileSetup.cancelEditBtn}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
