import "dotenv/config";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createSessionToken,
  getFarmerById,
  getSessionCookieName,
  loginFarmer,
  parseCookieHeader,
  PublicFarmerUser,
  registerFarmer,
  resetFarmerPasswordDemo,
  revokeSessionToken,
  SupportedLanguage,
  updateFarmerLanguage,
  updateFarmerProfile,
  verifySessionToken,
} from "./server/services/authService.ts";
import {
  analyzeSoilImage,
  askFarmerAssistant,
  isGeminiConfigured,
} from "./server/services/geminiService.ts";
import {
  fetchOpenMeteoWeather,
  fetchWeatherForFarmer,
  geocodeFarmerLocation,
  isWeatherConfigured,
} from "./server/services/weatherService.ts";
import {
  getTtsCapabilities,
  synthesizeSpeech,
} from "./server/services/ttsService.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface AuthenticatedRequest extends express.Request {
  authUser?: PublicFarmerUser;
  authToken?: string;
}

function isFirebaseConfiguredOnServer(): boolean {
  const cfgPath = path.resolve(process.cwd(), "firebase-applet-config.json");
  return fs.existsSync(cfgPath);
}

const VALID_LANGUAGES = new Set<SupportedLanguage>([
  "en",
  "te",
  "ta",
  "ml",
  "hi",
  "kn",
  "bn",
  "mr",
]);

function normalizeLang(input: unknown): SupportedLanguage {
  if (typeof input === "string" && VALID_LANGUAGES.has(input as SupportedLanguage)) {
    return input as SupportedLanguage;
  }
  return "te";
}

function isHttpsRequest(req: express.Request): boolean {
  const xfProto = req.headers["x-forwarded-proto"];
  const protoStr = Array.isArray(xfProto) ? xfProto[0] : xfProto;
  return (
    req.secure ||
    (typeof protoStr === "string" && protoStr.split(",")[0].trim() === "https") ||
    process.env.NODE_ENV === "production"
  );
}

function setSessionCookie(
  req: express.Request,
  res: express.Response,
  token: string
): void {
  const https = isHttpsRequest(req);
  res.cookie(getSessionCookieName(), token, {
    httpOnly: true,
    sameSite: https ? "none" : "lax",
    secure: https,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

function clearSessionCookie(req: express.Request, res: express.Response): void {
  const https = isHttpsRequest(req);
  res.clearCookie(getSessionCookieName(), {
    httpOnly: true,
    sameSite: https ? "none" : "lax",
    secure: https,
    path: "/",
  });
}

function extractSessionCandidates(req: express.Request): string[] {
  const candidates: string[] = [];
  const authHeader = req.headers.authorization;
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    const bearer = authHeader.slice(7).trim();
    if (bearer) candidates.push(bearer);
  }
  const cookies = parseCookieHeader(req.headers.cookie);
  const cookieToken = cookies[getSessionCookieName()];
  if (cookieToken && !candidates.includes(cookieToken)) {
    candidates.push(cookieToken);
  }
  return candidates;
}

function resolveValidSession(
  req: express.Request
): { user: PublicFarmerUser; token: string } | null {
  const candidates = extractSessionCandidates(req);
  for (const token of candidates) {
    const userId = verifySessionToken(token);
    if (!userId) continue;
    const user = getFarmerById(userId);
    if (user) {
      return { user, token };
    }
  }
  return null;
}

function requireDemoAuth(
  req: AuthenticatedRequest,
  res: express.Response,
  next: express.NextFunction
): void {
  const resolved = resolveValidSession(req);
  if (!resolved) {
    if (parseCookieHeader(req.headers.cookie)[getSessionCookieName()]) {
      clearSessionCookie(req, res);
    }
    res.status(401).json({
      ok: false,
      errorCode: "UNAUTHORIZED",
      message: "Authentication required.",
    });
    return;
  }

  req.authUser = resolved.user;
  req.authToken = resolved.token;
  next();
}

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;

  app.set("trust proxy", 1);

  // Allow credentials and Authorization headers when running across preview origins / iframes
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization"
      );
      res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS"
      );
    }
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    next();
  });

  app.use(express.json({ limit: "15mb" }));

  // Handle malformed JSON request bodies cleanly without leaking HTML error pages
  app.use(
    (
      err: unknown,
      _req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      if (err instanceof SyntaxError && "body" in err) {
        res.status(400).json({
          ok: false,
          errorCode: "BAD_REQUEST_FORMAT",
          message: "Invalid request data format.",
        });
        return;
      }
      next(err);
    }
  );

  // Public health & auth routes
  app.get("/api/health", (_req, res) => {
    const tts = getTtsCapabilities();
    res.json({
      ok: true,
      geminiConfigured: isGeminiConfigured(),
      ttsConfigured: tts.configured,
      ttsProvider: tts.provider,
      weatherConfigured: isWeatherConfigured(),
      weatherProvider: "open-meteo",
      firebaseConfigured: isFirebaseConfiguredOnServer(),
      authMode: isFirebaseConfiguredOnServer() ? "firebase" : "demo_server",
    });
  });

  app.get("/api/tts/status", (_req, res) => {
    res.json({ ok: true, ...getTtsCapabilities() });
  });

  app.get("/api/auth/session", (req, res) => {
    const resolved = resolveValidSession(req);
    const authMode = isFirebaseConfiguredOnServer() ? "firebase" : "demo_server";

    if (!resolved) {
      if (parseCookieHeader(req.headers.cookie)[getSessionCookieName()]) {
        clearSessionCookie(req, res);
      }
      res.json({
        authenticated: false,
        user: null,
        authMode,
      });
      return;
    }

    // Re-sync cookie and return the active token so Bearer + cookie stay in sync
    setSessionCookie(req, res, resolved.token);

    res.json({
      authenticated: true,
      user: resolved.user,
      authMode: resolved.user.authMode,
      sessionToken: resolved.token,
    });
  });

  app.post("/api/auth/register", (req, res) => {
    try {
      const { fullName, mobileNumber, password, preferredLanguage } =
        req.body ?? {};
      const user = registerFarmer({
        fullName: typeof fullName === "string" ? fullName : "",
        mobileNumber: typeof mobileNumber === "string" ? mobileNumber : "",
        password: typeof password === "string" ? password : "",
        preferredLanguage: normalizeLang(preferredLanguage),
      });
      const sessionToken = createSessionToken(user.id);
      setSessionCookie(req, res, sessionToken);
      res.status(201).json({ ok: true, user, sessionToken });
    } catch (error) {
      const err = error as Error & { status?: number; code?: string };
      res.status(err.status || 400).json({
        ok: false,
        errorCode: err.code || "REGISTRATION_FAILED",
        message: err.message || "Could not create account.",
      });
    }
  });

  app.post("/api/auth/login", (req, res) => {
    try {
      const { mobileNumber, password } = req.body ?? {};
      const user = loginFarmer({
        mobileNumber: typeof mobileNumber === "string" ? mobileNumber : "",
        password: typeof password === "string" ? password : "",
      });
      const sessionToken = createSessionToken(user.id);
      setSessionCookie(req, res, sessionToken);
      res.json({ ok: true, user, sessionToken });
    } catch (error) {
      const err = error as Error & { status?: number; code?: string };
      res.status(err.status || 401).json({
        ok: false,
        errorCode: err.code || "LOGIN_FAILED",
        message: err.message || "Incorrect mobile number or password.",
      });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    const candidates = extractSessionCandidates(req);
    for (const token of candidates) {
      revokeSessionToken(token);
    }
    clearSessionCookie(req, res);
    res.json({ ok: true });
  });

  app.post("/api/auth/reset-password", (req, res) => {
    try {
      const { mobileNumber, fullName, newPassword } = req.body ?? {};
      resetFarmerPasswordDemo({
        mobileNumber: typeof mobileNumber === "string" ? mobileNumber : "",
        fullName: typeof fullName === "string" ? fullName : "",
        newPassword: typeof newPassword === "string" ? newPassword : "",
      });
      res.json({
        ok: true,
        message: "Password updated. You can now log in with your new password.",
      });
    } catch (error) {
      const err = error as Error & { status?: number; code?: string };
      res.status(err.status || 400).json({
        ok: false,
        errorCode: err.code || "RESET_FAILED",
        message: err.message || "Could not reset password.",
      });
    }
  });

  // Protected farmer endpoints (require valid demo session)
  app.put(
    "/api/auth/language",
    requireDemoAuth,
    (req: AuthenticatedRequest, res) => {
      const lang = normalizeLang(req.body?.preferredLanguage);
      const updated = updateFarmerLanguage(req.authUser!.id, lang);
      if (!updated) {
        res.status(404).json({ ok: false, message: "Account not found." });
        return;
      }
      res.json({ ok: true, user: updated });
    }
  );

  app.put(
    "/api/profile",
    requireDemoAuth,
    (req: AuthenticatedRequest, res) => {
      const body = req.body ?? {};
      const farmerName =
        typeof body.farmerName === "string" ? body.farmerName.trim() : "";
      const village =
        typeof body.village === "string" ? body.village.trim() : "";
      const mandal = typeof body.mandal === "string" ? body.mandal.trim() : "";
      const district =
        typeof body.district === "string" ? body.district.trim() : "";
      const landAreaNum = Number(body.landArea);

      if (
        !farmerName ||
        !village ||
        !mandal ||
        !district ||
        Number.isNaN(landAreaNum) ||
        landAreaNum <= 0
      ) {
        res.status(400).json({
          ok: false,
          errorCode: "INVALID_PROFILE",
          message:
            "Farmer name, village, mandal, district, and positive land area are required.",
        });
        return;
      }

      try {
        const user = updateFarmerProfile(
          req.authUser!.id,
          {
            farmerName,
            mobileNumber:
              req.authUser!.mobileNumber || String(body.mobileNumber || ""),
            village,
            mandal,
            district,
            state:
              typeof body.state === "string" && body.state.trim()
                ? body.state.trim()
                : "Andhra Pradesh",
            landArea: String(body.landArea),
            areaUnit: body.areaUnit === "hectares" ? "hectares" : "acres",
            crop: typeof body.crop === "string" ? body.crop : "paddy",
            customCrop:
              typeof body.customCrop === "string" ? body.customCrop : "",
            otherCrops:
              typeof body.otherCrops === "string" ? body.otherCrops : "",
            growthStage:
              typeof body.growthStage === "string"
                ? body.growthStage
                : "vegetative",
            soilType:
              typeof body.soilType === "string" ? body.soilType : "loamy",
            waterSource:
              typeof body.waterSource === "string"
                ? body.waterSource
                : "borewell",
            irrigationMethod:
              typeof body.irrigationMethod === "string"
                ? body.irrigationMethod
                : "drip",
            waterAvailability:
              typeof body.waterAvailability === "string"
                ? body.waterAvailability
                : "sufficient",
          },
          body.preferredLanguage
            ? normalizeLang(body.preferredLanguage)
            : undefined
        );

        res.json({ ok: true, user });
      } catch (error) {
        const err = error as Error & { status?: number };
        res.status(err.status || 500).json({
          ok: false,
          message: err.message || "Failed to save farmer profile.",
        });
      }
    }
  );

  app.post("/api/soil/analyze", requireDemoAuth, async (req, res) => {
    try {
      const {
        imageBase64,
        mimeType,
        description,
        symptoms,
        language,
        farmContext,
      } = req.body ?? {};
      if (typeof imageBase64 !== "string" || typeof mimeType !== "string") {
        res.status(400).json({
          ok: false,
          errorCode: "INVALID_INPUT",
          message: "Soil image and MIME type are required.",
        });
        return;
      }

      const lang = normalizeLang(language);
      const safeSymptoms = Array.isArray(symptoms)
        ? symptoms
            .filter((s): s is string => typeof s === "string")
            .slice(0, 10)
        : [];

      const result = await analyzeSoilImage({
        imageBase64,
        mimeType,
        description:
          typeof description === "string" ? description : undefined,
        symptoms: safeSymptoms,
        language: lang,
        farmContext:
          farmContext && typeof farmContext === "object"
            ? farmContext
            : undefined,
      });

      res.json({ ok: true, result });
    } catch (error) {
      const err = error as Error & { code?: string; status?: number };
      console.error("[/api/soil/analyze] Error:", err.code || "", err.message);
      if (err.code === "GEMINI_NOT_CONFIGURED") {
        res.status(503).json({
          ok: false,
          errorCode: "GEMINI_NOT_CONFIGURED",
          message:
            "Gemini AI is not configured on the server. Set GEMINI_API_KEY in Settings > Secrets to enable AI soil analysis.",
        });
        return;
      }
      const status =
        err.status || (err.code === "GEMINI_TIMEOUT" ? 504 : 500);
      res.status(status).json({
        ok: false,
        errorCode: err.code || "SOIL_ANALYSIS_FAILED",
        message:
          err.message || "Failed to analyze soil image. Please try again.",
      });
    }
  });

  app.post("/api/faq/chat", requireDemoAuth, async (req, res) => {
    try {
      const { message, history, language, farmContext } = req.body ?? {};
      if (typeof message !== "string" || !message.trim()) {
        res.status(400).json({
          ok: false,
          errorCode: "INVALID_INPUT",
          message: "Please enter a farming question.",
        });
        return;
      }

      const lang = normalizeLang(language);
      const safeHistory = Array.isArray(history)
        ? history
            .filter(
              (item): item is { role: "user" | "assistant"; text: string } =>
                item &&
                (item.role === "user" || item.role === "assistant") &&
                typeof item.text === "string"
            )
            .slice(-10)
        : [];

      const result = await askFarmerAssistant({
        message,
        history: safeHistory,
        language: lang,
        farmContext:
          farmContext && typeof farmContext === "object"
            ? farmContext
            : undefined,
      });

      res.json({ ok: true, reply: result.reply });
    } catch (error) {
      const err = error as Error & { code?: string; status?: number };
      console.error("[/api/faq/chat] Error:", err.code || "", err.message);
      if (err.code === "GEMINI_NOT_CONFIGURED") {
        res.status(503).json({
          ok: false,
          errorCode: "GEMINI_NOT_CONFIGURED",
          message:
            "Gemini AI is not configured on the server. Set GEMINI_API_KEY in Settings > Secrets to use the Farmer FAQ Assistant.",
        });
        return;
      }
      const status =
        err.status || (err.code === "GEMINI_TIMEOUT" ? 504 : 500);
      res.status(status).json({
        ok: false,
        errorCode: err.code || "FAQ_FAILED",
        message:
          err.message || "Unable to get an answer right now. Please try again.",
      });
    }
  });

  // Multilingual Neural TTS synthesis route (protected)
  app.post("/api/tts/speak", requireDemoAuth, async (req, res) => {
    try {
      const { text, language, rate } = req.body ?? {};
      if (typeof text !== "string" || !text.trim()) {
        res.status(400).json({
          ok: false,
          errorCode: "INVALID_INPUT",
          message: "Text is required for speech synthesis.",
        });
        return;
      }

      const lang = normalizeLang(language);
      const result = await synthesizeSpeech({
        text,
        language: lang,
        rate: typeof rate === "number" ? rate : undefined,
      });

      res.json({
        ok: true,
        ...result,
      });
    } catch (error) {
      const err = error as Error & { code?: string; status?: number };
      console.error("[/api/tts/speak] Error:", err.code || "", err.message);
      const status = err.status || (err.code === "TTS_NOT_CONFIGURED" ? 503 : 502);
      res.status(status).json({
        ok: false,
        errorCode: err.code || "TTS_FAILED",
        message:
          err.message ||
          "Neural voice service is unavailable right now. Falling back to browser voice.",
      });
    }
  });

  // Open-Meteo Weather API integration endpoints (protected farmer routes)
  app.get("/api/weather/geocode", requireDemoAuth, async (req, res) => {
    try {
      const location =
        typeof req.query.location === "string" ? req.query.location : undefined;
      const village =
        typeof req.query.village === "string" ? req.query.village : undefined;
      const mandal =
        typeof req.query.mandal === "string" ? req.query.mandal : undefined;
      const district =
        typeof req.query.district === "string" ? req.query.district : undefined;
      const state =
        typeof req.query.state === "string" ? req.query.state : undefined;

      if (
        !location?.trim() &&
        !village?.trim() &&
        !mandal?.trim() &&
        !district?.trim()
      ) {
        res.status(400).json({
          ok: false,
          message: "Please provide a location, village, mandal, or district.",
        });
        return;
      }

      const geo = await geocodeFarmerLocation({
        location,
        village,
        mandal,
        district,
        state,
      });

      if (geo.results.length === 0) {
        res.status(404).json({
          ok: false,
          message:
            "Location not found. Try searching your nearest mandal, town, or district name.",
        });
        return;
      }

      res.json({
        ok: true,
        results: geo.results,
        resolvedFallback: geo.resolvedFallback,
      });
    } catch (error) {
      const err = error as Error & { status?: number };
      console.error("[/api/weather/geocode] Error:", err.message);
      res.status(err.status || 502).json({
        ok: false,
        message:
          err.message ||
          "Live weather information is temporarily unavailable. Please retry.",
      });
    }
  });

  app.get("/api/weather/current", requireDemoAuth, async (req, res) => {
    try {
      const lat = Number(req.query.latitude ?? req.query.lat);
      const lon = Number(req.query.longitude ?? req.query.lon);
      if (Number.isNaN(lat) || Number.isNaN(lon)) {
        res.status(400).json({
          ok: false,
          message: "Valid latitude and longitude query parameters are required.",
        });
        return;
      }
      const label =
        typeof req.query.label === "string" && req.query.label.trim()
          ? req.query.label.trim()
          : `${lat.toFixed(3)}, ${lon.toFixed(3)}`;

      const weather = await fetchOpenMeteoWeather({
        latitude: lat,
        longitude: lon,
        locationLabel: label,
        resolvedLocationName: label,
        bypassCache: req.query.refresh === "true",
      });

      res.json({
        ok: true,
        provider: weather.provider,
        status: weather.status,
        locationLabel: weather.locationLabel,
        coordinates: weather.coordinates,
        timezone: weather.timezone,
        observedAt: weather.observedAt,
        fetchedAt: weather.fetchedAt,
        cached: weather.cached,
        current: weather.current,
      });
    } catch (error) {
      const err = error as Error & { status?: number };
      console.error("[/api/weather/current] Error:", err.message);
      res.status(err.status || 502).json({
        ok: false,
        message:
          err.message ||
          "Live weather information is temporarily unavailable. Please retry.",
      });
    }
  });

  app.get("/api/weather/forecast", requireDemoAuth, async (req, res) => {
    try {
      const lat = Number(req.query.latitude ?? req.query.lat);
      const lon = Number(req.query.longitude ?? req.query.lon);
      if (Number.isNaN(lat) || Number.isNaN(lon)) {
        res.status(400).json({
          ok: false,
          message: "Valid latitude and longitude query parameters are required.",
        });
        return;
      }
      const label =
        typeof req.query.label === "string" && req.query.label.trim()
          ? req.query.label.trim()
          : `${lat.toFixed(3)}, ${lon.toFixed(3)}`;

      const weather = await fetchOpenMeteoWeather({
        latitude: lat,
        longitude: lon,
        locationLabel: label,
        resolvedLocationName: label,
        bypassCache: req.query.refresh === "true",
      });

      res.json({
        ok: true,
        provider: weather.provider,
        status: weather.status,
        locationLabel: weather.locationLabel,
        coordinates: weather.coordinates,
        timezone: weather.timezone,
        observedAt: weather.observedAt,
        fetchedAt: weather.fetchedAt,
        cached: weather.cached,
        forecast: weather.forecast,
        dailyForecast: weather.dailyForecast,
        interpretations: weather.interpretations,
        assumptions: weather.assumptions,
      });
    } catch (error) {
      const err = error as Error & { status?: number };
      console.error("[/api/weather/forecast] Error:", err.message);
      res.status(err.status || 502).json({
        ok: false,
        message:
          err.message ||
          "Live weather information is temporarily unavailable. Please retry.",
      });
    }
  });

  app.get("/api/weather", requireDemoAuth, async (req, res) => {
    try {
      const latRaw = req.query.latitude ?? req.query.lat;
      const lonRaw = req.query.longitude ?? req.query.lon;
      const latParam = latRaw !== undefined ? Number(latRaw) : undefined;
      const lonParam = lonRaw !== undefined ? Number(lonRaw) : undefined;
      const location =
        typeof req.query.location === "string" ? req.query.location : undefined;
      const village =
        typeof req.query.village === "string" ? req.query.village : undefined;
      const mandal =
        typeof req.query.mandal === "string" ? req.query.mandal : undefined;
      const district =
        typeof req.query.district === "string" ? req.query.district : undefined;
      const state =
        typeof req.query.state === "string" ? req.query.state : undefined;
      const refresh = req.query.refresh === "true";

      const weather = await fetchWeatherForFarmer({
        lat: latParam,
        lon: lonParam,
        location,
        village,
        mandal,
        district,
        state,
        refresh,
      });

      res.json(weather);
    } catch (error) {
      const err = error as Error & { status?: number };
      console.error("[/api/weather] Error:", err.message);
      res.status(err.status || 502).json({
        ok: false,
        status: "error",
        message:
          err.message ||
          "Live weather information is temporarily unavailable. Please retry.",
      });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, "dist");
    app.use(express.static(distDir));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distDir, "index.html"));
    });
  }

  app.listen(port, "0.0.0.0", () => {
    console.log(
      `Smart Water Management server listening on http://0.0.0.0:${port}`
    );
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
