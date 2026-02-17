import { API_HOST } from "./apiConfig";

/* ================= TOKENS ================= */

export const getAccessToken = () => {
  return localStorage.getItem("tokenKey");
};

export const getRefreshToken = () => {
  return localStorage.getItem("refreshToken");
};

/* ================= DEVICE ================= */

export const getDeviceId = () => {
  let deviceId = localStorage.getItem("deviceId");

  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem("deviceId", deviceId);
  }

  return deviceId;
};

/* ================= CLEAR AUTH ================= */

export const clearAuth = () => {
  localStorage.removeItem("tokenKey");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("deviceId");
};

/* ================= REFRESH TOKEN ================= */
/**
 * NOTE:
 * This function is OPTIONAL.
 * Your axios interceptor already handles refresh automatically.
 * Keep this only if you want to refresh manually somewhere.
 */
export const refreshAccessToken = async () => {
  const refreshToken = getRefreshToken();
  const deviceId = getDeviceId();

  if (!refreshToken || !deviceId) {
    throw new Error("No refresh token or deviceId found");
  }

  const response = await fetch(`${API_HOST}/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      refreshToken,
      deviceId,
    }),
  });

  if (!response.ok) {
    clearAuth();
    throw new Error("Refresh token expired");
  }

  const data = await response.json();

  // backend returns new access token
  const newToken = data.token; 
localStorage.setItem("tokenKey", newToken);
if (data.refreshToken) localStorage.setItem("refreshToken", data.refreshToken);


  return newToken;
};
