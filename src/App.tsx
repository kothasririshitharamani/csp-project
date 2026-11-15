import { useEffect, useState } from "react";
import { Droplets, Leaf, Loader2 } from "lucide-react";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { RecentActivityModal } from "./components/RecentActivityModal";
import { useRecentActivity } from "./hooks/useFarmProfile";
import { LanguageProvider, useLanguage } from "./hooks/useLanguage";
import { TextToSpeechProvider, useTextToSpeech } from "./hooks/useTextToSpeech";
import { AuthPage } from "./pages/AuthPage";
import { DisasterPage } from "./pages/DisasterPage";
import { FaqAssistantPage } from "./pages/FaqAssistantPage";
import { HomePage } from "./pages/HomePage";
import { IrrigationPlannerPage } from "./pages/IrrigationPlannerPage";
import { ProfileSetupPage } from "./pages/ProfileSetupPage";
import { SoilAnalysisPage } from "./pages/SoilAnalysisPage";
import { WaterBudgetPage } from "./pages/WaterBudgetPage";
import { WeatherPage } from "./pages/WeatherPage";
import {
  AuthUser,
  IrrigationInput,
  Language,
  PageId,
  RecentActivityItem,
  WaterBudgetInput,
} from "./types/app";
import {
  clearStoredSessionToken,
  onUnauthorizedSession,
  safeJsonFetch,
  setStoredSessionToken,
} from "./utils/apiClient";

const VALID_PAGES: Set<PageId> = new Set([
  "home",
  "soil",
  "irrigation",
  "budget",
  "weather",
  "disaster",
  "faq",
  "profile_setup",
]);

function getPageFromHash(): PageId {
  if (typeof window === "undefined") return "home";
  const raw = window.location.hash.replace(/^#/, "") as PageId;
  return VALID_PAGES.has(raw) ? raw : "home";
}

function AppShell() {
  const { setLanguage } = useLanguage();
  const { stop: stopTts } = useTextToSpeech();

  const [checkingSession, setCheckingSession] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [currentPage, setCurrentPage] = useState<PageId>(getPageFromHash);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  const [irrigationPrefill, setIrrigationPrefill] =
    useState<IrrigationInput | null>(null);
  const [budgetPrefill, setBudgetPrefill] = useState<WaterBudgetInput | null>(
    null
  );

  const { activities, addActivity, deleteActivity, clearActivities } =
    useRecentActivity(user?.id);

  const navigate = (page: PageId) => {
    if (user && !user.profileComplete && page !== "profile_setup") {
      setCurrentPage("profile_setup");
      if (window.location.hash !== "#profile_setup") {
        window.location.hash = "profile_setup";
      }
      return;
    }
    setCurrentPage(page);
    if (window.location.hash !== `#${page}`) {
      window.location.hash = page;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    const unsubscribe = onUnauthorizedSession(() => {
      setUser(null);
      setHistoryModalOpen(false);
      setCurrentPage("home");
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    let active = true;
    safeJsonFetch<{
      authenticated: boolean;
      user: AuthUser | null;
      sessionToken?: string;
    }>("/api/auth/session")
      .then((res) => {
        if (!active) return;
        if (res.authenticated && res.user) {
          if (res.sessionToken) {
            setStoredSessionToken(res.sessionToken);
          }
          setUser(res.user);
          if (res.user.preferredLanguage) {
            setLanguage(res.user.preferredLanguage);
          }
          if (!res.user.profileComplete) {
            setCurrentPage("profile_setup");
            window.location.hash = "profile_setup";
          }
        } else {
          clearStoredSessionToken();
          setUser(null);
        }
      })
      .catch(() => {
        if (active) {
          clearStoredSessionToken();
          setUser(null);
        }
      })
      .finally(() => {
        if (active) setCheckingSession(false);
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onHashChange = () => {
      const next = getPageFromHash();
      if (user && !user.profileComplete) {
        setCurrentPage("profile_setup");
        if (window.location.hash !== "#profile_setup") {
          window.location.hash = "profile_setup";
        }
        return;
      }
      setCurrentPage(next);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [user]);

  const handleAuthSuccess = (authedUser: AuthUser) => {
    setUser(authedUser);
    if (authedUser.preferredLanguage) {
      setLanguage(authedUser.preferredLanguage);
    }
    if (!authedUser.profileComplete) {
      setCurrentPage("profile_setup");
      window.location.hash = "profile_setup";
    } else {
      setCurrentPage("home");
      window.location.hash = "home";
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleProfileSaved = (updatedUser: AuthUser) => {
    setUser(updatedUser);
    setCurrentPage("home");
    window.location.hash = "home";
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleLanguageChange = async (lang: Language) => {
    if (!user) return;
    setUser((prev) => (prev ? { ...prev, preferredLanguage: lang } : prev));
    try {
      await safeJsonFetch("/api/auth/language", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferredLanguage: lang }),
      });
    } catch {
      // Non-blocking: localStorage keeps the language choice even if offline
    }
  };

  const handleLogout = async () => {
    stopTts();
    try {
      await safeJsonFetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Clear local session state regardless
    }
    clearStoredSessionToken();
    setUser(null);
    setHistoryModalOpen(false);
    setIrrigationPrefill(null);
    setBudgetPrefill(null);
    setCurrentPage("home");
    window.location.hash = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleOpenActivity = (item: RecentActivityItem, targetPage: PageId) => {
    if (item.type === "irrigation") {
      setIrrigationPrefill(item.payload as IrrigationInput);
    } else if (item.type === "budget") {
      setBudgetPrefill(item.payload as WaterBudgetInput);
    }
    navigate(targetPage);
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#EDF5EF] text-[#214B3D] p-4">
        <div className="bg-white border border-[#D3E3D8] rounded-2xl px-6 py-5 flex items-center gap-3 shadow-sm">
          <span
            className="w-9 h-9 rounded-xl bg-[#E3F0E8] border border-[#D3E3D8] flex items-center justify-center relative shrink-0"
            aria-hidden="true"
          >
            <Leaf className="w-4 h-4 text-[#39785C] -translate-x-1" />
            <Droplets className="w-4 h-4 text-[#4D91B5] translate-x-1 translate-y-0.5" />
          </span>
          <Loader2 className="w-5 h-5 animate-spin text-[#39785C]" />
          <span className="text-sm font-semibold text-[#214B3D]">
            Loading...
          </span>
        </div>
      </div>
    );
  }

  // Strictly require authentication before accessing dashboard or any feature pages
  if (!user) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />;
  }

  const effectivePage: PageId = !user.profileComplete
    ? "profile_setup"
    : currentPage;

  return (
    <div className="min-h-screen flex flex-col bg-[#EDF5EF] text-[#214B3D]">
      <Header
        currentPage={effectivePage}
        profileComplete={user.profileComplete}
        onNavigate={navigate}
        onOpenVoice={() => navigate("faq")}
        onOpenHistory={() => setHistoryModalOpen(true)}
        onLogout={handleLogout}
        onLanguageChange={handleLanguageChange}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {effectivePage === "profile_setup" && (
          <ProfileSetupPage
            user={user}
            isEditMode={user.profileComplete}
            onProfileSaved={handleProfileSaved}
            onCancelEdit={
              user.profileComplete ? () => navigate("home") : undefined
            }
          />
        )}

        {effectivePage === "home" && user.profileComplete && (
          <HomePage
            user={user}
            onNavigate={navigate}
            activities={activities}
            onOpenHistory={() => setHistoryModalOpen(true)}
            onLanguageChange={handleLanguageChange}
          />
        )}

        {effectivePage === "soil" && user.profileComplete && (
          <SoilAnalysisPage
            profile={user.profile}
            onBackHome={() => navigate("home")}
          />
        )}

        {effectivePage === "irrigation" && user.profileComplete && (
          <IrrigationPlannerPage
            profile={user.profile}
            onSaveActivity={addActivity}
            prefillInput={irrigationPrefill}
            onBackHome={() => navigate("home")}
          />
        )}

        {effectivePage === "budget" && user.profileComplete && (
          <WaterBudgetPage
            profile={user.profile}
            onSaveActivity={addActivity}
            prefillInput={budgetPrefill}
            onBackHome={() => navigate("home")}
          />
        )}

        {effectivePage === "weather" && user.profileComplete && (
          <WeatherPage
            profile={user.profile}
            onBackHome={() => navigate("home")}
          />
        )}

        {effectivePage === "disaster" && user.profileComplete && (
          <DisasterPage
            profile={user.profile}
            onBackHome={() => navigate("home")}
          />
        )}

        {effectivePage === "faq" && user.profileComplete && (
          <FaqAssistantPage
            profile={user.profile}
            onBackHome={() => navigate("home")}
            onLanguageChange={handleLanguageChange}
          />
        )}
      </main>

      <Footer
        profileComplete={user.profileComplete}
        onNavigate={navigate}
      />

      {user.profileComplete && (
        <RecentActivityModal
          isOpen={historyModalOpen}
          onClose={() => setHistoryModalOpen(false)}
          activities={activities}
          onDeleteActivity={deleteActivity}
          onClearActivities={clearActivities}
          onOpenActivity={handleOpenActivity}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <TextToSpeechProvider>
        <AppShell />
      </TextToSpeechProvider>
    </LanguageProvider>
  );
}
