import { getStoredToken, removeStoredToken } from "./auth";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");

export async function fetchWithAuth(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // LocalTunnel and ngrok warning screen bypass headers
  headers.set("Bypass-Tunnel-Reminder", "true");
  headers.set("bypass-tunnel-reminder", "true");
  headers.set("ngrok-skip-browser-warning", "true");

  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401 && !endpoint.includes("/api/auth/login")) {
    // Session expired or invalid token
    removeStoredToken();
  }

  return response;
}

