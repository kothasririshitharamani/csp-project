import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Eraser,
  HelpCircle,
  Info,
  Loader2,
  RefreshCw,
  Send,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { BackToHome } from "../components/BackToHome";
import { ReadAloudButton } from "../components/ReadAloudButton";
import {
  VoiceInputControl,
  VoiceInputControlHandle,
} from "../components/VoiceInputControl";
import { VoiceSettingsPanel } from "../components/VoiceSettingsPanel";
import { useLanguage } from "../hooks/useLanguage";
import { SpeechState } from "../hooks/useSpeechRecognition";
import { getTranslations } from "../i18n/translations";
import { FarmProfile, Language } from "../types/app";
import { safeJsonFetch } from "../utils/apiClient";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "error";
  text: string;
  failedQuestion?: string;
}

interface FaqAssistantPageProps {
  profile: FarmProfile | null;
  initialQuestion?: string | null;
  onConsumeInitialQuestion?: () => void;
  onBackHome: () => void;
  onLanguageChange?: (lang: Language) => void;
}

export function FaqAssistantPage({
  profile,
  initialQuestion,
  onConsumeInitialQuestion,
  onBackHome,
  onLanguageChange,
}: FaqAssistantPageProps) {
  const { language } = useLanguage();
  const t = getTranslations(language);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [speechState, setSpeechState] = useState<SpeechState>("ready");
  const [loading, setLoading] = useState(false);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [geminiConfigured, setGeminiConfigured] = useState<boolean | null>(
    null
  );

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const voiceRef = useRef<VoiceInputControlHandle | null>(null);

  const cropDisplay = profile
    ? profile.crop === "other" && profile.customCrop
      ? profile.customCrop
      : t.options.crops[profile.crop]
    : "";

  const areaDisplay = profile
    ? `${profile.landArea} ${t.options.areaUnits[profile.areaUnit]}`
    : "";

  useEffect(() => {
    safeJsonFetch<{ geminiConfigured?: boolean }>("/api/health")
      .then((health) => {
        if (typeof health.geminiConfigured === "boolean") {
          setGeminiConfigured(health.geminiConfigured);
        }
      })
      .catch(() => {
        // Ignore probe failure
      });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleVoiceTranscript = useCallback((text: string) => {
    setInput(text);
  }, []);

  const sendQuestion = async (questionText: string) => {
    const trimmed = questionText.trim();
    if (!trimmed || loading) return;

    if (speechState === "listening") {
      voiceRef.current?.stop();
    }

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      text: trimmed,
    };

    const historyForApi = messages
      .filter(
        (m): m is ChatMessage & { role: "user" | "assistant" } =>
          m.role === "user" || m.role === "assistant"
      )
      .map((m) => ({ role: m.role, text: m.text }));

    setMessages((prev) => [...prev, userMsg]);
    voiceRef.current?.reset();
    setInput("");
    setLoading(true);

    try {
      const data = await safeJsonFetch<{
        ok: boolean;
        reply: string;
      }>("/api/faq/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          history: historyForApi,
          language,
          farmContext: profile
            ? {
                farmerName: profile.farmerName,
                village: profile.village,
                mandal: profile.mandal,
                district: profile.district,
                state: profile.state,
                crop: cropDisplay,
                landArea: areaDisplay,
                soilType: t.options.soils[profile.soilType],
                waterSource: t.options.waterSources[profile.waterSource],
                irrigationMethod: t.options.methods[profile.irrigationMethod],
                waterAvailability:
                  t.options.availability[profile.waterAvailability],
              }
            : undefined,
        }),
      });

      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        text: data.reply,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to get response. Please retry.";
      if (message.toLowerCase().includes("not configured")) {
        setGeminiConfigured(false);
      }
      const errMsg: ChatMessage = {
        id: `e-${Date.now()}`,
        role: "error",
        text: message,
        failedQuestion: trimmed,
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialQuestion && initialQuestion.trim()) {
      const q = initialQuestion.trim();
      onConsumeInitialQuestion?.();
      sendQuestion(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuestion]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendQuestion(input);
  };

  const handleRemoveText = () => {
    // Clears spoken/typed question and speech state while preserving previous chat messages & farmer profile
    voiceRef.current?.reset();
    setInput("");
  };

  const handleRetry = (failedQuestion: string, errorId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== errorId));
    sendQuestion(failedQuestion);
  };

  const hasRemovableText = Boolean(
    input.length > 0 ||
      speechState === "listening" ||
      speechState === "processing" ||
      speechState === "recognized" ||
      speechState === "no_speech" ||
      speechState === "network_error" ||
      speechState === "error" ||
      speechState === "permission_denied"
  );

  return (
    <div className="space-y-6">
      <BackToHome onClick={onBackHome} />

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#214B3D] tracking-tight">
            {t.faq.title}
          </h1>
          <p className="text-sm sm:text-base text-[#71877D] max-w-3xl">
            {t.faq.subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setShowVoiceSettings((prev) => !prev)}
            aria-expanded={showVoiceSettings}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border text-sm font-semibold transition-colors min-h-[44px] ${
              showVoiceSettings
                ? "bg-[#214B3D] text-white border-[#214B3D]"
                : "bg-white text-[#214B3D] border-[#D3E3D8] hover:bg-[#E3F0E8]"
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>{t.voice.ttsSettingsBtn}</span>
          </button>

          {messages.length > 0 && (
            <button
              type="button"
              onClick={() => setMessages([])}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-[#D3E3D8] text-sm font-semibold text-[#71877D] hover:text-[#214B3D] min-h-[44px]"
            >
              <Trash2 className="w-4 h-4" />
              <span>{t.faq.clearBtn}</span>
            </button>
          )}
        </div>
      </div>

      {showVoiceSettings && (
        <VoiceSettingsPanel onLanguageChange={onLanguageChange} />
      )}

      {profile && (
        <div className="bg-[#E3F0E8] border border-[#D3E3D8] rounded-2xl p-3.5 flex items-center gap-2.5 text-xs sm:text-sm text-[#214B3D]">
          <Info className="w-4 h-4 text-[#39785C] shrink-0" />
          <span>
            {t.faq.contextActiveNote
              .replace("{crop}", cropDisplay)
              .replace("{area}", areaDisplay)
              .replace("{district}", profile.district)}
          </span>
        </div>
      )}

      {geminiConfigured === false && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-800 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-amber-950 space-y-1">
            <p className="font-bold">{t.faq.notConfiguredTitle}</p>
            <p>{t.faq.notConfiguredBody}</p>
          </div>
        </div>
      )}

      <div className="bg-white border border-[#D3E3D8] rounded-2xl p-4 sm:p-5 space-y-3">
        <p className="text-xs sm:text-sm font-bold text-[#39785C]">
          {t.faq.suggestedTitle}
        </p>
        <div className="flex flex-wrap gap-2">
          {t.faq.suggestedQuestions.map((question, idx) => (
            <button
              key={idx}
              type="button"
              disabled={loading}
              onClick={() => sendQuestion(question)}
              className="text-left px-3.5 py-2.5 rounded-xl bg-[#EDF5EF] border border-[#D3E3D8] text-xs sm:text-sm font-medium text-[#214B3D] hover:bg-[#E3F0E8] hover:border-[#39785C] transition-colors min-h-[40px]"
            >
              {question}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-[#D3E3D8] rounded-2xl overflow-hidden shadow-[0_2px_10px_rgba(33,75,61,0.03)] flex flex-col">
        <div className="p-4 sm:p-6 min-h-[300px] max-h-[520px] overflow-y-auto space-y-4">
          {messages.length === 0 && !loading ? (
            <div className="py-10 text-center space-y-2">
              <HelpCircle className="w-9 h-9 text-[#39785C] mx-auto" />
              <h2 className="text-base sm:text-lg font-bold text-[#214B3D]">
                {t.faq.emptyTitle}
              </h2>
              <p className="text-sm text-[#71877D] max-w-md mx-auto">
                {t.faq.emptyBody}
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              if (msg.role === "user") {
                return (
                  <div key={msg.id} className="flex justify-end">
                    <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-br-sm bg-[#39785C] text-white px-4 py-3 text-sm sm:text-base leading-relaxed">
                      {msg.text}
                    </div>
                  </div>
                );
              }

              if (msg.role === "error") {
                return (
                  <div key={msg.id} className="flex justify-start">
                    <div className="max-w-[90%] sm:max-w-[80%] rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-900 space-y-2">
                      <p>{msg.text}</p>
                      {msg.failedQuestion && (
                        <button
                          type="button"
                          onClick={() =>
                            handleRetry(msg.failedQuestion!, msg.id)
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-red-300 text-xs font-semibold text-red-800 hover:bg-red-100"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>{t.faq.retryBtn}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              }

              return (
                <div key={msg.id} className="flex justify-start">
                  <div className="max-w-[92%] sm:max-w-[82%] rounded-2xl rounded-bl-sm bg-[#EDF5EF] border border-[#D3E3D8] px-4 py-3.5 space-y-3">
                    <div className="text-sm sm:text-base text-[#214B3D] whitespace-pre-line leading-relaxed">
                      {msg.text}
                    </div>
                    <ReadAloudButton
                      text={msg.text}
                      itemId={msg.id}
                      className="!py-1.5 !px-3 !min-h-[36px] !text-xs"
                    />
                  </div>
                </div>
              );
            })
          )}

          {loading && (
            <div className="flex justify-start">
              <div className="inline-flex items-center gap-2 rounded-2xl bg-[#EDF5EF] border border-[#D3E3D8] px-4 py-3 text-sm text-[#39785C] font-medium">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t.faq.thinking}</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={handleSubmit}
          className="border-t border-[#D3E3D8] bg-[#EDF5EF]/60 p-4 space-y-3"
        >
          <VoiceInputControl
            ref={voiceRef}
            compact
            onTranscriptChange={handleVoiceTranscript}
            onStateChange={setSpeechState}
          />

          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t.faq.inputPlaceholder}
              className="flex-1 px-4 py-3 rounded-xl border border-[#D3E3D8] bg-white text-sm sm:text-base text-[#214B3D] min-h-[48px]"
            />
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={!hasRemovableText}
                onClick={handleRemoveText}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl border border-[#D3E3D8] bg-white text-sm font-semibold text-[#214B3D] hover:bg-[#E3F0E8] disabled:opacity-45 disabled:cursor-not-allowed min-h-[48px]"
              >
                <Eraser className="w-4 h-4 text-[#71877D]" />
                <span>{t.faq.removeTextBtn}</span>
              </button>
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#39785C] text-white text-sm sm:text-base font-semibold hover:bg-[#2f634c] disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]"
              >
                <Send className="w-4 h-4" />
                <span>{t.faq.sendBtn}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
