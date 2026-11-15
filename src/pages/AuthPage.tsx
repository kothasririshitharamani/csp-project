import React, { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Droplets,
  Eye,
  EyeOff,
  Info,
  Leaf,
  Loader2,
  Lock,
  Phone,
  User,
} from "lucide-react";
import { LanguageSelector } from "../components/LanguageSelector";
import { useLanguage } from "../hooks/useLanguage";
import { getTranslations } from "../i18n/translations";
import { AuthUser, AuthView, Language } from "../types/app";
import {
  clearStoredSessionToken,
  safeJsonFetch,
  setStoredSessionToken,
} from "../utils/apiClient";

interface AuthPageProps {
  onAuthSuccess: (user: AuthUser) => void;
}

function normalizeMobileInput(val: string): string {
  return val.replace(/\D/g, "").slice(0, 10);
}

function isValidMobile(mobile: string): boolean {
  return /^[6-9]\d{9}$/.test(mobile);
}

export function AuthPage({ onAuthSuccess }: AuthPageProps) {
  const { language, setLanguage } = useLanguage();
  const t = getTranslations(language);

  const [view, setView] = useState<AuthView>("login");

  // Login state (never prefilled with any personal phone or password)
  const [loginMobile, setLoginMobile] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register state
  const [regName, setRegName] = useState("");
  const [regMobile, setRegMobile] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regLanguage, setRegLanguage] = useState<Language>(language);
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Forgot password state
  const [forgotMobile, setForgotMobile] = useState("");
  const [forgotName, setForgotName] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const redirectTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current !== null) {
        window.clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  const switchView = (next: AuthView) => {
    setView(next);
    setError(null);
    setSuccessMsg(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || redirecting) return;
    setError(null);
    setSuccessMsg(null);

    const mobile = normalizeMobileInput(loginMobile);
    if (!isValidMobile(mobile)) {
      setError(t.auth.validationMobile);
      return;
    }
    if (!loginPassword) {
      setError(t.auth.validationPasswordReq);
      return;
    }

    setLoading(true);
    clearStoredSessionToken();
    try {
      const data = await safeJsonFetch<{
        ok: boolean;
        user: AuthUser;
        sessionToken?: string;
      }>("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mobileNumber: mobile,
          password: loginPassword,
        }),
      });
      if (data.sessionToken) {
        setStoredSessionToken(data.sessionToken);
      }
      setSuccessMsg(t.auth.loginSuccess);
      setRedirecting(true);
      redirectTimerRef.current = window.setTimeout(() => {
        onAuthSuccess(data.user);
      }, 300);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not sign in. Please retry."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || redirecting) return;
    setError(null);
    setSuccessMsg(null);

    const mobile = normalizeMobileInput(regMobile);
    if (regName.trim().length < 2) {
      setError(t.auth.validationNameMin);
      return;
    }
    if (!isValidMobile(mobile)) {
      setError(t.auth.validationMobile);
      return;
    }
    if (regPassword.length < 6) {
      setError(t.auth.validationPasswordMin);
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setError(t.auth.validationConfirmMismatch);
      return;
    }

    setLoading(true);
    clearStoredSessionToken();
    try {
      const data = await safeJsonFetch<{
        ok: boolean;
        user: AuthUser;
        sessionToken?: string;
      }>("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: regName.trim(),
          mobileNumber: mobile,
          password: regPassword,
          preferredLanguage: regLanguage,
        }),
      });
      if (data.sessionToken) {
        setStoredSessionToken(data.sessionToken);
      }
      setLanguage(regLanguage);
      onAuthSuccess(data.user);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not create account. Please retry."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleForgotReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const mobile = normalizeMobileInput(forgotMobile);
    if (!isValidMobile(mobile)) {
      setError(t.auth.validationMobile);
      return;
    }
    if (forgotName.trim().length < 2) {
      setError(t.auth.validationNameMin);
      return;
    }
    if (forgotNewPassword.length < 6) {
      setError(t.auth.validationPasswordMin);
      return;
    }

    setLoading(true);
    try {
      await safeJsonFetch<{ ok: boolean; message: string }>(
        "/api/auth/reset-password",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mobileNumber: mobile,
            fullName: forgotName.trim(),
            newPassword: forgotNewPassword,
          }),
        }
      );
      setSuccessMsg(t.auth.resetSuccess);
      setLoginMobile(mobile);
      setLoginPassword("");
      setForgotNewPassword("");
      setView("login");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not update password. Please check your details."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#EDF5EF] text-[#214B3D]">
      {/* Dark forest-green header with leaf-and-water branding */}
      <header className="bg-[#214B3D] text-white border-b border-[#39785C]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className="w-10 h-10 rounded-xl bg-[#39785C] border border-[#56987A] flex items-center justify-center relative shrink-0"
              aria-hidden="true"
            >
              <Leaf className="w-4 h-4 text-[#E3F0E8] -translate-x-1" />
              <Droplets className="w-4 h-4 text-[#93C5FD] translate-x-1 translate-y-0.5" />
            </span>
            <div>
              <p className="font-bold text-base sm:text-lg leading-snug text-white">
                {t.appShortName}
              </p>
              <p className="text-xs text-[#D3E3D8] hidden sm:block">
                {t.fullSystemName}
              </p>
            </div>
          </div>

          <LanguageSelector
            variant="dark"
            onLanguageChange={(lang) => {
              if (view === "register") setRegLanguage(lang);
            }}
          />
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-md space-y-3.5">
          <div className="flex justify-center">
            <span
              title={t.auth.demoBadgeHint}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E3F0E8] border border-[#D3E3D8] text-xs font-medium text-[#214B3D]"
            >
              <Info className="w-3.5 h-3.5 text-[#39785C] shrink-0" />
              <span>{t.auth.demoBadgeLabel}</span>
            </span>
          </div>

          <div className="bg-white border border-[#D3E3D8] rounded-2xl p-6 sm:p-7 shadow-[0_4px_20px_rgba(33,75,61,0.06)] space-y-5">
            {view === "login" && (
              <>
                <div className="space-y-1 text-center">
                  <h1 className="text-2xl font-bold text-[#214B3D]">
                    {t.auth.loginTitle}
                  </h1>
                  <p className="text-sm text-[#71877D]">
                    {t.auth.loginSubtitle}
                  </p>
                </div>

                {successMsg && (
                  <div className="rounded-xl bg-[#E3F0E8] border border-[#39785C]/30 p-3 text-sm text-[#214B3D] flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#39785C] shrink-0" />
                    <span>{successMsg}</span>
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label
                      htmlFor="login-mobile"
                      className="block text-sm font-bold text-[#214B3D] mb-1.5"
                    >
                      {t.auth.mobileLabel}
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-[#71877D] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        id="login-mobile"
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel"
                        value={loginMobile}
                        onChange={(e) =>
                          setLoginMobile(normalizeMobileInput(e.target.value))
                        }
                        placeholder={t.auth.mobilePlaceholder}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#D3E3D8] bg-white text-[#214B3D] text-base min-h-[48px]"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="login-password"
                      className="block text-sm font-bold text-[#214B3D] mb-1.5"
                    >
                      {t.auth.passwordLabel}
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#71877D] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        id="login-password"
                        type={showLoginPassword ? "text" : "password"}
                        autoComplete="current-password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder={t.auth.passwordPlaceholder}
                        className="w-full pl-10 pr-12 py-3 rounded-xl border border-[#D3E3D8] bg-white text-[#214B3D] text-base min-h-[48px]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword((prev) => !prev)}
                        aria-label={
                          showLoginPassword
                            ? t.auth.hidePassword
                            : t.auth.showPassword
                        }
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg flex items-center justify-center text-[#71877D] hover:text-[#214B3D]"
                      >
                        {showLoginPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-900 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || redirecting}
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-[#39785C] text-white text-base font-semibold hover:bg-[#2f634c] disabled:opacity-60 transition-colors min-h-[48px]"
                  >
                    {(loading || redirecting) && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                    <span>
                      {loading || redirecting
                        ? t.auth.loggingInBtn
                        : t.auth.loginBtn}
                    </span>
                  </button>
                </form>

                <div className="pt-2 border-t border-[#D3E3D8] flex flex-col sm:flex-row items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => switchView("register")}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#EDF5EF] border border-[#D3E3D8] text-sm font-semibold text-[#39785C] hover:bg-[#E3F0E8] min-h-[44px]"
                  >
                    {t.auth.createAccountBtn}
                  </button>
                  <button
                    type="button"
                    onClick={() => switchView("forgot")}
                    className="text-sm font-semibold text-[#4D91B5] hover:underline py-2 px-2 min-h-[44px]"
                  >
                    {t.auth.forgotBtn}
                  </button>
                </div>
              </>
            )}

            {view === "register" && (
              <>
                <div className="space-y-1 text-center">
                  <h1 className="text-2xl font-bold text-[#214B3D]">
                    {t.auth.registerTitle}
                  </h1>
                  <p className="text-sm text-[#71877D]">
                    {t.auth.registerSubtitle}
                  </p>
                </div>

                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <label
                      htmlFor="reg-name"
                      className="block text-sm font-bold text-[#214B3D] mb-1.5"
                    >
                      {t.auth.fullNameLabel}
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-[#71877D] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        id="reg-name"
                        type="text"
                        autoComplete="name"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder={t.auth.fullNamePlaceholder}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#D3E3D8] bg-white text-[#214B3D] text-base min-h-[48px]"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="reg-mobile"
                      className="block text-sm font-bold text-[#214B3D] mb-1.5"
                    >
                      {t.auth.mobileLabel}
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-[#71877D] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        id="reg-mobile"
                        type="tel"
                        inputMode="numeric"
                        value={regMobile}
                        onChange={(e) =>
                          setRegMobile(normalizeMobileInput(e.target.value))
                        }
                        placeholder={t.auth.mobilePlaceholder}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#D3E3D8] bg-white text-[#214B3D] text-base min-h-[48px]"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="reg-lang"
                      className="block text-sm font-bold text-[#214B3D] mb-1.5"
                    >
                      {t.auth.preferredLanguageLabel}
                    </label>
                    <select
                      id="reg-lang"
                      value={regLanguage}
                      onChange={(e) => {
                        const next = e.target.value as Language;
                        setRegLanguage(next);
                        setLanguage(next);
                      }}
                      className="w-full px-3.5 py-3 rounded-xl border border-[#D3E3D8] bg-white text-[#214B3D] text-base min-h-[48px]"
                    >
                      <option value="te">తెలుగు (Telugu)</option>
                      <option value="en">English</option>
                      <option value="hi">हिन्दी (Hindi)</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="reg-pass"
                      className="block text-sm font-bold text-[#214B3D] mb-1.5"
                    >
                      {t.auth.passwordLabel}
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#71877D] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        id="reg-pass"
                        type={showRegPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder={t.auth.passwordPlaceholder}
                        className="w-full pl-10 pr-12 py-3 rounded-xl border border-[#D3E3D8] bg-white text-[#214B3D] text-base min-h-[48px]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword((prev) => !prev)}
                        aria-label={
                          showRegPassword
                            ? t.auth.hidePassword
                            : t.auth.showPassword
                        }
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg flex items-center justify-center text-[#71877D] hover:text-[#214B3D]"
                      >
                        {showRegPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="reg-confirm"
                      className="block text-sm font-bold text-[#214B3D] mb-1.5"
                    >
                      {t.auth.confirmPasswordLabel}
                    </label>
                    <input
                      id="reg-confirm"
                      type={showRegPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder={t.auth.confirmPasswordPlaceholder}
                      className="w-full px-4 py-3 rounded-xl border border-[#D3E3D8] bg-white text-[#214B3D] text-base min-h-[48px]"
                    />
                  </div>

                  {error && (
                    <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-900 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-[#39785C] text-white text-base font-semibold hover:bg-[#2f634c] disabled:opacity-60 transition-colors min-h-[48px]"
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>
                      {loading ? t.auth.registeringBtn : t.auth.registerSubmitBtn}
                    </span>
                  </button>
                </form>

                <div className="pt-2 border-t border-[#D3E3D8] text-center">
                  <button
                    type="button"
                    onClick={() => switchView("login")}
                    className="text-sm font-semibold text-[#39785C] hover:underline py-2 min-h-[44px]"
                  >
                    {t.auth.backToLogin}
                  </button>
                </div>
              </>
            )}

            {view === "forgot" && (
              <>
                <div className="space-y-1 text-center">
                  <h1 className="text-2xl font-bold text-[#214B3D]">
                    {t.auth.forgotTitle}
                  </h1>
                  <p className="text-sm text-[#71877D]">
                    {t.auth.forgotSubtitle}
                  </p>
                </div>

                <form onSubmit={handleForgotReset} className="space-y-4">
                  <div>
                    <label
                      htmlFor="fp-mobile"
                      className="block text-sm font-bold text-[#214B3D] mb-1.5"
                    >
                      {t.auth.mobileLabel}
                    </label>
                    <input
                      id="fp-mobile"
                      type="tel"
                      inputMode="numeric"
                      value={forgotMobile}
                      onChange={(e) =>
                        setForgotMobile(normalizeMobileInput(e.target.value))
                      }
                      placeholder={t.auth.mobilePlaceholder}
                      className="w-full px-4 py-3 rounded-xl border border-[#D3E3D8] bg-white text-[#214B3D] text-base min-h-[48px]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="fp-name"
                      className="block text-sm font-bold text-[#214B3D] mb-1.5"
                    >
                      {t.auth.fullNameLabel}
                    </label>
                    <input
                      id="fp-name"
                      type="text"
                      value={forgotName}
                      onChange={(e) => setForgotName(e.target.value)}
                      placeholder={t.auth.fullNamePlaceholder}
                      className="w-full px-4 py-3 rounded-xl border border-[#D3E3D8] bg-white text-[#214B3D] text-base min-h-[48px]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="fp-pass"
                      className="block text-sm font-bold text-[#214B3D] mb-1.5"
                    >
                      {t.auth.passwordLabel}
                    </label>
                    <div className="relative">
                      <input
                        id="fp-pass"
                        type={showForgotPassword ? "text" : "password"}
                        value={forgotNewPassword}
                        onChange={(e) => setForgotNewPassword(e.target.value)}
                        placeholder={t.auth.passwordPlaceholder}
                        className="w-full pl-4 pr-12 py-3 rounded-xl border border-[#D3E3D8] bg-white text-[#214B3D] text-base min-h-[48px]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword((prev) => !prev)}
                        aria-label={
                          showForgotPassword
                            ? t.auth.hidePassword
                            : t.auth.showPassword
                        }
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg flex items-center justify-center text-[#71877D]"
                      >
                        {showForgotPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-900 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-[#39785C] text-white text-base font-semibold hover:bg-[#2f634c] disabled:opacity-60 transition-colors min-h-[48px]"
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>
                      {loading ? t.auth.resettingBtn : t.auth.resetSubmitBtn}
                    </span>
                  </button>
                </form>

                <div className="pt-2 border-t border-[#D3E3D8] text-center">
                  <button
                    type="button"
                    onClick={() => switchView("login")}
                    className="text-sm font-semibold text-[#39785C] hover:underline py-2 min-h-[44px]"
                  >
                    {t.auth.backToLogin}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
