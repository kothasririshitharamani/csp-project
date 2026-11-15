import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export type SupportedLanguage = "te" | "en" | "hi";

export interface StoredFarmProfile {
  farmerName: string;
  mobileNumber: string;
  village: string;
  mandal: string;
  district: string;
  state: string;
  landArea: string;
  areaUnit: "acres" | "hectares";
  crop: string;
  customCrop: string;
  otherCrops: string;
  growthStage: string;
  soilType: string;
  waterSource: string;
  irrigationMethod: string;
  waterAvailability: string;
  updatedAt: string;
}

interface StoredFarmerRecord {
  id: string;
  fullName: string;
  mobileNumber: string;
  passwordSalt: string;
  passwordHash: string;
  preferredLanguage: SupportedLanguage;
  profileComplete: boolean;
  profile: StoredFarmProfile | null;
  createdAt: string;
  updatedAt: string;
}

interface StoreData {
  farmers: StoredFarmerRecord[];
}

export interface PublicFarmerUser {
  id: string;
  fullName: string;
  mobileNumber: string;
  preferredLanguage: SupportedLanguage;
  profileComplete: boolean;
  profile: StoredFarmProfile | null;
  authMode: "demo_server";
}

const DATA_DIR = path.resolve(process.cwd(), "server", "data");
const STORE_PATH = path.join(DATA_DIR, "farmers-store.json");
const SECRET_PATH = path.join(DATA_DIR, ".session-secret");
const REVOKED_PATH = path.join(DATA_DIR, "revoked-sessions.json");
const SESSION_COOKIE_NAME = "swm_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function loadOrCreateSessionSecret(): string {
  const fromEnv = process.env.SESSION_SECRET?.trim();
  if (fromEnv) return fromEnv;

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(SECRET_PATH)) {
      const existing = fs.readFileSync(SECRET_PATH, "utf8").trim();
      if (existing.length >= 32) return existing;
    }
    const generated = crypto.randomBytes(32).toString("hex");
    fs.writeFileSync(SECRET_PATH, generated, "utf8");
    return generated;
  } catch {
    return crypto.randomBytes(32).toString("hex");
  }
}

const SESSION_SECRET = loadOrCreateSessionSecret();

function ensureStoreFile(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(STORE_PATH)) {
    const empty: StoreData = { farmers: [] };
    fs.writeFileSync(STORE_PATH, JSON.stringify(empty, null, 2), "utf8");
  }
}

function readStore(): StoreData {
  ensureStoreFile();
  try {
    const raw = fs.readFileSync(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as StoreData;
    if (!parsed || !Array.isArray(parsed.farmers)) {
      return { farmers: [] };
    }
    return parsed;
  } catch (err) {
    console.error("[authService] Failed reading farmers-store.json:", err);
    return { farmers: [] };
  }
}

function writeStore(data: StoreData): void {
  ensureStoreFile();
  fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), "utf8");
}

export function normalizeMobile(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith("0")) {
    return digits.slice(1);
  }
  return digits;
}

export function isValidIndianMobile(mobile: string): boolean {
  return /^[6-9]\d{9}$/.test(mobile);
}

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  const computed = crypto.scryptSync(password, salt, 64);
  const expectedBuf = Buffer.from(expectedHash, "hex");
  if (computed.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(computed, expectedBuf);
}

function toPublicUser(record: StoredFarmerRecord): PublicFarmerUser {
  return {
    id: record.id,
    fullName: record.fullName,
    mobileNumber: record.mobileNumber,
    preferredLanguage: record.preferredLanguage,
    profileComplete: record.profileComplete,
    profile: record.profile,
    authMode: "demo_server",
  };
}

interface RevokedEntry {
  jti: string;
  exp: number;
}

function readRevokedTokens(): RevokedEntry[] {
  try {
    if (!fs.existsSync(REVOKED_PATH)) return [];
    const raw = fs.readFileSync(REVOKED_PATH, "utf8");
    const parsed = JSON.parse(raw) as RevokedEntry[];
    if (!Array.isArray(parsed)) return [];
    const now = Date.now();
    return parsed.filter((item) => item && typeof item.jti === "string" && typeof item.exp === "number" && item.exp > now);
  } catch {
    return [];
  }
}

function writeRevokedTokens(entries: RevokedEntry[]): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const now = Date.now();
    const active = entries.filter((e) => e.exp > now);
    fs.writeFileSync(REVOKED_PATH, JSON.stringify(active), "utf8");
  } catch {
    // Non-fatal
  }
}

function parseVerifiedTokenPayload(
  token: string | undefined
): { uid: string; exp: number; jti: string } | null {
  if (!token || !token.includes(".")) return null;
  const [encoded, sig] = token.split(".");
  if (!encoded || !sig) return null;

  const expectedSig = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(encoded)
    .digest("base64url");

  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;

  try {
    const parsed = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8")
    ) as { uid?: string; exp?: number; jti?: string };
    if (!parsed.uid || typeof parsed.exp !== "number" || !parsed.jti) return null;
    if (Date.now() > parsed.exp) return null;
    return { uid: parsed.uid, exp: parsed.exp, jti: parsed.jti };
  } catch {
    return null;
  }
}

export function createSessionToken(userId: string): string {
  const payload = JSON.stringify({
    uid: userId,
    jti: crypto.randomUUID(),
    exp: Date.now() + SESSION_TTL_MS,
  });
  const encoded = Buffer.from(payload, "utf8").toString("base64url");
  const sig = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(encoded)
    .digest("base64url");
  return `${encoded}.${sig}`;
}

export function verifySessionToken(token: string | undefined): string | null {
  const payload = parseVerifiedTokenPayload(token);
  if (!payload) return null;
  const revoked = readRevokedTokens();
  if (revoked.some((entry) => entry.jti === payload.jti)) {
    return null;
  }
  return payload.uid;
}

export function revokeSessionToken(token: string | undefined): void {
  const payload = parseVerifiedTokenPayload(token);
  if (!payload) return;
  const revoked = readRevokedTokens();
  if (!revoked.some((entry) => entry.jti === payload.jti)) {
    revoked.push({ jti: payload.jti, exp: payload.exp });
    writeRevokedTokens(revoked);
  }
}

export function parseCookieHeader(cookieHeader: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;
  for (const part of cookieHeader.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) {
      cookies[key] = decodeURIComponent(val);
    }
  }
  return cookies;
}

export function getSessionCookieName(): string {
  return SESSION_COOKIE_NAME;
}

export function registerFarmer(params: {
  fullName: string;
  mobileNumber: string;
  password: string;
  preferredLanguage: SupportedLanguage;
}): PublicFarmerUser {
  const fullName = params.fullName.trim();
  const mobile = normalizeMobile(params.mobileNumber);

  if (fullName.length < 2) {
    const err = new Error("Full name must be at least 2 characters.");
    (err as Error & { status?: number; code?: string }).status = 400;
    (err as Error & { code?: string }).code = "INVALID_NAME";
    throw err;
  }

  if (!isValidIndianMobile(mobile)) {
    const err = new Error("Please enter a valid 10-digit mobile number starting with 6–9.");
    (err as Error & { status?: number; code?: string }).status = 400;
    (err as Error & { code?: string }).code = "INVALID_MOBILE";
    throw err;
  }

  if (!params.password || params.password.length < 6) {
    const err = new Error("Password must be at least 6 characters long.");
    (err as Error & { status?: number; code?: string }).status = 400;
    (err as Error & { code?: string }).code = "INVALID_PASSWORD";
    throw err;
  }

  const store = readStore();
  const existing = store.farmers.find((f) => f.mobileNumber === mobile);
  if (existing) {
    const err = new Error("An account with this mobile number already exists. Please log in.");
    (err as Error & { status?: number; code?: string }).status = 409;
    (err as Error & { code?: string }).code = "MOBILE_EXISTS";
    throw err;
  }

  const salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = hashPassword(params.password, salt);
  const now = new Date().toISOString();

  const record: StoredFarmerRecord = {
    id: crypto.randomUUID(),
    fullName,
    mobileNumber: mobile,
    passwordSalt: salt,
    passwordHash,
    preferredLanguage: params.preferredLanguage,
    profileComplete: false,
    profile: null,
    createdAt: now,
    updatedAt: now,
  };

  store.farmers.push(record);
  writeStore(store);
  return toPublicUser(record);
}

export function loginFarmer(params: {
  mobileNumber: string;
  password: string;
}): PublicFarmerUser {
  const mobile = normalizeMobile(params.mobileNumber);
  if (!isValidIndianMobile(mobile)) {
    const err = new Error("Please enter a valid 10-digit mobile number.");
    (err as Error & { status?: number; code?: string }).status = 400;
    (err as Error & { code?: string }).code = "INVALID_MOBILE";
    throw err;
  }

  if (!params.password) {
    const err = new Error("Please enter your password.");
    (err as Error & { status?: number; code?: string }).status = 400;
    (err as Error & { code?: string }).code = "INVALID_PASSWORD";
    throw err;
  }

  const store = readStore();
  const record = store.farmers.find((f) => f.mobileNumber === mobile);
  if (!record) {
    const err = new Error("Account not found. Please create an account.");
    (err as Error & { status?: number; code?: string }).status = 404;
    (err as Error & { code?: string }).code = "ACCOUNT_NOT_FOUND";
    throw err;
  }

  if (!verifyPassword(params.password, record.passwordSalt, record.passwordHash)) {
    const err = new Error("Incorrect mobile number or password.");
    (err as Error & { status?: number; code?: string }).status = 401;
    (err as Error & { code?: string }).code = "INVALID_CREDENTIALS";
    throw err;
  }

  return toPublicUser(record);
}

export function resetFarmerPasswordDemo(params: {
  mobileNumber: string;
  fullName: string;
  newPassword: string;
}): void {
  const mobile = normalizeMobile(params.mobileNumber);
  const nameLower = params.fullName.trim().toLowerCase();

  if (!isValidIndianMobile(mobile)) {
    const err = new Error("Please enter a valid 10-digit mobile number.");
    (err as Error & { status?: number; code?: string }).status = 400;
    (err as Error & { code?: string }).code = "INVALID_MOBILE";
    throw err;
  }
  if (!params.newPassword || params.newPassword.length < 6) {
    const err = new Error("New password must be at least 6 characters long.");
    (err as Error & { status?: number; code?: string }).status = 400;
    (err as Error & { code?: string }).code = "INVALID_PASSWORD";
    throw err;
  }

  const store = readStore();
  const record = store.farmers.find((f) => f.mobileNumber === mobile);
  if (!record || record.fullName.trim().toLowerCase() !== nameLower) {
    const err = new Error("Mobile number and registered full name did not match any account.");
    (err as Error & { status?: number; code?: string }).status = 404;
    (err as Error & { code?: string }).code = "ACCOUNT_MISMATCH";
    throw err;
  }

  const newSalt = crypto.randomBytes(16).toString("hex");
  record.passwordSalt = newSalt;
  record.passwordHash = hashPassword(params.newPassword, newSalt);
  record.updatedAt = new Date().toISOString();
  writeStore(store);
}

export function getFarmerById(userId: string): PublicFarmerUser | null {
  const store = readStore();
  const record = store.farmers.find((f) => f.id === userId);
  return record ? toPublicUser(record) : null;
}

export function updateFarmerProfile(
  userId: string,
  profile: Omit<StoredFarmProfile, "updatedAt">,
  preferredLanguage?: SupportedLanguage
): PublicFarmerUser {
  const store = readStore();
  const record = store.farmers.find((f) => f.id === userId);
  if (!record) {
    const err = new Error("Session user not found. Please log in again.");
    (err as Error & { status?: number; code?: string }).status = 401;
    (err as Error & { code?: string }).code = "UNAUTHORIZED";
    throw err;
  }

  const now = new Date().toISOString();
  record.fullName = profile.farmerName.trim() || record.fullName;
  record.profile = {
    ...profile,
    farmerName: profile.farmerName.trim(),
    village: profile.village.trim(),
    mandal: profile.mandal.trim(),
    district: profile.district.trim(),
    state: profile.state.trim() || "Andhra Pradesh",
    customCrop: profile.customCrop.trim(),
    otherCrops: profile.otherCrops.trim(),
    updatedAt: now,
  };
  record.profileComplete = true;
  if (preferredLanguage) {
    record.preferredLanguage = preferredLanguage;
  }
  record.updatedAt = now;

  writeStore(store);
  return toPublicUser(record);
}

export function updateFarmerLanguage(
  userId: string,
  preferredLanguage: SupportedLanguage
): PublicFarmerUser | null {
  const store = readStore();
  const record = store.farmers.find((f) => f.id === userId);
  if (!record) return null;
  record.preferredLanguage = preferredLanguage;
  record.updatedAt = new Date().toISOString();
  writeStore(store);
  return toPublicUser(record);
}
