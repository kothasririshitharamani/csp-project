export interface SafeApiError {
  ok: false;
  status: number;
  errorCode?: string;
  message: string;
}

const SESSION_TOKEN_KEY = "swm_demo_session_token_v1";
let inMemorySessionToken: string | null = null;

type UnauthorizedListener = () => void;
const unauthorizedListeners = new Set<UnauthorizedListener>();

export function getStoredSessionToken(): string | null {
  if (inMemorySessionToken && inMemorySessionToken.trim()) {
    return inMemorySessionToken.trim();
  }
  try {
    const fromSession = sessionStorage.getItem(SESSION_TOKEN_KEY);
    if (fromSession && fromSession.trim()) {
      inMemorySessionToken = fromSession.trim();
      return inMemorySessionToken;
    }
  } catch {
    // Ignore sessionStorage restrictions
  }
  try {
    const fromLocal = localStorage.getItem(SESSION_TOKEN_KEY);
    if (fromLocal && fromLocal.trim()) {
      inMemorySessionToken = fromLocal.trim();
      return inMemorySessionToken;
    }
  } catch {
    // Ignore localStorage restrictions
  }
  return null;
}

export function setStoredSessionToken(token: string | null | undefined): void {
  const clean = token && token.trim() ? token.trim() : null;
  inMemorySessionToken = clean;
  try {
    if (clean) {
      sessionStorage.setItem(SESSION_TOKEN_KEY, clean);
    } else {
      sessionStorage.removeItem(SESSION_TOKEN_KEY);
    }
  } catch {
    // Ignore storage quota / privacy mode errors
  }
  try {
    if (clean) {
      localStorage.setItem(SESSION_TOKEN_KEY, clean);
    } else {
      localStorage.removeItem(SESSION_TOKEN_KEY);
    }
  } catch {
    // Ignore storage quota / privacy mode errors
  }
}

export function clearStoredSessionToken(): void {
  inMemorySessionToken = null;
  try {
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
  } catch {
    // Ignore storage errors
  }
  try {
    localStorage.removeItem(SESSION_TOKEN_KEY);
  } catch {
    // Ignore storage errors
  }
}

export function onUnauthorizedSession(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.add(listener);
  return () => {
    unauthorizedListeners.delete(listener);
  };
}

function notifyUnauthorized(): void {
  clearStoredSessionToken();
  for (const listener of unauthorizedListeners) {
    listener();
  }
}

/**
 * Performs a fetch request with session credentials + Bearer token (for iframe compatibility)
 * and parses the response body safely without raw JSON syntax errors.
 */
export async function safeJsonFetch<T = Record<string, unknown>>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const token = getStoredSessionToken();
  const headers = new Headers(options?.headers || {});
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(url, {
      credentials: "include",
      ...options,
      headers,
    });
  } catch {
    throw new Error(
      "Network connection error. Please check your internet and try again."
    );
  }

  let rawText = "";
  try {
    rawText = await response.text();
  } catch {
    throw new Error("Could not read server response. Please try again.");
  }

  let parsed: Record<string, unknown> | null = null;
  if (rawText.trim()) {
    try {
      parsed = JSON.parse(rawText) as Record<string, unknown>;
    } catch {
      parsed = null;
    }
  }

  if (!response.ok) {
    const isAuthEndpoint =
      url.startsWith("/api/auth/login") ||
      url.startsWith("/api/auth/register") ||
      url.startsWith("/api/auth/reset-password") ||
      url.startsWith("/api/auth/logout");

    if (response.status === 401 && !isAuthEndpoint) {
      notifyUnauthorized();
    }

    const serverMsg =
      parsed && typeof parsed.message === "string" && parsed.message.trim()
        ? parsed.message.trim()
        : response.status === 504
          ? "The server took too long to respond. Please try again."
          : response.status === 503
            ? "Service is temporarily unavailable or not configured."
            : `Request failed (${response.status}). Please try again.`;

    const err = new Error(serverMsg) as Error & {
      errorCode?: string;
      status?: number;
    };
    err.status = response.status;
    if (parsed && typeof parsed.errorCode === "string") {
      err.errorCode = parsed.errorCode;
    }
    throw err;
  }

  if (!parsed) {
    throw new Error(
      "Received an unexpected response format from the server. Please retry."
    );
  }

  return parsed as T;
}
