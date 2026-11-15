import { ArrowRight, History, Trash2, X } from "lucide-react";
import { useLanguage } from "../hooks/useLanguage";
import { getTranslations } from "../i18n/translations";
import { PageId, RecentActivityItem } from "../types/app";

interface RecentActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  activities: RecentActivityItem[];
  onDeleteActivity: (id: string) => void;
  onClearActivities: () => void;
  onOpenActivity: (item: RecentActivityItem, targetPage: PageId) => void;
}

export function RecentActivityModal({
  isOpen,
  onClose,
  activities,
  onDeleteActivity,
  onClearActivities,
  onOpenActivity,
}: RecentActivityModalProps) {
  const { language } = useLanguage();
  const t = getTranslations(language);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.recentActivity.title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4"
    >
      <div className="bg-white border border-[#D3E3D8] rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-lg overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#D3E3D8] bg-[#EDF5EF]">
          <div className="flex items-center gap-2 text-[#214B3D] font-bold">
            <History className="w-5 h-5 text-[#4D91B5]" />
            <h2>
              {t.recentActivity.title} ({activities.length})
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.nav.close}
            className="w-10 h-10 rounded-xl bg-white border border-[#D3E3D8] flex items-center justify-center text-[#214B3D] hover:bg-[#E3F0E8]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          {activities.length > 0 && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClearActivities}
                className="text-xs font-semibold text-[#71877D] hover:text-[#214B3D] underline"
              >
                {t.recentActivity.clearAll}
              </button>
            </div>
          )}

          {activities.length === 0 ? (
            <div className="bg-[#EDF5EF] border border-[#D3E3D8] rounded-xl p-6 text-center text-sm text-[#71877D]">
              {t.recentActivity.empty}
            </div>
          ) : (
            <div className="space-y-2.5">
              {activities.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-[#D3E3D8] bg-[#EDF5EF]/50"
                >
                  <div className="space-y-0.5">
                    <div className="text-xs text-[#71877D]">
                      {item.type === "irrigation"
                        ? t.recentActivity.irrigationType
                        : t.recentActivity.budgetType}{" "}
                      · {new Date(item.createdAt).toLocaleDateString()}
                    </div>
                    <div className="text-sm font-semibold text-[#214B3D]">
                      {item.summaryTitle}
                    </div>
                    <div className="text-xs text-[#71877D]">
                      {item.summaryDetail}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        onOpenActivity(
                          item,
                          item.type === "irrigation" ? "irrigation" : "budget"
                        );
                        onClose();
                      }}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-[#39785C] text-white text-xs font-semibold hover:bg-[#2f634c] min-h-[40px]"
                    >
                      <span>{t.recentActivity.loadItem}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteActivity(item.id)}
                      aria-label={t.recentActivity.deleteItem}
                      className="p-2 rounded-xl border border-[#D3E3D8] bg-white text-[#71877D] hover:text-red-700 min-h-[40px] min-w-[40px] flex items-center justify-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
