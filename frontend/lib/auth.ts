const TOKEN_KEY = "cmpdi_auth_token";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;

  // 1. Try reading from cookie
  const match = document.cookie.match(new RegExp("(^| )" + TOKEN_KEY + "=([^;]+)"));
  if (match && match[2]) {
    return decodeURIComponent(match[2]);
  }

  // 2. Fallback to localStorage
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch (e) {
    return null;
  }
}

export function setStoredToken(token: string): void {
  if (typeof window === "undefined") return;

  // Set secure cookie (30 days expiry)
  const maxAge = 30 * 24 * 60 * 60;
  document.cookie = `${TOKEN_KEY}=${encodeURIComponent(token)}; path=/; max-age=${maxAge}; SameSite=Lax`;

  // Also sync to localStorage
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch (e) {
    // localStorage disabled or unavailable
  }
}

export function removeStoredToken(): void {
  if (typeof window === "undefined") return;

  // Clear cookie
  document.cookie = `${TOKEN_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;

  // Clear localStorage
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch (e) {
    // ignore
  }
}
